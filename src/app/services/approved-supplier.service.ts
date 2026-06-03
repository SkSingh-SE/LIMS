import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApprovedSupplier, ApprovedSupplierListResponse, ApprovedSupplierResponse } from '../models/approvedSupplierModel';

@Injectable({
    providedIn: 'root',
})
export class ApprovedSupplierService {
    private apiUrl = environment.apiUrl + '/Nabl/ApprovedSupplier';

    constructor(private http: HttpClient) { }

    getAll(params?: any): Observable<ApprovedSupplierListResponse> {
        return this.http.post<ApprovedSupplierListResponse>(this.apiUrl + '/list', params || {});
    }

    getById(id: number): Observable<ApprovedSupplier | null> {
        return this.http.get<ApprovedSupplier>(`${this.apiUrl}/details/${id}`);
    }

    create(data: ApprovedSupplier): Observable<ApprovedSupplierResponse> {
        return this.http.post<ApprovedSupplierResponse>(`${this.apiUrl}/save`, data);
    }

    update(id: number, data: ApprovedSupplier): Observable<ApprovedSupplierResponse> {
        data.id = id;
        return this.http.post<ApprovedSupplierResponse>(`${this.apiUrl}/save`, data);
    }

    delete(id: number): Observable<ApprovedSupplierResponse> {
        return this.http.delete<ApprovedSupplierResponse>(`${this.apiUrl}/delete/${id}`);
    }
    getAllSuppliers(searchTerm: string = '', pageNo: number = 0, pageSize: number = 20) {
        return this.http.get<any[]>(`${this.apiUrl}/supplierlist`, {
            params: {
                searchTerm: searchTerm,
                pageNo: pageNo,
                pageSize: pageSize
            }
        });
    }
}
