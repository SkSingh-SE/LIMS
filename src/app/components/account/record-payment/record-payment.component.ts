import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CustomerLedgerService } from '../../../services/customer-ledger.service';
import { CustomerService } from '../../../services/customer.service';
import { AccountService } from '../../../services/account.service';
import { ToastService } from '../../../services/toast.service';
import { ActivatedRoute, Router } from '@angular/router';
import { SearchableDropdownComponent } from '../../../utility/components/searchable-dropdown/searchable-dropdown.component';

@Component({
  selector: 'app-record-payment',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, SearchableDropdownComponent],
  templateUrl: './record-payment.component.html',
  styleUrl: './record-payment.component.css',
})
export class RecordPaymentComponent implements OnInit {
  paymentForm!: FormGroup;
  selectedCustomerId: number | null = null;
  outstandingInvoices: any[] = [];
  selectedInvoiceIds: number[] = [];
  isSubmitting = false;
  loadingInvoices = false;
  receiptNumber: string | null = null;
  showSuccessPanel = false;

  paymentModes = [
    { value: 'Cash', label: 'Cash' },
    { value: 'Cheque', label: 'Cheque' },
    { value: 'UPI', label: 'UPI' },
    { value: 'NEFT/RTGS', label: 'NEFT/RTGS' },
    { value: 'BankTransfer', label: 'Bank Transfer' },
    { value: 'Razorpay', label: 'Razorpay' },
  ];

  getCustomers = (term: string, page: number, pageSize: number) => {
    return this.customerService.getCustomerDropdown(term, page, pageSize);
  };

  constructor(
    private fb: FormBuilder,
    private customerLedgerService: CustomerLedgerService,
    private customerService: CustomerService,
    private accountService: AccountService,
    private toastService: ToastService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.route.queryParams.subscribe(params => {
      if (params['customerId']) {
        this.selectedCustomerId = +params['customerId'];
        this.loadOutstandingInvoices();
      }
    });
  }

  initForm(): void {
    this.paymentForm = this.fb.group({
      amount: [null, [Validators.required, Validators.min(0.01)]],
      paymentMode: ['', Validators.required],
      chequeNo: [''],
      chequeDate: [''],
      bankName: [''],
      transactionRef: [''],
      remarks: [''],
    });

    this.paymentForm.get('paymentMode')?.valueChanges.subscribe((mode) => {
      this.updateConditionalValidators(mode);
    });
  }

  updateConditionalValidators(mode: string): void {
    const chequeNo = this.paymentForm.get('chequeNo');
    const chequeDate = this.paymentForm.get('chequeDate');
    const bankName = this.paymentForm.get('bankName');
    const transactionRef = this.paymentForm.get('transactionRef');

    chequeNo?.clearValidators();
    chequeDate?.clearValidators();
    bankName?.clearValidators();
    transactionRef?.clearValidators();

    if (mode === 'Cheque') {
      chequeNo?.setValidators([Validators.required, Validators.pattern(/^\d{6}$/)]);
      chequeDate?.setValidators([Validators.required]);
      bankName?.setValidators([Validators.required]);
    } else if (mode === 'NEFT/RTGS') {
      transactionRef?.setValidators([Validators.required]);
      bankName?.setValidators([Validators.required]);
    } else if (mode === 'UPI') {
      transactionRef?.setValidators([Validators.required]);
    }

    chequeNo?.updateValueAndValidity();
    chequeDate?.updateValueAndValidity();
    bankName?.updateValueAndValidity();
    transactionRef?.updateValueAndValidity();
  }

  get showChequeFields(): boolean {
    return this.paymentForm.get('paymentMode')?.value === 'Cheque';
  }

  get showBankName(): boolean {
    const mode = this.paymentForm.get('paymentMode')?.value;
    return mode === 'Cheque' || mode === 'NEFT/RTGS';
  }

  get showTransactionRef(): boolean {
    const mode = this.paymentForm.get('paymentMode')?.value;
    return mode === 'NEFT/RTGS' || mode === 'UPI';
  }

  onCustomerSelect(item: any): void {
    if (!item) {
      this.selectedCustomerId = null;
      return;
    }
    this.selectedCustomerId = item.id;
    this.showSuccessPanel = false;
    this.receiptNumber = null;
    this.loadOutstandingInvoices();
  }

  loadOutstandingInvoices(): void {
    if (!this.selectedCustomerId) return;
    this.loadingInvoices = true;
    this.outstandingInvoices = [];
    this.selectedInvoiceIds = [];

    this.customerLedgerService.getLedgerEntries(this.selectedCustomerId, {}).subscribe({
      next: (data) => {
        const entries = data?.items || data || [];
        this.outstandingInvoices = (entries).filter(
          (e: any) => e.transactionType === 'Invoice' && (e.debit || 0) > (e.credit || 0)
        );
        this.loadingInvoices = false;
      },
      error: (err) => {
        console.error('Error loading invoices:', err);
        this.toastService.show('Failed to load outstanding invoices', 'error');
        this.loadingInvoices = false;
      },
    });
  }

  toggleInvoice(invoiceId: number): void {
    const idx = this.selectedInvoiceIds.indexOf(invoiceId);
    if (idx > -1) {
      this.selectedInvoiceIds.splice(idx, 1);
    } else {
      this.selectedInvoiceIds.push(invoiceId);
    }
  }

  isInvoiceSelected(invoiceId: number): boolean {
    return this.selectedInvoiceIds.includes(invoiceId);
  }

  selectAllInvoices(): void {
    if (this.selectedInvoiceIds.length === this.outstandingInvoices.length) {
      this.selectedInvoiceIds = [];
    } else {
      this.selectedInvoiceIds = this.outstandingInvoices.map((inv) => inv.id);
    }
  }

  onSubmit(): void {
    if (!this.selectedCustomerId) {
      this.toastService.show('Please select a customer', 'warning');
      return;
    }

    if (this.paymentForm.invalid) {
      this.paymentForm.markAllAsTouched();
      this.toastService.show('Please fill all required fields', 'warning');
      return;
    }

    this.isSubmitting = true;
    const formVal = this.paymentForm.value;
    const payload = {
      customerId: this.selectedCustomerId,
      amount: formVal.amount,
      paymentMode: formVal.paymentMode,
      chequeNo: formVal.chequeNo || null,
      chequeDate: formVal.chequeDate || null,
      bankName: formVal.bankName || null,
      transactionRef: formVal.transactionRef || null,
      invoiceIds: this.selectedInvoiceIds,
      remarks: formVal.remarks || null,
    };

    this.customerLedgerService.recordPayment(payload).subscribe({
      next: (res) => {
        this.receiptNumber = res?.receiptNumber || res?.referenceNo || 'N/A';
        this.showSuccessPanel = true;
        this.toastService.show('Payment recorded successfully', 'success');
        this.isSubmitting = false;
      },
      error: (err) => {
        console.error('Error recording payment:', err);
        this.toastService.show('Failed to record payment', 'error');
        this.isSubmitting = false;
      },
    });
  }

  resetForm(): void {
    this.paymentForm.reset();
    this.selectedCustomerId = null;
    this.outstandingInvoices = [];
    this.selectedInvoiceIds = [];
    this.receiptNumber = null;
    this.showSuccessPanel = false;
  }

  recordAnother(): void {
    this.resetForm();
  }
}
