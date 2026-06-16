import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ReferenceMaterial, ReferenceMaterialListResponse, ReferenceMaterialResponse } from '../models/referenceMaterialModel';

@Injectable({
    providedIn: 'root',
})
export class ReferenceMaterialService {
    private apiUrl = environment.apiUrl + '/Nabl/ReferenceMaterial';

    constructor(private http: HttpClient) {}

    getAll(params?: any): Observable<ReferenceMaterialListResponse> {
        return this.http.post<ReferenceMaterialListResponse>(this.apiUrl + '/list', params || {});
    }

    getById(id: number): Observable<ReferenceMaterial | null> {
        return this.http.get<ReferenceMaterial>(`${this.apiUrl}/details/${id}`);
    }

    create(data: ReferenceMaterial): Observable<ReferenceMaterialResponse> {
        return this.http.post<ReferenceMaterialResponse>(`${this.apiUrl}/save`, data);
    }

    update(id: number, data: ReferenceMaterial): Observable<ReferenceMaterialResponse> {
        data.id = id;
        return this.http.post<ReferenceMaterialResponse>(`${this.apiUrl}/save`, data);
    }

    delete(id: number): Observable<ReferenceMaterialResponse> {
        return this.http.delete<ReferenceMaterialResponse>(`${this.apiUrl}/delete/${id}`);
    }

    getLowStockItems(): Observable<ReferenceMaterialListResponse> {
        return this.http.post<ReferenceMaterialListResponse>(this.apiUrl + '/list', { lowStock: true });
    }

    getExpiringItems(): Observable<ReferenceMaterialListResponse> {
        return this.http.post<ReferenceMaterialListResponse>(this.apiUrl + '/list', { expiringSoon: true });
    }
}
