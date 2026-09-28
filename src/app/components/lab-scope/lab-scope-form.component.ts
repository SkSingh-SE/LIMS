import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { LabScopeService } from '../../services/lab-scope.service';
import { BranchService } from '../../services/branch.service';
import { LaboratoryTestService } from '../../services/laboratory-test.service';
import { TestMethodSpecificationService } from '../../services/test-method-specification.service';
import { ParameterService } from '../../services/parameter.service';
import { ParameterUnitService } from '../../services/parameter-unit.service';
import { EquipmentService } from '../../services/equipment.service';
import { ToastService } from '../../services/toast.service';
import { FormFieldErrorComponent } from '../../utility/components/form-field-error/form-field-error.component';
import { BreadcrumbComponent } from '../../utility/components/breadcrumb/breadcrumb.component';
import { SearchableDropdownComponent } from '../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { MultiSelectDropdownComponent } from '../../utility/components/multi-select-dropdown/multi-select-dropdown.component';

@Component({
  selector: 'app-lab-scope-form',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    FormFieldErrorComponent,
    BreadcrumbComponent,
    SearchableDropdownComponent,
    MultiSelectDropdownComponent
  ],
  templateUrl: './lab-scope-form.component.html',
  styleUrl: './lab-scope-form.component.css'
})
export class LabScopeFormComponent implements OnInit {
  scopeForm!: FormGroup;
  submitted = false;
  saved = false;
  scopeId = 0;
  isViewMode = false;
  isEditMode = false;
  // Lab Scope Master Form Component
  formTitle = 'New Lab Scope';

  versionsMap: { [key: number]: any[] } = {};
  equipmentIdsMap: { [key: string]: number[] } = {};
  accreditation: any = null;
  auditInfo: any = null;
  changeHistory: any[] = [];

  lowerOperators = ['', '>', '≥', '='];
  upperOperators = ['', '<', '≤', '='];
  scopeTypes = ['Quantitative', 'Qualitative'];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private labScopeService: LabScopeService,
    public branchService: BranchService,
    private laboratoryTestService: LaboratoryTestService,
    private testMethodService: TestMethodSpecificationService,
    private parameterService: ParameterService,
    private parameterUnitService: ParameterUnitService,
    private equipmentService: EquipmentService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.scopeId = Number(this.route.snapshot.paramMap.get('id') || 0);
    const state = history.state as { mode?: string };
    this.isViewMode = this.router.url.includes('/details/') || state?.mode === 'view';
    this.isEditMode = this.router.url.includes('/edit/') || state?.mode === 'edit';
    this.formTitle = this.isViewMode ? 'View Lab Scope' : this.isEditMode ? 'Edit Lab Scope' : 'New Lab Scope';

    this.initForm();
    if (this.branchService.branches().length === 0) {
      this.branchService.loadUserBranches().subscribe({
        next: () => this.applyDefaultBranch(),
        error: () => undefined
      });
    } else {
      this.applyDefaultBranch();
    }

    if (this.scopeId > 0) {
      this.loadScope(this.scopeId);
    } else {
      this.addMethod();
    }
  }

  canDeactivate(): boolean {
    if (this.saved || this.isViewMode) return true;
    if (this.scopeForm?.dirty) {
      return confirm('You have unsaved changes. Do you really want to leave?');
    }
    return true;
  }

  private initForm(): void {
    this.scopeForm = this.fb.group({
      id: [0],
      laboratoryTestID: [null, Validators.required],
      branchID: [null, Validators.required],
      isActive: [true],
      validFrom: [null],
      validUntil: [null],
      nextReviewDate: [null],
      scopeRemarks: ['', Validators.maxLength(500)],
      methods: this.fb.array([])
    });
  }

  get methods(): FormArray {
    return this.scopeForm.get('methods') as FormArray;
  }

  paramsOf(methodIdx: number): FormArray {
    return this.methods.at(methodIdx).get('parameters') as FormArray;
  }

  private applyDefaultBranch(): void {
    if (this.scopeId > 0 || this.isViewMode) return;
    if (this.scopeForm.get('branchID')?.value) return;
    const current = this.branchService.selectedBranch();
    const fallback = this.branchService.branches()[0];
    const branchId = current?.id ?? fallback?.id ?? null;
    if (branchId != null) this.scopeForm.patchValue({ branchID: branchId });
    this.onBranchChanged();
  }

  onBranchChanged(): void {
    const branchId = this.scopeForm.get('branchID')?.value;
    this.labScopeService.getAccreditationContext(branchId || null).subscribe({
      next: (data: any) => { this.accreditation = data; },
      error: () => { this.accreditation = null; }
    });
  }

  getTestDropdown = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.laboratoryTestService.getLaboratoryTestDropdown(term, page, pageSize);
  };

  getMethodDropdown = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.testMethodService.getTestMethodSpecificationDropdown(term, page, pageSize);
  };

  getParamDropdown = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.parameterService.getParameterDropdown(term, page, pageSize);
  };

  getUnitDropdown = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.parameterUnitService.getParameterUnitDropdown(term, page, pageSize);
  };

  getEquipmentDropdown = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.equipmentService.getEquipmentDropdown(term, page, pageSize);
  };

  onTestSelected(item: any): void {
    this.scopeForm.patchValue({ laboratoryTestID: item ? item.id : null });
  }

  onMethodSelected(item: any, methodIdx: number): void {
    const group = this.methods.at(methodIdx);
    if (!item) {
      group.patchValue({
        testMethodSpecificationID: null,
        testMethodSpecificationVersionID: null
      });
      this.versionsMap[methodIdx] = [];
      return;
    }
    const av = item.additionalValues || {};
    const isVersionLeaf = item.nodeType === 'Version' || av.versionId != null;
    const methodId = isVersionLeaf
      ? (av.testMethodSpecificationId ?? item.parentId ?? null)
      : item.id;
    const versionId = isVersionLeaf ? (av.versionId ?? item.id ?? null) : null;
    group.patchValue({
      testMethodSpecificationID: methodId,
      testMethodSpecificationVersionID: null
    });
    this.versionsMap[methodIdx] = [];
    if (methodId) this.loadVersions(methodId, methodIdx, versionId);
  }

  private loadVersions(methodId: number, methodIdx: number, selectId: number | null): void {
    this.testMethodService.getVersionsDropdown(methodId, true).subscribe({
      next: (data: any) => {
        const list = Array.isArray(data) ? data : (data?.items || data?.data || []);
        this.versionsMap[methodIdx] = list;
        if (selectId != null) {
          this.methods.at(methodIdx).patchValue({ testMethodSpecificationVersionID: selectId });
        } else if (list.length === 1 && list[0]?.id != null) {
          this.methods.at(methodIdx).patchValue({ testMethodSpecificationVersionID: list[0].id });
        }
      },
      error: () => { this.versionsMap[methodIdx] = []; }
    });
  }

  versionLabel(v: any): string {
    if (!v) return '';
    const ver = v.version ?? v.versionName ?? v.name ?? v.id;
    const def = v.isDefault ? ' ★' : '';
    return `${ver}${def}`;
  }

  onParamSelected(item: any, methodIdx: number, paramIdx: number): void {
    const group = this.paramsOf(methodIdx).at(paramIdx);
    if (!item) {
      group.patchValue({ parameterID: null, parameterUnitID: null });
      return;
    }
    const unitId = item.additionalValues?.parameterUnitID
      ?? item.additionalValues?.unitId
      ?? item.additionalValues?.parameterUnitId
      ?? null;
    group.patchValue({ parameterID: item.id, parameterUnitID: unitId });
  }

  onUnitSelected(item: any, methodIdx: number, paramIdx: number): void {
    this.paramsOf(methodIdx).at(paramIdx).patchValue({ parameterUnitID: item ? item.id : null });
  }

  onEquipmentsSelected(items: any[], methodIdx: number, paramIdx: number): void {
    const ids = (items || []).map((x: any) => x.id).filter((id: any) => id != null);
    this.equipmentIdsMap[`${methodIdx}-${paramIdx}`] = ids;
    this.paramsOf(methodIdx).at(paramIdx).patchValue({ equipmentIDs: ids });
    this.paramsOf(methodIdx).at(paramIdx).markAsDirty();
  }

  equipmentIds(methodIdx: number, paramIdx: number): number[] {
    return this.equipmentIdsMap[`${methodIdx}-${paramIdx}`] || [];
  }

  addMethod(): void {
    this.methods.push(this.fb.group({
      id: [0],
      testMethodSpecificationID: [null, Validators.required],
      testMethodSpecificationVersionID: [null],
      parameters: this.fb.array([])
    }));
    this.addParameter(this.methods.length - 1);
  }

  removeMethod(methodIdx: number): void {
    this.methods.removeAt(methodIdx);
    const rebuilt: { [key: string]: number[] } = {};
    Object.keys(this.equipmentIdsMap).forEach(k => {
      const [m, p] = k.split('-').map(Number);
      if (m < methodIdx) rebuilt[k] = this.equipmentIdsMap[k];
      else if (m > methodIdx) rebuilt[`${m - 1}-${p}`] = this.equipmentIdsMap[k];
    });
    this.equipmentIdsMap = rebuilt;
    const newVersions: { [key: number]: any[] } = {};
    Object.keys(this.versionsMap).forEach(k => {
      const m = Number(k);
      if (m < methodIdx) newVersions[m] = this.versionsMap[m];
      else if (m > methodIdx) newVersions[m - 1] = this.versionsMap[m];
    });
    this.versionsMap = newVersions;
  }

  addParameter(methodIdx: number): void {
    this.paramsOf(methodIdx).push(this.fb.group({
      id: [0],
      parameterID: [null, Validators.required],
      parameterUnitID: [null, Validators.required],
      scopeType: ['Quantitative', Validators.required],
      isUnderISO: [false],
      lowerOperator: [''],
      lowerLimitValue: [null],
      upperOperator: [''],
      upperLimitValue: [null],
      equipmentIDs: [[]]
    }));
  }

  removeParameter(methodIdx: number, paramIdx: number): void {
    this.paramsOf(methodIdx).removeAt(paramIdx);
  }

  branchName(): string {
    const id = this.scopeForm.get('branchID')?.value;
    return this.branchService.branches().find(b => b.id === id)?.name || '-';
  }

  get summaryMethodCount(): number {
    return this.methods.length;
  }

  get summaryParamCount(): number {
    let n = 0;
    for (let i = 0; i < this.methods.length; i++) n += this.paramsOf(i).length;
    return n;
  }

  private collectMissing(): string[] {
    const missing: string[] = [];
    if (this.scopeForm.get('laboratoryTestID')?.invalid) missing.push('Laboratory Test');
    if (this.scopeForm.get('branchID')?.invalid) missing.push('Branch');
    this.methods.controls.forEach((m, mi) => {
      if (m.get('testMethodSpecificationID')?.invalid) missing.push(`Method ${mi + 1}: Test Method`);
      (m.get('parameters') as FormArray).controls.forEach((p, pi) => {
        if (p.get('parameterID')?.invalid) missing.push(`Method ${mi + 1}, Param ${pi + 1}: Parameter`);
        if (p.get('parameterUnitID')?.invalid) missing.push(`Method ${mi + 1}, Param ${pi + 1}: Unit`);
      });
    });
    const from = this.scopeForm.get('validFrom')?.value;
    const until = this.scopeForm.get('validUntil')?.value;
    if (from && until && new Date(from) > new Date(until)) missing.push('Valid-From must not be later than Valid-Until');
    return missing;
  }

  onSubmit(): void {
    this.submitted = true;
    this.scopeForm.markAllAsTouched();
    if (this.scopeForm.invalid || this.isViewMode) {
      const missing = this.collectMissing();
      this.toastService.show(`Please fix: ${missing.length > 0 ? missing.join(', ') : 'required fields'}`, 'warning');
      return;
    }
    const missing = this.collectMissing();
    if (missing.length > 0) {
      this.toastService.show(`Please fix: ${missing.join(', ')}`, 'warning');
      return;
    }
    const payload = this.scopeForm.getRawValue();
    if (this.scopeId > 0) {
      this.labScopeService.updateScope(payload).subscribe({
        next: (res: any) => {
          this.saved = true;
          this.toastService.show(res?.message || 'Lab scope updated successfully.', 'success');
          this.router.navigate(['/lab-scope']);
        },
        error: (err: any) => {
          this.toastService.show(err?.error?.message || 'Failed to update lab scope', 'error');
        }
      });
    } else {
      this.labScopeService.createScope(payload).subscribe({
        next: (res: any) => {
          this.saved = true;
          this.toastService.show(res?.message || 'Lab scope created successfully.', 'success');
          this.router.navigate(['/lab-scope']);
        },
        error: (err: any) => {
          this.toastService.show(err?.error?.message || 'Failed to create lab scope', 'error');
        }
      });
    }
  }

  onCancel(): void {
    this.router.navigate(['/lab-scope']);
  }

  private loadScope(id: number): void {
    this.labScopeService.getScopeDetails(id).subscribe({
      next: (data: any) => {
        if (!data) {
          this.toastService.show('Lab scope not found', 'error');
          this.router.navigate(['/lab-scope']);
          return;
        }
        this.accreditation = data.accreditation || null;
        this.auditInfo = {
          createdByName: data.createdByName || '-',
          createdOn: data.createdOn || null,
          modifiedByName: data.modifiedByName || data.createdByName || '-',
          modifiedOn: data.modifiedOn || data.createdOn || null,
          companyCode: data.companyCode || ''
        };
        this.changeHistory = data.changeHistory || [];
        this.scopeForm.patchValue({
          id: data.id ?? 0,
          laboratoryTestID: data.laboratoryTestID ?? null,
          branchID: data.branchID ?? null,
          isActive: data.isActive !== undefined ? data.isActive : true,
          validFrom: data.validFrom ? String(data.validFrom).split('T')[0] : null,
          validUntil: data.validUntil ? String(data.validUntil).split('T')[0] : null,
          nextReviewDate: data.nextReviewDate ? String(data.nextReviewDate).split('T')[0] : null,
          scopeRemarks: data.scopeRemarks || ''
        });
        this.methods.clear();
        this.equipmentIdsMap = {};
        (data.methods || []).forEach((m: any, mi: number) => {
          const mg = this.fb.group({
            id: [m.id ?? 0],
            testMethodSpecificationID: [m.testMethodSpecificationID ?? null, Validators.required],
            testMethodSpecificationVersionID: [m.testMethodSpecificationVersionID ?? null],
            parameters: this.fb.array([])
          });
          this.methods.push(mg);
          if (m.testMethodSpecificationID) this.loadVersions(m.testMethodSpecificationID, mi, m.testMethodSpecificationVersionID ?? null);
          (m.parameters || []).forEach((p: any) => {
            const pg = this.fb.group({
              id: [p.id ?? 0],
              parameterID: [p.parameterID ?? null, Validators.required],
              parameterUnitID: [p.parameterUnitID ?? null, Validators.required],
              scopeType: [p.scopeType || 'Quantitative', Validators.required],
              isUnderISO: [!!p.isUnderISO],
              lowerOperator: [p.lowerOperator || ''],
              lowerLimitValue: [p.lowerLimitValue ?? null],
              upperOperator: [p.upperOperator || ''],
              upperLimitValue: [p.upperLimitValue ?? null],
              equipmentIDs: [(p.equipmentIDs || [])]
            });
            (mg.get('parameters') as FormArray).push(pg);
            this.equipmentIdsMap[`${mi}-${(mg.get('parameters') as FormArray).length - 1}`] = [...(p.equipmentIDs || [])];
          });
        });
        if (this.isViewMode) this.scopeForm.disable();
      },
      error: (err: any) => {
        this.toastService.show(err?.error?.message || 'Failed to load lab scope', 'error');
        this.router.navigate(['/lab-scope']);
      }
    });
  }
}
