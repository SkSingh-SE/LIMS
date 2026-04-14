import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { AccountService } from '../../../services/account.service';
import { ToastService } from '../../../services/toast.service';
import { PaginationComponent } from '../../../utility/components/pagination/pagination.component';

@Component({
  selector: 'app-case-account-list',
  imports: [ CommonModule, RouterModule, FormsModule, PaginationComponent ],
  templateUrl: './case-account-list.component.html',
  styleUrl: './case-account-list.component.css'
})
export class CaseAccountListComponent implements OnInit {
  @ViewChild('filterModal') filterModal!: ElementRef;

  columns = [
    { key: 'caseNo', type: 'string', label: 'Case No', filter: true },
    { key: 'customerName', type: 'string', label: 'Customer', filter: true },
    { key: 'customerType', type: 'string', label: 'Customer Type', filter: true },
    { key: 'piStatus', type: 'string', label: 'PI Status', filter: true },
    { key: 'invoiceStatus', type: 'string', label: 'Invoice Status', filter: true },
    { key: 'paymentStatus', type: 'string', label: 'Payment Status', filter: true },
  ];

  filterColumnTypes: Record<string, 'string' | 'number' | 'date' | 'bool'> = {
    caseNo: 'string',
    customerName: 'string',
    customerType: 'string',
    piStatus: 'string',
    invoiceStatus: 'string',
    paymentStatus: 'string'
  };

  filters: { column: string; type: string; value: any; value2?: any }[] = [];
  filterColumn: string = '';
  filterColumnTitle: string = '';
  filterType: string = 'Contains';
  filterValue: string = '';
  filterValue2: string = '';
  isFilterOpen = false;

  dataList: any[] = [];

  pageNumber = 1;
  pageSize = 10;
  totalItems = 0;
  pageSizes = [10, 25, 50, 100, 200, 500];

  sortByColumn: string = 'caseNo';
  sortOrder: string = 'desc';
  searchTerm: string = '';

  payload = {
    PageNumber: this.pageNumber,
    PageSize: this.pageSize,
    searchTerm: this.searchTerm,
    sortByColumn: this.sortByColumn,
    sortOrder: this.sortOrder,
    filter: this.filters ?? null
  };

  constructor(
    private accountService: AccountService,
    private router: Router,
    private route: ActivatedRoute,
    private toastService: ToastService
  ) { }

  ngOnInit(): void {
    // Check for filter query parameter from dashboard
    this.route.queryParams.subscribe(params => {
      if (params['filter']) {
        this.applyFilterFromDashboard(params['filter']);
      } else {
        this.fetchData();
      }
    });
  }

  applyFilterFromDashboard(filterType: string): void {
    // Apply dashboard filter to payload
    const filterMap: Record<string, any> = {
      'pi-pending': { column: 'piStatus', type: 'Equal', value: 'Pending', value2: 'Pending' },
      'invoice-pending': { column: 'invoiceStatus', type: 'Equal', value: 'Pending', value2: 'Pending' },
      'payment-pending': { column: 'paymentStatus', type: 'Equal', value: 'Pending', value2: 'Pending' },
      'fully-settled': { column: 'paymentStatus', type: 'Equal', value: 'Paid', value2: 'Paid' }
    };

    if (filterMap[filterType]) {
      this.filters = [filterMap[filterType]];
    } else {
      // Customer type filter (e.g., "Walk In", "Credit Customer", "Relationship Credit")
      this.filters = [{ column: 'customerType', type: 'Equal', value: filterType, value2: filterType }];
    }
    this.payload.filter = this.filters;
    this.fetchData();
  }

  fetchData(): void {
    this.payload.PageNumber = this.pageNumber;
    this.payload.PageSize = this.pageSize;
    this.payload.searchTerm = this.searchTerm;
    this.payload.sortByColumn = this.sortByColumn;
    this.payload.sortOrder = this.sortOrder;
    this.payload.filter = this.filters ?? null;

    this.accountService.getCaseAccounts(this.payload).subscribe({
      next: (response) => {
        this.dataList = response?.items || response?.data || [];
        this.totalItems = response?.totalRecords || response?.totalItems || 0;
        this.pageSize = response?.pageSize || this.pageSize;
        this.pageNumber = response?.pageNumber || this.pageNumber;
      },
      error: (error) => {
        console.error('Error fetching case accounts:', error);
        this.toastService.show('Failed to load case accounts', 'error');
        this.dataList = [];
      }
    });
  }

  applySorting(column: string): void {
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

  onSearch(): void {
    this.pageNumber = 1;
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
    return (this.pageNumber - 1) * this.pageSize + 1;
  }

  getEndRecord(): number {
    return Math.min(this.pageNumber * this.pageSize, this.totalItems);
  }

  openCaseDetail(inwardId: number, mode: 'edit' | 'view' = 'edit'): void {
    this.router.navigate(['/accounts/cases', inwardId], { state: { mode } });
  }

  openFilterModal(column: string, event: MouseEvent): void {
    this.filterColumn = column;
    this.columns.forEach(col => {
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

  applyFilter(): void {
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

  resetFilter(column: string): void {
    this.filters = this.filters.filter(filter => filter.column !== column);
    this.payload.filter = this.filters;
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

  getStatusBadgeClass(status: string): string {
    const billingMap: Record<string, string> = {
      'PRICE_DRAFTED': 'badge bg-secondary',
      'PI_GENERATED': 'badge bg-info',
      'PRICE_SNAPSHOT': 'badge bg-info',
      'INVOICE_GENERATED': 'badge bg-warning text-dark',
      'PAYMENT_PENDING': 'badge bg-warning text-dark',
      'PAYMENT_PARTIAL': 'badge bg-warning text-dark',
      'PAYMENT_COMPLETED': 'badge bg-success',
    };

    if (billingMap[status]) return billingMap[status];

    // Fallback for generic status keywords
    const statusLower = (status || '').toLowerCase();
    if (statusLower.includes('pending')) return 'badge bg-warning text-dark';
    if (statusLower.includes('paid') || statusLower.includes('completed')) return 'badge bg-success';
    if (statusLower.includes('failed') || statusLower.includes('rejected')) return 'badge bg-danger';
    if (statusLower.includes('generated') || statusLower.includes('draft')) return 'badge bg-info';
    return 'badge bg-secondary';
  }
}

