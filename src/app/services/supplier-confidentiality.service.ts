import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { SupplierConfidentiality, SupplierConfidentialityListResponse, SupplierConfidentialityResponse } from '../models/supplierConfidentialityModel';

@Injectable({
    providedIn: 'root',
})
export class SupplierConfidentialityService {
    private apiUrl = environment.apiUrl + '/Nabl/SupplierConfidentiality';

    constructor(private http: HttpClient) {}

    getAll(params?: any): Observable<SupplierConfidentialityListResponse> {
        return this.http.post<SupplierConfidentialityListResponse>(this.apiUrl + '/list', params || {});
    }

    getById(id: number): Observable<SupplierConfidentiality | null> {
        return this.http.get<SupplierConfidentiality>(`${this.apiUrl}/details/${id}`);
    }

    create(data: SupplierConfidentiality): Observable<SupplierConfidentialityResponse> {
        return this.http.post<SupplierConfidentialityResponse>(`${this.apiUrl}/save`, data);
    }

    update(id: number, data: SupplierConfidentiality): Observable<SupplierConfidentialityResponse> {
        data.id = id;
        return this.http.post<SupplierConfidentialityResponse>(`${this.apiUrl}/save`, data);
    }

    delete(id: number): Observable<SupplierConfidentialityResponse> {
        return this.http.delete<SupplierConfidentialityResponse>(`${this.apiUrl}/delete/${id}`);
    }
}
