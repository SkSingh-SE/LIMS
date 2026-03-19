import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TestResultService } from '../../../services/test-result.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-test-result-verification',
  templateUrl: './test-result-verification.component.html',
  styleUrls: ['./test-result-verification.component.css'],
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
})
export class TestResultVerificationComponent implements OnInit {
  listData: any[] = [];

  // Pagination
  pageNumber = 1;
  pageSize = 10;
  totalItems = 0;
  pageSizes = [5, 10, 20];
  searchTerm = '';

  // Date range filter
  dateFrom = '';
  dateTo = '';

  payload: any = {
    PageNumber: 1,
    PageSize: 10,
    searchTerm: '',
    dateFrom: '',
    dateTo: '',
  };

  // Expanded row
  expandedHeaderId: number | null = null;
  expandedParameters: any[] = [];
  isLoadingParameters = signal(false);

  // Reject modal state
  rejectHeaderId: number | null = null;
  rejectComments = '';
  showRejectModal = false;

  // Approve comments
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
    this.payload.PageNumber = this.pageNumber;
    this.payload.PageSize = this.pageSize;
    this.payload.searchTerm = this.searchTerm;
    this.payload.dateFrom = this.dateFrom || '';
    this.payload.dateTo = this.dateTo || '';

    this.testResultService.getVerificationList(this.payload).subscribe({
      next: (resp: any) => {
        this.listData = resp?.items || resp || [];
        this.totalItems = resp?.totalRecords || this.listData.length;
        this.pageSize = resp?.pageSize || this.pageSize;
        this.pageNumber = resp?.pageNumber || this.pageNumber;
      },
      error: (err: any) => {
        console.error('Failed to load verification list:', err);
        this.listData = [];
      },
    });
  }

  onSearch(): void {
    this.pageNumber = 1;
    this.fetchData();
  }

  onPageChange(page: number): void {
    if (page < 1 || page > this.totalPagesCount) return;
    this.pageNumber = page;
    this.fetchData();
  }

  changePageSize(event: Event): void {
    this.pageSize = Number((event.target as HTMLSelectElement).value);
    this.pageNumber = 1;
    this.fetchData();
  }

  get totalPages(): number[] {
    return Array.from({ length: this.totalPagesCount }, (_, i) => i + 1);
  }
  getStartRecord(): number {
    return this.totalItems === 0 ? 0 : (this.pageNumber - 1) * this.pageSize + 1;
  }

  getEndRecord(): number {
    return Math.min(this.pageNumber * this.pageSize, this.totalItems);
  }


  get totalPagesCount(): number {
    return Math.ceil(this.totalItems / this.pageSize);
  }

  // ================================================================
  // Row Expand / Collapse
  // ================================================================
  toggleRow(item: any): void {
    const headerId = item.headerId || item.id;
    if (this.expandedHeaderId === headerId) {
      this.expandedHeaderId = null;
      this.expandedParameters = [];
      return;
    }

    this.expandedHeaderId = headerId;
    this.expandedParameters = [];
    this.isLoadingParameters.set(true);

    this.testResultService.getParametersForHeader(headerId).subscribe({
      next: (params: any) => {
        this.expandedParameters = params || [];
        this.isLoadingParameters.set(false);
      },
      error: (err: any) => {
        console.error('Failed to load parameters:', err);
        this.expandedParameters = [];
        this.isLoadingParameters.set(false);
      },
    });
  }

  isExpanded(item: any): boolean {
    const headerId = item.headerId || item.id;
    return this.expandedHeaderId === headerId;
  }

  // ================================================================
  // Approve
  // ================================================================
  openApproveModal(item: any, event: Event): void {
    event.stopPropagation();
    this.approveHeaderId = item.headerId || item.id;
    this.approveComments = '';
    this.showApproveModal = true;
  }

  confirmApprove(): void {
    if (!this.approveHeaderId) return;

    this.testResultService.verifyTest(this.approveHeaderId, this.approveComments).subscribe({
      next: () => {
        this.toastService.show('Test verified successfully', 'success');
        this.showApproveModal = false;
        this.approveHeaderId = null;
        this.approveComments = '';
        this.fetchData();
      },
      error: (err: any) => {
        console.error('Verification failed:', err);
        this.toastService.show('Failed to verify test', 'error');
      },
    });
  }

  cancelApprove(): void {
    this.showApproveModal = false;
    this.approveHeaderId = null;
    this.approveComments = '';
  }

  // ================================================================
  // Reject
  // ================================================================
  openRejectModal(item: any, event: Event): void {
    event.stopPropagation();
    this.rejectHeaderId = item.headerId || item.id;
    this.rejectComments = '';
    this.showRejectModal = true;
  }

  confirmReject(): void {
    if (!this.rejectHeaderId || !this.rejectComments.trim()) {
      this.toastService.show('Please provide rejection comments', 'error');
      return;
    }

    this.testResultService.rejectVerification(this.rejectHeaderId, this.rejectComments).subscribe({
      next: () => {
        this.toastService.show('Test verification rejected', 'success');
        this.showRejectModal = false;
        this.rejectHeaderId = null;
        this.rejectComments = '';
        this.fetchData();
      },
      error: (err: any) => {
        console.error('Rejection failed:', err);
        this.toastService.show('Failed to reject verification', 'error');
      },
    });
  }

  cancelReject(): void {
    this.showRejectModal = false;
    this.rejectHeaderId = null;
    this.rejectComments = '';
  }

  // ================================================================
  // Navigate to verify (read-only view)
  // ================================================================
  navigateToVerify(item: any, event: Event): void {
    event.stopPropagation();
    const headerId = item.headerId || item.id;
    this.router.navigate(['/testing/perform', item.sampleId], {
      queryParams: { mode: 'verify', headerId: headerId },
    });
  }

  // ================================================================
  // Date Range Filter
  // ================================================================
  onDateFilter(): void {
    this.pageNumber = 1;
    this.fetchData();
  }

  clearDateFilter(): void {
    this.dateFrom = '';
    this.dateTo = '';
    this.pageNumber = 1;
    this.fetchData();
  }

  // ================================================================
  // Status Badge
  // ================================================================
  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'PendingVerification':
        return 'badge-pending';
      case 'Verified':
        return 'badge-verified';
      case 'VerificationRejected':
        return 'badge-rejected';
      default:
        return 'badge-default';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'PendingVerification':
        return 'Pending Verification';
      case 'Verified':
        return 'Verified';
      case 'VerificationRejected':
        return 'Rejected';
      default:
        return status || '-';
    }
  }
}
