import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { TechnicalRawDataNabl, TechnicalRawDataNablListResponse, TechnicalRawDataNablResponse } from '../models/technicalRawDataNablModel';

@Injectable({
    providedIn: 'root',
})
export class TechnicalRawDataNablService {
    private apiUrl = environment.apiUrl + '/Nabl/TechnicalRawData';

    constructor(private http: HttpClient) {}

    getAll(params?: any): Observable<TechnicalRawDataNablListResponse> {
        return this.http.post<TechnicalRawDataNablListResponse>(this.apiUrl + '/list', params || {});
    }

    getById(id: number): Observable<TechnicalRawDataNabl | null> {
        return this.http.get<TechnicalRawDataNabl>(`${this.apiUrl}/details/${id}`);
    }

    create(data: TechnicalRawDataNabl): Observable<TechnicalRawDataNablResponse> {
        return this.http.post<TechnicalRawDataNablResponse>(`${this.apiUrl}/save`, data);
    }

    update(id: number, data: TechnicalRawDataNabl): Observable<TechnicalRawDataNablResponse> {
        data.id = id;
        return this.http.post<TechnicalRawDataNablResponse>(`${this.apiUrl}/save`, data);
    }

    delete(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/delete/${id}`);
    }
}
