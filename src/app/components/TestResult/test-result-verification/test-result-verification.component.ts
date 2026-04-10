import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TestResultService } from '../../../services/test-result.service';
import { ToastService } from '../../../services/toast.service';
import { TestStatusBadgeComponent } from '../test-status-badge/test-status-badge.component';
import { getActionConfig, ActionButtonConfig } from '../../../utility/workflow-action.helper';

@Component({
  selector: 'app-test-result-verification',
  templateUrl: './test-result-verification.component.html',
  styleUrls: ['./test-result-verification.component.css'],
  imports: [CommonModule, FormsModule, RouterModule, TestStatusBadgeComponent],
})
export class TestResultVerificationComponent implements OnInit {
  @ViewChild('filterModal') filterModal!: ElementRef;

  columns = [
    { key: 'SampleNo', type: 'string', label: 'Sample No', filter: true },
    { key: 'CaseNo', type: 'string', label: 'Case No', filter: true },
    { key: 'TestName', type: 'string', label: 'Test Name', filter: true },
    { key: 'ParametersCount', type: 'number', label: 'Parameters', filter: false },
    { key: 'IsNabl', type: 'string', label: 'NABL', filter: true },
    { key: 'PerformedBy', type: 'string', label: 'Tester', filter: true },
    { key: 'CompletedAt', type: 'date', label: 'Completed Date', filter: true },
    { key: 'Status', type: 'string', label: 'Status', filter: true },
    { key: 'currentStep', type: 'string', label: 'Current Step', filter: false },
  ];

  filterColumnTypes: Record<string, 'string' | 'number' | 'date'> = {
    SampleNo: 'string', CaseNo: 'string', TestName: 'string',
    ParametersCount: 'number', IsNabl: 'string', PerformedBy: 'string',
    CompletedAt: 'date', Status: 'string', currentStep: 'string',
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
  sortByColumn = 'CompletedAt';
  sortOrder = 'desc';
  searchTerm = '';

  // Expanded rows — multiple can be open, cached to avoid re-fetch
  expandedMap: Record<number, boolean> = {};
  parametersCache: Record<number, any[]> = {};
  loadingMap: Record<number, boolean> = {};

  // Modals
  rejectHeaderId: number | null = null;
  rejectComments = '';
  showRejectModal = false;
  approveComments = '';
  approveHeaderId: number | null = null;
  showApproveModal = false;

  constructor(
    private testResultService: TestResultService,
    private toastService: ToastService,
    private router: Router
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

    this.testResultService.getVerificationList(payload).subscribe({
      next: (resp: any) => {
        this.listData = resp?.items || resp || [];
        this.totalItems = resp?.totalRecords || this.listData.length;
        this.pageSize = resp?.pageSize || this.pageSize;
        this.pageNumber = resp?.pageNumber || this.pageNumber;
      },
      error: () => { this.listData = []; },
    });
  }

  onSearch(): void { this.pageNumber = 1; this.fetchData(); }

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
    if (page >= 1 && page <= this.totalPages) { this.pageNumber = page; this.fetchData(); }
  }

  changePageSize(size: number): void { this.pageSize = size; this.pageNumber = 1; this.fetchData(); }

  get totalPages(): number { return Math.ceil(this.totalItems / this.pageSize); }
  getStartRecord(): number { return this.totalItems === 0 ? 0 : (this.pageNumber - 1) * this.pageSize + 1; }
  getEndRecord(): number { return Math.min(this.pageNumber * this.pageSize, this.totalItems); }

  // ── Filter Modal ──
  openFilterModal(column: string, event: MouseEvent): void {
    this.filterColumn = column;
    this.columns.forEach(c => { if (c.key === column) this.filterColumnTitle = c.label; });
    this.filterValue = ''; this.filterValue2 = '';
    const ct = this.filterColumnTypes[column];
    this.filterType = ct === 'number' ? 'Equal' : ct === 'date' ? 'Between' : 'Contains';
    const target = event.target as HTMLElement;
    const rect = target.getBoundingClientRect();
    if (this.filterModal) {
      const modal = this.filterModal.nativeElement;
      modal.style.display = 'block';
      modal.style.top = `${rect.bottom + window.scrollY - 53}px`;
      modal.style.left = `${rect.left + window.scrollX}px`;
      requestAnimationFrame(() => {
        const mr = modal.getBoundingClientRect();
        if (mr.right > window.innerWidth) modal.style.left = `${window.innerWidth - mr.width - 10 + window.scrollX}px`;
        if (mr.bottom > window.innerHeight) modal.style.top = `${rect.top + window.scrollY - mr.height - 5}px`;
      });
    }
  }

  applyFilter(): void {
    if (!this.filterColumn || this.filterValue === '') return;
    const idx = this.filters.findIndex(f => f.column === this.filterColumn);
    const d = { column: this.filterColumn, type: this.filterType, value: this.filterValue, value2: this.filterValue2 };
    if (idx > -1) this.filters[idx] = d; else this.filters.push(d);
    this.fetchData();
    this.closeFilterModal();
  }

  resetFilter(column: string): void { this.filters = this.filters.filter(f => f.column !== column); this.fetchData(); }
  closeFilterModal(): void { if (this.filterModal) this.filterModal.nativeElement.style.display = 'none'; }
  hasFilter(column: string): boolean { return this.filters?.some(f => f.column === column) ?? false; }
  getColumnType(columnKey: string): string | undefined { return this.columns.find(c => c.key === columnKey)?.type; }

  // ── Expanded Row (multiple open, cached) ──
  toggleRow(item: any): void {
    const hId = item.headerId;
    this.expandedMap[hId] = !this.expandedMap[hId];
    // Only fetch if expanding and not cached
    if (this.expandedMap[hId] && !this.parametersCache[hId]) {
      this.loadingMap[hId] = true;
      this.testResultService.getParametersForHeader(hId).subscribe({
        next: (params: any[]) => { this.parametersCache[hId] = params || []; this.loadingMap[hId] = false; },
        error: () => { this.parametersCache[hId] = []; this.loadingMap[hId] = false; },
      });
    }
  }

  isExpanded(item: any): boolean { return !!this.expandedMap[item.headerId]; }
  isLoadingRow(item: any): boolean { return !!this.loadingMap[item.headerId]; }

  getParamCount(headerId: number, status: string): number {
    const params = this.parametersCache[headerId] || [];
    return params.filter(p => p.resultStatus === status || (status === 'Pass' && p.isWithinLimit)).length;
  }

  // ── Navigation ──
  navigateToVerify(item: any, event: MouseEvent): void {
    event.stopPropagation();
    this.router.navigate(['/testing/perform', item.sampleId], {
      queryParams: { mode: 'verify', headerId: item.headerId },
      state: { mode: 'view' },
    });
  }

  // ── Approve / Reject ──
  openApproveModal(item: any, event: MouseEvent): void {
    event.stopPropagation();
    this.approveHeaderId = item.headerId;
    this.approveComments = '';
    this.showApproveModal = true;
  }

  cancelApprove(): void { this.showApproveModal = false; this.approveHeaderId = null; }

  confirmApprove(): void {
    if (!this.approveHeaderId) return;
    const item = this.listData.find(x => x.headerId === this.approveHeaderId);
    if (item?.workflowInstanceId) {
      this.testResultService.takeVerificationAction({
        id: item.workflowInstanceId, action: item.actions?.[0]?.action || 'Next',
        remarks: this.approveComments,
      }).subscribe({
        next: () => { this.toastService.show('Test verified', 'success'); this.showApproveModal = false; this.fetchData(); },
        error: (e: any) => this.toastService.show(e?.error?.message || 'Failed', 'error'),
      });
    } else {
      this.testResultService.verifyTest(this.approveHeaderId, this.approveComments).subscribe({
        next: () => { this.toastService.show('Test verified', 'success'); this.showApproveModal = false; this.fetchData(); },
        error: (e: any) => this.toastService.show(e?.error?.message || 'Failed', 'error'),
      });
    }
  }

  openRejectModal(item: any, event: MouseEvent): void {
    event.stopPropagation();
    this.rejectHeaderId = item.headerId;
    this.rejectComments = '';
    this.showRejectModal = true;
  }

  cancelReject(): void { this.showRejectModal = false; this.rejectHeaderId = null; }

  confirmReject(): void {
    if (!this.rejectHeaderId || !this.rejectComments.trim()) return;
    const item = this.listData.find(x => x.headerId === this.rejectHeaderId);
    if (item?.workflowInstanceId) {
      this.testResultService.takeVerificationAction({
        id: item.workflowInstanceId, action: 'Cancel',
        remarks: this.rejectComments,
      }).subscribe({
        next: () => { this.toastService.show('Test rejected', 'success'); this.showRejectModal = false; this.fetchData(); },
        error: (e: any) => this.toastService.show(e?.error?.message || 'Failed', 'error'),
      });
    } else {
      this.testResultService.rejectVerification(this.rejectHeaderId, this.rejectComments).subscribe({
        next: () => { this.toastService.show('Test rejected', 'success'); this.showRejectModal = false; this.fetchData(); },
        error: (e: any) => this.toastService.show(e?.error?.message || 'Failed', 'error'),
      });
    }
  }

  getActionCfg(action: string): ActionButtonConfig {
    return getActionConfig(action);
  }
}
