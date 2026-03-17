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
  isLoading = false;
  customerFilter = '';

  constructor(
    private customerLedgerService: CustomerLedgerService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.loadReport();
  }

  loadReport(): void {
    this.isLoading = true;
    this.customerLedgerService.getAgingReport().subscribe({
      next: (data) => {
        this.reportData = data || [];
        this.applyFilter();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading aging report:', err);
        this.toastService.show('Failed to load aging report', 'error');
        this.isLoading = false;
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
  }

  onFilterChange(): void {
    this.applyFilter();
  }

  getTotal(field: string): number {
    return this.filteredData.reduce((sum, row) => sum + (row[field] || 0), 0);
  }

  getGrandTotal(): number {
    return this.filteredData.reduce((sum, row) => sum + (row.total || 0), 0);
  }
}
