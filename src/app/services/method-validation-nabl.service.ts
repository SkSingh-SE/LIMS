import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { MethodValidationNabl, MethodValidationNablListResponse, MethodValidationNablResponse } from '../models/methodValidationNablModel';

@Injectable({
    providedIn: 'root',
})
export class MethodValidationNablService {
    private apiUrl = environment.apiUrl + '/Nabl/MethodValidation';

    constructor(private http: HttpClient) { }

    getAll(params?: any): Observable<MethodValidationNablListResponse> {
        return this.http.post<MethodValidationNablListResponse>(this.apiUrl + '/list', params || {});
    }

    getById(id: number): Observable<MethodValidationNabl | null> {
        return this.http.get<MethodValidationNabl>(`${this.apiUrl}/details/${id}`);
    }

    create(data: MethodValidationNabl): Observable<MethodValidationNablResponse> {
        return this.http.post<MethodValidationNablResponse>(`${this.apiUrl}/save`, data);
    }

    update(id: number, data: MethodValidationNabl): Observable<MethodValidationNablResponse> {
        data.id = id;
        return this.http.post<MethodValidationNablResponse>(`${this.apiUrl}/save`, data);
    }

    delete(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/delete/${id}`);
    }
    getTestMethodList(searchTerm: string = '', pageNo: number = 0, pageSize: number = 20) {
        return this.http.get<any[]>(`${this.apiUrl}/alltestmethodlist`, {
            params: {
                searchTerm: searchTerm,
                pageNo: pageNo,
                pageSize: pageSize
            }
        });
    }
    getTestMethodDetails(testmethodCode: string): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/testMethodDetails/${testmethodCode}`);
    }
}
