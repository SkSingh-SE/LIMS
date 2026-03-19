import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TpiInspectionService } from '../../../services/tpi-inspection.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-tpi-inspection-list',
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './tpi-inspection-list.component.html',
  styleUrl: './tpi-inspection-list.component.css',
})
export class TpiInspectionListComponent implements OnInit {
  @ViewChild('filterModal') filterModal!: ElementRef;

  columns = [
    { key: 'id', type: 'number', label: 'SN', filter: true },
    { key: 'sampleNumber', type: 'string', label: 'Sample #', filter: true },
    { key: 'tpiStage', type: 'number', label: 'Stage', filter: false },
    { key: 'tpiAgencyName', type: 'string', label: 'TPI Agency', filter: true },
    { key: 'tpiStatus', type: 'number', label: 'Status', filter: false },
    { key: 'scheduledDate', type: 'date', label: 'Scheduled Date', filter: true },
    { key: 'inspectorName', type: 'string', label: 'Inspector', filter: true },
  ];
  filterColumnTypes: Record<string, 'string' | 'number' | 'date'> = {
    id: 'number',
    sampleNumber: 'string',
    tpiAgencyName: 'string',
    scheduledDate: 'date',
    inspectorName: 'string',
  };

  filters: { column: string; type: string; value: any; value2?: any }[] = [];
  filterColumn: string = 'string';
  filterColumnTitle: string = 'string';
  filterType: string = 'Contains';
  filterValue: string = '';
  filterValue2: string = '';
  isFilterOpen = false;
  inspectionList: any[] = [];

  pageNumber = 1;
  pageSize = 10;
  totalItems = 0;
  pageSizes = [5, 10, 20];

  sortByColumn: string = 'id';
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

  stageLabels: Record<number, string> = {
    0: 'Before Preparation',
    1: 'Before Testing',
  };
  stageBadgeClass: Record<number, string> = {
    0: 'bg-info',
    1: 'bg-primary',
  };

  statusLabels: Record<number, string> = {
    0: 'Pending',
    1: 'Scheduled',
    2: 'In Progress',
    3: 'Approved',
    4: 'Rejected',
    5: 'Waived',
  };
  statusBadgeClass: Record<number, string> = {
    0: 'bg-warning text-dark',
    1: 'bg-info',
    2: 'bg-primary',
    3: 'bg-success',
    4: 'bg-danger',
    5: 'bg-secondary',
  };

  constructor(
    private tpiInspectionService: TpiInspectionService,
    private toastService: ToastService
  ) {}

  ngOnInit() {
    this.fetchData();
  }

  fetchData() {
    this.tpiInspectionService.getAll(this.payload).subscribe({
      next: (response) => {
        this.inspectionList = response?.items || [];
        this.totalItems = response?.totalRecords || 0;
        this.pageSize = response?.pageSize || 10;
        this.pageNumber = response?.pageNumber || 1;
      },
      error: (error) => {
        this.toastService.show(error.message, 'error');
        this.inspectionList = [];
      },
    });
  }

  updateStatus(id: number, newStatus: number, statusLabel: string): void {
    const remarks = prompt(`Enter remarks for ${statusLabel}:`);
    if (remarks === null) return;
    this.tpiInspectionService.updateStatus({ id, newStatus, remarks }).subscribe({
      next: (response) => {
        this.toastService.show(response.message, 'success');
        this.fetchData();
      },
      error: (error) => {
        this.toastService.show(error.error?.message || error.message, 'error');
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
