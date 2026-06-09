import { Component, ElementRef, OnInit, signal, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Modal } from 'bootstrap';
import { ParameterUnitService } from '../../services/parameter-unit.service';
import { ToastService } from '../../services/toast.service';
import { noWhitespaceValidator } from '../../utility/validators/custom-validators';
import { FormValidationHelper } from '../../utility/helper/form-validation.helper';
import { FormFieldErrorComponent } from '../../utility/components/form-field-error/form-field-error.component';
import { PaginationComponent } from '../../utility/components/pagination/pagination.component';

@Component({
  selector: 'app-parameter-unit',
  imports: [ CommonModule, FormsModule, ReactiveFormsModule, FormFieldErrorComponent, PaginationComponent ],
  templateUrl: './parameter-unit.component.html',
  styleUrl: './parameter-unit.component.css',
})
export class ParameterUnitComponent implements OnInit {
  @ViewChild('filterModal') filterModal!: ElementRef;
  @ViewChild('modalRef') modalElement!: ElementRef;
  private bsModal!: Modal;

  columns = [
    { key: 'id', type: 'number', label: 'SN', filter: false },
    { key: 'name', type: 'string', label: 'Unit Name', filter: true },
    { key: 'conversaionFactor', type: 'string', label: 'Base Factor', filter: true },
    { key: 'equivalents', type: 'string', label: 'Equivalent Units', filter: false },
  ];
  filterColumnTypes: Record<string, 'string' | 'number' | 'date' | 'bool'> = {
    name: 'string',
    conversaionFactor: 'string',
  };

  filters: { column: string; type: string; value: any; value2?: any }[] = [];
  filterColumn: string = 'string';
  filterColumnTitle: string = 'string';
  filterType: string = 'Contains';
  filterValue: string = '';
  filterValue2: string = '';
  filterPosition = { top: '0px', left: '0px' };
  isFilterOpen = false;
  parameterUnitList: any[] = [];

  pageNumber = 1;
  pageSize = 10;
  totalItems = 0;
  pageSizes = [10, 25, 50, 100, 200, 500];

  sortByColumn: string = 'modifiedOn';
  sortOrder: string = 'desc';
  searchTerm: string = '';
  isLoading = signal(false);

  payload = {
    PageNumber: this.pageNumber,
    PageSize: this.pageSize,
    searchTerm: this.searchTerm,
    sortByColumn: this.sortByColumn,
    sortOrder: this.sortOrder,
    filter: this.filters ?? null,
  };

  parameterUnitForm!: FormGroup;
  submitted = false;
  isEditMode: boolean = false;
  isViewMode: boolean = true;
  parameterUnitId: number = 0;
  formTitle = 'Parameter Unit Form';

  // Intelligence features
  testValue: number | null = null;

  constructor(
    private fb: FormBuilder,
    private parameterUnitService: ParameterUnitService,
    private toastService: ToastService
  ) {}

  ngOnInit() {
    this.fetchData();
    this.initForm();
  }

  initForm() {
    this.parameterUnitForm = this.fb.group({
      id: [0],
      name: ['', [Validators.required, Validators.maxLength(100), noWhitespaceValidator()]],
      conversaionFactor: [''],
      // Normalized equivalents (unlimited add/remove). Each row: { id, name, conversionFactor }.
      equivalents: this.fb.array([]),
    });
  }

  /** Equivalents FormArray accessor. */
  get equivalents(): FormArray {
    return this.parameterUnitForm.get('equivalents') as FormArray;
  }

  createEquivalentGroup(e?: any): FormGroup {
    return this.fb.group({
      id: [e?.id ?? 0],
      name: [e?.name ?? '', [Validators.required, Validators.maxLength(50), noWhitespaceValidator()]],
      conversionFactor: [e?.conversionFactor ?? null, [Validators.min(0.000001)]],
    });
  }

  addEquivalent(): void {
    this.equivalents.push(this.createEquivalentGroup());
  }

  removeEquivalent(index: number): void {
    this.equivalents.removeAt(index);
  }

  /** Rebuild the equivalents FormArray from a saved unit's child rows. */
  private bindEquivalents(rows: any[]): void {
    this.equivalents.clear();
    (rows || [])
      .slice()
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
      .forEach(e => this.equivalents.push(this.createEquivalentGroup(e)));
  }

  getConvertedValue(index: number): string {
    if (this.testValue === null || this.testValue === undefined) return '—';
    const factor = this.equivalents.at(index)?.get('conversionFactor')?.value;
    if (!factor) return '—';
    const result = this.testValue * factor;
    return Number.isInteger(result) ? result.toString() : result.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
  }

  fetchData() {
    this.parameterUnitService.getAllParameterUnits(this.payload).subscribe({
      next: (response) => {
        this.parameterUnitList = response?.items || [];
        this.totalItems = response?.totalRecords || 0;
        this.pageSize = response?.pageSize || 10;
        this.pageNumber = response?.pageNumber || 1;
        this.isLoading.set(false);
      },
      error: (error) => {
        this.toastService.show(error.message, 'error');
        this.parameterUnitList = [];
        this.isLoading.set(false);
      },
    });
  }

  getDetails(): void {
    const requestId = this.parameterUnitId;
    this.parameterUnitService.getParameterUnitById(requestId).subscribe({
      next: (response) => {
        if (this.parameterUnitId !== requestId) return; // discard stale response
        this.parameterUnitForm.patchValue(response);
        this.bindEquivalents(response.equivalents);
        if (this.isViewMode) this.parameterUnitForm.disable();
      },
      error: (error) => {
        console.error('Error fetching parameter unit data:', error);
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
    this.columns.forEach((col) => { if (col.key === column) this.filterColumnTitle = col.label; });
    this.filterValue = '';
    this.filterValue2 = '';
    const columnType = this.filterColumnTypes[column];
    switch (columnType) {
      case 'string': this.filterType = 'Contains'; break;
      case 'number': this.filterType = 'Equal'; break;
      case 'date': this.filterType = 'Between'; break;
      default: this.filterType = 'Contains';
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
    if (existingFilterIndex > -1) this.filters[existingFilterIndex] = filterData;
    else this.filters.push(filterData);
    this.fetchData();
    this.closeFilterModal();
  }

  resetFilter(column: string) {
    this.filters = this.filters.filter((filter) => filter.column !== column);
    this.payload.filter = this.filters;
    this.fetchData();
  }

  closeFilterModal() {
    if (this.filterModal) this.filterModal.nativeElement.style.display = 'none';
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
      this.parameterUnitService.deleteParameterUnit(id).subscribe({
        next: (response) => { this.fetchData(); this.toastService.show(response.message, 'success'); },
        error: (error) => { this.toastService.show(error.message, 'error'); },
      });
    }
  }

  openModal(type: string, id: number): void {
    this.testValue = null;
    this.parameterUnitForm.reset();
    this.parameterUnitForm.enable();
    this.parameterUnitId = 0;
    if (id > 0) {
      this.parameterUnitId = id;
      this.getDetails();
    }
    if (type === 'create') {
      this.isEditMode = false;
      this.isViewMode = false;
      this.initForm();
      this.formTitle = 'Create Parameter Unit';
    } else if (type === 'edit') {
      this.isEditMode = true;
      this.isViewMode = false;
      this.formTitle = 'Edit Parameter Unit';
      this.parameterUnitForm.enable();
    } else if (type === 'view') {
      this.isViewMode = true;
      this.isEditMode = false;
      this.formTitle = 'View Parameter Unit';
      this.parameterUnitForm.disable();
    }
    this.bsModal = new Modal(this.modalElement.nativeElement);
    this.bsModal.show();
  }

  isFieldInvalid(path: string): boolean {
    return FormValidationHelper.isFieldInvalid(this.parameterUnitForm, path, this.submitted);
  }

  closeModal(): void {
    this.submitted = false;
    if (this.bsModal) this.bsModal.hide();
    this.parameterUnitForm.reset();
    this.parameterUnitForm.enable();
    this.parameterUnitId = 0;
    this.isEditMode = false;
    this.isViewMode = false;
  }

  onSubmit(): void {
    this.submitted = true;
    FormValidationHelper.markAllTouched(this.parameterUnitForm);
    if (!this.parameterUnitForm.valid) {
      this.toastService.show('Please fix the validation errors before submitting.', 'warning');
      return;
    }
    let formData = this.parameterUnitForm.value;
    if (this.isEditMode) {
      this.parameterUnitService.updateParameterUnit(formData).subscribe({
        next: (response) => { this.toastService.show(response.message, 'success'); this.closeModal(); this.fetchData(); },
        error: (error) => { this.toastService.show(error.message, 'error'); },
      });
    } else {
      formData.id = 0;
      this.parameterUnitService.createParameterUnit(formData).subscribe({
        next: (response) => { this.toastService.show(response.message, 'success'); this.closeModal(); this.fetchData(); },
        error: (error) => { this.toastService.show(error.message, 'error'); },
      });
    }
  }
}
