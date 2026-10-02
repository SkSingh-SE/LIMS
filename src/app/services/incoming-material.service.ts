import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { IncomingMaterial, IncomingMaterialListResponse, IncomingMaterialResponse } from '../models/incomingMaterialModel';

@Injectable({
    providedIn: 'root',
})
export class IncomingMaterialService {
    private apiUrl = environment.apiUrl + '/Nabl/IncomingMaterial';

    constructor(private http: HttpClient) {}

    getAll(params?: any): Observable<IncomingMaterialListResponse> {
        return this.http.post<IncomingMaterialListResponse>(this.apiUrl + '/list', params || {});
    }

    getById(id: number): Observable<IncomingMaterial | null> {
        return this.http.get<IncomingMaterial>(`${this.apiUrl}/details/${id}`);
    }

    create(data: IncomingMaterial): Observable<IncomingMaterialResponse> {
        return this.http.post<IncomingMaterialResponse>(`${this.apiUrl}/save`, data);
    }

    update(id: number, data: IncomingMaterial): Observable<IncomingMaterialResponse> {
        data.id = id;
        return this.http.post<IncomingMaterialResponse>(`${this.apiUrl}/save`, data);
    }

    delete(id: number): Observable<IncomingMaterialResponse> {
        return this.http.delete<IncomingMaterialResponse>(`${this.apiUrl}/delete/${id}`);
    }
    getAllPlanNoDetails(searchTerm: string = '', pageNo: number = 0, pageSize: number = 20) {
        return this.http.get<any[]>(`${this.apiUrl}/planNoList`, {
            params: {
                searchTerm: searchTerm,
                pageNo: pageNo,
                pageSize: pageSize
            }
        });
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
}
