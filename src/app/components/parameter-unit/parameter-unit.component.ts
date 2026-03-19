import { Component, ElementRef, OnInit, signal, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Modal } from 'bootstrap';
import { ParameterUnitService } from '../../services/parameter-unit.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-parameter-unit',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './parameter-unit.component.html',
  styleUrl: './parameter-unit.component.css',
})
export class ParameterUnitComponent implements OnInit {
  @ViewChild('filterModal') filterModal!: ElementRef;
  @ViewChild('modalRef') modalElement!: ElementRef;
  private bsModal!: Modal;

  columns = [
    { key: 'id', type: 'number', label: 'SN', filter: true },
    { key: 'name', type: 'string', label: 'Unit Name', filter: true },
    { key: 'conversaionFactor', type: 'string', label: 'Base Factor', filter: true },
    { key: 'equivalents', type: 'string', label: 'Equivalent Units', filter: false },
  ];
  filterColumnTypes: Record<string, 'string' | 'number' | 'date'> = {
    id: 'number',
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
  pageSizes = [5, 10, 20];

  sortByColumn: string = 'id';
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
  isEditMode: boolean = false;
  isViewMode: boolean = true;
  parameterUnitId: number = 0;
  formTitle = 'Parameter Unit Form';

  // Intelligence features
  similarUnitCount = 0;
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
      name: ['', Validators.required],
      conversaionFactor: [''],
      similarUnit1: [''],
      conversionFactor1: [null],
      similarUnit2: [''],
      conversionFactor2: [null],
      similarUnit3: [''],
      conversionFactor3: [null],
    });
  }

  detectSimilarUnitCount(): void {
    let count = 0;
    if (this.parameterUnitForm.get('similarUnit1')?.value || this.parameterUnitForm.get('conversionFactor1')?.value) count = 1;
    if (this.parameterUnitForm.get('similarUnit2')?.value || this.parameterUnitForm.get('conversionFactor2')?.value) count = 2;
    if (this.parameterUnitForm.get('similarUnit3')?.value || this.parameterUnitForm.get('conversionFactor3')?.value) count = 3;
    this.similarUnitCount = count;
  }

  addSimilarUnit(): void {
    if (this.similarUnitCount < 3) this.similarUnitCount++;
  }

  removeSimilarUnit(index: number): void {
    if (index === 1) {
      this.parameterUnitForm.patchValue({
        similarUnit1: this.parameterUnitForm.get('similarUnit2')?.value || '',
        conversionFactor1: this.parameterUnitForm.get('conversionFactor2')?.value,
        similarUnit2: this.parameterUnitForm.get('similarUnit3')?.value || '',
        conversionFactor2: this.parameterUnitForm.get('conversionFactor3')?.value,
        similarUnit3: '', conversionFactor3: null,
      });
    } else if (index === 2) {
      this.parameterUnitForm.patchValue({
        similarUnit2: this.parameterUnitForm.get('similarUnit3')?.value || '',
        conversionFactor2: this.parameterUnitForm.get('conversionFactor3')?.value,
        similarUnit3: '', conversionFactor3: null,
      });
    } else if (index === 3) {
      this.parameterUnitForm.patchValue({ similarUnit3: '', conversionFactor3: null });
    }
    this.similarUnitCount--;
  }

  calculateConversions(): void {}

  getConvertedValue(index: number): string {
    if (this.testValue === null || this.testValue === undefined) return '—';
    const factor = this.parameterUnitForm.get(`conversionFactor${index}`)?.value;
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
    this.parameterUnitService.getParameterUnitById(this.parameterUnitId).subscribe({
      next: (response) => {
        this.parameterUnitForm.patchValue(response);
        this.detectSimilarUnitCount();
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
    if (id > 0) {
      this.parameterUnitId = id;
      this.getDetails();
    }
    if (type === 'create') {
      this.isEditMode = false;
      this.isViewMode = false;
      this.initForm();
      this.similarUnitCount = 0;
      this.formTitle = 'Create Parameter Unit';
      this.parameterUnitForm.enable();
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

  closeModal(): void {
    if (this.bsModal) this.bsModal.hide();
    this.parameterUnitForm.reset();
    this.parameterUnitForm.enable();
    this.parameterUnitId = 0;
    this.isEditMode = false;
    this.isViewMode = false;
  }

  onSubmit(): void {
    if (this.parameterUnitForm.valid) {
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
}
