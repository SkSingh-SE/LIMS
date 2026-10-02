import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CustomerFeedback } from '../models/customer-feedback';

@Injectable({
    providedIn: 'root',
})
export class CustomerFeedbackService {
    private apiUrl = environment.apiUrl + '/Nabl/CustomerFeedback';
    private readonly Default_Note_Clause = "Thank you for choosing 'DIVINE METALLURGICAL SERVICES PVT. LTD.' for your testing needs. We are committed to delivering the highest level of service and ensuring that your experience with us is seamless. Your feedback is incredibly valuable and helps us improve. If there's any aspect of our service that didn't meet your expectations, please let us know so we can make it right."
    constructor(private http: HttpClient) { }

    getAll(params: any = {}): Observable<any> {
        return this.http.post<any>(this.apiUrl + '/list', params || {});
    }

    getById(id: number): Observable<CustomerFeedback | undefined> {
        return this.http.get<CustomerFeedback>(`${this.apiUrl}/details/${id}`);
    }

    create(data: CustomerFeedback): Observable<CustomerFeedback> {
        return this.http.post<CustomerFeedback>(`${this.apiUrl}/save`, data);
    }

    update(id: number, data: CustomerFeedback): Observable<CustomerFeedback> {
        data.id = id;
        return this.http.post<CustomerFeedback>(`${this.apiUrl}/save`, data);
    }

    delete(id: number): Observable<boolean> {
        return this.http.delete<boolean>(`${this.apiUrl}/delete/${id}`);
    }
    getDefaultNoteClause(): string {
        return this.Default_Note_Clause;
    }
}
