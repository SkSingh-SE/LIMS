import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { PurchaseOrder, PurchaseOrderListResponse, PurchaseOrderResponse } from '../models/purchaseOrderModel';

@Injectable({
    providedIn: 'root',
})
export class PurchaseOrderService {
    private apiUrl = environment.apiUrl + '/Nabl/PurchaseOrder';

    constructor(private http: HttpClient) {}

    getAll(params?: any): Observable<PurchaseOrderListResponse> {
        return this.http.post<PurchaseOrderListResponse>(this.apiUrl + '/list', params || {});
    }

    getById(id: number): Observable<PurchaseOrder | null> {
        return this.http.get<PurchaseOrder>(`${this.apiUrl}/details/${id}`);
    }

    create(data: PurchaseOrder): Observable<PurchaseOrderResponse> {
        return this.http.post<PurchaseOrderResponse>(`${this.apiUrl}/save`, data);
    }

    update(id: number, data: PurchaseOrder): Observable<PurchaseOrderResponse> {
        data.id = id;
        return this.http.post<PurchaseOrderResponse>(`${this.apiUrl}/save`, data);
    }

    delete(id: number): Observable<PurchaseOrderResponse> {
        return this.http.delete<PurchaseOrderResponse>(`${this.apiUrl}/delete/${id}`);
    }
}
