import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Modal } from 'bootstrap';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { MeasurementUncertaintyMasterService } from '../../services/measurement-uncertainty-master.service';
import { LaboratoryTestService } from '../../services/laboratory-test.service';
import { TestMethodSpecificationService } from '../../services/test-method-specification.service';
import { TestMethodService } from '../../services/test-method.service';
import { ParameterService } from '../../services/parameter.service';
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
  selector: 'app-measurement-uncertainty-list',
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
  templateUrl: './measurement-uncertainty-list.component.html',
  styleUrl: './measurement-uncertainty-list.component.css'
})
export class MeasurementUncertaintyListComponent implements OnInit {
  @ViewChild('modalRef') modalElement!: ElementRef;
  private bsModal!: Modal;

  filterSearch: string = '';
  filterTestId: number | null = null;
  filterParamId: number | null = null;
  filterMethodId: number | null = null;
  filterType: string = '';
  filterBasis: string = '';
  filterStatus: string = 'active';

  selectedFilterTest: any = null;
  selectedFilterParam: any = null;
  selectedFilterMethod: any = null;

  muList: any[] = [];
  pageNumber: number = 1;
  pageSize: number = 10;
  totalItems: number = 0;
  pageSizes: number[] = [10, 25, 50, 100];
  sortByColumn: string = '';
  sortOrder: string = 'asc';

  muForm!: FormGroup;
  submitted: boolean = false;
  isEditMode: boolean = false;
  isViewMode: boolean = false;
  selectedId: number = 0;
  formTitle: string = 'Add Measurement Uncertainty';

  uncertaintyTypes: string[] = ['STANDARD', 'COMBINED', 'EXPANDED'];
  basisOptions: string[] = ['Type A', 'Type B', 'Type A+B', 'Combined'];
  evalTypeOptions: string[] = ['Type A', 'Type B'];
  distributionOptions: string[] = ['Normal', 'Rectangular', 'Triangular', 't-distribution', 'Other'];

  selectedTest: any = null;
  selectedParam: any = null;
  selectedMethod: any = null;
  selectedUnit: any = null;
  methodVersions: any[] = [];
  auditInfo: any = null;

  dryRunResult: any = null;
  dryRunLoading: boolean = false;

  constructor(
    private fb: FormBuilder,
    private muService: MeasurementUncertaintyMasterService,
    private laboratoryTestService: LaboratoryTestService,
    private testMethodService: TestMethodSpecificationService,
    private testMethodFlatService: TestMethodService,
    private parameterService: ParameterService,
    private parameterUnitService: ParameterUnitService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.fetchData();
  }

  private initForm(): void {
    this.muForm = this.fb.group({
      id: [0],
      code: ['', [Validators.required, Validators.maxLength(50), Validators.pattern('^[A-Za-z0-9_ ]+$'), noWhitespaceValidator()]],
      name: ['', [Validators.required, Validators.maxLength(150), noWhitespaceValidator()]],
      description: ['', [Validators.maxLength(500)]],
      laboratoryTestID: [null],
      parameterID: [null],
      testMethodSpecificationID: [null],
      testMethodSpecificationVersionID: [null],
      parameterUnitID: [null],
      uncertaintyType: ['EXPANDED', [Validators.required]],
      basis: ['Type B', [Validators.required]],
      combinedUncertainty: [null, [Validators.min(0)]],
      expandedUncertainty: [null, [Validators.min(0)]],
      coverageFactor: [2, [Validators.required, Validators.min(0.0001)]],
      confidenceLevel: [null, [Validators.min(0), Validators.max(100)]],
      components: this.fb.array([]),
      displayOrder: [0, [Validators.min(0)]],
      isActive: [true]
    });
  }

  get components(): FormArray {
    return this.muForm.get('components') as FormArray;
  }

  addComponent(row: any = null): void {
    this.components.push(this.fb.group({
      source: [(row?.source ?? ''), [Validators.required, Validators.maxLength(200)]],
      evalType: [(row?.evalType ?? 'Type B'), [Validators.required]],
      distribution: [(row?.distribution ?? '')],
      stdUncertainty: [(row?.stdUncertainty ?? null), [Validators.required, Validators.min(0)]],
      sensitivityCoefficient: [(row?.sensitivityCoefficient ?? 1), [Validators.required, Validators.min(0)]]
    }));
  }

  removeComponent(index: number): void {
    this.components.removeAt(index);
    this.dryRunResult = null;
  }

  componentContribution(i: number): number | null {
    const g = this.components.at(i);
    if (!g) return null;
    const u = Number(g.get('stdUncertainty')?.value);
    const c = Number(g.get('sensitivityCoefficient')?.value ?? 1);
    if (isNaN(u)) return null;
    return u * (isNaN(c) ? 1 : c);
  }

  onCodeInput(): void {
    const ctrl = this.muForm.get('code');
    if (!ctrl || this.isViewMode) return;
    const raw = (ctrl.value || '').toUpperCase().replace(/\s+/g, '_');
    if (raw !== ctrl.value) ctrl.setValue(raw, { emitEvent: false });
  }

  typeHint(type: string): string {
    switch (type) {
      case 'STANDARD': return 'Standard uncertainty of a single component (u)';
      case 'COMBINED': return 'Combined standard uncertainty (uc = √Σ(uᵢ×cᵢ)²)';
      default: return 'Expanded uncertainty (U = k × uc, default k = 2)';
    }
  }

  getParamDropdown = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.parameterService.getParameterDropdown(term, page, pageSize);
  };

  getTestDropdown = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.laboratoryTestService.getLaboratoryTestDropdown(term, page, pageSize);
  };

  getMethodDropdown = (term: string, page: number, pageSize: number): Observable<any[]> => {
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

  getUnitDropdown = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.parameterUnitService.getParameterUnitDropdown(term, page, pageSize);
  };

  onTestSelected(item: any): void {
    this.selectedTest = item || null;
    this.muForm.patchValue({ laboratoryTestID: item ? item.id : null });
  }

  onParamSelected(item: any): void {
    this.selectedParam = item || null;
    this.muForm.patchValue({ parameterID: item ? item.id : null });
  }

  onMethodSelected(item: any): void {
    this.selectedMethod = item || null;
    this.muForm.patchValue({
      testMethodSpecificationID: item ? item.id : null,
      testMethodSpecificationVersionID: null
    });
    this.methodVersions = [];
    if (item) this.loadVersions(item.id, null);
  }

  onUnitSelected(item: any): void {
    this.selectedUnit = item || null;
    this.muForm.patchValue({ parameterUnitID: item ? item.id : null });
  }

  private loadVersions(methodId: number, selectId: number | null): void {
    this.testMethodService.getVersionsDropdown(methodId, true).subscribe({
      next: (data: any) => {
        const list = Array.isArray(data) ? data : (data?.items || data?.data || []);
        this.methodVersions = list;
        if (selectId != null) {
          this.muForm.patchValue({ testMethodSpecificationVersionID: selectId });
        } else if (list.length === 1 && list[0]?.id != null) {
          this.muForm.patchValue({ testMethodSpecificationVersionID: list[0].id });
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

  onFilterTestSelected(item: any): void {
    this.selectedFilterTest = item || null;
    this.filterTestId = item ? item.id : null;
    this.onSearch();
  }

  onFilterParamSelected(item: any): void {
    this.selectedFilterParam = item || null;
    this.filterParamId = item ? item.id : null;
    this.onSearch();
  }

  onFilterMethodSelected(item: any): void {
    this.selectedFilterMethod = item || null;
    this.filterMethodId = item ? item.id : null;
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
      parameterID: this.filterParamId,
      testMethodSpecificationID: this.filterMethodId,
      uncertaintyType: this.filterType || null,
      basis: this.filterBasis || null,
      status: this.filterStatus
    };

    this.muService.queryUncertainties(payload).subscribe({
      next: (res: any) => {
        this.muList = res?.items || [];
        this.totalItems = res?.totalRecords || 0;
        this.pageNumber = res?.pageNumber || 1;
        this.pageSize = res?.pageSize || 10;
      },
      error: (err: any) => {
        this.muList = [];
        this.totalItems = 0;
        this.toastService.show(err?.error?.message || 'Failed to fetch measurement uncertainties', 'error');
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
    this.filterParamId = null;
    this.filterMethodId = null;
    this.filterType = '';
    this.filterBasis = '';
    this.filterStatus = 'active';
    this.selectedFilterTest = null;
    this.selectedFilterParam = null;
    this.selectedFilterMethod = null;
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
    this.dryRunResult = null;

    if (mode === 'create') {
      this.formTitle = 'Add Measurement Uncertainty';
      this.muForm.reset({ id: 0, code: '', name: '', description: '', laboratoryTestID: null, parameterID: null, testMethodSpecificationID: null, testMethodSpecificationVersionID: null, parameterUnitID: null, uncertaintyType: 'EXPANDED', basis: 'Type B', combinedUncertainty: null, expandedUncertainty: null, coverageFactor: 2, confidenceLevel: null, displayOrder: 0, isActive: true });
      this.components.clear();
      this.selectedTest = null;
      this.selectedParam = null;
      this.selectedMethod = null;
      this.selectedUnit = null;
      this.muForm.enable();
      this.showModal();
    } else {
      this.formTitle = mode === 'edit' ? 'Edit Measurement Uncertainty' : 'View Measurement Uncertainty';
      this.muService.getUncertaintyDetails(id).subscribe({
        next: (data: any) => {
          if (!data) {
            this.toastService.show('Measurement uncertainty not found', 'error');
            return;
          }
          const g = (k1: string, k2: string, fb: any = null) => data[k1] ?? data[k2] ?? fb;
          this.muForm.patchValue({
            id: g('id', 'ID', 0),
            code: g('code', 'Code', ''),
            name: g('name', 'Name', ''),
            description: g('description', 'Description', ''),
            laboratoryTestID: g('laboratoryTestID', 'LaboratoryTestID', null),
            parameterID: g('parameterID', 'ParameterID', null),
            testMethodSpecificationID: g('testMethodSpecificationID', 'TestMethodSpecificationID', null),
            testMethodSpecificationVersionID: g('testMethodSpecificationVersionID', 'TestMethodSpecificationVersionID', null),
            parameterUnitID: g('parameterUnitID', 'ParameterUnitID', null),
            uncertaintyType: g('uncertaintyType', 'UncertaintyType', 'EXPANDED'),
            basis: g('basis', 'Basis', 'Type B'),
            combinedUncertainty: g('combinedUncertainty', 'CombinedUncertainty', null),
            expandedUncertainty: g('expandedUncertainty', 'ExpandedUncertainty', null),
            coverageFactor: g('coverageFactor', 'CoverageFactor', 2),
            confidenceLevel: g('confidenceLevel', 'ConfidenceLevel', null),
            displayOrder: g('displayOrder', 'DisplayOrder', 0),
            isActive: g('isActive', 'IsActive', true)
          });

          const mkSel = (vId: any, vName: any) => (vId != null && vName) ? { id: vId, name: vName } : null;
          this.selectedTest = mkSel(g('laboratoryTestID', 'LaboratoryTestID'), g('laboratoryTestName', 'LaboratoryTestName'));
          this.selectedParam = mkSel(g('parameterID', 'ParameterID'), g('parameterName', 'ParameterName'));
          this.selectedMethod = mkSel(g('testMethodSpecificationID', 'TestMethodSpecificationID'), g('testMethodName', 'TestMethodName'));
          this.selectedUnit = mkSel(g('parameterUnitID', 'ParameterUnitID'), g('unitSymbol', 'UnitSymbol'));
          this.auditInfo = data;

          this.components.clear();
          const rows = g('components', 'Components', []);
          (Array.isArray(rows) ? rows : []).forEach((r: any) => this.addComponent(r));

          const methodId = g('testMethodSpecificationID', 'TestMethodSpecificationID', null);
          const versionId = g('testMethodSpecificationVersionID', 'TestMethodSpecificationVersionID', null);
          if (methodId) this.loadVersions(methodId, versionId);

          if (this.isViewMode) this.muForm.disable();
          else this.muForm.enable();
          this.showModal();
        },
        error: (err: any) => {
          this.toastService.show(err?.error?.message || 'Failed to load measurement uncertainty details', 'error');
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
    this.muForm.reset();
    this.components.clear();
    this.submitted = false;
    this.dryRunResult = null;
  }

  get summaryLine(): string {
    const v = this.muForm?.getRawValue?.() || {};
    const exp = v.expandedUncertainty;
    const comb = v.combinedUncertainty;
    const k = v.coverageFactor ?? 2;
    const unit = this.selectedUnit?.name || '';
    if (exp != null && exp !== '') return `± ${exp} ${unit} (k=${k})`.trim();
    if (comb != null && comb !== '') return `uc ${comb} ${unit} → U = k × uc (k=${k})`.trim();
    if (this.components.length > 0) return `uc = √Σ(uᵢ×cᵢ)² over ${this.components.length} component(s) → U = k × uc (k=${k})`;
    return 'Provide combined/expanded value or at least one component';
  }

  runDryRun(): void {
    const v = this.muForm.getRawValue();
    const comps = (v.components || []).map((c: any) => ({
      source: c.source,
      evalType: c.evalType,
      distribution: c.distribution || null,
      stdUncertainty: Number(c.stdUncertainty),
      sensitivityCoefficient: Number(c.sensitivityCoefficient ?? 1)
    }));
    const hasComp = comps.length > 0;
    const hasComb = v.combinedUncertainty != null && v.combinedUncertainty !== '';
    if (!hasComp && !hasComb) {
      this.toastService.show('Enter combined uncertainty or at least one component first', 'warning');
      return;
    }
    this.dryRunLoading = true;
    this.dryRunResult = null;
    this.muService.validateUncertainty({
      combinedUncertainty: hasComb ? Number(v.combinedUncertainty) : null,
      coverageFactor: Number(v.coverageFactor) || 2,
      components: hasComp ? comps : []
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

  saveUncertainty(): void {
    this.submitted = true;
    if (this.muForm.invalid || this.isViewMode) {
      this.muForm.markAllAsTouched();
      if (this.muForm.invalid) {
        this.toastService.show('Please fill in all required fields correctly', 'warning');
      }
      return;
    }

    const val = this.muForm.getRawValue();
    const hasComp = (val.components || []).length > 0;
    const hasComb = val.combinedUncertainty != null && val.combinedUncertainty !== '';
    const hasExp = val.expandedUncertainty != null && val.expandedUncertainty !== '';
    if (!hasComp && !hasComb && !hasExp) {
      this.toastService.show('Provide combined/expanded uncertainty or at least one component', 'warning');
      return;
    }

    const code = ((val.code || '').trim().toUpperCase().replace(/\s+/g, '_'));
    const base: any = {
      code,
      name: (val.name || '').trim(),
      description: (val.description || '').trim() || null,
      laboratoryTestID: val.laboratoryTestID || null,
      parameterID: val.parameterID || null,
      testMethodSpecificationID: val.testMethodSpecificationID || null,
      testMethodSpecificationVersionID: val.testMethodSpecificationVersionID || null,
      parameterUnitID: val.parameterUnitID || null,
      uncertaintyType: val.uncertaintyType,
      basis: val.basis,
      combinedUncertainty: hasComb ? Number(val.combinedUncertainty) : null,
      expandedUncertainty: hasExp ? Number(val.expandedUncertainty) : null,
      coverageFactor: Number(val.coverageFactor) || 2,
      confidenceLevel: val.confidenceLevel != null && val.confidenceLevel !== '' ? Number(val.confidenceLevel) : null,
      components: (val.components || []).map((c: any) => ({
        source: (c.source || '').trim(),
        evalType: c.evalType,
        distribution: c.distribution || null,
        stdUncertainty: Number(c.stdUncertainty),
        sensitivityCoefficient: Number(c.sensitivityCoefficient ?? 1)
      })),
      displayOrder: Number(val.displayOrder) || 0
    };

    if (this.isEditMode && (val.id || 0) > 0) {
      const payload = { ...base, id: val.id, isActive: val.isActive !== undefined ? val.isActive : true };
      this.muService.updateUncertainty(payload).subscribe({
        next: (res: any) => {
          this.toastService.show(res?.message || 'Measurement uncertainty updated successfully.', 'success');
          this.closeModal();
          this.fetchData();
        },
        error: (err: any) => {
          this.toastService.show(err?.error?.message || err?.message || 'Failed to update measurement uncertainty', 'error');
        }
      });
    } else {
      this.muService.createUncertainty(base).subscribe({
        next: (res: any) => {
          this.toastService.show(res?.message || 'Measurement uncertainty created successfully.', 'success');
          this.closeModal();
          this.fetchData();
        },
        error: (err: any) => {
          this.toastService.show(err?.error?.message || err?.message || 'Failed to create measurement uncertainty', 'error');
        }
      });
    }
  }

  toggleStatus(item: any): void {
    const action = item.isActive ? 'deactivate' : 'activate';
    if (!confirm(`Are you sure you want to ${action} measurement uncertainty '${item.name}'?`)) return;

    this.muService.toggleUncertaintyStatus(item.id).subscribe({
      next: (res: any) => {
        this.toastService.show(res?.message || `Measurement uncertainty ${action}d successfully.`, 'success');
        this.fetchData();
      },
      error: (err: any) => {
        this.toastService.show(err?.error?.message || `Failed to ${action} measurement uncertainty`, 'error');
      }
    });
  }
}
