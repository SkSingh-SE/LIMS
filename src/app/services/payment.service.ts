import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private apiUrl = environment.apiUrl + "/Payments";

  constructor(private http: HttpClient) { }

  validateToken(token: string) {
    return this.http.get<any>(`${this.apiUrl}/validate/${token}`);
  }

  processPayment(payload: any) {
    return this.http.post<any>(`${this.apiUrl}/process`, payload);
  }
}
