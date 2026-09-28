import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Modal } from 'bootstrap';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { FactorConversionService } from '../../services/factor-conversion.service';
import { LaboratoryTestService } from '../../services/laboratory-test.service';
import { TestMethodSpecificationService } from '../../services/test-method-specification.service';
import { TestMethodService } from '../../services/test-method.service';
import { ParameterService } from '../../services/parameter.service';
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
  selector: 'app-factor-conversion-list',
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
  templateUrl: './factor-conversion-list.component.html',
  styleUrl: './factor-conversion-list.component.css'
})
export class FactorConversionListComponent implements OnInit {
  @ViewChild('modalRef') modalElement!: ElementRef;
  private bsModal!: Modal;

  filterSearch: string = '';
  filterType: string = '';
  filterInputParamId: number | null = null;
  filterOutputParamId: number | null = null;
  filterStatus: string = 'active';

  selectedFilterInputParam: any = null;
  selectedFilterOutputParam: any = null;

  factorList: any[] = [];
  pageNumber: number = 1;
  pageSize: number = 10;
  totalItems: number = 0;
  pageSizes: number[] = [10, 25, 50, 100];
  sortByColumn: string = '';
  sortOrder: string = 'asc';

  factorForm!: FormGroup;
  submitted: boolean = false;
  isEditMode: boolean = false;
  isViewMode: boolean = false;
  selectedId: number = 0;
  formTitle: string = 'Add Factor / Conversion';

  factorTypes: string[] = ['MULTIPLICATION', 'DIVISION', 'ADDITIVE_OFFSET', 'SUBTRACTIVE_OFFSET'];
  appliedOnOptions: string[] = ['Measured Value', 'Reported Value'];

  selectedInputParam: any = null;
  selectedOutputParam: any = null;
  selectedTest: any = null;
  selectedMethod: any = null;
  methodVersions: any[] = [];
  auditInfo: any = null;

  dryRunInput: number | null = null;
  dryRunResult: any = null;
  dryRunLoading: boolean = false;

  constructor(
    private fb: FormBuilder,
    private factorService: FactorConversionService,
    private laboratoryTestService: LaboratoryTestService,
    private testMethodService: TestMethodSpecificationService,
    private testMethodFlatService: TestMethodService,
    private parameterService: ParameterService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.fetchData();
  }

  private initForm(): void {
    this.factorForm = this.fb.group({
      id: [0],
      code: ['', [Validators.required, Validators.maxLength(50), Validators.pattern('^[A-Za-z0-9_ ]+$'), noWhitespaceValidator()]],
      name: ['', [Validators.required, Validators.maxLength(150), noWhitespaceValidator()]],
      description: ['', [Validators.maxLength(500)]],
      factorType: ['MULTIPLICATION', [Validators.required]],
      factorValue: [1, [Validators.required]],
      inputParameterID: [null, [Validators.required]],
      outputParameterID: [null],
      laboratoryTestID: [null],
      testMethodSpecificationID: [null],
      testMethodSpecificationVersionID: [null],
      appliedOn: ['Measured Value', [Validators.required]],
      isMandatory: [true],
      displayOrder: [0, [Validators.min(0)]],
      isActive: [true]
    });
  }

  onCodeInput(): void {
    const ctrl = this.factorForm.get('code');
    if (!ctrl || this.isViewMode) return;
    const raw = (ctrl.value || '').toUpperCase().replace(/\s+/g, '_');
    if (raw !== ctrl.value) ctrl.setValue(raw, { emitEvent: false });
  }

  factorTypeHint(type: string): string {
    switch (type) {
      case 'DIVISION': return 'Output = Input ÷ Factor (Factor ≠ 0)';
      case 'ADDITIVE_OFFSET': return 'Output = Input + Offset';
      case 'SUBTRACTIVE_OFFSET': return 'Output = Input − Offset';
      default: return 'Output = Input × Factor';
    }
  }

  getInputParamDropdown = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.parameterService.getParameterDropdown(term, page, pageSize);
  };

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

  onInputParamSelected(item: any): void {
    this.selectedInputParam = item || null;
    this.factorForm.patchValue({ inputParameterID: item ? item.id : null });
    this.dryRunResult = null;
  }

  onOutputParamSelected(item: any): void {
    this.selectedOutputParam = item || null;
    this.factorForm.patchValue({ outputParameterID: item ? item.id : null });
  }

  onTestSelected(item: any): void {
    this.selectedTest = item || null;
    this.factorForm.patchValue({ laboratoryTestID: item ? item.id : null });
  }

  onMethodSelected(item: any): void {
    this.selectedMethod = item || null;
    this.factorForm.patchValue({
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
          this.factorForm.patchValue({ testMethodSpecificationVersionID: selectId });
        } else if (list.length === 1 && list[0]?.id != null) {
          this.factorForm.patchValue({ testMethodSpecificationVersionID: list[0].id });
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

  onFilterInputParamSelected(item: any): void {
    this.selectedFilterInputParam = item || null;
    this.filterInputParamId = item ? item.id : null;
    this.onSearch();
  }

  onFilterOutputParamSelected(item: any): void {
    this.selectedFilterOutputParam = item || null;
    this.filterOutputParamId = item ? item.id : null;
    this.onSearch();
  }

  fetchData(): void {
    const payload = {
      pageNumber: this.pageNumber,
      pageSize: this.pageSize,
      searchTerm: this.filterSearch.trim() || null,
      sortByColumn: this.sortByColumn || null,
      sortOrder: this.sortOrder,
      factorType: this.filterType || null,
      inputParameterID: this.filterInputParamId,
      outputParameterID: this.filterOutputParamId,
      status: this.filterStatus
    };

    this.factorService.queryFactors(payload).subscribe({
      next: (res: any) => {
        this.factorList = res?.items || [];
        this.totalItems = res?.totalRecords || 0;
        this.pageNumber = res?.pageNumber || 1;
        this.pageSize = res?.pageSize || 10;
      },
      error: (err: any) => {
        this.factorList = [];
        this.totalItems = 0;
        this.toastService.show(err?.error?.message || 'Failed to fetch factors / conversions', 'error');
      }
    });
  }

  onSearch(): void {
    this.pageNumber = 1;
    this.fetchData();
  }

  onReset(): void {
    this.filterSearch = '';
    this.filterType = '';
    this.filterInputParamId = null;
    this.filterOutputParamId = null;
    this.filterStatus = 'active';
    this.selectedFilterInputParam = null;
    this.selectedFilterOutputParam = null;
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
    this.dryRunInput = null;
    this.dryRunResult = null;

    if (mode === 'create') {
      this.formTitle = 'Add Factor / Conversion';
      this.factorForm.reset({ id: 0, code: '', name: '', description: '', factorType: 'MULTIPLICATION', factorValue: 1, inputParameterID: null, outputParameterID: null, laboratoryTestID: null, testMethodSpecificationID: null, testMethodSpecificationVersionID: null, appliedOn: 'Measured Value', isMandatory: true, displayOrder: 0, isActive: true });
      this.selectedInputParam = null;
      this.selectedOutputParam = null;
      this.selectedTest = null;
      this.selectedMethod = null;
      this.factorForm.enable();
      this.showModal();
    } else {
      this.formTitle = mode === 'edit' ? 'Edit Factor / Conversion' : 'View Factor / Conversion';
      this.factorService.getFactorDetails(id).subscribe({
        next: (data: any) => {
          if (!data) {
            this.toastService.show('Factor/conversion not found', 'error');
            return;
          }
          const g = (k1: string, k2: string, fb: any = null) => data[k1] ?? data[k2] ?? fb;
          this.factorForm.patchValue({
            id: g('id', 'ID', 0),
            code: g('code', 'Code', ''),
            name: g('name', 'Name', ''),
            description: g('description', 'Description', ''),
            factorType: g('factorType', 'FactorType', 'MULTIPLICATION'),
            factorValue: g('factorValue', 'FactorValue', 1),
            inputParameterID: g('inputParameterID', 'InputParameterID', null),
            outputParameterID: g('outputParameterID', 'OutputParameterID', null),
            laboratoryTestID: g('laboratoryTestID', 'LaboratoryTestID', null),
            testMethodSpecificationID: g('testMethodSpecificationID', 'TestMethodSpecificationID', null),
            testMethodSpecificationVersionID: g('testMethodSpecificationVersionID', 'TestMethodSpecificationVersionID', null),
            appliedOn: g('appliedOn', 'AppliedOn', 'All Results'),
            isMandatory: g('isMandatory', 'IsMandatory', true),
            displayOrder: g('displayOrder', 'DisplayOrder', 0),
            isActive: g('isActive', 'IsActive', true)
          });

          const mkSel = (vId: any, vName: any) => (vId != null && vName) ? { id: vId, name: vName } : null;
          this.selectedInputParam = mkSel(g('inputParameterID', 'InputParameterID'), g('inputParameterName', 'InputParameterName'));
          this.selectedOutputParam = mkSel(g('outputParameterID', 'OutputParameterID'), g('outputParameterName', 'OutputParameterName'));
          this.selectedTest = mkSel(g('laboratoryTestID', 'LaboratoryTestID'), g('laboratoryTestName', 'LaboratoryTestName'));
          this.selectedMethod = mkSel(g('testMethodSpecificationID', 'TestMethodSpecificationID'), g('testMethodName', 'TestMethodName'));
          this.auditInfo = data;

          const methodId = g('testMethodSpecificationID', 'TestMethodSpecificationID', null);
          const versionId = g('testMethodSpecificationVersionID', 'TestMethodSpecificationVersionID', null);
          if (methodId) this.loadVersions(methodId, versionId);

          if (this.isViewMode) this.factorForm.disable();
          else this.factorForm.enable();
          this.showModal();
        },
        error: (err: any) => {
          this.toastService.show(err?.error?.message || 'Failed to load factor/conversion details', 'error');
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
    this.factorForm.reset();
    this.submitted = false;
    this.dryRunResult = null;
  }

  get summaryLine(): string {
    const v = this.factorForm?.getRawValue?.() || {};
    const input = this.selectedInputParam?.name || '—';
    const output = this.selectedOutputParam?.name || input;
    const op = v.factorType === 'DIVISION' ? '÷' : v.factorType === 'ADDITIVE_OFFSET' ? '+' : v.factorType === 'SUBTRACTIVE_OFFSET' ? '−' : '×';
    return `${input} ${op} ${v.factorValue ?? '…'} → ${output}`;
  }

  runDryRun(): void {
    const v = this.factorForm.getRawValue();
    if (this.dryRunInput == null) {
      this.toastService.show('Enter a trial input value first', 'warning');
      return;
    }
    this.dryRunLoading = true;
    this.dryRunResult = null;
    this.factorService.validateFactor({
      factorType: v.factorType,
      factorValue: Number(v.factorValue),
      inputValue: Number(this.dryRunInput)
    }).subscribe({
      next: (res: any) => {
        this.dryRunLoading = false;
        this.dryRunResult = res;
      },
      error: (err: any) => {
        this.dryRunLoading = false;
        this.toastService.show(err?.error?.message || 'Dry-run validation failed', 'error');
      }
    });
  }

  saveFactor(): void {
    this.submitted = true;
    if (this.factorForm.invalid || this.isViewMode) {
      this.factorForm.markAllAsTouched();
      if (this.factorForm.invalid) {
        this.toastService.show('Please fill in all required fields correctly', 'warning');
      }
      return;
    }

    const val = this.factorForm.getRawValue();
    if (val.factorType === 'DIVISION' && Number(val.factorValue) === 0) {
      this.toastService.show('Division factor value must not be zero', 'warning');
      return;
    }
    if (val.outputParameterID != null && val.outputParameterID === val.inputParameterID) {
      this.toastService.show('Output parameter must differ from input parameter (or stay empty)', 'warning');
      return;
    }

    const code = ((val.code || '').trim().toUpperCase().replace(/\s+/g, '_'));
    const base: any = {
      code,
      name: (val.name || '').trim(),
      description: (val.description || '').trim() || null,
      factorType: val.factorType,
      factorValue: Number(val.factorValue),
      inputParameterID: val.inputParameterID,
      outputParameterID: val.outputParameterID || null,
      laboratoryTestID: val.laboratoryTestID || null,
      testMethodSpecificationID: val.testMethodSpecificationID || null,
      testMethodSpecificationVersionID: val.testMethodSpecificationVersionID || null,
      appliedOn: val.appliedOn || 'All Results',
      isMandatory: val.isMandatory !== undefined ? val.isMandatory : true,
      displayOrder: Number(val.displayOrder) || 0
    };

    if (this.isEditMode && (val.id || 0) > 0) {
      const payload = { ...base, id: val.id, isActive: val.isActive !== undefined ? val.isActive : true };
      this.factorService.updateFactor(payload).subscribe({
        next: (res: any) => {
          this.toastService.show(res?.message || 'Factor/conversion updated successfully.', 'success');
          this.closeModal();
          this.fetchData();
        },
        error: (err: any) => {
          this.toastService.show(err?.error?.message || err?.message || 'Failed to update factor/conversion', 'error');
        }
      });
    } else {
      this.factorService.createFactor(base).subscribe({
        next: (res: any) => {
          this.toastService.show(res?.message || 'Factor/conversion created successfully.', 'success');
          this.closeModal();
          this.fetchData();
        },
        error: (err: any) => {
          this.toastService.show(err?.error?.message || err?.message || 'Failed to create factor/conversion', 'error');
        }
      });
    }
  }

  toggleStatus(item: any): void {
    const action = item.isActive ? 'deactivate' : 'activate';
    if (!confirm(`Are you sure you want to ${action} factor/conversion '${item.name}'?`)) return;

    this.factorService.toggleFactorStatus(item.id).subscribe({
      next: (res: any) => {
        this.toastService.show(res?.message || `Factor/conversion ${action}d successfully.`, 'success');
        this.fetchData();
      },
      error: (err: any) => {
        this.toastService.show(err?.error?.message || `Failed to ${action} factor/conversion`, 'error');
      }
    });
  }
}
