import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AccountService } from '../../../services/account.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-invoice-preview',
  imports: [CommonModule, RouterModule],
  templateUrl: './invoice-preview.component.html',
  styleUrl: './invoice-preview.component.css'
})
export class InvoicePreviewComponent implements OnInit {
  invoiceId!: number;
  isLoading = signal(false);
  isSendingInvoice = signal(false);
  invoiceData: any = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private accountService: AccountService,
    private toastService: ToastService
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.invoiceId = +params['id'];
      if (this.invoiceId) {
        this.loadInvoiceData();
      }
    });
  }

  loadInvoiceData(): void {
    // Since we don't have a direct GET invoice endpoint, we'll show summary
    // In a real scenario, you might have GET /api/accounts/invoices/{id}
    // For now, we'll use the case summary or show a placeholder
    this.isLoading.set(false);
  }

  sendInvoice(method: 'email' | 'whatsapp' = 'email'): void {
    const methodName = method === 'email' ? 'email' : 'whatsapp';

    if (!confirm(`Are you sure you want to send the invoice via ${methodName}?`)) {
      return;
    }

    this.isSendingInvoice.set(true);
    this.accountService.sendInvoice(this.invoiceId, methodName).subscribe({
      next: (response) => {
        this.toastService.show(`Invoice sent via ${methodName} successfully`, 'success');
        this.isSendingInvoice.set(false);
      },
      error: (error) => {
        console.error('Error sending invoice:', error);
        this.toastService.show(error?.error?.message || `Failed to send invoice via ${methodName}`, 'error');
        this.isSendingInvoice.set(false);
      }
    });
  }

  printInvoice(): void {
    window.print();
  }

  goBack(): void {
    this.router.navigate(['/accounts/cases']);
  }
}

