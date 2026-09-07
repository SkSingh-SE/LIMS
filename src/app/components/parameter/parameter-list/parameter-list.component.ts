import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Modal } from 'bootstrap';
import { ParameterService } from '../../../services/parameter.service';
import { ParameterUnitService } from '../../../services/parameter-unit.service';
import { ToastService } from '../../../services/toast.service';
import { noWhitespaceValidator } from '../../../utility/validators/custom-validators';
import { FormFieldErrorComponent } from '../../../utility/components/form-field-error/form-field-error.component';
import { PaginationComponent } from '../../../utility/components/pagination/pagination.component';
import { FormulaBuilderComponent } from '../../../utility/components/formula-builder/formula-builder.component';
import { BreadcrumbComponent } from '../../../utility/components/breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-parameter-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    FormFieldErrorComponent,
    PaginationComponent,
    FormulaBuilderComponent,
    BreadcrumbComponent
  ],
  templateUrl: './parameter-list.component.html',
  styleUrl: './parameter-list.component.css'
})
export class ParameterListComponent implements OnInit {
  @ViewChild('modalRef') modalElement!: ElementRef;
  private bsModal!: Modal;

  // Metadata / Lookups
  parameterTypes: string[] = ['Quantitative', 'Qualitative', 'Reported', 'Observed', 'Derived'];
  calculationRoles: string[] = ['Input', 'Calculated', 'Derived'];
  availableUnits: any[] = [];

  // Filter state
  filterCode: string = '';
  filterName: string = '';
  filterParameterType: string = '';
  filterUnitId: string = '';
  filterStatus: string = '';

  // Grid state
  parameterList: any[] = [];
  pageNumber: number = 1;
  pageSize: number = 10;
  totalItems: number = 0;
  pageSizes: number[] = [10, 25, 50, 100];
  sortByColumn: string = 'Name';
  sortOrder: string = 'asc';

  // Modal / Form state
  parameterForm!: FormGroup;
  submitted: boolean = false;
  isEditMode: boolean = false;
  isViewMode: boolean = false;
  selectedId: number = 0;
  formTitle: string = 'Add Parameter';
  isSaving: boolean = false;
  showFormulaBuilder: boolean = false;
  isFormulaValid: boolean | null = null;
  formulaValidationMessage: string = '';

  constructor(
    private fb: FormBuilder,
    private parameterService: ParameterService,
    private parameterUnitService: ParameterUnitService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadMetadata();
    this.fetchData();
  }

  initForm(): void {
    this.parameterForm = this.fb.group({
      id: [0],
      code: ['', [Validators.required, Validators.maxLength(100), noWhitespaceValidator()]],
      name: ['', [Validators.required, Validators.maxLength(200), noWhitespaceValidator()]],
      symbol: ['', [Validators.maxLength(50)]],
      parameterType: ['Quantitative', [Validators.required]],
      calculationRole: ['Input', [Validators.required]],
      parameterUnitID: [null],
      decimalPrecision: [2, [Validators.min(0), Validators.max(6)]],
      sequence: [null],
      formula: [''],
      formulaDisplay: [''],
      description: ['', [Validators.maxLength(500)]],
      isActive: [true]
    });

    // Code uppercase normalization
    this.parameterForm.get('code')?.valueChanges.subscribe(val => {
      if (val && typeof val === 'string') {
        const upper = val.toUpperCase().replace(/\s+/g, '_');
        if (upper !== val) {
          this.parameterForm.get('code')?.setValue(upper, { emitEvent: false });
        }
      }
    });

  }

  loadMetadata(): void {
    this.parameterService.getParameterTypesMetadata().subscribe({
      next: (res: any) => {
        if (res) {
          if (res.parameterTypes?.length) this.parameterTypes = res.parameterTypes;
          if (res.calculationRoles?.length) this.calculationRoles = res.calculationRoles;
          if (res.units?.length) this.availableUnits = res.units;
        }
      },
      error: () => {
        this.parameterUnitService.getAllParameterUnits({ pageNumber: 1, pageSize: 200, isActive: true }).subscribe({
          next: (r: any) => { this.availableUnits = r?.data || r?.items || []; }
        });
      }
    });
  }

  fetchData(): void {
    const filters: any[] = [];
    if (this.filterCode.trim())
      filters.push({ column: 'code', type: 'Contains', value: this.filterCode.trim() });
    if (this.filterName.trim())
      filters.push({ column: 'name', type: 'Contains', value: this.filterName.trim() });
    if (this.filterParameterType)
      filters.push({ column: 'parametertype', type: 'Equal', value: this.filterParameterType });
    if (this.filterUnitId)
      filters.push({ column: 'parameterunitid', type: 'Equal', value: this.filterUnitId.toString() });
    if (this.filterStatus !== '')
      filters.push({ column: 'isactive', type: 'Equal', value: this.filterStatus });

    this.parameterService.getAllParameters({
      pageNumber: this.pageNumber,
      pageSize: this.pageSize,
      sortByColumn: this.sortByColumn,
      sortOrder: this.sortOrder,
      filter: filters
    }).subscribe({
      next: (res: any) => {
        this.parameterList = res?.items || res?.data || [];
        this.totalItems = res?.totalRecords ?? 0;
      },
      error: (err: any) => {
        this.toastService.show(err?.error?.message || 'Failed to load parameters.', 'error');
      }
    });
  }

  onSearch(): void { this.pageNumber = 1; this.fetchData(); }

  onReset(): void {
    this.filterCode = '';
    this.filterName = '';
    this.filterParameterType = '';
    this.filterUnitId = '';
    this.filterStatus = '';
    this.pageNumber = 1;
    this.fetchData();
  }

  onPageChange(page: number): void { this.pageNumber = page; this.fetchData(); }
  onPageSizeChange(size: number): void { this.pageSize = size; this.pageNumber = 1; this.fetchData(); }

  applySorting(column: string): void {
    if (this.sortByColumn === column) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortByColumn = column;
      this.sortOrder = 'asc';
    }
    this.fetchData();
  }

  openModal(mode: 'create' | 'edit' | 'view', item?: any): void {
    this.submitted = false;
    this.isEditMode = mode === 'edit';
    this.isViewMode = mode === 'view';
    this.selectedId = item ? item.id : 0;
    this.isFormulaValid = null;
    this.formulaValidationMessage = '';

    if (mode === 'create') {
      this.formTitle = 'Add Universal Parameter';
      this.parameterForm.reset({
        id: 0,
        code: '',
        name: '',
        symbol: '',
        parameterType: 'Quantitative',
        calculationRole: 'Input',
        parameterUnitID: null,
        decimalPrecision: 2,
        sequence: null,
        formula: '',
        formulaDisplay: '',
        description: '',
        isActive: true
      });
      this.parameterForm.enable();
      this.showBsModal();
    } else {
      this.formTitle = mode === 'edit'
        ? `Edit Parameter: ${item.name}`
        : `View Parameter: ${item.name}`;

      this.parameterService.getParameterById(item.id).subscribe({
        next: (detail: any) => {
          this.parameterForm.patchValue({
            id: detail.id,
            code: detail.code,
            name: detail.name,
            symbol: detail.symbol,
            parameterType: detail.parameterType || 'Quantitative',
            calculationRole: detail.calculationRole || 'Input',
            parameterUnitID: detail.parameterUnitID,
            decimalPrecision: detail.decimalPrecision ?? 2,
            sequence: detail.sequence,
            formula: detail.formula,
            formulaDisplay: detail.formulaDisplay,
            description: detail.description,
            isActive: detail.isActive
          });

          if (this.isViewMode) {
            this.parameterForm.disable();
          } else {
            this.parameterForm.enable();
          }

          this.showBsModal();
        },
        error: (err: any) => {
          this.toastService.show(err?.error?.message || 'Failed to fetch parameter details.', 'error');
        }
      });
    }
  }

  showBsModal(): void {
    if (!this.bsModal) {
      this.bsModal = new Modal(this.modalElement.nativeElement, { backdrop: 'static', keyboard: false });
    }
    this.bsModal.show();
  }

  closeModal(): void {
    if (this.bsModal) { this.bsModal.hide(); }
  }

  validateFormula(): void {
    const formula = this.parameterForm.get('formula')?.value?.trim();
    if (!formula) {
      this.isFormulaValid = false;
      this.formulaValidationMessage = 'Formula cannot be empty.';
      return;
    }
    this.parameterService.validateFormula(formula).subscribe({
      next: (res: any) => {
        this.isFormulaValid = res.isValid;
        this.formulaValidationMessage = res.isValid
          ? 'Formula syntax is valid and all parameter tokens are resolved.'
          : (res.error || 'Formula validation failed.');
      },
      error: (err: any) => {
        this.isFormulaValid = false;
        this.formulaValidationMessage = err?.error?.message || err?.error?.error || 'Formula evaluation error.';
      }
    });
  }

  openFormulaBuilder(): void { this.showFormulaBuilder = true; }

  onFormulaSaved(event: { formula: string; formulaDisplay: string }): void {
    this.parameterForm.patchValue({ formula: event.formula, formulaDisplay: event.formulaDisplay });
    this.showFormulaBuilder = false;
    this.validateFormula();
  }

  onFormulaCleared(): void {
    this.parameterForm.patchValue({ formula: '', formulaDisplay: '' });
    this.showFormulaBuilder = false;
    this.isFormulaValid = null;
    this.formulaValidationMessage = '';
  }

  onSubmit(): void {
    this.submitted = true;
    if (this.parameterForm.invalid) {
      this.toastService.show('Please fill in all required fields properly.', 'error');
      return;
    }

    const formVal = this.parameterForm.getRawValue();

    if ((formVal.calculationRole === 'Calculated' || formVal.calculationRole === 'Derived') && !formVal.formula?.trim()) {
      this.toastService.show('Formula is required for Calculated/Derived parameters.', 'error');
      return;
    }

    const payload = {
      ...formVal,
      inputType: 'Decimal',             // Always Decimal — not exposed in UI
      dropdownOptions: [],
      code: formVal.code.trim().toUpperCase(),
      name: formVal.name.trim(),
      symbol: formVal.symbol?.trim() || null,
      description: formVal.description?.trim() || null,
      formula: formVal.formula?.trim() || null,
      formulaDisplay: formVal.formulaDisplay?.trim() || formVal.formula?.trim() || null
    };

    this.isSaving = true;
    if (this.isEditMode) {
      this.parameterService.updateParameter(payload).subscribe({
        next: () => {
          this.isSaving = false;
          this.toastService.show(`Parameter '${payload.name}' updated successfully.`, 'success');
          this.closeModal();
          this.fetchData();
        },
        error: (err: any) => {
          this.isSaving = false;
          this.toastService.show(err?.error?.message || err?.error || 'Failed to update parameter.', 'error');
        }
      });
    } else {
      this.parameterService.createParameter(payload).subscribe({
        next: () => {
          this.isSaving = false;
          this.toastService.show(`Parameter '${payload.name}' created successfully.`, 'success');
          this.closeModal();
          this.fetchData();
        },
        error: (err: any) => {
          this.isSaving = false;
          this.toastService.show(err?.error?.message || err?.error || 'Failed to create parameter.', 'error');
        }
      });
    }
  }

  toggleStatus(item: any): void {
    const action = item.isActive ? 'deactivate' : 'activate';
    if (!confirm(`Are you sure you want to ${action} parameter '${item.name}' (${item.code})?`)) return;

    this.parameterService.toggleStatus(item.id).subscribe({
      next: (res: any) => {
        item.isActive = res?.isActive ?? !item.isActive;
        this.toastService.show(
          item.isActive ? `Parameter '${item.name}' activated.` : `Parameter '${item.name}' deactivated.`,
          'success'
        );
      },
      error: (err: any) => {
        this.toastService.show(err?.error?.message || `Failed to ${action} parameter.`, 'error');
      }
    });
  }

  openLinkedMaster(route: string): void { window.open(route, '_blank'); }
}
