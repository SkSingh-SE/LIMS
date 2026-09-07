import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ProductMasterService } from '../../services/product-master.service';
import { MetalClassificationService } from '../../services/metal-classification.service';
import { ProductSizeMasterService } from '../../services/product-size-master.service';
import { MaterialSpecificationService } from '../../services/material-specification.service';
import { ProductConditionService } from '../../services/product-condition.service';
import { HeatTreatmentService } from '../../services/heat-treatment.service';
import { ToastService } from '../../services/toast.service';
import { SearchableDropdownComponent } from '../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { MultiSelectDropdownComponent } from '../../utility/components/multi-select-dropdown/multi-select-dropdown.component';
import { BreadcrumbComponent } from '../../utility/components/breadcrumb/breadcrumb.component';

export interface ProductConditionItem {
  id: number;
  productConditionID1: number | null;
  productConditionName1?: string;
  productConditionID2: number | null;
  productConditionName2?: string;
  heatTreatmentID: number | null;
  heatTreatmentName?: string;
  productSizeMasterID: number | null;
  productSizeName?: string;
  priority: number;
}

export interface ProductApplicabilityItem {
  id: number;
  specificationGradeID: number;
  gradeName: string;
  specificationHeaderID: number;
  specificationHeaderName: string;
  specificationCode: string;
  activeVersionID: number | null;
  activeVersionName: string;
  requirementCount: number;
  sortOrder: number;
  conditions: ProductConditionItem[];
}

export interface ProductVersionItem {
  id: number;
  versionNumber: string;
  title: string;
  year: string;
  isActiveVersion: boolean;
  applicabilities: ProductApplicabilityItem[];
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
    MultiSelectDropdownComponent,
    BreadcrumbComponent
  ],
  templateUrl: './product-master-form.component.html',
  styleUrls: ['./product-master-form.component.css']
})
export class ProductMasterFormComponent implements OnInit {
  form!: FormGroup;
  id = 0;
  isEditMode = false;
  isViewMode = false;
  submitted = false;

  prefixOptions: string[] = [];
  yearsList: number[] = [];
  newCustomPrefix = '';
  showCustomPrefixModal = false;

  selectedProductSize: any = null;
  selectedGradeToAdd: any = null;

  versions: ProductVersionItem[] = [];
  activeVersionIndex = 0;

  // Conditions Modal State
  showConditionsModal = false;
  activeApplicabilityForConditions: ProductApplicabilityItem | null = null;
  editingConditionsList: ProductConditionItem[] = [];

  // Dropdown Fetchers
  getSizeDropdown = (searchTerm: string, pageNo: number, pageSize: number) => {
    return this.productSizeService.getProductSizeDropdown(searchTerm, pageNo, pageSize);
  };

  getGradeDropdown = (searchTerm: string, pageNo: number, pageSize: number) => {
    return this.specHeaderService.getGradeDropdown(searchTerm, pageNo, pageSize);
  };

  getMetalDropdown = (searchTerm: string, pageNo: number, pageSize: number) => {
    return this.metalService.getMetalClassificationDropdown(searchTerm, pageNo, pageSize);
  };

  getPC1Dropdown = (searchTerm: string, pageNo: number, pageSize: number) => {
    return this.productCondService.getProductConditionDropdown(searchTerm, pageNo, pageSize);
  };

  getPC2Dropdown = (searchTerm: string, pageNo: number, pageSize: number) => {
    return this.productCondService.getProductConditionDropdown(searchTerm, pageNo, pageSize);
  };

  getHeatTreatmentDropdown = (searchTerm: string, pageNo: number, pageSize: number) => {
    return this.heatTreatmentService.getHeatTreatmentDropdown(searchTerm, pageNo, pageSize);
  };

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private service: ProductMasterService,
    private metalService: MetalClassificationService,
    private productSizeService: ProductSizeMasterService,
    private specHeaderService: MaterialSpecificationService,
    private productCondService: ProductConditionService,
    private heatTreatmentService: HeatTreatmentService,
    private toastService: ToastService
  ) {}

  get formTitle(): string {
    if (this.isViewMode) return 'Product Master Details (Universal Applicability)';
    if (this.isEditMode || this.id > 0) return 'Edit Product Master';
    return 'Create Product Master';
  }

  get currentVersion(): ProductVersionItem | null {
    if (this.activeVersionIndex >= 0 && this.activeVersionIndex < this.versions.length) {
      return this.versions[this.activeVersionIndex];
    }
    return null;
  }

  ngOnInit(): void {
    this.generateYearsList();
    this.initForm();
    this.loadPrefixOptions();
    this.initModeFromRoute();

    this.route.params.subscribe((params) => {
      if (params['id']) {
        this.id = +params['id'];
        this.initModeFromRoute();
        this.loadDetails();
      } else {
        this.isEditMode = false;
        this.isViewMode = false;
        this.initializeDefaultVersion();
      }
    });

    this.setupTitleAutoGeneration();
  }

  private initModeFromRoute(): void {
    const rawId = this.route.snapshot.params['id'] || this.route.snapshot.paramMap.get('id');
    if (rawId) {
      this.id = +rawId;
    }
    const currentUrl = this.router.url || '';
    const urlSegments = this.route.snapshot.url ? this.route.snapshot.url.map(s => s.path) : [];

    const isDetails = currentUrl.includes('/details') || urlSegments.includes('details') || (this.route.snapshot.routeConfig?.path?.includes('details') ?? false);
    const isEdit = currentUrl.includes('/edit') || urlSegments.includes('edit') || (this.route.snapshot.routeConfig?.path?.includes('edit') ?? false) || this.id > 0;

    if (isDetails) {
      this.isViewMode = true;
      this.isEditMode = false;
      this.form?.disable();
    } else if (isEdit) {
      this.isEditMode = true;
      this.isViewMode = false;
    } else {
      this.isEditMode = false;
      this.isViewMode = false;
    }
  }

  generateYearsList(): void {
    const currentYear = new Date().getFullYear();
    this.yearsList = [];
    for (let y = currentYear + 5; y >= 1990; y--) {
      this.yearsList.push(y);
    }
  }

  initForm(): void {
    this.form = this.fb.group({
      id: [0],
      productName: ['', [Validators.required]],
      displayTitle: [''],
      isSizeApplicable: [true],
      productSizeMasterID: [null],
      gradePrefix: ['Grade'],
      gradeValue: [''],
      metalClassificationIDs: [[]],
      isActive: [true]
    });

    this.form.get('isSizeApplicable')?.valueChanges.subscribe((applicable) => {
      const sizeControl = this.form.get('productSizeMasterID');
      if (!applicable) {
        this.selectedProductSize = null;
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

  initializeDefaultVersion(): void {
    this.versions = [{
      id: 0,
      versionNumber: '1',
      title: 'Standard Production',
      year: new Date().getFullYear().toString(),
      isActiveVersion: true,
      applicabilities: []
    }];
    this.activeVersionIndex = 0;
  }

  onNoSizeChange(checked: boolean): void {
    this.form.get('isSizeApplicable')?.setValue(!checked);
  }

  onProductSizeSelected(item: any): void {
    const id = item ? item.id : null;
    this.selectedProductSize = item || null;
    this.form.get('productSizeMasterID')?.setValue(id);
    this.form.get('productSizeMasterID')?.markAsTouched();
    this.updateAutoDisplayTitle();
  }

  loadPrefixOptions(): void {
    this.service.getPrefixOptions().subscribe({
      next: (opts) => {
        this.prefixOptions = opts || ['Grade', 'Class', 'Designation', 'Type', 'Series'];
        const currentVal = this.form.get('gradePrefix')?.value;
        if (!currentVal && this.prefixOptions.length > 0) {
          this.form.get('gradePrefix')?.setValue(this.prefixOptions[0]);
        }
      }
    });
  }

  onMetalItemsSelected(selectedItems: any[]): void {
    const ids = (selectedItems || []).map(item => item.id);
    this.form.get('metalClassificationIDs')?.setValue(ids);
  }

  setupTitleAutoGeneration(): void {
    this.form.get('productName')?.valueChanges.subscribe(() => this.updateAutoDisplayTitle());
    this.form.get('gradePrefix')?.valueChanges.subscribe(() => this.updateAutoDisplayTitle());
    this.form.get('gradeValue')?.valueChanges.subscribe(() => this.updateAutoDisplayTitle());
    this.form.get('productSizeMasterID')?.valueChanges.subscribe((val) => {
      if (!val) this.selectedProductSize = null;
      this.updateAutoDisplayTitle();
    });
  }

  updateAutoDisplayTitle(): void {
    const isApplicable = this.form.get('isSizeApplicable')?.value;
    const productSize = (isApplicable && this.selectedProductSize) ? (this.selectedProductSize.name || this.selectedProductSize.text || this.selectedProductSize.displayName || '') : '';
    const pName = this.form.get('productName')?.value || '';
    const prefix = this.form.get('gradePrefix')?.value || '';
    const gradeVal = this.form.get('gradeValue')?.value || '';
    const titleControl = this.form.get('displayTitle');

    if (!titleControl?.dirty) {
      const gradePart = prefix || gradeVal ? `${prefix} ${gradeVal}`.trim() : '';
      const generated = [productSize, pName, gradePart].filter(s => s && s.trim()).join(' ').replace(/\s+/g, ' ').trim();
      titleControl?.setValue(generated, { emitEvent: false });
    }
  }

  openCustomPrefixModal(): void {
    this.newCustomPrefix = '';
    this.showCustomPrefixModal = true;
  }

  saveCustomPrefix(): void {
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

  // --- VERSION MANAGEMENT ---
  addVersion(): void {
    const nextVerNo = (this.versions.length + 1).toString();
    const newVer: ProductVersionItem = {
      id: 0,
      versionNumber: nextVerNo,
      title: `Version ${nextVerNo}`,
      year: new Date().getFullYear().toString(),
      isActiveVersion: this.versions.length === 0,
      applicabilities: []
    };
    this.versions.push(newVer);
    this.activeVersionIndex = this.versions.length - 1;
    this.toastService.show(`Product Version ${nextVerNo} added.`, 'info');
  }

  removeVersion(index: number, event?: Event): void {
    if (event) event.stopPropagation();
    if (this.versions.length <= 1) {
      this.toastService.show('At least one product version is required.', 'warning');
      return;
    }
    const verToRemove = this.versions[index];
    if (confirm(`Remove Product Version V${verToRemove.versionNumber}?`)) {
      const wasActive = verToRemove.isActiveVersion;
      this.versions.splice(index, 1);
      if (wasActive && this.versions.length > 0) {
        this.versions[0].isActiveVersion = true;
      }
      if (this.activeVersionIndex >= this.versions.length) {
        this.activeVersionIndex = this.versions.length - 1;
      }
    }
  }

  selectVersion(index: number): void {
    this.activeVersionIndex = index;
  }

  toggleActiveVersion(index: number, event: Event): void {
    event.stopPropagation();
    this.versions.forEach((v, idx) => {
      v.isActiveVersion = idx === index;
    });
  }

  // --- APPLICABILITY WORKFLOW ---
  onGradeSelected(item: any): void {
    this.selectedGradeToAdd = item;
  }

  addApplicability(): void {
    if (!this.selectedGradeToAdd || !this.selectedGradeToAdd.id) {
      this.toastService.show('Please search and select a Specification Grade first.', 'warning');
      return;
    }

    const curVer = this.currentVersion;
    if (!curVer) return;

    const gradeId = this.selectedGradeToAdd.id;
    if (curVer.applicabilities.some(a => a.specificationGradeID === gradeId)) {
      this.toastService.show(`Grade '${this.selectedGradeToAdd.name}' is already linked to Version ${curVer.versionNumber}.`, 'warning');
      return;
    }

    this.service.getGradeApplicability(gradeId).subscribe({
      next: (info) => {
        if (!info) return;

        const newApp: ProductApplicabilityItem = {
          id: 0,
          specificationGradeID: info.specificationGradeID,
          gradeName: info.gradeName,
          specificationHeaderID: info.specificationHeaderID,
          specificationHeaderName: info.specificationHeaderName,
          specificationCode: info.specificationCode,
          activeVersionID: info.activeVersionID,
          activeVersionName: info.activeVersionName,
          requirementCount: info.requirementCount,
          sortOrder: curVer.applicabilities.length + 1,
          conditions: []
        };

        curVer.applicabilities.push(newApp);
        this.selectedGradeToAdd = null;
        this.toastService.show(`Grade '${info.gradeName}' linked to Version ${curVer.versionNumber}.`, 'success');
      },
      error: () => {
        this.toastService.show('Failed to fetch Specification Grade applicability details.', 'error');
      }
    });
  }

  removeApplicability(gIdx: number): void {
    const curVer = this.currentVersion;
    if (!curVer) return;

    const app = curVer.applicabilities[gIdx];
    if (confirm(`Remove applicability for grade '${app.gradeName}' from Version ${curVer.versionNumber}?`)) {
      curVer.applicabilities.splice(gIdx, 1);
    }
  }

  // Universal Navigation Hub Deep Links
  openSpecification(specId: number): void {
    if (specId) {
      this.router.navigate(['/specification'], { queryParams: { specId } });
    }
  }

  openSpecificationVersion(specId: number): void {
    if (specId) {
      this.router.navigate(['/specification-version'], { queryParams: { specId } });
    }
  }

  openRequirements(specId: number, versionId: number | null, gradeId: number): void {
    if (specId && gradeId) {
      this.router.navigate(['/specification-requirement'], {
        queryParams: {
          specId,
          versionId: versionId || undefined,
          gradeId
        }
      });
    }
  }

  // --- CONDITIONS MODAL ---
  openConditionsModal(app: ProductApplicabilityItem): void {
    this.activeApplicabilityForConditions = app;
    // Deep clone conditions for editing
    this.editingConditionsList = (app.conditions || []).map(c => ({
      id: c.id,
      productConditionID1: c.productConditionID1,
      productConditionName1: c.productConditionName1,
      productConditionID2: c.productConditionID2,
      productConditionName2: c.productConditionName2,
      heatTreatmentID: c.heatTreatmentID,
      heatTreatmentName: c.heatTreatmentName,
      productSizeMasterID: c.productSizeMasterID,
      productSizeName: c.productSizeName,
      priority: c.priority
    }));
    this.showConditionsModal = true;
  }

  addConditionRow(): void {
    this.editingConditionsList.push({
      id: 0,
      productConditionID1: null,
      productConditionID2: null,
      heatTreatmentID: null,
      productSizeMasterID: null,
      priority: this.editingConditionsList.length + 1
    });
  }

  removeConditionRow(cIdx: number): void {
    this.editingConditionsList.splice(cIdx, 1);
  }

  saveConditionsModal(): void {
    if (this.activeApplicabilityForConditions) {
      this.activeApplicabilityForConditions.conditions = [...this.editingConditionsList];
    }
    this.showConditionsModal = false;
    this.activeApplicabilityForConditions = null;
    this.toastService.show('Conditions updated.', 'info');
  }

  closeConditionsModal(): void {
    this.showConditionsModal = false;
    this.activeApplicabilityForConditions = null;
  }

  // --- DETAILS LOADING ---
  loadDetails(): void {
    this.service.getById(this.id).subscribe({
      next: (res) => {
        if (!res) return;

        this.form.patchValue({
          id: res.id,
          productName: res.productName,
          displayTitle: res.displayTitle,
          isSizeApplicable: res.isSizeApplicable,
          productSizeMasterID: res.productSizeMasterID,
          gradePrefix: res.gradePrefix,
          gradeValue: res.gradeValue || '',
          metalClassificationIDs: res.metalClassificationIDs || [],
          isActive: res.isActive
        });

        if (res.productSizeMasterID) {
          const name = res.productSizeName || res.productSizeMasterName || res.productSize || null;
          this.selectedProductSize = name ? { id: res.productSizeMasterID, name } : res.productSizeMasterID;
        } else {
          this.selectedProductSize = null;
        }

        if (res.versions && res.versions.length > 0) {
          this.versions = res.versions.map((v: any) => ({
            id: v.id,
            versionNumber: (v.versionNumber != null ? v.versionNumber : '1').toString(),
            title: v.title || `Version ${v.versionNumber || '1'}`,
            year: v.year || new Date().getFullYear().toString(),
            isActiveVersion: v.isActiveVersion,
            applicabilities: (v.grades || []).map((g: any) => ({
              id: g.id,
              specificationGradeID: g.specificationGradeID,
              gradeName: g.gradeName,
              specificationHeaderID: g.specificationHeaderID,
              specificationHeaderName: g.specificationHeaderName,
              specificationCode: g.specificationCode || '',
              activeVersionID: g.activeVersionID,
              activeVersionName: g.activeVersionName || 'Active',
              requirementCount: g.requirementCount || 0,
              sortOrder: g.sortOrder,
              conditions: (g.conditions || []).map((c: any) => ({
                id: c.id,
                productConditionID1: c.productConditionID1,
                productConditionName1: c.productConditionName1,
                productConditionID2: c.productConditionID2,
                productConditionName2: c.productConditionName2,
                heatTreatmentID: c.heatTreatmentID,
                heatTreatmentName: c.heatTreatmentName,
                productSizeMasterID: c.productSizeMasterID,
                productSizeName: c.productSizeName,
                priority: c.priority
              }))
            }))
          }));
        } else {
          this.initializeDefaultVersion();
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

  // --- SUBMIT ---
  onSubmit(): void {
    this.submitted = true;
    if (this.form.invalid) {
      this.toastService.show('Please fill in all required fields.', 'warning');
      return;
    }

    if (this.versions.length === 0) {
      this.toastService.show('At least one Product Version is required.', 'warning');
      return;
    }

    const formVal = this.form.getRawValue();
    const payload = {
      id: this.id,
      productName: formVal.productName?.trim(),
      displayTitle: formVal.displayTitle?.trim(),
      isSizeApplicable: formVal.isSizeApplicable,
      productSizeMasterID: formVal.isSizeApplicable ? formVal.productSizeMasterID : null,
      gradePrefix: formVal.gradePrefix?.trim(),
      gradeValue: formVal.gradeValue?.trim(),
      metalClassificationIDs: formVal.metalClassificationIDs || [],
      versions: this.versions.map(v => ({
        id: v.id,
        versionNumber: v.versionNumber,
        year: v.year,
        title: v.title,
        isActiveVersion: v.isActiveVersion,
        grades: v.applicabilities.map((a, aIdx) => ({
          id: a.id,
          specificationGradeID: a.specificationGradeID,
          sortOrder: aIdx + 1,
          conditions: (a.conditions || []).map((c, cIdx) => ({
            id: c.id,
            productConditionID1: c.productConditionID1,
            productConditionID2: c.productConditionID2,
            heatTreatmentID: c.heatTreatmentID,
            productSizeMasterID: c.productSizeMasterID,
            priority: cIdx + 1
          }))
        }))
      }))
    };

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

  onCancel(): void {
    this.router.navigate(['/product-master']);
  }
}
// Refreshed applicability actions styling v3

