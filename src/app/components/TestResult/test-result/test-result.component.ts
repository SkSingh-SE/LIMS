import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, signal, ViewChild } from '@angular/core';
import { FormBuilder, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TestResultService } from '../../../services/test-result.service';
import { TestStatusBadgeComponent } from '../test-status-badge/test-status-badge.component';

@Component({
  selector: 'app-test-result',
  templateUrl: './test-result.component.html',
  styleUrls: ['./test-result.component.css'],
  imports: [CommonModule, RouterModule, FormsModule, TestStatusBadgeComponent]
})
export class TestResultComponent implements OnInit {
  @ViewChild('filterModal') filterModal!: ElementRef;

  columns = [
    { key: 'sampleNo', type: 'string', label: 'Sample No', filter: true },
    { key: 'caseNo', type: 'string', label: 'Case No', filter: true },
    { key: 'customerName', type: 'string', label: 'Customer', filter: true },
    { key: 'material', type: 'string', label: 'Material', filter: true },
    { key: 'condition', type: 'string', label: 'Condition', filter: true },
    { key: 'tests', type: 'string', label: 'Tests', filter: false },
    { key: 'sampleStatus', type: 'string', label: 'Status', filter: true },
  ];
  filterColumnTypes: Record<string, 'string' | 'number' | 'date'> = {
    caseNo: 'string',
    customerName: 'string',
    sampleNo: 'string',
    material: 'string',
    condition: 'string',
    sampleStatus: 'string',
    tests: 'string',
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

  constructor(private fb: FormBuilder, private testresultService: TestResultService) {
  }


  ngOnInit() {
    this.fetchData();
  }

  fetchData() {
    this.isLoading.set(true);
    // Prefer dashboard-specific API; fall back to list if needed
    this.testresultService.getDashboardItems(this.payload).subscribe({
      next: (response) => {
        // response expected as array of dashboard items
        this.listData = (response || []).map((item: any) => this.enrichDashboardItem(item));
        this.totalItems = (response && (response as any).length) || 0;
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error fetching dashboard items:', error);
        // Try fallback to generic list API
        this.testresultService.getAllTestResults(this.payload).subscribe({
          next: (resp) => {
            this.listData = (resp?.items || []).map((item: any) => this.enrichDashboardItem(item));
            this.totalItems = resp?.totalRecords || 0;
            this.pageSize = resp?.pageSize || 10;
            this.pageNumber = resp?.pageNumber || 1;
            this.isLoading.set(false);
          },
          error: (err) => {
            console.error('Fallback list API failed:', err);
            this.listData = [];
            this.isLoading.set(false);
          }
        });
      }
    });

  }

  /**
   * Enrich dashboard item with computed properties
   * Maps API response to component display format
   */
  enrichDashboardItem(item: any) {
    // Validate critical fields
    if (!item.sampleId && !item.id) {
      console.warn('[Dashboard] Missing sample ID for item:', item);
    }
    if (!item.sampleNo) {
      console.warn('[Dashboard] Missing sample number for item:', item);
    }
    if (!item.tests) {
      console.warn('[Dashboard] Missing tests for sample:', item.sampleNo || item.id);
    }

    return {
      ...item,
      // Ensure sampleStatus field maps correctly from status or derives from test array
      sampleStatus: this.deriveSampleStatus(item),
      // Ensure proper ID references for routing
      sampleId: item.sampleId || item.id,
      planId: item.planId || null,
      // Ensure tests string is comma-separated test names
      tests: this.formatTestsDisplay(item.tests),
      // Check if sample has long-term tests that are active
      hasLongTermTests: this.hasActiveLongTermTests(item)
    };
  }

  /**
   * Check if sample has active long-term tests
   */
  hasActiveLongTermTests(item: any): boolean {
    // Check if any test is marked as long-term or has long-term status
    if (Array.isArray(item.tests)) {
      return item.tests.some((t: any) =>
        t.status === 'Long-Term' ||
        t.isLongTerm === true ||
        t.testType === 'LongTerm'
      );
    }

    // Check if item has explicit long-term flag
    return item.hasLongTermTests === true || item.isLongTermTest === true;
  }

  /**
   * Derive overall sample status from individual test statuses
   * Status priority: Completed > In Progress > Started > Pending
   */
  deriveSampleStatus(item: any): string {
    // If status is already provided, use it
    if (item.status && item.status !== 'Pending') {
      return item.status;
    }

    // If tests array exists, derive from test states
    if (Array.isArray(item.tests) && item.tests.length > 0) {
      const statuses = item.tests.map((t: any) => t.status || t.testStatus || 'Pending');

      if (statuses.some((s: string) => s === 'Completed')) return 'Completed';
      if (statuses.some((s: string) => s === 'In Progress')) return 'In Progress';
      if (statuses.some((s: string) => s === 'Started')) return 'Started';
      if (statuses.some((s: string) => s === 'Pending')) return 'Pending';
    }

    // Default to Pending
    return 'Pending';
  }

  /**
   * Format tests for display
   * Convert from array or string to comma-separated names
   */
  formatTestsDisplay(tests: any): string {
    if (!tests) return '-';

    // If tests is a string, return as-is
    if (typeof tests === 'string') {
      return tests;
    }

    // If tests is an array, map to names
    if (Array.isArray(tests)) {
      return tests
        .map((t: any) => {
          // Handle different property names
          return t.name || t.testName || t.testMethodName || 'Unknown';
        })
        .join(', ');
    }

    return '-';
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

  onActionClick(action: any) {
   console.log('Action clicked:', action);
  }

}

