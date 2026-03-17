import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CustomerLedgerService } from '../../../services/customer-ledger.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-outstanding-report',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './outstanding-report.component.html',
  styleUrl: './outstanding-report.component.css',
})
export class OutstandingReportComponent implements OnInit {
  reportData: any[] = [];
  isLoading = false;
  sortField = 'totalOutstanding';
  sortDir: 'asc' | 'desc' = 'desc';

  constructor(
    private customerLedgerService: CustomerLedgerService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.loadReport();
  }

  loadReport(): void {
    this.isLoading = true;
    this.customerLedgerService.getOutstandingReport().subscribe({
      next: (data) => {
        this.reportData = data || [];
        this.sortData();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading outstanding report:', err);
        this.toastService.show('Failed to load outstanding report', 'error');
        this.isLoading = false;
      },
    });
  }

  sortBy(field: string): void {
    if (this.sortField === field) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDir = 'desc';
    }
    this.sortData();
  }

  sortData(): void {
    this.reportData.sort((a, b) => {
      const aVal = a[this.sortField] || 0;
      const bVal = b[this.sortField] || 0;
      if (typeof aVal === 'string') {
        return this.sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return this.sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }

  getSortIcon(field: string): string {
    if (this.sortField !== field) return 'bi-arrow-down-up';
    return this.sortDir === 'asc' ? 'bi-sort-up' : 'bi-sort-down';
  }

  getTotalInvoiced(): number {
    return this.reportData.reduce((sum, row) => sum + (row.totalInvoiced || 0), 0);
  }

  getTotalPaid(): number {
    return this.reportData.reduce((sum, row) => sum + (row.totalPaid || 0), 0);
  }

  getTotalOutstanding(): number {
    return this.reportData.reduce((sum, row) => sum + (row.totalOutstanding || 0), 0);
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
