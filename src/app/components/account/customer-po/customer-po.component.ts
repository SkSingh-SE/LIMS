import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CustomerPOService } from '../../../services/customer-po.service';
import { CustomerService } from '../../../services/customer.service';
import { ToastService } from '../../../services/toast.service';
import { SearchableDropdownComponent } from '../../../utility/components/searchable-dropdown/searchable-dropdown.component';

@Component({
  selector: 'app-customer-po',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, SearchableDropdownComponent],
  templateUrl: './customer-po.component.html',
  styleUrl: './customer-po.component.css',
})
export class CustomerPOComponent implements OnInit {
  poList: any[] = [];
  isLoading = false;
  isSubmitting = false;
  showForm = false;
  editingId: number | null = null;
  poForm!: FormGroup;

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalRecords = 0;
  totalPages = 0;

  // Search
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
    this.loadPOList();
  }

  initForm(): void {
    this.poForm = this.fb.group({
      poNumber: ['', Validators.required],
      poDate: ['', Validators.required],
      validUntil: [''],
      amount: [null, [Validators.required, Validators.min(0.01)]],
      terms: [''],
      customerId: [null, Validators.required],
    });
  }

  loadPOList(): void {
    this.isLoading = true;
    const filter = {
      searchTerm: this.searchTerm,
      pageNo: this.currentPage - 1,
      pageSize: this.pageSize,
    };

    this.customerPOService.getAll(filter).subscribe({
      next: (res) => {
        this.poList = res?.items || res?.data || res || [];
        this.totalRecords = res?.totalCount || res?.total || this.poList.length;
        this.totalPages = Math.ceil(this.totalRecords / this.pageSize);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading PO list:', err);
        this.toastService.show('Failed to load purchase orders', 'error');
        this.isLoading = false;
      },
    });
  }

  onSearch(): void {
    this.currentPage = 1;
    this.loadPOList();
  }

  onPageChange(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.loadPOList();
  }

  getPages(): number[] {
    const pages: number[] = [];
    const start = Math.max(1, this.currentPage - 2);
    const end = Math.min(this.totalPages, start + 4);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

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
      amount: po.amount,
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
          this.loadPOList();
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
          this.loadPOList();
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
        this.loadPOList();
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

  getStartRecord(): number {
    return this.totalRecords === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
  }

  getEndRecord(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalRecords);
  }
}
