import { Component, ElementRef, OnInit, signal, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Modal } from 'bootstrap';
import { BankService } from '../../services/bank.service';
import { ToastService } from '../../services/toast.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-bank',
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule],
  templateUrl: './bank.component.html',
  styleUrl: './bank.component.css'
})
export class BankComponent implements OnInit {
  @ViewChild('filterModal') filterModal!: ElementRef;
  @ViewChild('modalRef') modalElement!: ElementRef;
  private bsModal!: Modal;

  columns = [
    { key: 'id', type: 'number', label: 'SN', filter: true },
    { key: 'bankName', type: 'string', label: 'Bank Name', filter: true },
    { key: 'accountHolderName', type: 'string', label: 'Account Holder Name', filter: true },
    { key: 'accountNumber', type: 'string', label: 'Account Number', filter: true },
    { key: 'createdOn', type: 'string', label: 'Created At', filter: true },
  ];
  filterColumnTypes: Record<string, 'string' | 'number' | 'date'> = {
    id: 'number',
    bankName: 'string',
    accountHolderName: 'string',
    accountNumber: 'string',
    accountType: 'string'
  };

  filters: { column: string; type: string; value: any; value2?: any }[] = [];
  filterColumn: string = 'string';
  filterColumnTitle: string = 'string';
  filterType: string = 'Contains';
  filterValue: string = '';
  filterValue2: string = '';
  filterPosition = { top: '0px', left: '0px' };
  isFilterOpen = false;
  bankList: any[] = [];

  pageNumber = 1;
  pageSize = 10;
  totalItems = 0;
  pageSizes = [5, 10, 20];

  sortByColumn: string = 'id';
  sortOrder: string = 'asc';
  searchTerm: string = '';
  isLoading = signal(false);

  payload = {
    PageNumber: this.pageNumber,
    PageSize: this.pageSize,
    searchTerm: this.searchTerm,
    sortByColumn: this.sortByColumn,
    sortOrder: this.sortOrder,
    filter: this.filters ?? null
  };

  // form
  bankForm!: FormGroup;
  isEditMode: boolean = false;
  isViewMode: boolean = true;
  customerTypeObject: any = null;
  bankId: number = 0;
  formTitle = 'Bank Form';

  accountTypes= [
    { id: 1, name: 'Saving' },
    { id: 2, name: 'Current' },
    { id: 3, name: 'Fixed Deposit' },
    { id: 4, name: 'Recurring Deposit' },
    { id: 5, name: 'NRE' },
    { id: 6, name: 'NRO' },
    { id: 7, name: 'FCNR' },
    { id: 8, name: 'Others' }
  ];
  constructor(private fb: FormBuilder, private router: Router, private route: ActivatedRoute, private bankService: BankService, private toastService: ToastService) {

  }


  ngOnInit() {
    this.fetchData();
    this.bankForm = this.fb.group({
      id: [0],
      bankName: ['', Validators.required],
      accountHolderName: ['', Validators.required],
      accountNumber: ['', Validators.required],
      accountType: ['', Validators.required],
      branchName: [''],
      ifscCode: [''],
    });
  }

  fetchData() {
    this.bankService.getAllBanks(this.payload).subscribe({
      next: (response) => {
        this.bankList = response?.items || [];
        this.totalItems = response?.totalRecords || 0;
        this.pageSize = response?.pageSize || 10;
        this.pageNumber = response?.pageNumber || 1;
        this.isLoading.set(false);
      },
      error: (error) => {
        this.toastService.show(error.message, 'error');
        this.bankList = [];
        this.isLoading.set(false);
      }
    }

    );
  }
  loadBankData(): void {
    this.bankService.getBankById(this.bankId).subscribe({
      next: (response) => {
        this.customerTypeObject = response;
        this.bankForm.patchValue({
          id: this.customerTypeObject.id || 0,
          bankName: this.customerTypeObject.bankName,
          accountHolderName: this.customerTypeObject.accountHolderName,
          accountNumber: this.customerTypeObject.accountNumber,
          accountType: this.customerTypeObject.accountType,
          branchName: this.customerTypeObject.branchName,
          ifscCode: this.customerTypeObject.ifscCode,
        });
      },
      error: (error) => {
        console.error('Error fetching tax data:', error);
      }
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
    this.columns.forEach(col => {
      if (col.key === column) {
        this.filterColumnTitle = col.label;
      }
    })
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

    const existingFilterIndex = this.filters.findIndex(f => f.column === this.filterColumn);
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
    this.filters = this.filters.filter(filter => filter.column !== column);
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
    this.pageNumber = 1; // Reset to first page
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

  hasFilter(column: string): boolean {
    return this.filters?.some(f => f.column === column) ?? false;
  }
  getColumnType(columnKey: string): string | undefined {
    const column = this.columns.find(col => col.key === columnKey);
    return column ? column.type : undefined;
  }

  deleteBank(id: number): void {
    if (id <= 0) return;
    const confirmed = window.confirm('Are you sure you want to delete this item?');
    if (confirmed) {
      this.bankService.deleteBank(id).subscribe({
        next: (response) => {
          this.fetchData();
          this.toastService.show(response.message, 'success');
        },
        error: (error) => {
          this.toastService.show(error.message, 'error');
        }
      });
    }
  }
  openModal(type: string, id: number): void {
    if (id > 0) {
      this.bankId = id;
      this.loadBankData();
    }
    if (type === 'create') {
      this.isEditMode = false;
      this.isViewMode = false;
      this.bankForm.reset();
      this.formTitle = 'Bank Form';
      this.bankForm.enable();
    } else if (type === 'edit') {
      this.isEditMode = true;
      this.isViewMode = false;
      this.formTitle = 'Bank Form';
      this.bankForm.enable();
      
    }
    else if (type === 'view') {
      this.isViewMode = true;
      this.isEditMode = false;
      this.formTitle = 'View Bank';
      this.bankForm.disable();
    }

    this.bsModal = new Modal(this.modalElement.nativeElement);
    this.bsModal.show();
  }

  closeModal(): void {
    if (this.bsModal) {
      this.bsModal.hide();
    }
  }

  onSubmit(): void {
    if (this.bankForm.valid) {
      let formData = this.bankForm.value;
      if (this.isEditMode) {
        this.bankService.updateBank(formData).subscribe({
          next: (response) => {
            this.toastService.show(response.message, 'success');
            this.closeModal();
            this.fetchData();
          },
          error: (error) => {
            this.toastService.show(error.message, 'error');
          }
        });
      } else {
        formData.id = 0;
        this.bankService.createBank(formData).subscribe({
          next: (response) => {
            this.toastService.show(response.message, 'success');
            this.closeModal();
            this.fetchData();
          },
          error: (error) => {
            this.toastService.show(error.message, 'error');
          }
        });
      }
    }
  }

}


