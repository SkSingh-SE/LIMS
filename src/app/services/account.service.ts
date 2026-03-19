import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AccountService {
  private apiUrl = environment.apiUrl + "/account";

  constructor(private http: HttpClient) { }

  /**
   * Get account dashboard data
   * GET /api/accounts/dashboard
   */
  getDashboard(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/dashboard`);
  }

  /**
   * Get case account list with pagination, search, and sorting
   * POST /api/accounts/cases
   */
  getCaseAccounts(filter: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/cases`, filter);
  }

  /**
   * Get case account summary
   * GET /api/accounts/cases/{inwardId}/summary
   */
  getCaseSummary(inwardId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/cases/${inwardId}/summary`);
  }

  /**
   * Get payments for a case
   * POST /api/accounts/cases/{inwardId}/payments
   */
  getCasePayments(inwardId: number, filter?: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/cases/${inwardId}/payments`, filter || {});
  }

  /**
   * Send payment link
   * POST /api/accounts/payments/{paymentOrderId}/send-link
   */
  sendPaymentLink(paymentOrderId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/payments/${paymentOrderId}/send-link`, {});
  }

  /**
   * Generate Proforma Invoice (PI) for a case
   * POST /api/accounts/cases/{inwardId}/generate-pi
   */
  generatePI(inwardId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/cases/${inwardId}/generate-proforma-invoice`, {});
  }

  /**
   * Generate Final Invoice for a case
   * POST /api/accounts/cases/{inwardId}/generate-invoice
   */
  generateInvoice(inwardId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/cases/${inwardId}/generate-invoice`, {});
  }

  /**
   * Send invoice
   * POST /api/accounts/invoices/{invoiceId}/send
   */
  sendInvoice(invoiceId: number, method?: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/invoices/${invoiceId}/send`, { method: method || 'email' });
  }

  getInvoiceLineItems(invoiceHeaderId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/invoice-line-items/${invoiceHeaderId}`);
  }

  addInvoiceLineItem(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/invoice-line-items`, payload);
  }

  updateInvoiceLineItem(id: number, payload: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/invoice-line-items/${id}`, payload);
  }

  deleteInvoiceLineItem(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/invoice-line-items/${id}`);
  }

  getLedgerPeriodSummary(customerId: number, periodStart: string, periodEnd: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/ledger-summary/${customerId}`, {
      params: { periodStart, periodEnd }
    });
  }

  checkPaymentGate(sampleInwardId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/payment-gate/${sampleInwardId}`);
  }

  checkCreditLimit(customerId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/credit-check/${customerId}`);
  }
}

