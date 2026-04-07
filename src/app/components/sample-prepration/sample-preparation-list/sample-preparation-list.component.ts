import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { SamplePreparationService } from '../../../services/sample-preparation.service';
import { ToastService } from '../../../services/toast.service';
import { TestStatusBadgeComponent } from '../../TestResult/test-status-badge/test-status-badge.component';

@Component({
  selector: 'app-sample-preparation-list',
  imports: [CommonModule, RouterModule, FormsModule, TestStatusBadgeComponent],
  templateUrl: './sample-preparation-list.component.html',
  styleUrl: './sample-preparation-list.component.css',
})
export class SamplePreparationListComponent implements OnInit {
  @ViewChild('filterModal') filterModal!: ElementRef;

  columns = [
    { key: 'CaseNo', type: 'string', label: 'Case No', filter: true },
    { key: 'SampleNo', type: 'string', label: 'Sample No', filter: true },
    { key: 'CustomerName', type: 'string', label: 'Customer', filter: true },
    { key: 'SampleDescription', type: 'string', label: 'Material', filter: true },
    { key: 'Status', type: 'string', label: 'Status', filter: true },
    { key: 'AssignedToName', type: 'string', label: 'Assigned To', filter: false },
    { key: 'TotalCharges', type: 'number', label: 'Total Charges (₹)', filter: false },
  ];

  filterColumnTypes: Record<string, 'string' | 'number' | 'date'> = {
    CaseNo: 'string',
    SampleNo: 'string',
    CustomerName: 'string',
    SampleDescription: 'string',
    Status: 'string',
    AssignedToName: 'string',
    TotalCharges: 'number',
  };

  filters: { column: string; type: string; value: any; value2?: any }[] = [];
  filterColumn = '';
  filterColumnTitle = '';
  filterType = 'Contains';
  filterValue = '';
  filterValue2 = '';

  listData: any[] = [];
  pageNumber = 1;
  pageSize = 10;
  totalItems = 0;
  pageSizes = [5, 10, 20, 50];
  sortByColumn = 'InwardID';
  sortOrder = 'desc';
  searchTerm = '';

  constructor(
    private prepService: SamplePreparationService,
    private router: Router,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.fetchData();
  }

  fetchData(): void {
    const payload = {
      PageNumber: this.pageNumber,
      PageSize: this.pageSize,
      searchTerm: this.searchTerm,
      sortByColumn: this.sortByColumn,
      sortOrder: this.sortOrder,
      filter: this.filters ?? null,
    };

    this.prepService.getAll(payload).subscribe({
      next: (res) => {
        this.listData = res?.items || [];
        this.totalItems = res?.totalRecords || 0;
        this.pageSize = res?.pageSize || this.pageSize;
        this.pageNumber = res?.pageNumber || this.pageNumber;
      },
      error: (err) => {
        console.error('Error fetching preparation list:', err);
        this.toastService.show('Failed to load preparation list', 'error');
        this.listData = [];
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

  navigateTo(item: any, mode: string): void {
    if (item.id > 0) {
      this.router.navigate([`/sample/preparation/${mode}`, item.id], { state: { mode } });
    } else {
      // No prep record yet — create mode by sample
      this.router.navigate(['/sample/preparation/create', item.sampleID], { state: { mode: 'create' } });
    }
  }

  // ── Filter Modal ──
  openFilterModal(column: string, event: MouseEvent): void {
    this.filterColumn = column;
    this.columns.forEach((col) => {
      if (col.key === column) this.filterColumnTitle = col.label;
    });
    this.filterValue = '';
    this.filterValue2 = '';
    const columnType = this.filterColumnTypes[column];
    this.filterType = columnType === 'number' ? 'Equal' : columnType === 'date' ? 'Between' : 'Contains';

    const target = event.target as HTMLElement;
    const rect = target.getBoundingClientRect();
    if (this.filterModal) {
      const modal = this.filterModal.nativeElement;
      modal.style.display = 'block';
      modal.style.top = `${rect.bottom + window.scrollY - 53}px`;
      modal.style.left = `${rect.left + window.scrollX}px`;
      requestAnimationFrame(() => {
        const modalRect = modal.getBoundingClientRect();
        if (modalRect.right > window.innerWidth) modal.style.left = `${window.innerWidth - modalRect.width - 10 + window.scrollX}px`;
        if (modalRect.bottom > window.innerHeight) modal.style.top = `${rect.top + window.scrollY - modalRect.height - 5}px`;
      });
    }
  }

  applyFilter(): void {
    if (!this.filterColumn || this.filterValue === '') return;
    const idx = this.filters.findIndex((f) => f.column === this.filterColumn);
    const data = { column: this.filterColumn, type: this.filterType, value: this.filterValue, value2: this.filterValue2 };
    if (idx > -1) this.filters[idx] = data;
    else this.filters.push(data);
    this.fetchData();
    this.closeFilterModal();
  }

  resetFilter(column: string): void {
    this.filters = this.filters.filter((f) => f.column !== column);
    this.fetchData();
  }

  closeFilterModal(): void {
    if (this.filterModal) this.filterModal.nativeElement.style.display = 'none';
  }

  hasFilter(column: string): boolean {
    return this.filters?.some((f) => f.column === column) ?? false;
  }

  getColumnType(columnKey: string): string | undefined {
    return this.columns.find((col) => col.key === columnKey)?.type;
  }
}
