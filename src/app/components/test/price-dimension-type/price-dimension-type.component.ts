import { Component, ElementRef, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { PriceDimensionTypeService } from '../../../services/price-dimension-type.service';
import { ToastService } from '../../../services/toast.service';

declare var bootstrap: any;

@Component({
  selector: 'app-price-dimension-type',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './price-dimension-type.component.html',
  styleUrl: './price-dimension-type.component.css',
})
export class PriceDimensionTypeComponent implements OnInit {
  @ViewChild('filterModal') filterModal!: ElementRef;
  @ViewChild('formModal') formModal!: ElementRef;

  columns = [
    { key: 'id', type: 'number', label: 'SN', filter: true },
    { key: 'name', type: 'string', label: 'Name', filter: true },
    { key: 'unit', type: 'string', label: 'Unit', filter: true },
    { key: 'isRange', type: 'string', label: 'Is Range', filter: false },
    { key: 'description', type: 'string', label: 'Description', filter: true },
    { key: 'sortOrder', type: 'number', label: 'Sort Order', filter: true },
  ];

  filterColumnTypes: Record<string, 'string' | 'number' | 'date'> = {
    id: 'number',
    name: 'string',
    unit: 'string',
    description: 'string',
    sortOrder: 'number',
  };

  filters: { column: string; type: string; value: any; value2?: any }[] = [];
  filterColumn: string = 'string';
  filterColumnTitle: string = 'string';
  filterType: string = 'Contains';
  filterValue: string = '';
  filterValue2: string = '';
  filterPosition = { top: '0px', left: '0px' };
  isFilterOpen = false;

  dataList: any[] = [];
  isEditing = false;
  editingId: number | null = null;
  dimensionForm!: FormGroup;

  pageNumber = 1;
  pageSize = 10;
  totalItems = 0;
  pageSizes = [5, 10, 20];

  sortByColumn: string = 'ID';
  sortOrder: string = 'desc';
  searchTerm: string = '';

  payload = {
    PageNumber: this.pageNumber,
    PageSize: this.pageSize,
    searchTerm: this.searchTerm,
    SortByColumn: this.sortByColumn,
    SortOrder: this.sortOrder,
    filter: this.filters ?? null,
  };

  private bsModal: any;

  constructor(
    private fb: FormBuilder,
    private service: PriceDimensionTypeService,
    private toastService: ToastService
  ) {}

  ngOnInit() {
    this.initForm();
    this.fetchData();
  }

  initForm() {
    this.dimensionForm = this.fb.group({
      name: ['', [Validators.required]],
      unit: [''],
      isRange: [false],
      description: [''],
      sortOrder: [0],
    });
  }

  fetchData() {
    this.service.getAll(this.payload).subscribe({
      next: (response) => {
        this.dataList = response?.items || [];
        this.totalItems = response?.totalRecords || 0;
        this.pageSize = response?.pageSize || 10;
        this.pageNumber = response?.pageNumber || 1;
      },
      error: (error) => {
        console.error('Error fetching price dimension types:', error);
        this.dataList = [];
      },
    });
  }

  openAddModal() {
    this.isEditing = false;
    this.editingId = null;
    this.dimensionForm.reset({ name: '', unit: '', isRange: false, description: '', sortOrder: 0 });
    this.showModal();
  }

  openEditModal(item: any) {
    this.isEditing = true;
    this.editingId = item.id;
    this.dimensionForm.patchValue({
      name: item.name,
      unit: item.unit,
      isRange: item.isRange,
      description: item.description,
      sortOrder: item.sortOrder,
    });
    this.showModal();
  }

  private showModal() {
    if (this.formModal) {
      this.bsModal = new bootstrap.Modal(this.formModal.nativeElement);
      this.bsModal.show();
    }
  }

  private hideModal() {
    if (this.bsModal) {
      this.bsModal.hide();
    }
  }

  saveForm() {
    if (this.dimensionForm.invalid) {
      this.dimensionForm.markAllAsTouched();
      return;
    }

    const formData = this.dimensionForm.value;

    if (this.isEditing && this.editingId) {
      const updateData = { id: this.editingId, ...formData };
      this.service.update(updateData).subscribe({
        next: (response) => {
          this.toastService.show(response?.message || 'Updated successfully', 'success');
          this.hideModal();
          this.fetchData();
        },
        error: (error) => {
          this.toastService.show(error?.error?.message || 'Error updating record', 'error');
        },
      });
    } else {
      this.service.create(formData).subscribe({
        next: (response) => {
          this.toastService.show(response?.message || 'Created successfully', 'success');
          this.hideModal();
          this.fetchData();
        },
        error: (error) => {
          this.toastService.show(error?.error?.message || 'Error creating record', 'error');
        },
      });
    }
  }

  deleteItem(id: number): void {
    if (id <= 0) return;
    const confirmed = window.confirm('Are you sure you want to delete this item?');
    if (confirmed) {
      this.service.delete(id).subscribe({
        next: (response) => {
          this.fetchData();
          this.toastService.show(response?.message || 'Deleted successfully', 'success');
        },
        error: (error) => {
          this.toastService.show(error?.error?.message || 'Error deleting record', 'error');
        },
      });
    }
  }

  applySorting(column: string) {
    if (this.sortByColumn === column) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortByColumn = column;
      this.sortOrder = 'asc';
    }
    this.payload.SortByColumn = this.sortByColumn;
    this.payload.SortOrder = this.sortOrder;
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
    }
  }

  applyFilter() {
    if (!this.filterColumn || this.filterValue === '') return;

    const existingFilterIndex = this.filters.findIndex((f) => f.column === this.filterColumn);
    const filterData = {
      column: this.filterColumn,
      type: this.filterType,
      value: this.filterValue,
      value2: this.filterValue2,
    };

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
}
