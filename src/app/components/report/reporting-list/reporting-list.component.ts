import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ReportingService, ReportingListItem } from '../../../services/reporting.service';
import { TestStatusBadgeComponent } from '../../TestResult/test-status-badge/test-status-badge.component';
import { ToastService } from '../../../services/toast.service';
import { StatusHelperService } from '../../../utility/status-helpers/status-helper.service';
import { RoleHelperService } from '../../../utility/role-helpers/role-helper.service';
import { HasPermissionDirective } from '../../../utility/directives/has-permission.directive';

@Component({
  selector: 'app-reporting-list',
  templateUrl: './reporting-list.component.html',
  styleUrls: ['./reporting-list.component.css'],
  imports: [CommonModule, RouterModule, FormsModule, TestStatusBadgeComponent, HasPermissionDirective]
})
export class ReportingListComponent implements OnInit {
  @ViewChild('filterModal') filterModal!: ElementRef;
  pdfGeneratingId: string | null = null; // Track which item is generating PDF
  columns = [
    { key: 'sampleNo', type: 'string', label: 'Sample No', filter: true },
    { key: 'caseNo', type: 'string', label: 'Case No', filter: true },
    { key: 'customer', type: 'string', label: 'Customer', filter: true },
    { key: 'material', type: 'string', label: 'Material', filter: true },
    { key: 'condition', type: 'string', label: 'Condition', filter: true },
    { key: 'status', type: 'string', label: 'Status', filter: true },
  ];
  filterColumnTypes: Record<string, 'string' | 'number' | 'date'> = {
    caseNo: 'string',
    customer: 'string',
    sampleNo: 'string',
    material: 'string',
    condition: 'string',
    status: 'string'
  };

  filters: { column: string; type: string; value: any; value2?: any }[] = [];
  filterColumn: string = 'string';
  filterColumnTitle: string = 'string';
  filterType: string = 'Contains';
  filterValue: string = '';
  filterValue2: string = '';
  filterPosition = { top: '0px', left: '0px' };
  isFilterOpen = false;

  reportingData: ReportingListItem[] = [];
  filteredData: ReportingListItem[] = [];

  // Search and Filter
  searchTerm: string = '';

  // Sorting
  sortByColumn: string = 'sampleNo';
  sortOrder: string = 'desc';

  // Pagination
  pageNumber: number = 1;
  pageSize: number = 10;
  pageSizes = [5, 10, 20, 50];
  totalRecords: number = 0;

  totalItems = 0;
  payload = {
    PageNumber: this.pageNumber,
    PageSize: this.pageSize,
    searchTerm: this.searchTerm,
    sortByColumn: this.sortByColumn,
    sortOrder: this.sortOrder,
    filter: this.filters ?? null
  };
  // Available filter values (dummy)
  customers: string[] = ['ABC Metals', 'Shreenath Steel', 'Tata Steel', 'JSW Steel', 'ArcelorMittal', 'SAIL'];
  materials: string[] = ['TMT', 'Billet', 'Wire Rod', 'Plate', 'Coil', 'Bar'];
  statuses: string[] = ['Pending', 'Completed', 'ReadyForReport'];

  constructor(
    private reportingService: ReportingService,
    private router: Router,
    private toast: ToastService,
    private statusHelper: StatusHelperService,
    private roleHelper: RoleHelperService
  ) { }

  ngOnInit(): void {
    this.fetchData();
  }

  fetchData(): void {
    // Prefer dashboard API which supports paging/filtering. Fall back to local list when not available.
    this.payload.PageNumber = this.pageNumber;
    this.payload.PageSize = this.pageSize;
    this.payload.searchTerm = this.searchTerm;
    this.payload.sortByColumn = this.sortByColumn;
    this.payload.sortOrder = this.sortOrder;
    this.payload.filter = this.filters ?? null;

    this.reportingService.getReportDashboardList(this.payload).subscribe({
      next: (resp) => {
        // Response shapes vary: try common properties
        const items = resp?.items || resp?.data || resp || [];
        this.reportingData = Array.isArray(items) ? items : [];

        this.totalRecords = resp?.totalRecords || this.reportingData.length;
        this.pageSize = resp?.pageSize || this.pageSize;
        this.pageNumber = resp?.pageNumber || this.pageNumber;
        this.applyFiltersAndSort();
      },
      error: (error) => {
        console.error('Error loading reporting data (dashboard API):', error);
        // fallback
        this.reportingService.getReportingList().subscribe({
          next: (data) => {
            this.reportingData = data || [];
            this.applyFiltersAndSort();
          },
          error: (err) => {
            console.error('Fallback error loading reporting data:', err);
          }
        });
      }
    });
  }

  applyFiltersAndSort(): void {
    let filtered = [...this.reportingData];

    // Apply search filter
    if (this.searchTerm.trim()) {
      const searchLower = this.searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.sampleNo.toLowerCase().includes(searchLower) ||
        item.caseNo.toLowerCase().includes(searchLower) ||
        item.customer.toLowerCase().includes(searchLower)
      );
    }


    // Apply sorting
    filtered.sort((a, b) => {
      let valueA = (a as any)[this.sortByColumn];
      let valueB = (b as any)[this.sortByColumn];

      if (typeof valueA === 'string') {
        valueA = valueA.toLowerCase();
        valueB = (valueB as any).toLowerCase();
      }

      if (valueA < valueB) {
        return this.sortOrder === 'asc' ? -1 : 1;
      } else if (valueA > valueB) {
        return this.sortOrder === 'asc' ? 1 : -1;
      }
      return 0;
    });

    this.totalRecords = filtered.length;
    this.pageNumber = 1; // Reset to first page

    // Apply pagination
    const startIndex = (this.pageNumber - 1) * this.pageSize;
    this.filteredData = filtered.slice(startIndex, startIndex + this.pageSize);
  }

  performWorkflowAction(item: any, action: 'Next' | 'Cancel' | 'Back') {
    const selectedAction = item.actions?.find(
      (a: any) => a.action === action
    );

    if (!selectedAction) {
      this.toast.show('Invalid action selected.', 'error');
      return;
    }

    let comments: string | null = '';

    // Prompt ONLY for non-Next actions
    if (action !== 'Next') {
      const input = prompt(
        `Enter comments for ${action.toLowerCase()} (optional):`,
        ''
      );
      if (input === null || input === "") {
        return; // user cancelled
      }
      comments = input;
      if (comments === null || comments.trim() === '') {
        this.toast.show('Comments are required for this action.', 'error');
        return;
      }
    }

    const payload = {
      id: selectedAction.id,
      action: selectedAction.action,
      name: selectedAction.name,
      remarks: comments || ''
    };

    this.reportingService.takeWorkflowAction(payload).subscribe({
      next: () => {
        this.toast.show('Action completed successfully.', 'success');
        this.fetchData();
      },
      error: (err) => {
        console.error('Workflow action failed:', err);
        this.toast.show('Action failed. See console for details.', 'error');
      }
    });
  }

  /**
   * Generate PDF for approved/completed report
   */
  generatePdf(item: ReportingListItem, event: Event): void {
    event.stopPropagation();

    if (!item?.reportHeaderId) {
      alert('Report ID is not available.');
      return;
    }

    // Check if status allows PDF generation
    if (!this.canGeneratePdf(item.status)) {
      alert('PDF can only be generated for approved/completed reports.');
      return;
    }

    this.pdfGeneratingId = item.reportHeaderId;
    // Download PDF directly via format endpoint (returns blob)
    const headerId = +(item.reportHeaderId || 0);
    this.reportingService.generateByFormat(headerId, 0).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Report-${item.sampleNo || headerId}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.pdfGeneratingId = null;
        this.fetchData();
      },
      error: (err) => {
        this.pdfGeneratingId = null;
        console.error('PDF generation failed:', err);
        this.toast.show('PDF generation failed', 'error');
      }
    });
  }

  /**
   * Check if report status allows PDF generation
   */
  canGeneratePdf(status: string): boolean {
    return this.statusHelper.canGeneratePDF(status);
  }

  /**
   * Check if user can approve reports
   */
  canApproveReport(): boolean {
    return this.roleHelper.canApproveReport();
  }

  /**
   * Check if user can request amendments
   */
  canRequestAmendment(): boolean {
    return true;
    return this.roleHelper.canRequestAmendment();
  }

  onSearch(): void {
    this.applyFiltersAndSort();
  }

  applySorting(column: string): void {
    if (this.sortByColumn === column) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortByColumn = column;
      this.sortOrder = 'asc';
    }
    this.applyFiltersAndSort();
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.pageNumber = page;
      this.applyFiltersAndSort();
    }
  }

  changePageSize(size: number): void {
    this.pageSize = size;
    this.pageNumber = 1;
    this.applyFiltersAndSort();
  }

  get totalPages(): number {
    return Math.ceil(this.totalRecords / this.pageSize);
  }

  onFilterChange(): void {
    this.applyFiltersAndSort();
  }




  getEndRecord(): number {
    return Math.min(this.pageNumber * this.pageSize, this.totalRecords);
  }

  getStartRecord(): number {
    return (this.pageNumber - 1) * this.pageSize + 1;
  }

  //filter modal logic
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
  hasFilter(column: string): boolean {
    return this.filters?.some(f => f.column === column) ?? false;
  }
  getColumnType(columnKey: string): string | undefined {
    const column = this.columns.find(col => col.key === columnKey);
    return column ? column.type : undefined;
  }

  canAmend(status: string): boolean {
    return true;
    return this.statusHelper.canAmendReport(status);
  }

  openAmendment(item: any): void {
    this.router.navigate(['/reporting/amend', item.reportHeaderId]);
  }

  /**
   * Check if pricing can be viewed (read-only after approval)
   */
  canViewPricing(item: any): boolean {
    return this.statusHelper.canViewPricing(item.status || '');
  }

  getItemPrice(item: ReportingListItem): string | number {
    const itemAny = item as any;
    return itemAny.totalAmount || itemAny.price || itemAny.pricing?.totalAmount || 'N/A';
  }

  // Expose statusHelper to template
  get statusHelperService() {
    return this.statusHelper;
  }
}
