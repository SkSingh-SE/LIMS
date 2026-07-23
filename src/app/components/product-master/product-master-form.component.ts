import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ProductMasterService } from '../../services/product-master.service';
import { MetalClassificationService } from '../../services/metal-classification.service';
import { ProductSizeMasterService } from '../../services/product-size-master.service';
import { StandardOrgnizationService } from '../../services/standard-orgnization.service';
import { MaterialSpecificationService } from '../../services/material-specification.service';
import { ToastService } from '../../services/toast.service';
import { SearchableDropdownComponent } from '../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { MultiSelectDropdownComponent } from '../../utility/components/multi-select-dropdown/multi-select-dropdown.component';

export interface VersionGradeEntry {
  gradeId: number;
  gradeName: string;
  specHeaderId: number;
  specHeaderName: string;
  sortOrder: number;
  chemicalParams: any[];
  generalParams: any[];
  laboratoryTests: any[];
  testMethods: any[];
  availablePC1: any[];
  availablePC2: any[];
  availableHeatTreatments: any[];
  availableProductSizes: any[];
  conditions: GradeConditionEntry[];
  activeParamTab: 'chemical' | 'general' | 'labtest' | 'testmethod';
  activeConditionIdx: number | null;
}

export interface GradeConditionEntry {
  productConditionID1: number | null;
  productConditionName1: string | null;
  productConditionID2: number | null;
  productConditionName2: string | null;
  heatTreatmentID: number | null;
  heatTreatmentName: string | null;
  productSizeMasterID: number | null;
  productSizeName: string | null;
  priority: number;
}

@Component({
  selector: 'app-product-master-form',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    FormsModule,
    SearchableDropdownComponent,
    MultiSelectDropdownComponent
  ],
  templateUrl: './product-master-form.component.html',
  styleUrls: ['./product-master-form.component.css']
})
export class ProductMasterFormComponent implements OnInit {
  form!: FormGroup;
  id: number = 0;
  isEditMode = false;
  isViewMode = false;
  submitted = false;

  metalClassifications: any[] = [];
  prefixOptions: string[] = [];
  yearsList: number[] = [];
  newCustomPrefix = '';
  showCustomPrefixModal = false;

  activeVersionIndex = 0;

  // Version Grade State: versionIndex -> array of VersionGradeEntry
  versionGradeMap: Record<number, VersionGradeEntry[]> = {};
  // Active Grade Tab per version: versionIndex -> active grade array index
  activeGradeTabMap: Record<number, number> = {};
  // Pending selected grade from SearchableDropdown per version
  selectedGradeForVersion: Record<number, any> = {};
  slectedProductSize: any = null;
  openSections: Record<string, boolean> = {
    sec1: true,
    sec2: true
  };

  getSizeDropdown = (searchTerm: string, pageNo: number, pageSize: number) => {
    return this.productSizeService.getProductSizeDropdown(searchTerm, pageNo, pageSize);
  };

  getStdOrgDropdown = (searchTerm: string, pageNo: number, pageSize: number) => {
    return this.stdOrgService.getStandardOrganizationDropdown(searchTerm, pageNo, pageSize);
  };

  getGradeDropdown = (searchTerm: string, pageNo: number, pageSize: number) => {
    return this.specHeaderService.getGradeDropdown(searchTerm, pageNo, pageSize);
  };

  getMetalDropdown = (searchTerm: string, pageNo: number, pageSize: number) => {
    return this.metalService.getMetalClassificationDropdown(searchTerm, pageNo, pageSize);
  };

  toggleSection(key: string) {
    this.openSections[key] = !this.openSections[key];
  }

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private service: ProductMasterService,
    private metalService: MetalClassificationService,
    private productSizeService: ProductSizeMasterService,
    private stdOrgService: StandardOrgnizationService,
    private specHeaderService: MaterialSpecificationService,
    private toastService: ToastService
  ) {}

  ngOnInit() {
    this.generateYearsList();
    this.initForm();
    this.loadPrefixOptions();

    this.route.params.subscribe((params) => {
      if (params['id']) {
        this.id = +params['id'];
        const path = this.route.snapshot.url[0]?.path;
        if (path === 'details') {
          this.isViewMode = true;
          this.form.disable();
        } else if (path === 'edit') {
          this.isEditMode = true;
        }
        this.loadDetails();
      } else {
        this.addVersion();
      }
    });

    this.setupTitleAutoGeneration();
  }

  generateYearsList() {
    const currentYear = new Date().getFullYear();
    this.yearsList = [];
    for (let y = currentYear + 5; y >= 1990; y--) {
      this.yearsList.push(y);
    }
  }

  initForm() {
    this.form = this.fb.group({
      id: [0],
      isSizeApplicable: [true],
      productSizeMasterID: [null],
      productName: ['', [Validators.required]],
      gradePrefix: ['Grade'],
      gradeValue: [''],
      displayTitle: [''],
      metalClassificationIDs: [[]],
      versions: this.fb.array([])
    });

    this.form.get('isSizeApplicable')?.valueChanges.subscribe((applicable) => {
      const sizeControl = this.form.get('productSizeMasterID');
      if (!applicable) {
        this.slectedProductSize = null;
        sizeControl?.setValue(null);
        sizeControl?.clearValidators();
        sizeControl?.disable();
      } else {
        sizeControl?.setValidators([Validators.required]);
        if (!this.isViewMode) sizeControl?.enable();
      }
      sizeControl?.updateValueAndValidity();
      this.updateAutoDisplayTitle();
    });
  }

  onNoSizeChange(checked: boolean) {
    this.form.get('isSizeApplicable')?.setValue(!checked);
  }

  selectedStdOrgMap: Record<number, any> = {};

  onProductSizeSelected(item: any) {
    const id = item ? item.id : null;
    this.slectedProductSize = item || null;
    this.form.get('productSizeMasterID')?.setValue(id);
    this.form.get('productSizeMasterID')?.markAsTouched();
    this.updateAutoDisplayTitle();
  }

  onStdOrgSelected(item: any, vIdx: number = this.activeVersionIndex) {
    const id = item ? item.id : null;
    this.selectedStdOrgMap[vIdx] = item || null;
    const vGroup = this.versions.at(vIdx) as FormGroup;
    if (vGroup) {
      vGroup.get('standardOrganizationID')?.setValue(id);
      vGroup.get('standardOrganizationID')?.markAsTouched();
      this.updateVersionAutoFields(vIdx);
    }
  }

  get versions(): FormArray {
    return this.form.get('versions') as FormArray;
  }

  createVersionGroup(vVal: string = '1'): FormGroup {
    const group = this.fb.group({
      id: [0],
      versionNumber: [vVal.toString(), [Validators.required]],
      year: [new Date().getFullYear().toString(), [Validators.required]],
      specificationFilePath: [''],
      standardOrganizationID: [null, [Validators.required]],
      specStdNo: ['', [Validators.required]],
      partSection: [''],
      title: [''],
      productCaption: [''],
      isActiveVersion: [this.versions.length === 0]
    });
    this.subscribeVersionAutoGeneration(group, this.versions.length);
    return group;
  }

  subscribeVersionAutoGeneration(vGroup: FormGroup, vIdx: number) {
    vGroup.get('specStdNo')?.valueChanges.subscribe(() => this.updateVersionAutoFields(vIdx));
    vGroup.get('partSection')?.valueChanges.subscribe(() => this.updateVersionAutoFields(vIdx));
    vGroup.get('year')?.valueChanges.subscribe(() => this.updateVersionAutoFields(vIdx));
    vGroup.get('versionNumber')?.valueChanges.subscribe(() => this.updateVersionAutoFields(vIdx));
  }

  generateProductSpecName(vIdx: number): string {
    const vGroup = this.versions.at(vIdx) as FormGroup;
    if (!vGroup) return '';
    const stdOrgObj = this.selectedStdOrgMap[vIdx];
    const stdOrgName = stdOrgObj ? (stdOrgObj.name || stdOrgObj.text || stdOrgObj.displayName || stdOrgObj.code || '') : '';
    const specStdNo = vGroup.get('specStdNo')?.value || '';
    const part = vGroup.get('partSection')?.value || '';
    const year = vGroup.get('year')?.value || '';
    const version = vGroup.get('versionNumber')?.value || '';

    const stdParts = [stdOrgName, specStdNo, part].filter(s => s && s.toString().trim()).join(' ').trim();
    if (!stdParts && !year && !version) return '';

    const yearPart = year ? `: ${year}` : '';
    const verPart = version ? `V${version}` : '';

    const res = [stdParts, yearPart, verPart].filter(s => s && s.toString().trim()).join(' ').replace(/\s+/g, ' ').trim();
    return res;
  }

  generateProductCaption(vIdx: number): string {
    const vGroup = this.versions.at(vIdx) as FormGroup;
    if (!vGroup) return '';
    const stdOrgObj = this.selectedStdOrgMap[vIdx];
    const stdOrgName = stdOrgObj ? (stdOrgObj.name || stdOrgObj.text || stdOrgObj.displayName || stdOrgObj.code || '') : '';
    const specStdNo = vGroup.get('specStdNo')?.value || '';
    const part = vGroup.get('partSection')?.value || '';
    const version = vGroup.get('versionNumber')?.value || '';

    const stdParts = [stdOrgName, specStdNo, part].filter(s => s && s.toString().trim()).join(' ').trim();
    if (!stdParts && !version) return '';

    const verPart = version ? `V${version}` : '';
    const res = [stdParts, verPart].filter(s => s && s.toString().trim()).join(' ').replace(/\s+/g, ' ').trim();
    return res;
  }

  updateVersionAutoFields(vIdx: number) {
    const vGroup = this.versions.at(vIdx) as FormGroup;
    if (!vGroup) return;

    const specName = this.generateProductSpecName(vIdx);
    if (specName) {
      vGroup.get('title')?.setValue(specName, { emitEvent: false });
    }

    const captionControl = vGroup.get('productCaption');
    if (captionControl && !captionControl.dirty) {
      const caption = this.generateProductCaption(vIdx);
      if (caption) {
        captionControl.setValue(caption, { emitEvent: false });
      }
    }
  }

  addVersion() {
    const nextVer = (this.versions.length + 1).toString();
    this.versions.push(this.createVersionGroup(nextVer));
    this.activeVersionIndex = this.versions.length - 1;
    if (!this.versionGradeMap[this.activeVersionIndex]) {
      this.versionGradeMap[this.activeVersionIndex] = [];
    }
    this.activeGradeTabMap[this.activeVersionIndex] = 0;
  }

  removeVersion(index: number) {
    if (this.versions.length <= 1) {
      this.toastService.show('At least one version is required.', 'warning');
      return;
    }
    this.versions.removeAt(index);
    delete this.versionGradeMap[index];
    delete this.activeGradeTabMap[index];
    if (this.activeVersionIndex >= this.versions.length) {
      this.activeVersionIndex = this.versions.length - 1;
    }
  }

  selectVersion(index: number) {
    this.activeVersionIndex = index;
  }

  toggleVersionActive(vIdx: number, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.versions.controls.forEach((ctrl, idx) => {
      if (idx === vIdx) {
        ctrl.get('isActiveVersion')?.setValue(checked);
      } else if (checked) {
        ctrl.get('isActiveVersion')?.setValue(false);
      }
    });
  }

  get currentVersionGroup(): FormGroup {
    return this.versions.at(this.activeVersionIndex) as FormGroup;
  }

  loadPrefixOptions() {
    this.service.getPrefixOptions().subscribe({
      next: (opts) => {
        this.prefixOptions = opts || ['Grade', 'Class', 'Designation', 'Type', 'Series'];
      }
    });
  }

  onMetalItemsSelected(selectedItems: any[]) {
    const ids = (selectedItems || []).map(item => item.id);
    this.form.get('metalClassificationIDs')?.setValue(ids);
  }

  setupTitleAutoGeneration() {
    this.form.get('productName')?.valueChanges.subscribe(() => this.updateAutoDisplayTitle());
    this.form.get('gradePrefix')?.valueChanges.subscribe(() => this.updateAutoDisplayTitle());
    this.form.get('gradeValue')?.valueChanges.subscribe(() => this.updateAutoDisplayTitle());
    this.form.get('productSizeMasterID')?.valueChanges.subscribe((val) => {
      if (!val) {
        this.slectedProductSize = null;
      }
      this.updateAutoDisplayTitle();
    });
  }

  updateAutoDisplayTitle() {
    const isApplicable = this.form.get('isSizeApplicable')?.value;
    const productSize = (isApplicable && this.slectedProductSize) ? (this.slectedProductSize.name || this.slectedProductSize.text || this.slectedProductSize.displayName || '') : '';
    const pName = this.form.get('productName')?.value || '';
    const prefix = this.form.get('gradePrefix')?.value || '';
    const gradeVal = this.form.get('gradeValue')?.value || '';
    const titleControl = this.form.get('displayTitle');

    if (!titleControl?.dirty) {
      const gradePart = prefix || gradeVal ? `${prefix} ${gradeVal}`.trim() : '<Grade>';
      const generated = `${productSize} ${pName} ${gradePart}`.replace(/\s+/g, ' ').trim();
      titleControl?.setValue(generated, { emitEvent: false });
    }
  }

  openCustomPrefixModal() {
    this.newCustomPrefix = '';
    this.showCustomPrefixModal = true;
  }

  saveCustomPrefix() {
    if (!this.newCustomPrefix.trim()) return;
    const val = this.newCustomPrefix.trim();
    this.service.addPrefixOption(val).subscribe({
      next: () => {
        if (!this.prefixOptions.includes(val)) {
          this.prefixOptions.push(val);
        }
        this.form.get('gradePrefix')?.setValue(val);
        this.showCustomPrefixModal = false;
        this.toastService.show('Prefix added to database.', 'success');
      }
    });
  }

  onFileUpload(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.service.uploadSpecFile(file).subscribe({
        next: (res) => {
          this.currentVersionGroup.get('specificationFilePath')?.setValue(res.filePath);
          this.toastService.show('Specification PDF uploaded.', 'success');
        },
        error: (err) => {
          this.toastService.show(err?.error?.message || 'File upload failed.', 'error');
        }
      });
    }
  }

  getFileName(path: string | null): string {
    if (!path) return '';
    const parts = path.split(/[/\\]/);
    const raw = parts[parts.length - 1];

    // If filename starts with GUID (36 chars) or contains prefix like GUID_Product_originalName.pdf
    const underscoreIdx = raw.indexOf('_');
    if (underscoreIdx !== -1 && underscoreIdx < raw.length - 1) {
      let clean = raw.substring(underscoreIdx + 1);
      if (clean.toLowerCase().startsWith('product_') && clean.length > 8) {
        clean = clean.substring(8);
      }
      return clean;
    }
    return raw;
  }

  // Grade & Condition Workflow Methods
  onGradeSelected(vIdx: number, item: any) {
    this.selectedGradeForVersion[vIdx] = item;
  }

  onGradeAdded(vIdx: number) {
    const selected = this.selectedGradeForVersion[vIdx];
    if (!selected || !selected.id) {
      this.toastService.show('Please search and select a grade first.', 'warning');
      return;
    }

    const gradeId = selected.id;
    if (!this.versionGradeMap[vIdx]) {
      this.versionGradeMap[vIdx] = [];
    }

    if (this.versionGradeMap[vIdx].some(g => g.gradeId === gradeId)) {
      this.toastService.show(`Grade '${selected.name}' is already added to Version ${vIdx + 1}.`, 'warning');
      return;
    }

    this.service.getGradeParameters(gradeId).subscribe({
      next: (res) => {
        if (!res) return;

        const newEntry: VersionGradeEntry = {
          gradeId: res.specificationGradeID,
          gradeName: res.gradeName,
          specHeaderId: res.specificationHeaderID,
          specHeaderName: res.specificationHeaderName,
          sortOrder: this.versionGradeMap[vIdx].length + 1,
          chemicalParams: res.chemicalParameters || [],
          generalParams: res.generalParameters || [],
          laboratoryTests: res.laboratoryTests || [],
          testMethods: res.testMethods || [],
          availablePC1: res.availablePC1 || [],
          availablePC2: res.availablePC2 || [],
          availableHeatTreatments: res.availableHeatTreatments || [],
          availableProductSizes: res.availableProductSizes || [],
          conditions: [],
          activeParamTab: 'chemical',
          activeConditionIdx: null
        };

        this.versionGradeMap[vIdx].push(newEntry);
        this.activeGradeTabMap[vIdx] = this.versionGradeMap[vIdx].length - 1;
        this.selectedGradeForVersion[vIdx] = null;
        this.toastService.show(`Grade '${res.gradeName}' added.`, 'success');
      },
      error: (err) => {
        this.toastService.show('Failed to fetch grade details.', 'error');
      }
    });
  }

  removeGrade(vIdx: number, gIdx: number, event?: Event) {
    if (event) event.stopPropagation();
    if (!this.versionGradeMap[vIdx]) return;

    this.versionGradeMap[vIdx].splice(gIdx, 1);
    if (this.activeGradeTabMap[vIdx] >= this.versionGradeMap[vIdx].length) {
      this.activeGradeTabMap[vIdx] = Math.max(0, this.versionGradeMap[vIdx].length - 1);
    }
  }

  selectGradeTab(vIdx: number, gIdx: number) {
    this.activeGradeTabMap[vIdx] = gIdx;
  }

  get currentActiveGrade(): VersionGradeEntry | null {
    const list = this.versionGradeMap[this.activeVersionIndex] || [];
    const activeIdx = this.activeGradeTabMap[this.activeVersionIndex] ?? 0;
    return list[activeIdx] || null;
  }

  addCondition(vIdx: number, gIdx: number) {
    const grade = this.versionGradeMap[vIdx]?.[gIdx];
    if (!grade) return;

    const newCond: GradeConditionEntry = {
      productConditionID1: null,
      productConditionName1: null,
      productConditionID2: null,
      productConditionName2: null,
      heatTreatmentID: null,
      heatTreatmentName: null,
      productSizeMasterID: null,
      productSizeName: null,
      priority: grade.conditions.length + 1
    };

    grade.conditions.push(newCond);
    grade.activeConditionIdx = grade.conditions.length - 1;
  }

  removeCondition(vIdx: number, gIdx: number, cIdx: number) {
    const grade = this.versionGradeMap[vIdx]?.[gIdx];
    if (!grade) return;

    grade.conditions.splice(cIdx, 1);
    if (grade.activeConditionIdx === cIdx) {
      grade.activeConditionIdx = grade.conditions.length > 0 ? 0 : null;
    } else if (grade.activeConditionIdx !== null && grade.activeConditionIdx > cIdx) {
      grade.activeConditionIdx--;
    }
  }

  selectConditionCard(vIdx: number, gIdx: number, cIdx: number) {
    const grade = this.versionGradeMap[vIdx]?.[gIdx];
    if (!grade) return;
    grade.activeConditionIdx = cIdx;
  }

  clearConditionSelection(vIdx: number, gIdx: number) {
    const grade = this.versionGradeMap[vIdx]?.[gIdx];
    if (!grade) return;
    grade.activeConditionIdx = null;
  }

  getFilteredChemicalParams(vIdx: number, gIdx: number): any[] {
    const grade = this.versionGradeMap[vIdx]?.[gIdx];
    if (!grade) return [];

    const params = grade.chemicalParams || [];
    if (grade.activeConditionIdx === null || !grade.conditions[grade.activeConditionIdx]) {
      return params;
    }

    const cond = grade.conditions[grade.activeConditionIdx];
    return params.filter(p =>
      (!cond.productConditionID1 || p.productConditionID1 === cond.productConditionID1) &&
      (!cond.productConditionID2 || p.productConditionID2 === cond.productConditionID2) &&
      (!cond.heatTreatmentID || p.heatTreatmentID === cond.heatTreatmentID) &&
      (!cond.productSizeMasterID || p.productSizeMasterID === cond.productSizeMasterID)
    );
  }

  getFilteredGeneralParams(vIdx: number, gIdx: number): any[] {
    const grade = this.versionGradeMap[vIdx]?.[gIdx];
    if (!grade) return [];

    const params = grade.generalParams || [];
    if (grade.activeConditionIdx === null || !grade.conditions[grade.activeConditionIdx]) {
      return params;
    }

    const cond = grade.conditions[grade.activeConditionIdx];
    return params.filter(p =>
      (!cond.productConditionID1 || p.productConditionID1 === cond.productConditionID1) &&
      (!cond.productConditionID2 || p.productConditionID2 === cond.productConditionID2) &&
      (!cond.heatTreatmentID || p.heatTreatmentID === cond.heatTreatmentID) &&
      (!cond.productSizeMasterID || p.productSizeMasterID === cond.productSizeMasterID)
    );
  }

  loadDetails() {
    this.service.getById(this.id).subscribe({
      next: (res) => {
        if (!res) return;

        this.form.patchValue({
          id: res.id,
          isSizeApplicable: res.isSizeApplicable,
          productSizeMasterID: res.productSizeMasterID,
          productName: res.productName,
          gradePrefix: res.gradePrefix,
          gradeValue: res.gradeValue || '',
          displayTitle: res.displayTitle,
          metalClassificationIDs: res.metalClassificationIDs || []
        });

        if (res.productSizeMasterID) {
          const name = res.productSizeName || res.productSizeMasterName || res.productSize || null;
          this.slectedProductSize = name ? { id: res.productSizeMasterID, name } : res.productSizeMasterID;
        } else {
          this.slectedProductSize = null;
        }

        this.versions.clear();
        this.versionGradeMap = {};
        this.activeGradeTabMap = {};

        if (res.versions && res.versions.length > 0) {
          res.versions.forEach((v: any, vIdx: number) => {
            const verStr = (v.versionNumber != null ? v.versionNumber : '1').toString();
            if (v.standardOrganizationID) {
              this.selectedStdOrgMap[vIdx] = { id: v.standardOrganizationID, name: v.standardOrganizationName || v.standardOrganization };
            }
            const vGroup = this.createVersionGroup(verStr);
            vGroup.patchValue({
              id: v.id,
              versionNumber: verStr,
              year: v.year,
              specificationFilePath: v.specificationFilePath,
              standardOrganizationID: v.standardOrganizationID,
              specStdNo: v.specStdNo,
              partSection: v.partSection,
              title: v.title,
              productCaption: v.productCaption,
              isActiveVersion: v.isActiveVersion
            });

            this.versions.push(vGroup);
            this.versionGradeMap[vIdx] = [];

            if (v.grades && v.grades.length > 0) {
              v.grades.forEach((vg: any) => {
                const entry: VersionGradeEntry = {
                  gradeId: vg.specificationGradeID,
                  gradeName: vg.gradeName,
                  specHeaderId: vg.specificationHeaderID,
                  specHeaderName: vg.specificationHeaderName,
                  sortOrder: vg.sortOrder,
                  chemicalParams: vg.parameters?.chemicalParameters || [],
                  generalParams: vg.parameters?.generalParameters || [],
                  laboratoryTests: vg.parameters?.laboratoryTests || [],
                  testMethods: vg.parameters?.testMethods || [],
                  availablePC1: vg.parameters?.availablePC1 || [],
                  availablePC2: vg.parameters?.availablePC2 || [],
                  availableHeatTreatments: vg.parameters?.availableHeatTreatments || [],
                  availableProductSizes: vg.parameters?.availableProductSizes || [],
                  conditions: (vg.conditions || []).map((c: any) => ({
                    productConditionID1: c.productConditionID1,
                    productConditionName1: c.productConditionName1,
                    productConditionID2: c.productConditionID2,
                    productConditionName2: c.productConditionName2,
                    heatTreatmentID: c.heatTreatmentID,
                    heatTreatmentName: c.heatTreatmentName,
                    productSizeMasterID: c.productSizeMasterID,
                    productSizeName: c.productSizeName,
                    priority: c.priority
                  })),
                  activeParamTab: 'chemical',
                  activeConditionIdx: vg.conditions?.length > 0 ? 0 : null
                };
                this.versionGradeMap[vIdx].push(entry);
              });
            }
            this.activeGradeTabMap[vIdx] = 0;
          });
        } else {
          this.addVersion();
        }

        this.activeVersionIndex = 0;
        if (this.isViewMode) {
          this.form.disable();
        }
      },
      error: (err) => {
        this.toastService.show(err?.error?.message || 'Failed to load details.', 'error');
      }
    });
  }

  onSubmit() {
    this.submitted = true;
    if (this.form.invalid) {
      this.toastService.show('Please fill in all required fields.', 'warning');
      return;
    }

    const payload = this.form.getRawValue();

    // Attach grade & condition lists to version payloads
    payload.versions.forEach((v: any, vIdx: number) => {
      const grades = this.versionGradeMap[vIdx] || [];
      v.grades = grades.map((g, gIdx) => ({
        specificationGradeID: g.gradeId,
        sortOrder: gIdx + 1,
        conditions: (g.conditions || []).map((c, cIdx) => ({
          productConditionID1: c.productConditionID1,
          productConditionID2: c.productConditionID2,
          heatTreatmentID: c.heatTreatmentID,
          productSizeMasterID: c.productSizeMasterID,
          priority: cIdx + 1
        }))
      }));
    });

    if (this.isEditMode) {
      this.service.update(payload).subscribe({
        next: () => {
          this.toastService.show('Product Master updated successfully.', 'success');
          this.router.navigate(['/product-master']);
        },
        error: (err) => {
          this.toastService.show(err?.error?.message || 'Update failed.', 'error');
        }
      });
    } else {
      this.service.create(payload).subscribe({
        next: () => {
          this.toastService.show('Product Master created successfully.', 'success');
          this.router.navigate(['/product-master']);
        },
        error: (err) => {
          this.toastService.show(err?.error?.message || 'Creation failed.', 'error');
        }
      });
    }
  }

  onCancel() {
    this.router.navigate(['/product-master']);
  }
}
