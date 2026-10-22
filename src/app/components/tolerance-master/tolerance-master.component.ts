import { Component, ElementRef, OnInit, signal, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Modal } from 'bootstrap';
import { Observable } from 'rxjs';
import { ToleranceMasterService } from '../../services/tolerance-master.service';
import { ToastService } from '../../services/toast.service';
import { MaterialSpecificationService } from '../../services/material-specification.service';
import { ParameterService } from '../../services/parameter.service';
import { SearchableDropdownModalComponent } from '../../utility/components/searchable-dropdown-modal/searchable-dropdown-modal.component';
import { PaginationComponent } from '../../utility/components/pagination/pagination.component';

@Component({
  selector: 'app-tolerance-master',
  imports: [ CommonModule, FormsModule, ReactiveFormsModule, SearchableDropdownModalComponent, PaginationComponent ],
  templateUrl: './tolerance-master.component.html',
  styleUrl: './tolerance-master.component.css',
})
export class ToleranceMasterComponent implements OnInit {
  @ViewChild('filterModal') filterModal!: ElementRef;
  @ViewChild('modalRef') modalElement!: ElementRef;
  private bsModal!: Modal;

  columns = [
    { key: 'id', type: 'number', label: 'SN', filter: false },
    { key: 'standardName', type: 'string', label: 'Standard Name', filter: true },
    { key: 'parameterName', type: 'string', label: 'Parameter', filter: true },
    { key: 'valueRangeStart', type: 'number', label: 'Range Start', filter: true },
    { key: 'valueRangeEnd', type: 'number', label: 'Range End', filter: true },
    { key: 'toleranceValue', type: 'number', label: 'Tolerance', filter: true },
    { key: 'toleranceType', type: 'string', label: 'Type', filter: true },
  ];
  filterColumnTypes: Record<string, 'string' | 'number' | 'date' | 'bool'> = {
    standardName: 'string',
    parameterName: 'string',
    valueRangeStart: 'number',
    valueRangeEnd: 'number',
    toleranceValue: 'number',
    toleranceType: 'string',
  };

  filters: { column: string; type: string; value: any; value2?: any }[] = [];
  filterColumn: string = 'string';
  filterColumnTitle: string = 'string';
  filterType: string = 'Contains';
  filterValue: string = '';
  filterValue2: string = '';
  filterPosition = { top: '0px', left: '0px' };
  isFilterOpen = false;
  toleranceMasterList: any[] = [];

  pageNumber = 1;
  pageSize = 10;
  totalItems = 0;
  pageSizes = [10, 25, 50, 100, 200, 500];

  sortByColumn: string = 'modifiedOn';
  sortOrder: string = 'desc';
  searchTerm: string = '';

  payload = {
    PageNumber: this.pageNumber,
    PageSize: this.pageSize,
    searchTerm: this.searchTerm,
    sortByColumn: this.sortByColumn,
    sortOrder: this.sortOrder,
    filter: this.filters ?? null,
  };

  toleranceMasterForm!: FormGroup;
  isEditMode: boolean = false;
  isViewMode: boolean = true;
  toleranceMasterId: number = 0;
  formTitle = 'Tolerance Master Form';

  toleranceTypes = ['Absolute', 'Percentage'];

  constructor(
    private fb: FormBuilder,
    private toleranceMasterService: ToleranceMasterService,
    private toastService: ToastService,
    private materialSpecificationService: MaterialSpecificationService,
    private parameterService: ParameterService
  ) {}

  ngOnInit() {
    this.fetchData();
    this.initForm();
  }

  initForm() {
    this.toleranceMasterForm = this.fb.group({
      id: [0],
      specificationHeaderID: [null, Validators.required],
      parameterID: [null, Validators.required],
      standardName: ['', Validators.required],
      valueRangeStart: [null, Validators.required],
      valueRangeEnd: [null, Validators.required],
      toleranceValue: [null, Validators.required],
      toleranceType: ['Absolute', Validators.required],
      remark: [''],
      // Parameter metadata (UI only — not submitted)
      decimalPrecision: [2],
      parameterSymbol: [''],
      minReportableLimit: [null],
    });
  }

  /** Step attribute for numeric inputs, based on selected parameter's decimal precision. */
  getToleranceStep(): string {
    const precision = Number(this.toleranceMasterForm?.get('decimalPrecision')?.value ?? 2);
    if (precision <= 0) return '1';
    return (1 / Math.pow(10, precision)).toFixed(precision);
  }

  /** Round a numeric control to the parameter's decimal precision on blur. */
  roundToleranceField(field: string): void {
    const ctrl = this.toleranceMasterForm?.get(field);
    const raw = ctrl?.value;
    if (raw === null || raw === '' || raw === undefined) return;
    const num = Number(raw);
    if (isNaN(num)) return;
    const precision = Number(this.toleranceMasterForm?.get('decimalPrecision')?.value ?? 2);
    const rounded = Number(num.toFixed(precision));
    if (rounded !== num) {
      ctrl?.setValue(rounded, { emitEvent: false });
    }
  }

  fetchData() {
    this.toleranceMasterService.getAllToleranceMasters(this.payload).subscribe({
      next: (response) => {
        this.toleranceMasterList = response?.items || [];
        this.totalItems = response?.totalRecords || 0;
        this.pageSize = response?.pageSize || 10;
        this.pageNumber = response?.pageNumber || 1;
      },
      error: (error) => {
        this.toastService.show(error.message, 'error');
        this.toleranceMasterList = [];
      },
    });
  }

  getDetails(): void {
    const requestId = this.toleranceMasterId;
    this.toleranceMasterService.getToleranceMasterById(requestId).subscribe({
      next: (response) => {
        if (this.toleranceMasterId !== requestId) return; // discard stale response
        this.toleranceMasterForm.patchValue(response);
      },
      error: (error) => {
        console.error('Error fetching tolerance master data:', error);
      },
    });
  }

  applySorting(column: string) {
    if (this.sortByColumn === column) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortByColumn = column;
      this.sortOrder = 'asc';
    }
    this.payload.sortByColumn = this.sortByColumn;
    this.payload.sortOrder = this.sortOrder;
    this.fetchData();
  }

  openFilterModal(column: string, event: MouseEvent) {
    this.filterColumn = column;
    this.columns.forEach((col) => {
      if (col.key === column) {
        this.filterColumnTitle = col.label;
      }
    });
    this.filterValue = '';
    this.filterValue2 = '';

    const columnType = this.filterColumnTypes[column];
    switch (columnType) {
      case 'string':
        this.filterType = 'Contains';
        break;
      case 'number':
        this.filterType = 'Equal';
        break;
      case 'date':
        this.filterType = 'Between';
        break;
      default:
        this.filterType = 'Contains';
    }

    this.isFilterOpen = true;
    const target = event.target as HTMLElement;
    const rect = target.getBoundingClientRect();

    if (this.filterModal) {
      const modal = this.filterModal.nativeElement;
      modal.style.display = 'block';
      modal.style.top = `${rect.bottom + window.scrollY - 53}px`;
      modal.style.left = `${rect.left + window.scrollX}px`;

      // Clamp to viewport so the popup doesn't overflow
      requestAnimationFrame(() => {
        const modalRect = modal.getBoundingClientRect();
        if (modalRect.right > window.innerWidth) {
          modal.style.left = `${window.innerWidth - modalRect.width - 10 + window.scrollX}px`;
        }
        if (modalRect.bottom > window.innerHeight) {
          modal.style.top = `${rect.top + window.scrollY - modalRect.height - 5}px`;
        }
      });
    }
  }

  applyFilter() {
    if (!this.filterColumn || this.filterValue === '') return;

    const existingFilterIndex = this.filters.findIndex((f) => f.column === this.filterColumn);
    const filterData = { column: this.filterColumn, type: this.filterType, value: this.filterValue, value2: this.filterValue2 };

    if (existingFilterIndex > -1) {
      this.filters[existingFilterIndex] = filterData;
    } else {
      this.filters.push(filterData);
    }

    this.fetchData();
    this.closeFilterModal();
  }

  resetFilter(column: string) {
    this.filters = this.filters.filter((filter) => filter.column !== column);
    this.payload.filter = this.filters;
    this.fetchData();
  }

  closeFilterModal() {
    if (this.filterModal) {
      this.filterModal.nativeElement.style.display = 'none';
    }
  }

  onPageChange(page: number) {
    this.pageNumber = page;
    this.payload.PageNumber = this.pageNumber;
    this.fetchData();
  }

  changePageSize(event: Event) {
    this.pageSize = Number((event.target as HTMLSelectElement).value);
    this.pageNumber = 1;
    this.payload.PageNumber = this.pageNumber;
    this.payload.PageSize = this.pageSize;
    this.fetchData();
  }

  onSearch() {
    if (this.searchTerm !== this.payload.searchTerm) {
      this.pageNumber = 1;
      this.payload.PageNumber = 1;
      this.payload.searchTerm = this.searchTerm;
      this.fetchData();
    }
  }

  get totalPages(): number[] {
    return Array.from({ length: Math.ceil(this.totalItems / this.pageSize) }, (_, i) => i + 1);
  }

  getStartRecord(): number {
    return this.totalItems === 0 ? 0 : (this.pageNumber - 1) * this.pageSize + 1;
  }

  getEndRecord(): number {
    return Math.min(this.pageNumber * this.pageSize, this.totalItems);
  }

  hasFilter(column: string): boolean {
    return this.filters?.some((f) => f.column === column) ?? false;
  }

  getColumnType(columnKey: string): string | undefined {
    const column = this.columns.find((col) => col.key === columnKey);
    return column ? column.type : undefined;
  }

  deleteFn(id: number): void {
    if (id <= 0) return;
    const confirmed = window.confirm('Are you sure you want to delete this item?');
    if (confirmed) {
      this.toleranceMasterService.deleteToleranceMaster(id).subscribe({
        next: (response) => {
          this.fetchData();
          this.toastService.show(response.message, 'success');
        },
        error: (error) => {
          this.toastService.show(error.message, 'error');
        },
      });
    }
  }

  openModal(type: string, id: number): void {
    this.toleranceMasterForm.reset();
    this.toleranceMasterForm.enable();
    this.toleranceMasterId = 0;
    if (id > 0) {
      this.toleranceMasterId = id;
      this.getDetails();
    }
    if (type === 'create') {
      this.isEditMode = false;
      this.isViewMode = false;
      this.initForm();
      this.formTitle = 'Tolerance Master Form';
    } else if (type === 'edit') {
      this.isEditMode = true;
      this.isViewMode = false;
      this.formTitle = 'Tolerance Master Form';
      this.toleranceMasterForm.enable();
    } else if (type === 'view') {
      this.isViewMode = true;
      this.isEditMode = false;
      this.formTitle = 'View Tolerance Master';
      this.toleranceMasterForm.disable();
    }

    this.bsModal = new Modal(this.modalElement.nativeElement, { focus: false });
    this.bsModal.show();
  }

  closeModal(): void {
    if (this.bsModal) {
      this.bsModal.hide();
    }
    this.toleranceMasterForm.reset();
    this.toleranceMasterForm.enable();
    this.toleranceMasterId = 0;
    this.isEditMode = false;
    this.isViewMode = false;
  }

  onSubmit(): void {
    if (this.toleranceMasterForm.valid) {
      let formData = this.toleranceMasterForm.value;
      if (this.isEditMode) {
        this.toleranceMasterService.updateToleranceMaster(formData).subscribe({
          next: (response) => {
            this.toastService.show(response.message, 'success');
            this.closeModal();
            this.fetchData();
          },
          error: (error) => {
            this.toastService.show(error.message, 'error');
          },
        });
      } else {
        formData.id = 0;
        this.toleranceMasterService.createToleranceMaster(formData).subscribe({
          next: (response) => {
            this.toastService.show(response.message, 'success');
            this.closeModal();
            this.fetchData();
          },
          error: (error) => {
            this.toastService.show(error.message, 'error');
          },
        });
      }
    }
  }

  getSpecificationHeader = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.materialSpecificationService.getMaterialSpecificationDropdown(term, page, pageSize);
  };

  getParameter = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.parameterService.getParameterDropdown(term, page, pageSize);
  };

  onSpecificationHeaderSelected(item: any) {
    this.toleranceMasterForm.patchValue({ specificationHeaderID: item.id });
  }

  onParameterSelected(item: any) {
    if (!item) {
      this.toleranceMasterForm.patchValue({
        parameterID: null,
        decimalPrecision: 2,
        parameterSymbol: '',
        minReportableLimit: null
      });
      return;
    }
    const additional = item?.additionalValues || {};
    this.toleranceMasterForm.patchValue({
      parameterID: item.id,
      decimalPrecision: Number(additional.DecimalPrecision ?? additional.decimalPrecision ?? 2),
      parameterSymbol: additional.Symbol || additional.symbol || '',
      minReportableLimit: additional.MinReportableLimit ?? additional.minReportableLimit ?? null
    });

    // Round any existing numeric values to new precision
    ['valueRangeStart', 'valueRangeEnd', 'toleranceValue'].forEach(f => this.roundToleranceField(f));
  }
}
