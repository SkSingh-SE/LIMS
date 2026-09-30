import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SampleInwardService } from '../../../services/sample-inward.service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TestStatusBadgeComponent } from '../../TestResult/test-status-badge/test-status-badge.component';
import { StatusHelperService } from '../../../utility/status-helpers/status-helper.service';
import { RoleHelperService } from '../../../utility/role-helpers/role-helper.service';
import { PaginationComponent } from '../../../utility/components/pagination/pagination.component';
import { BreadcrumbComponent } from '../../../utility/components/breadcrumb/breadcrumb.component';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-sample-inward-list',
  imports: [CommonModule, RouterModule, FormsModule, TestStatusBadgeComponent, PaginationComponent, BreadcrumbComponent],
  templateUrl: './sample-inward-list.component.html',
  styleUrl: './sample-inward-list.component.css'
})
export class SampleInwardListComponent implements OnInit {
  @ViewChild('filterModal') filterModal!: ElementRef;

  columns = [
    { key: 'caseNo', type: 'string', label: 'Case No', filter: true },
    { key: 'customerName', type: 'string', label: 'Customer', filter: true },
    { key: 'contactPersonName', type: 'string', label: 'Contact Person', filter: true },
    { key: 'contactEmail', type: 'string', label: 'Contact Email', filter: true },
    { key: 'contactPhone', type: 'string', label: 'Contact Phone', filter: true },
    { key: 'collectionTime', type: 'string', label: 'Collection Time', filter: true },
    { key: 'inwardStatus', type: 'string', label: 'Status', filter: true },
    { key: 'modifiedBy', type: 'string', label: 'Modified By', filter: true },
    { key: 'modifiedOn', type: 'date', label: 'Modified On', filter: true },
  ];
  filterColumnTypes: Record<string, 'string' | 'number' | 'date' | 'bool'> = {
    caseNo: 'string',
    customerName: 'string',
    contactPersonName: 'string',
    contactEmail: 'string',
    contactPhone: 'string',
    collectionTime: 'string',
    inwardStatus: 'string',
    modifiedBy: 'string',
    modifiedOn: 'date',
  };

  filters: { column: string; type: string; value: any; value2?: any }[] = [];
  filterColumn: string = 'string';
  filterColumnTitle: string = 'string';
  filterType: string = 'Contains';
  filterValue: string = '';
  filterValue2: string = '';
  filterPosition = { top: '0px', left: '0px' };
  isFilterOpen = false;
  // materialSpecificationListForm: FormGroup;
  listData: any[] = [];

  pageNumber = 1;
  pageSize = 10;
  totalItems = 0;
  pageSizes = [10, 25, 50, 100];

  sortByColumn: string = 'modifiedOn';
  sortOrder: string = 'desc';
  searchTerm: string = '';
  selectedStatus: string = 'all';
  statusOptions: string[] = [
    'INWARD_REGISTERED',
    'UNDER_PLANNING',
    'UNDER_REVIEW',
    'SAMPLE_UNDER_PREPARATION',
    'UNDER_TESTING',
    'TESTING_COMPLETED',
    'INWARD_COMPLETED'
  ];

  get totalColumns(): number {
    return 10;
  }

  payload = {
    PageNumber: this.pageNumber,
    PageSize: this.pageSize,
    searchTerm: this.searchTerm,
    sortByColumn: this.sortByColumn,
    sortOrder: this.sortOrder,
    filter: this.filters ?? null
  };

  constructor(
    private inwardService: SampleInwardService,
    private statusHelper: StatusHelperService,
    private roleHelper: RoleHelperService,
    private toastService: ToastService
  ) {
  }

  /**
   * Check if inward can be edited based on status
   */
  canEditInward(item: any): boolean {
    const status = item.inwardStatus || item.status || '';
    return this.statusHelper.canEditInward(status) && this.roleHelper.canEditInward();
  }

  /**
   * Check if inward can be deleted based on status
   */
  canDeleteInward(item: any): boolean {
    const status = item.inwardStatus || item.status || '';
    return this.statusHelper.canDeleteInward(status) && this.roleHelper.canDeleteInward();
  }


  ngOnInit() {
    this.fetchData();
  }

  fetchData() {
    this.inwardService.getAllSampleInward(this.payload).subscribe({
      next: (response) => {
        this.listData = response?.items || [];
        this.totalItems = response?.totalRecords || 0;
        this.pageSize = response?.pageSize || 10;
        this.pageNumber = response?.pageNumber || 1;
      },
      error: (error) => {
        this.listData = [];
        this.toastService.show(error?.error?.message || 'Error loading Sample Inward list.', 'error');
      }
    });
  }

  private syncStatusFilter(): void {
    this.filters = this.selectedStatus && this.selectedStatus !== 'all'
      ? [{ column: 'inwardStatus', type: 'Equal', value: this.selectedStatus }]
      : [];
    this.payload.filter = this.filters;
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

    // Determine filter type dynamically
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

    const existingFilterIndex = this.filters.findIndex(f => f.column === this.filterColumn);
    const filterData = { column: this.filterColumn, type: this.filterType, value: this.filterValue, value2: this.filterValue2 };

    if (existingFilterIndex > -1) {
      this.filters[existingFilterIndex] = filterData;
    } else {
      this.filters.push(filterData);
    }

    this.payload.filter = this.filters;
    this.pageNumber = 1;
    this.payload.PageNumber = 1;
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
    this.onPageSizeChange(Number((event.target as HTMLSelectElement).value));
  }

  onPageSizeChange(newSize: number): void {
    this.pageSize = newSize;
    this.pageNumber = 1;
    this.payload.PageNumber = this.pageNumber;
    this.payload.PageSize = this.pageSize;
    this.fetchData();
  }

  onSearch() {
    this.syncStatusFilter();
    this.pageNumber = 1;
    this.payload.PageNumber = 1;
    this.payload.searchTerm = this.searchTerm ? this.searchTerm.trim() : '';
    this.fetchData();
  }

  onFilterChange(): void {
    this.pageNumber = 1;
    this.payload.PageNumber = 1;
    this.onSearch();
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedStatus = 'all';
    this.filters = [];
    this.payload.filter = this.filters;
    this.payload.searchTerm = '';
    this.pageNumber = 1;
    this.payload.PageNumber = 1;
    this.sortByColumn = 'modifiedOn';
    this.sortOrder = 'desc';
    this.payload.sortByColumn = this.sortByColumn;
    this.payload.sortOrder = this.sortOrder;
    this.fetchData();
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
    return this.filters?.some(f => f.column === column) ?? false;
  }
  getColumnType(columnKey: string): string | undefined {
    const column = this.columns.find(col => col.key === columnKey);
    return column ? column.type : undefined;
  }

  // Expose statusHelper to template
  get statusHelperService() {
    return this.statusHelper;
  }
}

