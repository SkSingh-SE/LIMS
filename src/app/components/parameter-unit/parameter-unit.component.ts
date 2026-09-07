import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Modal } from 'bootstrap';
import { ParameterUnitService } from '../../services/parameter-unit.service';
import { ToastService } from '../../services/toast.service';
import { noWhitespaceValidator } from '../../utility/validators/custom-validators';
import { FormFieldErrorComponent } from '../../utility/components/form-field-error/form-field-error.component';
import { PaginationComponent } from '../../utility/components/pagination/pagination.component';
import { BreadcrumbComponent } from '../../utility/components/breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-parameter-unit',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    FormFieldErrorComponent,
    PaginationComponent,
    BreadcrumbComponent
  ],
  templateUrl: './parameter-unit.component.html',
  styleUrl: './parameter-unit.component.css'
})
export class ParameterUnitComponent implements OnInit {
  @ViewChild('modalRef') modalElement!: ElementRef;
  private bsModal!: Modal;

  // Lookups
  quantityTypes: string[] = [];

  // Filter state
  filterCode: string = '';
  filterName: string = '';
  filterSymbol: string = '';
  filterQuantityType: string = '';
  filterStatus: string = ''; // '' = All, 'true' = Active, 'false' = Inactive

  // Grid state
  unitList: any[] = [];
  pageNumber: number = 1;
  pageSize: number = 10;
  totalItems: number = 0;
  pageSizes: number[] = [10, 25, 50, 100];
  sortByColumn: string = 'code';
  sortOrder: string = 'asc';

  // Modal / Form state
  unitForm!: FormGroup;
  submitted: boolean = false;
  isEditMode: boolean = false;
  isViewMode: boolean = false;
  selectedId: number = 0;
  formTitle: string = 'Add Parameter Unit';

  constructor(
    private fb: FormBuilder,
    private parameterUnitService: ParameterUnitService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadQuantityTypes();
    this.fetchData();
  }

  initForm(): void {
    this.unitForm = this.fb.group({
      id: [0],
      code: ['', [Validators.required, Validators.maxLength(50), noWhitespaceValidator()]],
      name: ['', [Validators.required, Validators.maxLength(100), noWhitespaceValidator()]],
      symbol: ['', [Validators.required, Validators.maxLength(50), noWhitespaceValidator()]],
      quantityType: [''],
      conversionFactor: [1.0, [Validators.min(0.000001)]],
      description: ['', [Validators.maxLength(500)]],
      isActive: [true],
      equivalents: this.fb.array([])
    });
  }

  get equivalents(): FormArray {
    return this.unitForm.get('equivalents') as FormArray;
  }

  createEquivalentGroup(e?: any): FormGroup {
    return this.fb.group({
      id: [e?.id ?? 0],
      name: [e?.name ?? '', [Validators.required, Validators.maxLength(50), noWhitespaceValidator()]],
      conversionFactor: [e?.conversionFactor ?? 1.0, [Validators.required, Validators.min(0.000001)]]
    });
  }

  addEquivalent(): void {
    this.equivalents.push(this.createEquivalentGroup());
  }

  removeEquivalent(index: number): void {
    this.equivalents.removeAt(index);
  }

  private bindEquivalents(rows: any[]): void {
    this.equivalents.clear();
    (rows || [])
      .filter(e => e.isActive !== false)
      .slice()
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
      .forEach(e => this.equivalents.push(this.createEquivalentGroup(e)));
  }

  loadQuantityTypes(): void {
    this.parameterUnitService.getQuantityTypes().subscribe({
      next: (types) => {
        this.quantityTypes = types || [];
      },
      error: () => {
        this.quantityTypes = [
          'Length', 'Mass', 'Force', 'Pressure', 'Temperature',
          'Voltage', 'Current', 'Resistance', 'Density', 'Concentration',
          'Percentage', 'Time', 'Area', 'Volume', 'Dimensionless',
          'Energy', 'Hardness', 'Other'
        ];
      }
    });
  }

  buildFilters(): any[] {
    const filters: any[] = [];
    if (this.filterCode.trim()) {
      filters.push({ column: 'code', type: 'Contains', value: this.filterCode.trim() });
    }
    if (this.filterName.trim()) {
      filters.push({ column: 'name', type: 'Contains', value: this.filterName.trim() });
    }
    if (this.filterSymbol.trim()) {
      filters.push({ column: 'symbol', type: 'Contains', value: this.filterSymbol.trim() });
    }
    if (this.filterQuantityType) {
      filters.push({ column: 'quantityType', type: 'Equal', value: this.filterQuantityType });
    }
    if (this.filterStatus !== '') {
      filters.push({ column: 'isActive', type: 'Equal', value: this.filterStatus === 'true' });
    }
    return filters;
  }

  fetchData(): void {
    const payload = {
      pageNumber: this.pageNumber,
      pageSize: this.pageSize,
      searchTerm: '',
      sortByColumn: this.sortByColumn,
      sortOrder: this.sortOrder,
      filter: this.buildFilters()
    };

    this.parameterUnitService.getAllParameterUnits(payload).subscribe({
      next: (response) => {
        this.unitList = response?.items || [];
        this.totalItems = response?.totalRecords || 0;
      },
      error: (err) => {
        this.toastService.show(err.message || 'Failed to load parameter units.', 'error');
        this.unitList = [];
        this.totalItems = 0;
      }
    });
  }

  onSearch(): void {
    this.pageNumber = 1;
    this.fetchData();
  }

  onReset(): void {
    this.filterCode = '';
    this.filterName = '';
    this.filterSymbol = '';
    this.filterQuantityType = '';
    this.filterStatus = '';
    this.pageNumber = 1;
    this.fetchData();
  }

  applySorting(column: string): void {
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

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.pageNumber = 1;
    this.fetchData();
  }

  openModal(mode: 'create' | 'edit' | 'view', id: number = 0): void {
    this.submitted = false;
    this.selectedId = id;
    this.initForm();

    if (mode === 'create') {
      this.isEditMode = false;
      this.isViewMode = false;
      this.formTitle = 'Add Parameter Unit';
      this.showModal();
    } else if (mode === 'edit') {
      this.isEditMode = true;
      this.isViewMode = false;
      this.formTitle = 'Edit Parameter Unit';
      this.loadDetails(id);
    } else if (mode === 'view') {
      this.isEditMode = false;
      this.isViewMode = true;
      this.formTitle = 'View Parameter Unit';
      this.loadDetails(id);
    }
  }

  loadDetails(id: number): void {
    this.parameterUnitService.getParameterUnitById(id).subscribe({
      next: (data) => {
        this.unitForm.patchValue({
          id: data.id,
          code: data.code,
          name: data.name,
          symbol: data.symbol,
          quantityType: data.quantityType || '',
          conversionFactor: data.conversionFactor ?? 1.0,
          description: data.description || '',
          isActive: data.isActive
        });
        this.bindEquivalents(data.equivalents);

        if (this.isViewMode) {
          this.unitForm.disable();
        } else {
          this.unitForm.enable();
        }
        this.showModal();
      },
      error: (err) => {
        this.toastService.show(err.message || 'Failed to load parameter unit details.', 'error');
      }
    });
  }

  private showModal(): void {
    if (!this.bsModal) {
      this.bsModal = new Modal(this.modalElement.nativeElement, { backdrop: 'static', keyboard: false });
    }
    this.bsModal.show();
  }

  closeModal(): void {
    this.submitted = false;
    if (this.bsModal) {
      this.bsModal.hide();
    }
    this.initForm();
    this.selectedId = 0;
    this.isEditMode = false;
    this.isViewMode = false;
  }

  onSubmit(): void {
    this.submitted = true;
    if (this.unitForm.invalid) {
      this.toastService.show('Please fill in all required fields correctly.', 'warning');
      return;
    }

    const raw = this.unitForm.getRawValue();
    const payload = {
      id: this.isEditMode ? this.selectedId : 0,
      code: (raw.code || '').trim().toUpperCase(),
      name: (raw.name || '').trim(),
      symbol: (raw.symbol || '').trim(),
      quantityType: raw.quantityType || null,
      conversionFactor: raw.conversionFactor !== null && raw.conversionFactor !== undefined && raw.conversionFactor !== '' ? Number(raw.conversionFactor) : 1.0,
      description: (raw.description || '').trim() || null,
      isActive: raw.isActive !== false,
      equivalents: (raw.equivalents || []).map((eq: any, index: number) => ({
        id: eq.id || 0,
        baseParameterUnitID: this.isEditMode ? this.selectedId : 0,
        name: (eq.name || '').trim(),
        conversionFactor: eq.conversionFactor ? Number(eq.conversionFactor) : 1.0,
        displayOrder: index + 1,
        isActive: true
      }))
    };

    if (this.isEditMode) {
      this.parameterUnitService.updateParameterUnit(payload).subscribe({
        next: (res) => {
          this.toastService.show(res?.message || 'Parameter Unit updated successfully.', 'success');
          this.closeModal();
          this.fetchData();
        },
        error: (err) => {
          this.toastService.show(err.message || 'Failed to update parameter unit.', 'error');
        }
      });
    } else {
      this.parameterUnitService.createParameterUnit(payload).subscribe({
        next: (res) => {
          this.toastService.show(res?.message || 'Parameter Unit created successfully.', 'success');
          this.closeModal();
          this.fetchData();
        },
        error: (err) => {
          this.toastService.show(err.message || 'Failed to create parameter unit.', 'error');
        }
      });
    }
  }

  toggleStatus(item: any): void {
    const action = item.isActive ? 'deactivate' : 'activate';
    const confirmed = confirm(`Are you sure you want to ${action} unit '${item.name}' (${item.code})?`);
    if (!confirmed) return;

    this.parameterUnitService.toggleStatus(item.id).subscribe({
      next: (res) => {
        this.toastService.show(res?.message || `Parameter Unit ${action}d successfully.`, 'success');
        this.fetchData();
      },
      error: (err) => {
        this.toastService.show(err.message || `Failed to ${action} parameter unit.`, 'error');
      }
    });
  }
}
