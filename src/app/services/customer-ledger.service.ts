import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class CustomerLedgerService {
  private apiUrl = environment.apiUrl + '/CustomerLedger';

  constructor(private http: HttpClient) {}

  // Ledger Operations
  getLedgerEntries(customerId: number, filter: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${customerId}/list`, filter);
  }

  getLedger(customerId: number, from?: string, to?: string): Observable<any[]> {
    let url = `${this.apiUrl}/${customerId}`;
    const params: string[] = [];
    if (from) params.push(`from=${from}`);
    if (to) params.push(`to=${to}`);
    if (params.length) url += '?' + params.join('&');
    return this.http.get<any[]>(url);
  }

  getBalance(customerId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${customerId}/balance`);
  }

  getStatement(customerId: number, from: string, to: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${customerId}/statement?from=${from}&to=${to}`);
  }

  // Payment Recording
  recordPayment(dto: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/payment`, dto);
  }

  getReceipt(receiptId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/receipt/${receiptId}`);
  }

  getReceipts(customerId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${customerId}/receipts`);
  }

  getReceiptsPaged(customerId: number, filter: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${customerId}/receipts-paged`, filter);
  }

  // Reports
  getAgingReport(asOfDate?: string): Observable<any[]> {
    const url = asOfDate ? `${this.apiUrl}/aging-report?asOfDate=${asOfDate}` : `${this.apiUrl}/aging-report`;
    return this.http.get<any[]>(url);
  }

  getOutstandingReport(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/outstanding-report`);
  }

  getCollectionSummary(from: string, to: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/collection-summary?from=${from}&to=${to}`);
  }

  // Credit Management
  getCreditStatus(customerId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${customerId}/credit-status`);
  }

  checkCreditLimit(customerId: number, amount: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${customerId}/check-credit?amount=${amount}`);
  }
}
