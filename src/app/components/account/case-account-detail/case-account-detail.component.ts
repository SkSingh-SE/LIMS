import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AccountService } from '../../../services/account.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-case-account-detail',
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './case-account-detail.component.html',
  styleUrl: './case-account-detail.component.css'
})
export class CaseAccountDetailComponent implements OnInit {
  inwardId!: number;
  isReadOnly = false;
  isLoading = signal(false);
  isLoadingPayments = signal(false);
  isGeneratingInvoice = signal(false);
  isSendingInvoice = signal(false);
  sendingPaymentLinkId: number | null = null;

  caseSummary: any = null;
  payments: any[] = [];
  invoice: any = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private accountService: AccountService,
    private toastService: ToastService
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.inwardId = +params['id'];
      if (this.inwardId) {
        this.loadCaseSummary();
        this.loadPayments();
      }
    });

    this.route.queryParams.subscribe(params => {
      this.isReadOnly = params['mode'] === 'view';
    });
  }

  loadCaseSummary(): void {
    this.isLoading.set(true);
    this.accountService.getCaseSummary(this.inwardId).subscribe({
      next: (response) => {
        this.caseSummary = response;
        this.invoice = response?.invoice || null;
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading case summary:', error);
        this.toastService.show('Failed to load case summary', 'error');
        this.isLoading.set(false);
      }
    });
  }

  loadPayments(): void {
    this.isLoadingPayments.set(true);
    this.accountService.getCasePayments(this.inwardId).subscribe({
      next: (response) => {
        this.payments = response?.items || response?.data || response || [];
        this.isLoadingPayments.set(false);
      },
      error: (error) => {
        console.error('Error loading payments:', error);
        this.toastService.show('Failed to load payments', 'error');
        this.payments = [];
        this.isLoadingPayments.set(false);
      }
    });
  }

  generateInvoice(): void {
    if (!confirm('Are you sure you want to generate an invoice for this case?')) {
      return;
    }

    this.isGeneratingInvoice.set(true);
    this.accountService.generateInvoice(this.inwardId).subscribe({
      next: (response) => {
        this.toastService.show('Invoice generated successfully', 'success');
        this.loadCaseSummary(); // Reload to get the new invoice
        this.isGeneratingInvoice.set(false);
      },
      error: (error) => {
        console.error('Error generating invoice:', error);
        this.toastService.show(error?.error?.message || 'Failed to generate invoice', 'error');
        this.isGeneratingInvoice.set(false);
      }
    });
  }

  sendInvoice(method: 'email' | 'whatsapp' = 'email'): void {
    if (!this.invoice?.invoiceId && !this.invoice?.invoice_id) {
      this.toastService.show('Invoice ID not available', 'error');
      return;
    }

    const invoiceId = this.invoice.invoiceId || this.invoice.invoice_id;
    const methodName = method === 'email' ? 'email' : 'whatsapp';

    if (!confirm(`Are you sure you want to send the invoice via ${methodName}?`)) {
      return;
    }

    this.isSendingInvoice.set(true);
    this.accountService.sendInvoice(invoiceId, methodName).subscribe({
      next: (response) => {
        this.toastService.show(`Invoice sent via ${methodName} successfully`, 'success');
        this.loadCaseSummary(); // Reload to get updated invoice status
        this.isSendingInvoice.set(false);
      },
      error: (error) => {
        console.error('Error sending invoice:', error);
        this.toastService.show(error?.error?.message || `Failed to send invoice via ${methodName}`, 'error');
        this.isSendingInvoice.set(false);
      }
    });
  }

  sendPaymentLink(paymentOrderId: number): void {
    if (!confirm('Are you sure you want to send the payment link?')) {
      return;
    }

    this.sendingPaymentLinkId = paymentOrderId;
    this.accountService.sendPaymentLink(paymentOrderId).subscribe({
      next: (response) => {
        this.toastService.show('Payment link sent successfully', 'success');
        this.loadPayments(); // Reload to get updated payment status
        this.sendingPaymentLinkId = null;
      },
      error: (error) => {
        console.error('Error sending payment link:', error);
        this.toastService.show(error?.error?.message || 'Failed to send payment link', 'error');
        this.sendingPaymentLinkId = null;
      }
    });
  }

  canSendPaymentLink(status: string): boolean {
    const statusLower = (status || '').toLowerCase();
    return statusLower === 'pending' || statusLower === 'failed';
  }

  getPaymentStatusBadgeClass(status: string): string {
    const statusLower = (status || '').toLowerCase();
    if (statusLower === 'paid') return 'badge bg-success';
    if (statusLower === 'pending') return 'badge bg-warning text-dark';
    if (statusLower === 'failed') return 'badge bg-danger';
    return 'badge bg-secondary';
  }

  getInvoiceStatusBadgeClass(status: string): string {
    const statusLower = (status || '').toLowerCase();
    if (statusLower === 'paid' || statusLower === 'sent') return 'badge bg-success';
    if (statusLower === 'draft' || statusLower === 'pending') return 'badge bg-warning text-dark';
    if (statusLower === 'final') return 'badge bg-info';
    return 'badge bg-secondary';
  }

  openInvoicePreview(): void {
    if (this.invoice?.invoiceId || this.invoice?.invoice_id) {
      this.router.navigate(['/accounts/invoices', this.invoice.invoiceId || this.invoice.invoice_id, 'preview']);
    }
  }

  goBack(): void {
    this.router.navigate(['/accounts/cases']);
  }
}

