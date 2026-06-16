import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root',
})
export class EmployeePerformanceService {
    private apiUrl = environment.apiUrl + '/Nabl/EmployeePerformanceRecord';

    constructor(private http: HttpClient) {}

    getAll(filter: any): Observable<any> {
        return this.http.post<any>(this.apiUrl + '/list', filter);
    }

    getById(id: number): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/details/${id}`);
    }

    save(record: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/save`, record);
    }

    delete(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/delete/${id}`);
    }

    submit(id: number): Observable<any> {
        return this.http.post(`${this.apiUrl}/submit/${id}`, {});
    }

    review(id: number): Observable<any> {
        return this.http.post(`${this.apiUrl}/review/${id}`, {});
    }

    approve(id: number): Observable<any> {
        return this.http.post(`${this.apiUrl}/approve/${id}`, {});
    }
}
