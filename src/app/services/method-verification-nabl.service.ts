import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { MethodVerificationNabl, MethodVerificationNablListResponse, MethodVerificationNablResponse } from '../models/methodVerificationNablModel';

@Injectable({
    providedIn: 'root',
})
export class MethodVerificationNablService {
    private apiUrl = environment.apiUrl + '/Nabl/MethodVerification';

    constructor(private http: HttpClient) {}

    getAll(params?: any): Observable<MethodVerificationNablListResponse> {
        return this.http.post<MethodVerificationNablListResponse>(this.apiUrl + '/list', params || {});
    }

    getById(id: number): Observable<MethodVerificationNabl | null> {
        return this.http.get<MethodVerificationNabl>(`${this.apiUrl}/details/${id}`);
    }

    create(data: MethodVerificationNabl): Observable<MethodVerificationNablResponse> {
        return this.http.post<MethodVerificationNablResponse>(`${this.apiUrl}/save`, data);
    }

    update(id: number, data: MethodVerificationNabl): Observable<MethodVerificationNablResponse> {
        data.id = id;
        return this.http.post<MethodVerificationNablResponse>(`${this.apiUrl}/save`, data);
    }

    delete(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/delete/${id}`);
    }
}
