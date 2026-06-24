import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ToastService } from '../../../services/toast.service';
import { SearchableDropdownComponent } from '../../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { MultiSelectDropdownComponent } from '../../../utility/components/multi-select-dropdown/multi-select-dropdown.component';
import { Observable } from 'rxjs';
import { StandardOrgnizationService } from '../../../services/standard-orgnization.service';
import { MetalClassificationService } from '../../../services/metal-classification.service';
import { ParameterService } from '../../../services/parameter.service';
import { ParameterUnitService } from '../../../services/parameter-unit.service';
import { TestMethodSpecificationService } from '../../../services/test-method-specification.service';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AbstractControl, FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { environment } from '../../../../environments/environment';
import { VersionStatus } from '../../../utility/status_flow/enums/version-status.enum';
import { YearHelper } from '../../../utility/helper/year.helper';

@Component({
  selector: 'app-test-method-specification',
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule, SearchableDropdownComponent, MultiSelectDropdownComponent],
  templateUrl: './test-method-specification.component.html',
  styleUrl: './test-method-specification.component.css',
})
export class TestMethodSpecificationComponent implements OnInit {
  testSpecificationForm!: FormGroup;
  isViewMode: boolean = false;
  isEditMode: boolean = false;
  yearOptions: number[] = YearHelper.standardYears();
  selectedStandardOrganization: any = {};
  testMethodSpecificationID: number = 0;
  VersionStatus = VersionStatus;
  // Pre-selected metal classification IDs for the multi-select ([selectedValues] expects IDs, not objects).
  selectedMetalClassificationIds: any[] = [];
  // Per-parameter-row unit options (primary unit first, then its equivalents) fetched on parameter selection.
  equivalentUnitsByRow = new WeakMap<AbstractControl, any[]>();

  // Accordion open/close state (mirrors material-specification form pattern)
  openSections: { [key: string]: boolean } = { header: true, metal: true, versions: true };

  toggleSection(section: string) {
    this.openSections[section] = !this.openSections[section];
  }

  constructor(
    private fb: FormBuilder,
    private toastService: ToastService,
    private standardOrganizationService: StandardOrgnizationService,
    private metalClassificationService: MetalClassificationService,
    private parameterService: ParameterService,
    private parameterUnitService: ParameterUnitService,
    private testMethodService: TestMethodSpecificationService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.testMethodSpecificationID = Number(params.get('id'));
    });
    const state = history.state as { mode?: string };

    if (state) {
      if (state.mode === 'view') {
        this.isViewMode = true;
      }
      if (state.mode === 'edit') {
        this.isEditMode = true;
      }
    }
    this.initForm();
    if (this.testMethodSpecificationID > 0) {
      this.loadTestMethodSpecification(this.testMethodSpecificationID);
    } else {
      this.addVersion(true);
      this.onActivateVersion(0);
      // First version is the default by default.
      this.setDefaultVersion(0);
    }
  }

  initForm() {
    this.testSpecificationForm = this.fb.group({
      id: [0],
      isDisabled: [false],
      standardOrganizationID: ['', Validators.required],
      testMethodStandard: ['', Validators.required],
      name: ['', Validators.required],
      part: [''],
      displayTitle: [{ value: '', disabled: true }],
      metalClassificationIDs: [[]],
      versions: this.fb.array([]),
    });
  }
  get versions(): FormArray {
    return this.testSpecificationForm.get('versions') as FormArray;
  }

  // ── Metal Classifications (multi-select) ──────────────────────────────
  getMetalClassification = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.metalClassificationService.getMetalClassificationDropdown(term, page, pageSize);
  };

  onMetalClassificationsSelected(items: any[]) {
    const ids = (items || []).map((i) => i.id);
    this.selectedMetalClassificationIds = ids;
    this.testSpecificationForm.get('metalClassificationIDs')?.setValue(ids);
    this.testSpecificationForm.markAsDirty();
  }

  // ── Parameters (version-level FormArray) ──────────────────────────────
  getParameter = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.parameterService.getParameterDropdown(term, page, pageSize);
  };

  /** Parameters FormArray for a given version index. */
  versionParameters(versionIndex: number): FormArray {
    return this.versions.at(versionIndex).get('parameters') as FormArray;
  }

  createParameterGroup(): FormGroup {
    return this.fb.group({
      id: [0],
      parameterID: [null, Validators.required],
      parameterName: [''],
      // Base unit (auto-set from the parameter's default unit; used to load equivalents).
      parameterUnitID: [null],
      // Chosen unit: null = base/primary unit, else an equivalent unit ID.
      parameterUnitEquivalentID: [null],
      comment: [''],
    });
  }

  addParameter(versionIndex: number): void {
    this.versionParameters(versionIndex).push(this.createParameterGroup());
    this.testSpecificationForm.markAsDirty();
  }

  removeParameter(versionIndex: number, paramIndex: number): void {
    this.versionParameters(versionIndex).removeAt(paramIndex);
    this.testSpecificationForm.markAsDirty();
  }

  onParameterSelected(item: any, versionIndex: number, paramIndex: number) {
    const row = this.versionParameters(versionIndex).at(paramIndex) as FormGroup;
    if (!item) {
      row.patchValue({ parameterID: null, parameterName: '', parameterUnitID: null, parameterUnitEquivalentID: null });
      this.equivalentUnitsByRow.set(row, []);
      return;
    }
    // Duplicate guard within the same version.
    const isDuplicate = this.versionParameters(versionIndex).controls.some(
      (ctrl, i) => i !== paramIndex && ctrl.get('parameterID')?.value === item.id,
    );
    if (isDuplicate) {
      this.toastService.show(`"${item.name || 'Parameter'}" is already added in this version.`, 'warning');
      row.patchValue({ parameterID: -1, parameterName: '', parameterUnitID: null, parameterUnitEquivalentID: null });
      setTimeout(() => row.patchValue({ parameterID: null }), 0);
      this.equivalentUnitsByRow.set(row, []);
      return;
    }
    const additional = item?.additionalValues || {};
    const rawUnit = additional.UnitID ?? additional.unitID ?? null;
    const unitID = rawUnit != null && rawUnit !== '' ? Number(rawUnit) : null;
    row.patchValue({ parameterID: item.id, parameterName: item.name });
    // Fetch equivalent units for this parameter's default unit; primary unit auto-selected (equivalent = null).
    this.loadEquivalentUnits(row, unitID, true);
  }

  /** Fetches equivalent-unit options for a parameter row and (optionally) sets the base unit. */
  loadEquivalentUnits(group: AbstractControl, unitId: number | null, setSelected: boolean): void {
    if (!unitId) {
      this.equivalentUnitsByRow.set(group, []);
      if (setSelected) {
        group.get('parameterUnitID')?.setValue(null);
        group.get('parameterUnitEquivalentID')?.setValue(null);
      }
      return;
    }
    if (setSelected) {
      group.get('parameterUnitID')?.setValue(Number(unitId));
      group.get('parameterUnitEquivalentID')?.setValue(null);
    }
    this.parameterUnitService.getEquivalentUnits(unitId).subscribe({
      next: (units: any[]) => this.equivalentUnitsByRow.set(group, units || []),
      error: () => this.equivalentUnitsByRow.set(group, []),
    });
  }

  getRowEquivalentUnits(group: AbstractControl): any[] {
    return this.equivalentUnitsByRow.get(group) || [];
  }

  // ── Versions ──────────────────────────────────────────────────────────
  createVersionGroup(flag: boolean = false): FormGroup {
    return this.fb.group({
      id: [0],
      testMethodSpecificationID: [0],
      status: [VersionStatus.Draft],
      version: ['', Validators.required],
      year: [null],
      effectiveDate: [new Date().toISOString().split('T')[0]],
      supersededDate: [null],
      reviewDate: [null],
      changeReason: [''],
      standardFile: ['', Validators.required],
      standardFilePath: [''],
      uploadReferenceID: [null],
      file: [null],
      isVersionAdded: [flag],
      isDefault: [false],
      parameters: this.fb.array([]),
    });
  }

  addVersion(flag: boolean = false): void {
    const newGroup = this.createVersionGroup(flag);
    // Clone parameters from the current default version as a starting point.
    this.cloneDefaultParametersInto(newGroup);
    if (flag) {
      this.versions.insert(0, newGroup);
    } else {
      this.versions.push(newGroup);
    }
  }

  /** Copies the default (or first) version's parameter rows into a freshly-created version group. */
  private cloneDefaultParametersInto(targetVersion: FormGroup): void {
    const source =
      this.versions.controls.find((g) => g.get('isDefault')?.value) ||
      this.versions.controls.find((g) => g.get('status')?.value === VersionStatus.Active) ||
      this.versions.at(0);
    if (!source) return;
    const sourceParams = source.get('parameters') as FormArray;
    const targetParams = targetVersion.get('parameters') as FormArray;
    sourceParams?.controls.forEach((sp) => {
      const grp = this.createParameterGroup();
      const unitId = sp.get('parameterUnitID')?.value;
      grp.patchValue({
        id: 0, // new row in the new version
        parameterID: sp.get('parameterID')?.value,
        parameterName: sp.get('parameterName')?.value,
        parameterUnitID: unitId,
        parameterUnitEquivalentID: sp.get('parameterUnitEquivalentID')?.value ?? null,
        comment: sp.get('comment')?.value ?? '',
      });
      // Carry over the source row's equivalent options if present.
      const srcUnits = this.equivalentUnitsByRow.get(sp);
      if (srcUnits && srcUnits.length) this.equivalentUnitsByRow.set(grp, srcUnits);
      else if (unitId) this.loadEquivalentUnits(grp, Number(unitId), false);
      targetParams.push(grp);
    });
  }

  removeVersion(index: number): void {
    if (this.versions.length > 1) {
      const version = this.versions.at(index);
      // Only allow removing Draft versions that haven't been saved
      if (version.get('status')?.value === VersionStatus.Superseded || version.get('status')?.value === VersionStatus.Withdrawn) {
        this.toastService.show('Cannot remove superseded or withdrawn versions.', 'warning');
        return;
      }
      const wasDefault = version.get('isDefault')?.value;
      this.versions.removeAt(index);
      // If the removed version was the default, fall back to the Active version (else the first).
      if (wasDefault && this.versions.length > 0) {
        const activeIdx = this.versions.controls.findIndex((g) => g.get('status')?.value === VersionStatus.Active);
        this.setDefaultVersion(activeIdx >= 0 ? activeIdx : 0);
      }
    }
  }

  /** Marks the version at `index` as the default; clears the flag on all others. */
  setDefaultVersion(index: number): void {
    this.versions.controls.forEach((group, idx) => {
      group.get('isDefault')?.setValue(idx === index, { emitEvent: false });
    });
    this.testSpecificationForm.markAsDirty();
  }

  isDefaultVersion(index: number): boolean {
    return !!this.versions.at(index).get('isDefault')?.value;
  }

  showaddVersionButton(): boolean {
    let isVersionAdded = false;
    this.versions.controls.forEach((group: any) => {
      if (group.get('isVersionAdded')?.value) {
        isVersionAdded = true;
      }
    });
    return !isVersionAdded;
  }

  loadTestMethodSpecification(id: number) {
    this.testMethodService.getTestMethodSpecificationById(id).subscribe({
      next: (response) => {
        if (response) {
          this.testSpecificationForm.patchValue({
            id: response.id,
            standardOrganizationID: response.standardOrganizationID,
            testMethodStandard: response.testMethodStandard,
            name: response.name,
            part: response.part || '',
            displayTitle: response.displayTitle || '',
            isDisabled: response.isDisabled,
          });
          // Fetch organization name so Display Title can rebuild correctly when header fields are edited.
          if (response.standardOrganizationID) {
            this.standardOrganizationService.getStandardOrganizationById(response.standardOrganizationID).subscribe({
              next: (org) => {
                this.selectedStandardOrganization = { id: response.standardOrganizationID, name: org?.name || '' };
              },
            });
          }
          // Bind metal classifications (multi-select expects an array of IDs; names are fetched by the component)
          const mcLinks = response.metalClassifications || [];
          this.selectedMetalClassificationIds = mcLinks.map((m: any) => m.metalClassificationID);
          this.testSpecificationForm.get('metalClassificationIDs')?.setValue([...this.selectedMetalClassificationIds]);

          this.versions.clear();

          // Versions come pre-sorted from API (Active first)
          response.versions.forEach((version: any) => {
            const versionGroup = this.createVersionGroup();
            versionGroup.patchValue({
              id: version.id,
              testMethodSpecificationID: version.testMethodSpecificationID,
              status: version.status,
              version: version.version,
              year: version.year != null ? +version.year : null,
              effectiveDate: version.effectiveDate ? version.effectiveDate.split('T')[0] : null,
              supersededDate: version.supersededDate ? version.supersededDate.split('T')[0] : null,
              reviewDate: version.reviewDate ? version.reviewDate.split('T')[0] : null,
              changeReason: version.changeReason,
              standardFile: version.standardFile,
              standardFilePath: version.standardFilePath,
              uploadReferenceID: version.uploadReferenceID,
              isDefault: !!version.isDefault,
            });

            // Bind this version's parameters
            const paramsArray = versionGroup.get('parameters') as FormArray;
            (version.parameters || [])
              .slice()
              .sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
              .forEach((p: any) => {
                const grp = this.createParameterGroup();
                grp.patchValue({
                  id: p.id,
                  parameterID: p.parameterID,
                  parameterName: p.parameter?.name,
                  parameterUnitID: p.parameterUnitID ?? null,
                  parameterUnitEquivalentID: p.parameterUnitEquivalentID ?? null,
                  comment: p.comment,
                });
                if (p.parameterUnitID) this.loadEquivalentUnits(grp, Number(p.parameterUnitID), false);
                paramsArray.push(grp);
              });

            this.versions.push(versionGroup);
          });

          // Default-version sync on load:
          // - prefer the saved default IF it's a non-readonly (Active/Draft/Withdrawn) version,
          // - otherwise fall back to the Active version, else the first.
          if (this.versions.length > 0) {
            const savedDefaultIdx = this.versions.controls.findIndex(
              (g) => g.get('isDefault')?.value && g.get('status')?.value !== VersionStatus.Superseded,
            );
            if (savedDefaultIdx < 0) {
              const activeIdx = this.versions.controls.findIndex((g) => g.get('status')?.value === VersionStatus.Active);
              this.setDefaultVersion(activeIdx >= 0 ? activeIdx : 0);
            }
          }

          // Disable read-only versions (Superseded)
          this.applyVersionDisabledState();

          if (this.isViewMode) {
            this.testSpecificationForm.disable();
          }
          if (this.testSpecificationForm.get('isDisabled')?.value) {
            this.testSpecificationForm.disable();
          } else {
            this.testSpecificationForm.enable();
            this.testSpecificationForm.get('isDisabled')?.enable();
            // Re-apply version disabled state after enabling form
            this.applyVersionDisabledState();
          }
        }
      },
      error: (error) => {
        this.toastService.show(error.message, 'error');
      },
    });
  }

  getStandardOrganization = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.standardOrganizationService.getStandardOrganizationDropdown(term, page, pageSize);
  };
  onOrganizationSelected(item: any) {
    this.testSpecificationForm.patchValue({ standardOrganizationID: item.id });
    this.selectedStandardOrganization = item;
    this.buildDisplayTitle();
  }

  /** Active version ka version-number return karta hai (display title ke liye). */
  private getActiveVersionLabel(): string {
    const active = this.versions.controls.find((g) => g.get('status')?.value === VersionStatus.Active);
    const fallback = this.versions.controls.find((g) => g.get('status')?.value === VersionStatus.Draft);
    return (active?.get('version')?.value || fallback?.get('version')?.value || '').toString().trim();
  }

  /** Display Title = "{StdOrg} {TestMethodStandard} {Part} : {ActiveVersion}" — year nahi, version dikhata hai. */
  buildDisplayTitle(): void {
    const org = (this.selectedStandardOrganization?.name || '').toString().trim();
    const std = (this.testSpecificationForm.get('testMethodStandard')?.value || '').toString().trim();
    const part = (this.testSpecificationForm.get('part')?.value || '').toString().trim();
    const version = this.getActiveVersionLabel();

    let left = [org, std, part].filter((x) => x).join(' ');
    const display = version ? (left ? `${left} : ${version}` : version) : left;
    this.testSpecificationForm.get('displayTitle')?.setValue(display, { emitEvent: false });
  }

  onFileChange(event: any, index: number) {
    const file = event.target.files[0];
    if (file) {
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        this.toastService.show(`File size  should be less than 5 MB.`, 'warning');
        event.target.value = '';
        return;
      }
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/jpeg',
        'image/png',
      ];

      if (!allowedTypes.includes(file.type)) {
        this.toastService.show('Invalid file type', 'warning');
        event.target.value = '';
        return;
      }
      this.versions.at(index).patchValue({ standardFile: file.name, file: file });
    }
  }

  openFileInNewTab(filePath: string): void {
    if (filePath) {
      const baseUrl = environment.baseUrl;
      const fullUrl = baseUrl + filePath;
      window.open(fullUrl, '_blank');
    }
  }
  removeFile(index: number): void {
    this.versions.at(index).patchValue({ standardFile: '', standardFilePath: '', file: null, uploadReferenceID: null });
  }

  getCaption(year: any): string {
    const org = this.selectedStandardOrganization?.name;
    const std = this.testSpecificationForm.get('testMethodStandard')?.value;
    return org && std && year ? `${org} ${std} - ${year}` : '';
  }

  onDisable() {
    if (confirm('Are you sure you want to disable this test method specification?')) {
      this.testMethodService.enable_disableTestMethodSpecification(this.testMethodSpecificationID).subscribe({
        next: (response) => {
          this.testMethodSpecificationID = response.id;
          this.toastService.show(response.message, 'success');
          this.router.navigate(['/test-specification']);
        },
        error: (error) => {
          console.error(error);
          this.toastService.show(error.message, 'error');
        },
      });
    } else {
      this.testSpecificationForm.get('isDisabled')?.setValue(false);
    }
  }

  applyVersionDisabledState() {
    this.versions.controls.forEach((group, idx) => {
      const status = group.get('status')?.value;
      if (status === VersionStatus.Superseded) {
        group.disable({ emitEvent: false });
        // Keep status readable for UI badges
        group.get('status')?.enable({ emitEvent: false });
      } else {
        group.enable({ emitEvent: false });
      }
    });
  }

  onActivateVersion(index: number) {
    const versions = this.testSpecificationForm.get('versions') as FormArray;
    versions.controls.forEach((group, idx) => {
      if (idx !== index) {
        const currentStatus = group.get('status')?.value;
        if (currentStatus === VersionStatus.Active) {
          group.get('status')?.setValue(VersionStatus.Superseded, { emitEvent: false });
          group.get('supersededDate')?.setValue(new Date().toISOString().split('T')[0], { emitEvent: false });
        }
      } else {
        group.get('status')?.setValue(VersionStatus.Active, { emitEvent: false });
        group.get('effectiveDate')?.setValue(new Date().toISOString().split('T')[0], { emitEvent: false });
      }
    });
    // Active version becomes the default (keeps Active/Default in sync).
    this.setDefaultVersion(index);
    this.applyVersionDisabledState();
    this.buildDisplayTitle();
  }

  onWithdrawVersion(index: number) {
    const version = this.versions.at(index);
    const reason = prompt('Reason for withdrawal:');
    if (!reason) return;

    // If this is an existing version (has ID), call the API.
    const versionId = version.get('id')?.value;
    if (versionId && this.testMethodSpecificationID) {
      this.testMethodService.withdrawVersion(this.testMethodSpecificationID, versionId, reason).subscribe({
        next: () => {
          version.get('status')?.setValue(VersionStatus.Withdrawn, { emitEvent: false });
          version.get('changeReason')?.setValue(reason, { emitEvent: false });
          this.applyVersionDisabledState();
          this.toastService.show('Version withdrawn successfully.', 'success');
        },
        error: (err) => this.toastService.show(err?.error?.message || 'Failed to withdraw version.', 'error'),
      });
    } else {
      // New/unsaved version — just update locally.
      version.get('status')?.setValue(VersionStatus.Withdrawn, { emitEvent: false });
      version.get('changeReason')?.setValue(reason, { emitEvent: false });
      this.applyVersionDisabledState();
    }
  }

  isVersionReadOnly(index: number): boolean {
    const status = this.versions.at(index).get('status')?.value;
    return status === VersionStatus.Superseded;
  }

  getStatusLabel(index: number): string {
    const status = this.versions.at(index).get('status')?.value;
    switch (status) {
      case VersionStatus.Active:
        return 'ACTIVE';
      case VersionStatus.Draft:
        return 'DRAFT';
      case VersionStatus.Superseded:
        return 'SUPERSEDED';
      case VersionStatus.Withdrawn:
        return 'WITHDRAWN';
      default:
        return '';
    }
  }

  getStatusBadgeClass(index: number): string {
    const status = this.versions.at(index).get('status')?.value;
    switch (status) {
      case VersionStatus.Active:
        return 'bg-success';
      case VersionStatus.Draft:
        return 'bg-warning text-dark';
      case VersionStatus.Superseded:
        return 'bg-secondary';
      case VersionStatus.Withdrawn:
        return 'bg-danger';
      default:
        return 'bg-light';
    }
  }

  submit() {
    if (this.testSpecificationForm.valid) {
      const raw = this.testSpecificationForm.getRawValue();
      const formData = new FormData();
      formData.append('id', raw.id.toString());
      formData.append('standardOrganizationID', raw.standardOrganizationID);
      formData.append('testMethodStandard', raw.testMethodStandard);
      formData.append('name', raw.name);
      formData.append('part', raw.part || '');
      formData.append('displayTitle', raw.displayTitle || '');
      formData.append('isDisabled', raw.isDisabled ? 'true' : 'false');
      formData.append('metalClassificationIDs', JSON.stringify(raw.metalClassificationIDs || []));

      const versionsArray: any[] = [];

      raw.versions.forEach((version: any) => {
        versionsArray.push({
          id: version.id,
          testMethodSpecificationID: version.testMethodSpecificationID,
          status: version.status,
          version: version.version,
          year: version.year,
          effectiveDate: version.effectiveDate,
          supersededDate: version.supersededDate,
          reviewDate: version.reviewDate,
          changeReason: version.changeReason,
          standardFile: version.standardFile,
          standardFilePath: version.standardFilePath,
          uploadReferenceID: version.uploadReferenceID || null,
          isDefault: !!version.isDefault,
          parameters: (version.parameters || [])
            .filter((p: any) => p.parameterID && p.parameterID > 0)
            .map((p: any, idx: number) => ({
              id: p.id || 0,
              parameterID: p.parameterID,
              parameterUnitID: p.parameterUnitID || null,
              parameterUnitEquivalentID: p.parameterUnitEquivalentID || null,
              comment: p.comment || '',
              sortOrder: idx,
            })),
        });

        if (version.file) {
          formData.append('files', version.file, version.standardFile);
        }
      });
      formData.append('versions', JSON.stringify(versionsArray));

      if (this.testMethodSpecificationID > 0) {
        this.testMethodService.updateTestMethodSpecification(formData).subscribe({
          next: (response) => {
            this.toastService.show(response.message, 'success');
            this.testSpecificationForm.reset();
            this.versions.clear();
            this.router.navigate(['/test-specification']);
          },
          error: (error) => {
            this.toastService.show(error.message, 'error');
          },
        });
      } else {
        this.testMethodService.createTestMethodSpecification(formData).subscribe({
          next: (response) => {
            this.toastService.show(response.message, 'success');
            this.testSpecificationForm.reset();
            this.versions.clear();
            this.versions.push(this.createVersionGroup());
            this.router.navigate(['/test-specification']);
          },
          error: (error) => {
            this.toastService.show(error.message, 'error');
          },
        });
      }
    } else {
      this.testSpecificationForm.markAllAsTouched();
    }
  }

  // Move up/down removed: UI-only reorder, doesn't persist to backend.
  // moveVersionUp(index: number): void {
  //   if (index === 0) return;
  //   const versions = this.versions;
  //   const current = versions.at(index);
  //   versions.removeAt(index);
  //   versions.insert(index - 1, current);
  // }

  // Move up/down removed: UI-only reorder, doesn't persist to backend.
  // moveVersionDown(index: number): void {
  //   if (index >= this.versions.length - 1) return;
  //   const versions = this.versions;
  //   const current = versions.at(index);
  //   versions.removeAt(index);
  //   versions.insert(index + 1, current);
  // }
}
