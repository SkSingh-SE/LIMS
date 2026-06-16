import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CustomerPOService } from '../../../services/customer-po.service';
import { CustomerService } from '../../../services/customer.service';
import { ToastService } from '../../../services/toast.service';
import { SearchableDropdownComponent } from '../../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { PaginationComponent } from '../../../utility/components/pagination/pagination.component';

@Component({
  selector: 'app-customer-po',
  imports: [ CommonModule, FormsModule, ReactiveFormsModule, SearchableDropdownComponent, PaginationComponent ],
  templateUrl: './customer-po.component.html',
  styleUrl: './customer-po.component.css',
})
export class CustomerPOComponent implements OnInit {
  @ViewChild('filterModal') filterModal!: ElementRef;

  columns = [
    { key: 'PONumber', type: 'string', label: 'PO No', filter: true },
    { key: 'CustomerName', type: 'string', label: 'Customer', filter: true },
    { key: 'PODate', type: 'date', label: 'Date', filter: true },
    { key: 'POAmount', type: 'number', label: 'Amount (₹)', filter: true },
    { key: 'UtilizedAmount', type: 'number', label: 'Utilized (₹)', filter: false },
    { key: 'RemainingAmount', type: 'number', label: 'Remaining (₹)', filter: false },
    { key: 'Status', type: 'string', label: 'Status', filter: true },
  ];

  filterColumnTypes: Record<string, 'string' | 'number' | 'date' | 'bool'> = {
    PONumber: 'string',
    CustomerName: 'string',
    PODate: 'date',
    POAmount: 'number',
    UtilizedAmount: 'number',
    RemainingAmount: 'number',
    Status: 'string',
  };

  filters: { column: string; type: string; value: any; value2?: any }[] = [];
  filterColumn = '';
  filterColumnTitle = '';
  filterType = 'Contains';
  filterValue = '';
  filterValue2 = '';

  poList: any[] = [];
  isSubmitting = false;
  showForm = false;
  editingId: number | null = null;
  poForm!: FormGroup;

  // Pagination
  pageNumber = 1;
  pageSize = 10;
  totalItems = 0;
  pageSizes = [10, 25, 50, 100, 200, 500];

  // Sort
  sortByColumn = 'ID';
  sortOrder = 'desc';
  searchTerm = '';

  // PO Items Detail
  selectedPO: any = null;
  poItems: any[] = [];
  isLoadingItems = false;

  getCustomers = (term: string, page: number, pageSize: number) => {
    return this.customerService.getCustomerDropdown(term, page, pageSize);
  };

  constructor(
    private fb: FormBuilder,
    private customerPOService: CustomerPOService,
    private customerService: CustomerService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.fetchData();
  }

  initForm(): void {
    this.poForm = this.fb.group({
      poNumber: ['', Validators.required],
      poDate: ['', Validators.required],
      validUntil: [''],
      poAmount: [null, [Validators.required, Validators.min(0.01)]],
      terms: [''],
      customerId: [null, Validators.required],
    });
  }

  fetchData(): void {
    const payload = {
      PageNumber: this.pageNumber,
      PageSize: this.pageSize,
      searchTerm: this.searchTerm,
      sortByColumn: this.sortByColumn,
      sortOrder: this.sortOrder,
      filter: this.filters ?? null
    };

    this.customerPOService.getAll(payload).subscribe({
      next: (res) => {
        this.poList = res?.items || res?.data || res || [];
        this.totalItems = res?.totalRecords || res?.totalCount || res?.total || this.poList.length;
        this.pageSize = res?.pageSize || this.pageSize;
        this.pageNumber = res?.pageNumber || this.pageNumber;
      },
      error: (err) => {
        console.error('Error loading PO list:', err);
        this.toastService.show('Failed to load purchase orders', 'error');
        this.poList = [];
      },
    });
  }

  onSearch(): void {
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
    if (page >= 1 && page <= this.totalPages) {
      this.pageNumber = page;
      this.fetchData();
    }
  }

  changePageSize(size: number): void {
    this.pageSize = size;
    this.pageNumber = 1;
    this.fetchData();
  }

  get totalPages(): number {
    return Math.ceil(this.totalItems / this.pageSize);
  }

  getStartRecord(): number {
    return this.totalItems === 0 ? 0 : (this.pageNumber - 1) * this.pageSize + 1;
  }

  getEndRecord(): number {
    return Math.min(this.pageNumber * this.pageSize, this.totalItems);
  }

  // ===== Filter Modal =====
  openFilterModal(column: string, event: MouseEvent): void {
    this.filterColumn = column;
    this.columns.forEach(col => {
      if (col.key === column) this.filterColumnTitle = col.label;
    });
    this.filterValue = '';
    this.filterValue2 = '';

    const columnType = this.filterColumnTypes[column];
    switch (columnType) {
      case 'string': this.filterType = 'Contains'; break;
      case 'number': this.filterType = 'Equal'; break;
      case 'date': this.filterType = 'Between'; break;
      default: this.filterType = 'Contains';
    }

    const target = event.target as HTMLElement;
    const rect = target.getBoundingClientRect();

    if (this.filterModal) {
      const modal = this.filterModal.nativeElement;
      modal.style.display = 'block';
      modal.style.top = `${rect.bottom + window.scrollY - 53}px`;
      modal.style.left = `${rect.left + window.scrollX}px`;

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

  applyFilter(): void {
    if (!this.filterColumn || this.filterValue === '') return;
    const existingIndex = this.filters.findIndex(f => f.column === this.filterColumn);
    const filterData = { column: this.filterColumn, type: this.filterType, value: this.filterValue, value2: this.filterValue2 };
    if (existingIndex > -1) {
      this.filters[existingIndex] = filterData;
    } else {
      this.filters.push(filterData);
    }
    this.fetchData();
    this.closeFilterModal();
  }

  resetFilter(column: string): void {
    this.filters = this.filters.filter(f => f.column !== column);
    this.fetchData();
  }

  closeFilterModal(): void {
    if (this.filterModal) {
      this.filterModal.nativeElement.style.display = 'none';
    }
  }

  hasFilter(column: string): boolean {
    return this.filters?.some(f => f.column === column) ?? false;
  }

  getColumnType(columnKey: string): string | undefined {
    const column = this.columns.find(col => col.key === columnKey);
    return column ? column.type : undefined;
  }

  // ===== CRUD =====
  openCreateForm(): void {
    this.editingId = null;
    this.poForm.reset();
    this.showForm = true;
  }

  openEditForm(po: any): void {
    this.editingId = po.id;
    this.poForm.patchValue({
      poNumber: po.poNumber,
      poDate: po.poDate ? po.poDate.split('T')[0] : '',
      validUntil: po.validUntil ? po.validUntil.split('T')[0] : '',
      poAmount: po.poAmount || po.amount,
      terms: po.terms,
      customerId: po.customerId,
    });
    this.showForm = true;
  }

  cancelForm(): void {
    this.showForm = false;
    this.editingId = null;
    this.poForm.reset();
  }

  onCustomerSelect(item: any): void {
    this.poForm.patchValue({ customerId: item?.id || null });
  }

  onSubmit(): void {
    if (this.poForm.invalid) {
      this.poForm.markAllAsTouched();
      this.toastService.show('Please fill all required fields', 'warning');
      return;
    }

    this.isSubmitting = true;
    const payload = this.poForm.value;

    if (this.editingId) {
      this.customerPOService.update(this.editingId, payload).subscribe({
        next: () => {
          this.toastService.show('Purchase order updated successfully', 'success');
          this.isSubmitting = false;
          this.cancelForm();
          this.fetchData();
        },
        error: (err) => {
          console.error('Error updating PO:', err);
          this.toastService.show('Failed to update purchase order', 'error');
          this.isSubmitting = false;
        },
      });
    } else {
      this.customerPOService.create(payload).subscribe({
        next: () => {
          this.toastService.show('Purchase order created successfully', 'success');
          this.isSubmitting = false;
          this.cancelForm();
          this.fetchData();
        },
        error: (err) => {
          console.error('Error creating PO:', err);
          this.toastService.show('Failed to create purchase order', 'error');
          this.isSubmitting = false;
        },
      });
    }
  }

  deletePO(po: any): void {
    if (!confirm(`Are you sure you want to delete PO "${po.poNumber}"?`)) return;

    this.customerPOService.delete(po.id).subscribe({
      next: () => {
        this.toastService.show('Purchase order deleted successfully', 'success');
        this.fetchData();
      },
      error: (err) => {
        console.error('Error deleting PO:', err);
        this.toastService.show('Failed to delete purchase order', 'error');
      },
    });
  }

  viewPOItems(po: any): void {
    if (this.selectedPO?.id === po.id) {
      this.selectedPO = null;
      this.poItems = [];
      return;
    }
    this.selectedPO = po;
    this.isLoadingItems = true;
    this.customerPOService.getById(po.id).subscribe({
      next: (res) => {
        this.poItems = res?.items || [];
        this.isLoadingItems = false;
      },
      error: (err) => {
        console.error('Error loading PO items:', err);
        this.toastService.show('Failed to load PO items', 'error');
        this.poItems = [];
        this.isLoadingItems = false;
      }
    });
  }

  closePOItems(): void {
    this.selectedPO = null;
    this.poItems = [];
  }

  getStatusBadgeClass(status: string): string {
    if (!status) return 'bg-secondary';
    const s = status.toLowerCase();
    if (s === 'active') return 'bg-success';
    if (s === 'exhausted') return 'bg-secondary';
    if (s === 'expired') return 'bg-danger';
    return 'bg-secondary';
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
