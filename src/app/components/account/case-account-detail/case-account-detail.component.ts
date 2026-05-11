import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AccountService } from '../../../services/account.service';
import { ToastService } from '../../../services/toast.service';
import { StatusHelperService } from '../../../utility/status-helpers/status-helper.service';
import { RoleHelperService } from '../../../utility/role-helpers/role-helper.service';
import { HasPermissionDirective } from '../../../utility/directives/has-permission.directive';
import { SampleStatus } from '../../../utility/status_flow/enums/sample-status.enum';
import { ConfigService } from '../../../services/config.service';

@Component({
  selector: 'app-case-account-detail',
  imports: [CommonModule, RouterModule, FormsModule, HasPermissionDirective],
  templateUrl: './case-account-detail.component.html',
  styleUrl: './case-account-detail.component.css'
})
export class CaseAccountDetailComponent implements OnInit {
  inwardId!: number;
  isReadOnly = false;
  isLoadingPayments = signal(false);
  isGeneratingInvoice = signal(false);
  isSendingInvoice = signal(false);
  sendingPaymentLinkId: number | null = null;

  caseSummary: any = null;
  payments: any[] = [];
  invoice: any = null;
  proformaInvoice: any = null;
  advancePayments: any[] = [];
  isGeneratingPI = signal(false);
  isRecalculating = signal(false);
  canClose = false;
  closeReason = '';
  isClosing = signal(false);
  paymentGatewayEnabled = false;

  showExchangeRateModal = false;
  exchangeRateInput: number | null = null;

  lineItems: any[] = [];
  showAddLineItem = false;
  newLineItem = { description: '', amount: 0, taxPercent: 18 };
  editingLineItemId: number | null = null;
  editLineItemData: any = {};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private accountService: AccountService,
    private toastService: ToastService,
    private statusHelper: StatusHelperService,
    private roleHelper: RoleHelperService,
    private configService: ConfigService
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.inwardId = +params['id'];
      if (this.inwardId) {
        this.loadCaseSummary();
        this.loadPayments();
        this.loadLineItems();
      }
    });

    this.route.queryParams.subscribe(params => {
      this.isReadOnly = params['mode'] === 'view';
    });

    // Load payment gateway config
    this.configService.getConfigurationValueBykey('PaymentGatewayEnabled').subscribe({
      next: (val) => {
        this.paymentGatewayEnabled = val === 'true' || val === true;
      },
      error: () => { this.paymentGatewayEnabled = false; }
    });
  }

  loadCaseSummary(): void {
    this.accountService.getCaseSummary(this.inwardId).subscribe({
      next: (response) => {
        this.caseSummary = response;
        this.invoice = response?.finalInvoice || response?.invoice || null;
        this.proformaInvoice = response?.proformaInvoice || response?.pi || null;
        this.advancePayments = response?.advancePayments || [];
        this.loadLineItems();
        this.checkCanClose();
      },
      error: (error) => {
        console.error('Error loading case summary:', error);
        this.toastService.show('Failed to load case summary', 'error');
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

  /**
   * Generate Proforma Invoice (PI) - Manual, Accounts role only
   */
  generatePI(): void {
    if (!this.canGeneratePI()) {
      this.toastService.show('PI cannot be generated at this stage', 'error');
      return;
    }

    if (!confirm('Are you sure you want to generate a Proforma Invoice for this case?')) {
      return;
    }

    this.isGeneratingPI.set(true);
    this.accountService.generatePI(this.inwardId).subscribe({
      next: (response) => {
        this.toastService.show('Proforma Invoice generated successfully', 'success');
        this.loadCaseSummary();
        this.isGeneratingPI.set(false);
      },
      error: (error) => {
        console.error('Error generating PI:', error);
        this.toastService.show(error?.error?.message || 'Failed to generate Proforma Invoice', 'error');
        this.isGeneratingPI.set(false);
      }
    });
  }

  /**
   * Generate Final Invoice - Only after report approval and advance payment.
   * For non-INR customers, shows an exchange rate modal before proceeding.
   */
  generateInvoice(): void {
    if (!this.canGenerateInvoice()) {
      this.toastService.show('Final Invoice cannot be generated at this stage. Report must be approved and advance payment completed.', 'error');
      return;
    }

    if (!this.caseSummary?.customerCurrencyIsDefault) {
      this.exchangeRateInput = null;
      this.showExchangeRateModal = true;
      return;
    }

    if (!confirm('Are you sure you want to generate a Final Invoice for this case?')) {
      return;
    }

    this.doGenerateInvoice(null);
  }

  confirmExchangeRate(): void {
    if (!this.exchangeRateInput || this.exchangeRateInput <= 0) {
      this.toastService.show('Please enter a valid exchange rate greater than 0.', 'warning');
      return;
    }
    this.showExchangeRateModal = false;
    this.doGenerateInvoice(this.exchangeRateInput);
  }

  private doGenerateInvoice(exchangeRate: number | null): void {
    this.isGeneratingInvoice.set(true);
    this.accountService.generateInvoice(this.inwardId, exchangeRate ?? undefined).subscribe({
      next: () => {
        this.toastService.show('Final Invoice generated successfully', 'success');
        this.loadCaseSummary();
        this.isGeneratingInvoice.set(false);
      },
      error: (error) => {
        console.error('Error generating invoice:', error);
        this.toastService.show(error?.error?.message || 'Failed to generate Final Invoice', 'error');
        this.isGeneratingInvoice.set(false);
      }
    });
  }

  /**
   * Check if PI can be generated
   */
  canGeneratePI(): boolean {
    if (!this.caseSummary) return false;
    if(this.caseSummary?.piStatus.toUpperCase() === 'PENDING') {
      return true;
    }
    return false;
  }

  /**
   * Check if Final Invoice can be generated
   */
  canGenerateInvoice(): boolean {
    debugger;
    if (!this.caseSummary) return false;
    const billingStatus = this.caseSummary.billingStatus || this.caseSummary.billing_status || '';
    const reportStatus = this.caseSummary.reportStatus || this.caseSummary.report_status || '';
    const piStatus = (this.caseSummary.piStatus || this.caseSummary.pi_status || '').toUpperCase();

    // PI not required (DirectTaxInvoice customer or AdvancePIRequired=false) — allow invoice once pricing is done and reports are approved
    if (piStatus === 'NOT_REQUIRED') {
      const billingUpper = billingStatus.toUpperCase();
      const reportUpper = (reportStatus || '').toUpperCase();
      const billingReady = billingUpper === 'PRICE_DRAFTED' || billingUpper === 'PRICE_SNAPSHOT' || billingUpper === 'ADVANCE_PAID';
      return billingReady && reportUpper === 'FINAL_REPORT_APPROVED' && this.roleHelper.canGenerateInvoice();
    }

    return this.statusHelper.canGenerateInvoice(billingStatus, reportStatus) && this.roleHelper.canGenerateInvoice();
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
    return statusLower === 'paid';
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

  openInvoicePreview(type: 'pi' | 'invoice' = 'invoice'): void {
    if (type === 'pi') {
      const piId = this.proformaInvoice?.id || this.proformaInvoice?.piId;
      if (!piId) {
        this.toastService.show('PI not found', 'error');
        return;
      }
      this.accountService.downloadPIPdf(piId).subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          window.open(url, '_blank');
        },
        error: (err) => {
          this.toastService.show(err?.error?.message || 'Failed to load PI PDF', 'error');
        }
      });
    } else {
      const invoiceId = this.invoice?.invoiceId || this.invoice?.invoice_id;
      if (invoiceId) {
        this.router.navigate(['/accounts/invoices', invoiceId, 'preview']);
      }
    }
  }

  openPaymentDetail(payment: any): void {
    // For now, just show payment details in console or navigate to case detail with payment highlighted
    // In future, can create a payment detail modal or page
    console.log('Payment details:', payment);
    // Could navigate to a payment detail page if it exists
    // this.router.navigate(['/accounts/payments', payment.id]);
  }

  loadLineItems(): void {
    // Try TaxInvoice ID first (final invoice), fall back to ProformaInvoice ID
    const taxInvoiceId = this.invoice?.invoiceId || this.invoice?.invoice_id;
    const piHeaderId = this.proformaInvoice?.id || this.proformaInvoice?.piId || this.caseSummary?.invoiceHeaderId;

    if (taxInvoiceId) {
      this.accountService.getLineItemsByTaxInvoiceId(taxInvoiceId).subscribe({
        next: (items) => { this.lineItems = items || []; },
        error: () => { this.toastService.show('Failed to load line items', 'error'); }
      });
    } else if (piHeaderId) {
      this.accountService.getInvoiceLineItems(piHeaderId).subscribe({
        next: (items) => { this.lineItems = items || []; },
        error: () => { this.toastService.show('Failed to load line items', 'error'); }
      });
    }
  }

  saveLineItem(): void {
    if (!this.newLineItem.description || this.newLineItem.amount <= 0) {
      this.toastService.show('Please enter description and a valid amount', 'warning');
      return;
    }
    const invoiceHeaderId = this.invoice?.invoiceId || this.invoice?.invoice_id || this.caseSummary?.invoiceHeaderId;
    if (!invoiceHeaderId) {
      this.toastService.show('No invoice found to add line items', 'error');
      return;
    }
    const payload = {
      invoiceHeaderId,
      description: this.newLineItem.description,
      amount: this.newLineItem.amount,
      taxPercent: this.newLineItem.taxPercent
    };
    this.accountService.addInvoiceLineItem(payload).subscribe({
      next: () => {
        this.toastService.show('Line item added successfully', 'success');
        this.showAddLineItem = false;
        this.newLineItem = { description: '', amount: 0, taxPercent: 18 };
        this.loadLineItems();
        this.loadCaseSummary();
      },
      error: (err) => {
        console.error('Error adding line item:', err);
        this.toastService.show(err?.error?.message || 'Failed to add line item', 'error');
      }
    });
  }

  editLineItem(item: any): void {
    this.editingLineItemId = item.id;
    this.editLineItemData = {
      description: item.description,
      amount: item.amount,
      taxPercent: item.taxPercent
    };
  }

  cancelEditLineItem(): void {
    this.editingLineItemId = null;
    this.editLineItemData = {};
  }

  updateLineItem(): void {
    if (!this.editingLineItemId) return;
    this.accountService.updateInvoiceLineItem(this.editingLineItemId, this.editLineItemData).subscribe({
      next: () => {
        this.toastService.show('Line item updated successfully', 'success');
        this.editingLineItemId = null;
        this.editLineItemData = {};
        this.loadLineItems();
        this.loadCaseSummary();
      },
      error: (err) => {
        console.error('Error updating line item:', err);
        this.toastService.show(err?.error?.message || 'Failed to update line item', 'error');
      }
    });
  }

  deleteLineItem(item: any): void {
    if (!confirm(`Are you sure you want to delete "${item.description}"?`)) return;
    this.accountService.deleteInvoiceLineItem(item.id).subscribe({
      next: () => {
        this.toastService.show('Line item deleted successfully', 'success');
        this.loadLineItems();
        this.loadCaseSummary();
      },
      error: (err) => {
        console.error('Error deleting line item:', err);
        this.toastService.show(err?.error?.message || 'Failed to delete line item', 'error');
      }
    });
  }

  getLineItemTaxAmount(item: any): number {
    return (item.amount || 0) * (item.taxPercent || 0) / 100;
  }

  getLineItemTotal(item: any): number {
    return (item.amount || 0) + this.getLineItemTaxAmount(item);
  }

  /**
   * Recalculate pricing — deletes existing DRAFT ChargeEvents and creates fresh ones.
   * Only available when billing status is PRICE_DRAFTED (not SNAPSHOT/INVOICED).
   */
  recalculatePricing(): void {
    if (!confirm('This will delete existing draft prices and recalculate. Continue?')) return;

    this.isRecalculating.set(true);
    this.accountService.calculatePricing(this.inwardId).subscribe({
      next: (response) => {
        const warnings = response?.warnings || [];
        const total = response?.totalAmount || 0;
        const failures = response?.failureCount || 0;
        let msg = `Pricing calculated: Total ${total}`;
        if (failures > 0) msg += ` (${failures} failures)`;
        if (warnings.length > 0) msg += `. ${warnings[0]}`;
        this.toastService.show(msg, failures > 0 ? 'warning' : 'success');
        this.loadCaseSummary();
        this.isRecalculating.set(false);
      },
      error: (error) => {
        this.toastService.show(error?.error?.message || 'Failed to calculate pricing', 'error');
        this.isRecalculating.set(false);
      }
    });
  }

  /**
   * Check if recalculation is allowed (PRICE_DRAFTED status, not locked)
   */
  canRecalculate(): boolean {
    if (!this.caseSummary) return false;
    const status = (this.caseSummary.billingStatus || '').toUpperCase();
    return status === 'PRICE_DRAFTED' || status === '' || !status;
  }

  /**
   * Format charge type for display
   */
  formatChargeType(chargeType: string): string {
    if (chargeType === 'MinimumChargeAdjustment') return 'Minimum Charge Adjustment';
    if (chargeType === 'CustomPreparation') return 'Custom Preparation';
    return chargeType;
  }

  checkCanClose(): void {
    this.accountService.canCloseCase(this.inwardId).subscribe({
      next: (res) => {
        this.canClose = res?.canClose || false;
        this.closeReason = res?.reason || '';
      },
      error: () => {
        this.canClose = false;
        this.closeReason = '';
      }
    });
  }

  closeCase(): void {
    if (!this.canClose) return;
    if (!confirm('Are you sure you want to close this case? This action cannot be undone.')) return;

    this.isClosing.set(true);
    this.accountService.closeCase(this.inwardId).subscribe({
      next: () => {
        this.toastService.show('Case closed successfully', 'success');
        this.loadCaseSummary();
        this.isClosing.set(false);
      },
      error: (error) => {
        this.toastService.show(error?.error?.message || 'Failed to close case', 'error');
        this.isClosing.set(false);
      }
    });
  }

  goToRecordPayment(): void {
    this.router.navigate(['/accounts/record-payment'], {
      queryParams: {
        customerId: this.caseSummary?.customerId || this.caseSummary?.customer_id,
        inwardId: this.inwardId
      }
    });
  }

  getTotalAdvance(): number {
    return (this.advancePayments || []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
  }

  goBack(): void {
    this.router.navigate(['/accounts/cases']);
  }
}

