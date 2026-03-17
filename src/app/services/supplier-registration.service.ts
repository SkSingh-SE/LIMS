import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { SupplierRegistration, SupplierRegistrationListResponse, SupplierRegistrationResponse } from '../models/supplierRegistrationModel';

@Injectable({
    providedIn: 'root',
})
export class SupplierRegistrationService {
    private apiUrl = environment.apiUrl + '/Nabl/SupplierRegistration';

    constructor(private http: HttpClient) {}

    getAll(params?: any): Observable<SupplierRegistrationListResponse> {
        return this.http.post<SupplierRegistrationListResponse>(this.apiUrl + '/list', params || {});
    }

    getById(id: number): Observable<SupplierRegistration | null> {
        return this.http.get<SupplierRegistration>(`${this.apiUrl}/details/${id}`);
    }

    create(data: SupplierRegistration): Observable<SupplierRegistrationResponse> {
        return this.http.post<SupplierRegistrationResponse>(`${this.apiUrl}/save`, data);
    }

    update(id: number, data: SupplierRegistration): Observable<SupplierRegistrationResponse> {
        data.id = id;
        return this.http.post<SupplierRegistrationResponse>(`${this.apiUrl}/save`, data);
    }

    delete(id: number): Observable<SupplierRegistrationResponse> {
        return this.http.delete<SupplierRegistrationResponse>(`${this.apiUrl}/delete/${id}`);
    }
}
