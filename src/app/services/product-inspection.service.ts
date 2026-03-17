import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ProductInspection, ProductInspectionListResponse, ProductInspectionResponse } from '../models/productInspectionModel';

@Injectable({
    providedIn: 'root',
})
export class ProductInspectionService {
    private apiUrl = environment.apiUrl + '/Nabl/ProductInspection';

    constructor(private http: HttpClient) {}

    getAll(params?: any): Observable<ProductInspectionListResponse> {
        return this.http.post<ProductInspectionListResponse>(this.apiUrl + '/list', params || {});
    }

    getById(id: number): Observable<ProductInspection | null> {
        return this.http.get<ProductInspection>(`${this.apiUrl}/details/${id}`);
    }

    create(data: ProductInspection): Observable<ProductInspectionResponse> {
        return this.http.post<ProductInspectionResponse>(`${this.apiUrl}/save`, data);
    }

    update(id: number, data: ProductInspection): Observable<ProductInspectionResponse> {
        data.id = id;
        return this.http.post<ProductInspectionResponse>(`${this.apiUrl}/save`, data);
    }

    delete(id: number): Observable<ProductInspectionResponse> {
        return this.http.delete<ProductInspectionResponse>(`${this.apiUrl}/delete/${id}`);
    }
}
