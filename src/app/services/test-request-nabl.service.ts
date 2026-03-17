import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { TestRequestNabl, TestRequestNablListResponse, TestRequestNablResponse } from '../models/testRequestNablModel';

@Injectable({
    providedIn: 'root',
})
export class TestRequestNablService {
    private apiUrl = environment.apiUrl + '/Nabl/TestRequest';

    constructor(private http: HttpClient) {}

    getAll(params?: any): Observable<TestRequestNablListResponse> {
        return this.http.post<TestRequestNablListResponse>(this.apiUrl + '/list', params || {});
    }

    getById(id: number): Observable<TestRequestNabl | null> {
        return this.http.get<TestRequestNabl>(`${this.apiUrl}/details/${id}`);
    }

    create(data: TestRequestNabl): Observable<TestRequestNablResponse> {
        return this.http.post<TestRequestNablResponse>(`${this.apiUrl}/save`, data);
    }

    update(id: number, data: TestRequestNabl): Observable<TestRequestNablResponse> {
        data.id = id;
        return this.http.post<TestRequestNablResponse>(`${this.apiUrl}/save`, data);
    }

    delete(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/delete/${id}`);
    }
}
