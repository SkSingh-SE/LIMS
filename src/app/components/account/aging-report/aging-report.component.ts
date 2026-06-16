import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CustomerLedgerService } from '../../../services/customer-ledger.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-aging-report',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './aging-report.component.html',
  styleUrl: './aging-report.component.css',
})
export class AgingReportComponent implements OnInit {
  reportData: any[] = [];
  filteredData: any[] = [];
  customerFilter = '';

  sortField = 'total';
  sortDir: 'asc' | 'desc' = 'desc';

  constructor(
    private customerLedgerService: CustomerLedgerService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.loadReport();
  }

  loadReport(): void {
    this.customerLedgerService.getAgingReport().subscribe({
      next: (data) => {
        this.reportData = data || [];
        this.applyFilter();
      },
      error: (err) => {
        console.error('Error loading aging report:', err);
        this.toastService.show('Failed to load aging report', 'error');
      },
    });
  }

  applyFilter(): void {
    if (!this.customerFilter.trim()) {
      this.filteredData = [...this.reportData];
    } else {
      const term = this.customerFilter.toLowerCase();
      this.filteredData = this.reportData.filter(
        (row) => (row.customerName || '').toLowerCase().includes(term)
      );
    }
    this.sortData();
  }

  onFilterChange(): void {
    this.applyFilter();
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
    this.filteredData.sort((a, b) => {
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
    return this.sortDir === 'asc' ? 'bi-caret-up-fill' : 'bi-caret-down-fill';
  }

  getTotal(field: string): number {
    return this.filteredData.reduce((sum, row) => sum + (row[field] || 0), 0);
  }

  getGrandTotal(): number {
    return this.filteredData.reduce((sum, row) => sum + (row.total || 0), 0);
  }
}
