import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { TestMethodNabl, TestMethodNablListResponse, TestMethodNablResponse } from '../models/testMethodNablModel';

@Injectable({
    providedIn: 'root',
})
export class TestMethodNablService {
    private apiUrl = environment.apiUrl + '/Nabl/TestMethod';

    constructor(private http: HttpClient) {}

    getAll(params?: any): Observable<TestMethodNablListResponse> {
        return this.http.post<TestMethodNablListResponse>(this.apiUrl + '/list', params || {});
    }

    getById(id: number): Observable<TestMethodNabl | null> {
        return this.http.get<TestMethodNabl>(`${this.apiUrl}/details/${id}`);
    }

    create(data: TestMethodNabl): Observable<TestMethodNablResponse> {
        return this.http.post<TestMethodNablResponse>(`${this.apiUrl}/save`, data);
    }

    update(id: number, data: TestMethodNabl): Observable<TestMethodNablResponse> {
        data.id = id;
        return this.http.post<TestMethodNablResponse>(`${this.apiUrl}/save`, data);
    }

    delete(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/delete/${id}`);
    }
}
