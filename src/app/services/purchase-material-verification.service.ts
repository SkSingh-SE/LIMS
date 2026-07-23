import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { PurchaseMaterialVerification, PurchaseMaterialVerificationListResponse, PurchaseMaterialVerificationPrintDto, PurchaseMaterialVerificationResponse } from '../models/purchaseMaterialVerificationModel';

@Injectable({
    providedIn: 'root',
})
export class PurchaseMaterialVerificationService {
    private apiUrl = environment.apiUrl + '/Nabl/PurchaseMaterialVerification';

    constructor(private http: HttpClient) { }

    getAll(params?: any): Observable<PurchaseMaterialVerificationListResponse> {
        return this.http.post<PurchaseMaterialVerificationListResponse>(this.apiUrl + '/list', params || {});
    }

    getById(id: number): Observable<PurchaseMaterialVerification | null> {
        return this.http.get<PurchaseMaterialVerification>(`${this.apiUrl}/details/${id}`);
    }

    create(data: PurchaseMaterialVerification): Observable<PurchaseMaterialVerificationResponse> {
        return this.http.post<PurchaseMaterialVerificationResponse>(`${this.apiUrl}/save`, data);
    }

    update(id: number, data: PurchaseMaterialVerification): Observable<PurchaseMaterialVerificationResponse> {
        data.id = id;
        return this.http.post<PurchaseMaterialVerificationResponse>(`${this.apiUrl}/save`, data);
    }

    delete(id: number): Observable<PurchaseMaterialVerificationResponse> {
        return this.http.delete<PurchaseMaterialVerificationResponse>(`${this.apiUrl}/delete/${id}`);
    }
    getAllPONoetails(searchTerm: string = '', pageNo: number = 0, pageSize: number = 20) {
        return this.http.get<any[]>(`${this.apiUrl}/pONoList`, {
            params: {
                searchTerm: searchTerm,
                pageNo: pageNo,
                pageSize: pageSize
            }
        });
    }
    getPrintList(): Observable<PurchaseMaterialVerificationPrintDto[]> {
        return this.http.get<PurchaseMaterialVerificationPrintDto[]>(
            `${this.apiUrl}/print-list`
        );
    }
}
