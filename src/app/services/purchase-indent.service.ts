import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { PurchaseIndent, PurchaseIndentListResponse, PurchaseIndentResponse } from '../models/purchaseIndentModel';

@Injectable({
    providedIn: 'root',
})
export class PurchaseIndentService {
    private apiUrl = environment.apiUrl + '/Nabl/PurchaseIndent';

    constructor(private http: HttpClient) {}

    getAll(params?: any): Observable<PurchaseIndentListResponse> {
        return this.http.post<PurchaseIndentListResponse>(this.apiUrl + '/list', params || {});
    }

    getById(id: number): Observable<PurchaseIndent | null> {
        return this.http.get<PurchaseIndent>(`${this.apiUrl}/details/${id}`);
    }

    create(data: PurchaseIndent): Observable<PurchaseIndentResponse> {
        return this.http.post<PurchaseIndentResponse>(`${this.apiUrl}/save`, data);
    }

    update(id: number, data: PurchaseIndent): Observable<PurchaseIndentResponse> {
        data.id = id;
        return this.http.post<PurchaseIndentResponse>(`${this.apiUrl}/save`, data);
    }

    delete(id: number): Observable<PurchaseIndentResponse> {
        return this.http.delete<PurchaseIndentResponse>(`${this.apiUrl}/delete/${id}`);
    }
}
