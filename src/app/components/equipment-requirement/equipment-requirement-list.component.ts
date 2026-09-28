import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Modal } from 'bootstrap';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { EquipmentRequirementService } from '../../services/equipment-requirement.service';
import { LaboratoryTestService } from '../../services/laboratory-test.service';
import { TestMethodSpecificationService } from '../../services/test-method-specification.service';
import { TestMethodService } from '../../services/test-method.service';
import { ParameterService } from '../../services/parameter.service';
import { EquipmentTypeService } from '../../services/equipment-type.service';
import { EquipmentService } from '../../services/equipment.service';
import { ParameterUnitService } from '../../services/parameter-unit.service';
import { ToastService } from '../../services/toast.service';
import { HasPermissionDirective } from '../../utility/directives/has-permission.directive';
import { noWhitespaceValidator } from '../../utility/validators/custom-validators';
import { FormFieldErrorComponent } from '../../utility/components/form-field-error/form-field-error.component';
import { PaginationComponent } from '../../utility/components/pagination/pagination.component';
import { BreadcrumbComponent } from '../../utility/components/breadcrumb/breadcrumb.component';
import { SearchableDropdownComponent } from '../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { DecimalOnlyDirective } from '../../utility/directives/decimal-only.directive';
import { NumberOnlyDirective } from '../../utility/directives/number-only.directive';

@Component({
  selector: 'app-equipment-requirement-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    FormFieldErrorComponent,
    PaginationComponent,
    BreadcrumbComponent,
    SearchableDropdownComponent,
    HasPermissionDirective,
    DecimalOnlyDirective,
    NumberOnlyDirective
  ],
  templateUrl: './equipment-requirement-list.component.html',
  styleUrl: './equipment-requirement-list.component.css'
})
export class EquipmentRequirementListComponent implements OnInit {
  @ViewChild('modalRef') modalElement!: ElementRef;
  private bsModal!: Modal;

  filterSearch: string = '';
  filterTestId: number | null = null;
  filterMethodId: number | null = null;
  filterTypeId: number | null = null;
  filterStatus: string = 'active';

  selectedFilterTest: any = null;
  selectedFilterMethod: any = null;
  selectedFilterType: any = null;

  requirementList: any[] = [];
  pageNumber: number = 1;
  pageSize: number = 10;
  totalItems: number = 0;
  pageSizes: number[] = [10, 25, 50, 100];
  sortByColumn: string = '';
  sortOrder: string = 'asc';

  requirementForm!: FormGroup;
  submitted: boolean = false;
  isEditMode: boolean = false;
  isViewMode: boolean = false;
  selectedId: number = 0;
  formTitle: string = 'Add Equipment Requirement';

  selectedTest: any = null;
  selectedMethod: any = null;
  selectedParameter: any = null;
  selectedType: any = null;
  selectedEquipment: any = null;
  selectedRangeUnit: any = null;
  methodVersions: any[] = [];
  auditInfo: any = null;

  constructor(
    private fb: FormBuilder,
    private requirementService: EquipmentRequirementService,
    private laboratoryTestService: LaboratoryTestService,
    private testMethodService: TestMethodSpecificationService,
    private testMethodFlatService: TestMethodService,
    private parameterService: ParameterService,
    private equipmentTypeService: EquipmentTypeService,
    private equipmentService: EquipmentService,
    private parameterUnitService: ParameterUnitService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.fetchData();
  }

  private initForm(): void {
    this.requirementForm = this.fb.group({
      id: [0],
      code: ['', [Validators.required, Validators.maxLength(50), Validators.pattern('^[A-Za-z0-9_ ]+$'), noWhitespaceValidator()]],
      name: ['', [Validators.required, Validators.maxLength(150), noWhitespaceValidator()]],
      description: ['', [Validators.maxLength(500)]],
      laboratoryTestID: [null, [Validators.required]],
      testMethodSpecificationID: [null],
      testMethodSpecificationVersionID: [null],
      parameterID: [null],
      equipmentTypeID: [null, [Validators.required]],
      equipmentID: [null],
      requiredCapability: ['', [Validators.maxLength(500)]],
      minimumRange: [null, [Validators.min(0)]],
      maximumRange: [null, [Validators.min(0)]],
      rangeUnitID: [null],
      accuracyRequirement: ['', [Validators.maxLength(200)]],
      resolutionRequirement: ['', [Validators.maxLength(200)]],
      isMandatory: [true],
      displayOrder: [0, [Validators.min(0)]],
      isActive: [true]
    });
  }

  onCodeInput(): void {
    const ctrl = this.requirementForm.get('code');
    if (!ctrl || this.isViewMode) return;
    const raw = (ctrl.value || '').toUpperCase().replace(/\s+/g, '_');
    if (raw !== ctrl.value) ctrl.setValue(raw, { emitEvent: false });
  }

  getTestDropdown = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.laboratoryTestService.getLaboratoryTestDropdown(term, page, pageSize);
  };

  getMethodDropdown = (term: string, page: number, pageSize: number): Observable<any[]> => {
    // Flat method identity list (spec-level IDs). Versions are chosen separately
    // via the Method Version select — the tree dropdown returns version leaves.
    return this.testMethodFlatService.getActiveDropdown().pipe(
      map((list: any[]) => {
        const t = (term || '').trim().toLowerCase();
        const filtered = t
          ? (list || []).filter((x: any) =>
              ((x.name || '') + ' ' + (x.code || '') + ' ' + (x.standardReference || '')).toLowerCase().includes(t))
          : (list || []);
        return filtered
          .map((x: any) => ({ id: x.id, name: x.name, code: x.code, standardReference: x.standardReference }))
          .slice(page * pageSize, page * pageSize + pageSize);
      })
    );
  };

  getParamDropdown = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.parameterService.getParameterDropdown(term, page, pageSize);
  };

  getTypeDropdown = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.equipmentTypeService.getEquipmentTypeDropdown(term, page, pageSize);
  };

  getEquipmentDropdown = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.equipmentService.getEquipmentDropdown(term, page, pageSize);
  };

  getUnitDropdown = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.parameterUnitService.getParameterUnitDropdown(term, page, pageSize);
  };

  onTestSelected(item: any): void {
    this.selectedTest = item || null;
    this.requirementForm.patchValue({ laboratoryTestID: item ? item.id : null });
  }

  onMethodSelected(item: any): void {
    this.selectedMethod = item || null;
    this.requirementForm.patchValue({
      testMethodSpecificationID: item ? item.id : null,
      testMethodSpecificationVersionID: null
    });
    this.methodVersions = [];
    if (item) this.loadVersions(item.id, null);
  }

  private loadVersions(methodId: number, selectId: number | null): void {
    this.testMethodService.getVersionsDropdown(methodId, true).subscribe({
      next: (data: any) => {
        const list = Array.isArray(data) ? data : (data?.items || data?.data || []);
        this.methodVersions = list;
        if (selectId != null) {
          this.requirementForm.patchValue({ testMethodSpecificationVersionID: selectId });
        } else if (list.length === 1 && list[0]?.id != null) {
          this.requirementForm.patchValue({ testMethodSpecificationVersionID: list[0].id });
        }
      },
      error: () => { this.methodVersions = []; }
    });
  }

  versionLabel(v: any): string {
    if (!v) return '';
    const ver = v.version ?? v.versionName ?? v.name ?? v.id;
    const def = v.isDefault ? ' ★' : '';
    return `${ver}${def}`;
  }

  onParameterSelected(item: any): void {
    this.selectedParameter = item || null;
    this.requirementForm.patchValue({ parameterID: item ? item.id : null });
  }

  onTypeSelected(item: any): void {
    this.selectedType = item || null;
    this.requirementForm.patchValue({ equipmentTypeID: item ? item.id : null });
  }

  onEquipmentSelected(item: any): void {
    this.selectedEquipment = item || null;
    this.requirementForm.patchValue({ equipmentID: item ? item.id : null });
  }

  onRangeUnitSelected(item: any): void {
    this.selectedRangeUnit = item || null;
    this.requirementForm.patchValue({ rangeUnitID: item ? item.id : null });
  }

  onFilterTestSelected(item: any): void {
    this.selectedFilterTest = item || null;
    this.filterTestId = item ? item.id : null;
    this.onSearch();
  }

  onFilterMethodSelected(item: any): void {
    this.selectedFilterMethod = item || null;
    this.filterMethodId = item ? item.id : null;
    this.onSearch();
  }

  onFilterTypeSelected(item: any): void {
    this.selectedFilterType = item || null;
    this.filterTypeId = item ? item.id : null;
    this.onSearch();
  }

  fetchData(): void {
    const payload = {
      pageNumber: this.pageNumber,
      pageSize: this.pageSize,
      searchTerm: this.filterSearch.trim() || null,
      sortByColumn: this.sortByColumn || null,
      sortOrder: this.sortOrder,
      laboratoryTestID: this.filterTestId,
      testMethodSpecificationID: this.filterMethodId,
      equipmentTypeID: this.filterTypeId,
      status: this.filterStatus
    };

    this.requirementService.queryRequirements(payload).subscribe({
      next: (res: any) => {
        this.requirementList = res?.items || [];
        this.totalItems = res?.totalRecords || 0;
        this.pageNumber = res?.pageNumber || 1;
        this.pageSize = res?.pageSize || 10;
      },
      error: (err: any) => {
        this.requirementList = [];
        this.totalItems = 0;
        this.toastService.show(err?.error?.message || 'Failed to fetch equipment requirements', 'error');
      }
    });
  }

  onSearch(): void {
    this.pageNumber = 1;
    this.fetchData();
  }

  onReset(): void {
    this.filterSearch = '';
    this.filterTestId = null;
    this.filterMethodId = null;
    this.filterTypeId = null;
    this.filterStatus = 'active';
    this.selectedFilterTest = null;
    this.selectedFilterMethod = null;
    this.selectedFilterType = null;
    this.pageNumber = 1;
    this.fetchData();
  }

  onSort(column: string): void {
    if (this.sortByColumn === column) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortByColumn = column;
      this.sortOrder = 'asc';
    }
    this.fetchData();
  }

  onPageChange(page: number): void {
    this.pageNumber = page;
    this.fetchData();
  }

  onPageSizeChange(event: any): void {
    this.pageSize = typeof event === 'number' ? event : Number(event?.target?.value || event);
    this.pageNumber = 1;
    this.fetchData();
  }

  openModal(mode: 'create' | 'edit' | 'view', id: number = 0): void {
    this.submitted = false;
    this.selectedId = id;
    this.isViewMode = mode === 'view';
    this.isEditMode = mode === 'edit';
    this.auditInfo = null;
    this.methodVersions = [];

    if (mode === 'create') {
      this.formTitle = 'Add Equipment Requirement';
      this.requirementForm.reset({ id: 0, code: '', name: '', description: '', laboratoryTestID: null, testMethodSpecificationID: null, testMethodSpecificationVersionID: null, parameterID: null, equipmentTypeID: null, equipmentID: null, requiredCapability: '', minimumRange: null, maximumRange: null, rangeUnitID: null, accuracyRequirement: '', resolutionRequirement: '', isMandatory: true, displayOrder: 0, isActive: true });
      this.selectedTest = null;
      this.selectedMethod = null;
      this.selectedParameter = null;
      this.selectedType = null;
      this.selectedEquipment = null;
      this.selectedRangeUnit = null;
      this.requirementForm.enable();
      this.showModal();
    } else {
      this.formTitle = mode === 'edit' ? 'Edit Equipment Requirement' : 'View Equipment Requirement';
      this.requirementService.getRequirementDetails(id).subscribe({
        next: (data: any) => {
          if (!data) {
            this.toastService.show('Equipment requirement not found', 'error');
            return;
          }
          const g = (k1: string, k2: string, fb: any = null) => data[k1] ?? data[k2] ?? fb;
          this.requirementForm.patchValue({
            id: g('id', 'ID', 0),
            code: g('code', 'Code', ''),
            name: g('name', 'Name', ''),
            description: g('description', 'Description', ''),
            laboratoryTestID: g('laboratoryTestID', 'LaboratoryTestID', null),
            testMethodSpecificationID: g('testMethodSpecificationID', 'TestMethodSpecificationID', null),
            testMethodSpecificationVersionID: g('testMethodSpecificationVersionID', 'TestMethodSpecificationVersionID', null),
            parameterID: g('parameterID', 'ParameterID', null),
            equipmentTypeID: g('equipmentTypeID', 'EquipmentTypeID', null),
            equipmentID: g('equipmentID', 'EquipmentID', null),
            requiredCapability: g('requiredCapability', 'RequiredCapability', ''),
            minimumRange: g('minimumRange', 'MinimumRange', null),
            maximumRange: g('maximumRange', 'MaximumRange', null),
            rangeUnitID: g('rangeUnitID', 'RangeUnitID', null),
            accuracyRequirement: g('accuracyRequirement', 'AccuracyRequirement', ''),
            resolutionRequirement: g('resolutionRequirement', 'ResolutionRequirement', ''),
            isMandatory: g('isMandatory', 'IsMandatory', true),
            displayOrder: g('displayOrder', 'DisplayOrder', 0),
            isActive: g('isActive', 'IsActive', true)
          });

          const mkSel = (vId: any, vName: any) => (vId != null && vName) ? { id: vId, name: vName } : null;
          this.selectedTest = mkSel(g('laboratoryTestID', 'LaboratoryTestID'), g('laboratoryTestName', 'LaboratoryTestName'));
          this.selectedMethod = mkSel(g('testMethodSpecificationID', 'TestMethodSpecificationID'), g('testMethodName', 'TestMethodName'));
          this.selectedParameter = mkSel(g('parameterID', 'ParameterID'), g('parameterName', 'ParameterName'));
          this.selectedType = mkSel(g('equipmentTypeID', 'EquipmentTypeID'), g('equipmentTypeName', 'EquipmentTypeName'));
          this.selectedEquipment = mkSel(g('equipmentID', 'EquipmentID'), g('equipmentName', 'EquipmentName'));
          this.selectedRangeUnit = mkSel(g('rangeUnitID', 'RangeUnitID'), g('rangeUnitName', 'RangeUnitName'));
          this.auditInfo = data;

          const methodId = g('testMethodSpecificationID', 'TestMethodSpecificationID', null);
          const versionId = g('testMethodSpecificationVersionID', 'TestMethodSpecificationVersionID', null);
          if (methodId) this.loadVersions(methodId, versionId);

          if (this.isViewMode) this.requirementForm.disable();
          else this.requirementForm.enable();
          this.showModal();
        },
        error: (err: any) => {
          this.toastService.show(err?.error?.message || 'Failed to load equipment requirement details', 'error');
        }
      });
    }
  }

  private showModal(): void {
    if (!this.bsModal && this.modalElement) {
      this.bsModal = new Modal(this.modalElement.nativeElement, { backdrop: 'static', keyboard: false });
    }
    this.bsModal?.show();
  }

  closeModal(): void {
    this.bsModal?.hide();
    this.requirementForm.reset();
    this.submitted = false;
  }

  get summaryLine(): string {
    const v = this.requirementForm?.getRawValue?.() || {};
    const parts = [
      this.selectedTest?.name || '—',
      this.selectedMethod?.name || 'Any Method',
      this.selectedParameter?.name || 'All Parameters',
      this.selectedType?.name || '—'
    ];
    let s = parts.join(' • ');
    if (v.minimumRange != null || v.maximumRange != null) {
      s += ` • Range ${v.minimumRange ?? '…'}–${v.maximumRange ?? '…'} ${this.selectedRangeUnit?.name || ''}`.trim();
    }
    return s;
  }

  saveRequirement(): void {
    this.submitted = true;
    if (this.requirementForm.invalid || this.isViewMode) {
      this.requirementForm.markAllAsTouched();
      if (this.requirementForm.invalid) {
        this.toastService.show('Please fill in all required fields correctly', 'warning');
      }
      return;
    }

    const val = this.requirementForm.getRawValue();
    if (val.minimumRange != null && val.maximumRange != null && Number(val.minimumRange) > Number(val.maximumRange)) {
      this.toastService.show('Minimum range must be less than or equal to maximum range', 'warning');
      return;
    }
    if ((val.minimumRange != null || val.maximumRange != null) && val.rangeUnitID == null) {
      this.toastService.show('Range unit is required when minimum or maximum range is specified', 'warning');
      return;
    }

    const code = ((val.code || '').trim().toUpperCase().replace(/\s+/g, '_'));
    const base: any = {
      code,
      name: (val.name || '').trim(),
      description: (val.description || '').trim() || null,
      laboratoryTestID: val.laboratoryTestID,
      testMethodSpecificationID: val.testMethodSpecificationID || null,
      testMethodSpecificationVersionID: val.testMethodSpecificationVersionID || null,
      parameterID: val.parameterID || null,
      equipmentTypeID: val.equipmentTypeID,
      equipmentID: val.equipmentID || null,
      requiredCapability: (val.requiredCapability || '').trim() || null,
      minimumRange: val.minimumRange ?? null,
      maximumRange: val.maximumRange ?? null,
      rangeUnitID: val.rangeUnitID || null,
      accuracyRequirement: (val.accuracyRequirement || '').trim() || null,
      resolutionRequirement: (val.resolutionRequirement || '').trim() || null,
      isMandatory: val.isMandatory !== undefined ? val.isMandatory : true,
      displayOrder: Number(val.displayOrder) || 0
    };

    if (this.isEditMode && (val.id || 0) > 0) {
      const payload = { ...base, id: val.id, isActive: val.isActive !== undefined ? val.isActive : true };
      this.requirementService.updateRequirement(payload).subscribe({
        next: (res: any) => {
          this.toastService.show(res?.message || 'Equipment requirement updated successfully.', 'success');
          this.closeModal();
          this.fetchData();
        },
        error: (err: any) => {
          this.toastService.show(err?.error?.message || err?.message || 'Failed to update equipment requirement', 'error');
        }
      });
    } else {
      this.requirementService.createRequirement(base).subscribe({
        next: (res: any) => {
          this.toastService.show(res?.message || 'Equipment requirement created successfully.', 'success');
          this.closeModal();
          this.fetchData();
        },
        error: (err: any) => {
          this.toastService.show(err?.error?.message || err?.message || 'Failed to create equipment requirement', 'error');
        }
      });
    }
  }

  toggleStatus(item: any): void {
    const action = item.isActive ? 'deactivate' : 'activate';
    if (!confirm(`Are you sure you want to ${action} equipment requirement '${item.name}'?`)) return;

    this.requirementService.toggleRequirementStatus(item.id).subscribe({
      next: (res: any) => {
        this.toastService.show(res?.message || `Equipment requirement ${action}d successfully.`, 'success');
        this.fetchData();
      },
      error: (err: any) => {
        this.toastService.show(err?.error?.message || `Failed to ${action} equipment requirement`, 'error');
      }
    });
  }
}
