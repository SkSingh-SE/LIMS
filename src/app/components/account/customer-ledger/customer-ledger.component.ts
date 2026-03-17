import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CustomerLedgerService } from '../../../services/customer-ledger.service';
import { CustomerService } from '../../../services/customer.service';
import { ToastService } from '../../../services/toast.service';
import { SearchableDropdownComponent } from '../../../utility/components/searchable-dropdown/searchable-dropdown.component';

@Component({
  selector: 'app-customer-ledger',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, SearchableDropdownComponent],
  templateUrl: './customer-ledger.component.html',
  styleUrl: './customer-ledger.component.css',
})
export class CustomerLedgerComponent implements OnInit {
  selectedCustomerId: number | null = null;
  selectedCustomerName = '';
  fromDate = '';
  toDate = '';
  ledgerEntries: any[] = [];
  balance: any = null;
  openingBalance = 0;
  closingBalance = 0;
  isLoading = false;

  getCustomers = (term: string, page: number, pageSize: number) => {
    return this.customerService.getCustomerDropdown(term, page, pageSize);
  };

  constructor(
    private customerLedgerService: CustomerLedgerService,
    private customerService: CustomerService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    this.fromDate = this.formatDate(firstDay);
    this.toDate = this.formatDate(today);
  }

  onCustomerSelect(item: any): void {
    this.selectedCustomerId = item.id;
    this.selectedCustomerName = item.name;
    this.loadLedger();
    this.loadBalance();
  }

  loadLedger(): void {
    if (!this.selectedCustomerId) return;
    this.isLoading = true;
    this.customerLedgerService
      .getStatement(this.selectedCustomerId, this.fromDate, this.toDate)
      .subscribe({
        next: (data) => {
          this.ledgerEntries = data?.entries || data || [];
          this.openingBalance = data?.openingBalance || 0;
          this.closingBalance = data?.closingBalance || 0;
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error loading ledger:', err);
          this.toastService.show('Failed to load ledger entries', 'error');
          this.isLoading = false;
        },
      });
  }

  loadBalance(): void {
    if (!this.selectedCustomerId) return;
    this.customerLedgerService.getBalance(this.selectedCustomerId).subscribe({
      next: (data) => {
        this.balance = data;
      },
      error: (err) => {
        console.error('Error loading balance:', err);
      },
    });
  }

  onDateChange(): void {
    if (this.selectedCustomerId) {
      this.loadLedger();
    }
  }

  getEntryRowClass(entry: any): string {
    if (entry.transactionType === 'Invoice' || entry.debit > 0) return 'row-debit';
    if (entry.transactionType === 'Payment' || entry.credit > 0) return 'row-credit';
    return '';
  }

  printStatement(): void {
    if (!this.selectedCustomerId) {
      this.toastService.show('Please select a customer first', 'warning');
      return;
    }
    this.customerLedgerService
      .getStatement(this.selectedCustomerId, this.fromDate, this.toDate)
      .subscribe({
        next: (data) => {
          const printWindow = window.open('', '_blank');
          if (printWindow) {
            printWindow.document.write(this.buildStatementHtml(data));
            printWindow.document.close();
            printWindow.print();
          }
        },
        error: (err) => {
          console.error('Error loading statement:', err);
          this.toastService.show('Failed to generate statement', 'error');
        },
      });
  }

  exportToExcel(): void {
    if (!this.ledgerEntries.length) {
      this.toastService.show('No data to export', 'warning');
      return;
    }
    const headers = ['Date', 'Type', 'Reference', 'Description', 'Debit (INR)', 'Credit (INR)', 'Balance (INR)'];
    const rows = this.ledgerEntries.map((e) => [
      this.formatDisplayDate(e.date),
      e.transactionType || '',
      e.referenceNo || '',
      e.description || '',
      e.debit || 0,
      e.credit || 0,
      e.runningBalance || e.balance || 0,
    ]);

    let csv = headers.join(',') + '\n';
    rows.forEach((row) => {
      csv += row.map((val: any) => `"${val}"`).join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Ledger_${this.selectedCustomerName}_${this.fromDate}_${this.toDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  getDebitTotal(): number {
    return this.ledgerEntries.reduce((sum, e) => sum + (e.debit || 0), 0);
  }

  getCreditTotal(): number {
    return this.ledgerEntries.reduce((sum, e) => sum + (e.credit || 0), 0);
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  formatDisplayDate(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  private buildStatementHtml(data: any): string {
    const entries = data?.entries || data || [];
    const opening = data?.openingBalance || 0;
    const closing = data?.closingBalance || 0;
    let rows = '';
    if (Array.isArray(entries)) {
      entries.forEach((e: any) => {
        const isInvoice = e.transactionType === 'Invoice' || e.debit > 0;
        const rowColor = isInvoice ? '#fff5f5' : '#f0fff4';
        rows += `<tr style="background-color:${rowColor}">
          <td>${this.formatDisplayDate(e.date)}</td>
          <td>${e.transactionType || ''}</td>
          <td>${e.referenceNo || ''}</td>
          <td>${e.description || ''}</td>
          <td style="text-align:right">${e.debit ? e.debit.toFixed(2) : '-'}</td>
          <td style="text-align:right">${e.credit ? e.credit.toFixed(2) : '-'}</td>
          <td style="text-align:right">${(e.runningBalance || e.balance || 0).toFixed(2)}</td>
        </tr>`;
      });
    }

    return `<!DOCTYPE html>
    <html><head><title>Customer Statement</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 20px; }
      h2 { text-align: center; }
      table { width: 100%; border-collapse: collapse; margin-top: 20px; }
      th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; }
      th { background-color: #f5f5f5; }
      .header-info { margin-bottom: 20px; }
      .balance-row { background-color: #fff3cd; font-weight: bold; }
    </style></head>
    <body>
      <h2>Customer Statement</h2>
      <div class="header-info">
        <p><strong>Customer:</strong> ${this.selectedCustomerName}</p>
        <p><strong>Period:</strong> ${this.fromDate} to ${this.toDate}</p>
        <p><strong>Opening Balance:</strong> INR ${opening.toFixed(2)}</p>
      </div>
      <table>
        <thead>
          <tr>
            <th>Date</th><th>Type</th><th>Reference</th><th>Description</th>
            <th>Debit (INR)</th><th>Credit (INR)</th><th>Balance (INR)</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr class="balance-row">
            <td colspan="6" style="text-align:right">Closing Balance</td>
            <td style="text-align:right">${closing.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>
    </body></html>`;
  }
}
