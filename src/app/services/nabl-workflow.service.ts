import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root',
})
export class NablWorkflowService {
    private apiUrl = environment.apiUrl + '/Nabl';

    constructor(private http: HttpClient) {}

    submit(formType: string, id: number): Observable<any> {
        return this.http.post(`${this.apiUrl}/${formType}/submit/${id}`, {});
    }

    review(formType: string, id: number): Observable<any> {
        return this.http.post(`${this.apiUrl}/${formType}/review/${id}`, {});
    }

    approve(formType: string, id: number): Observable<any> {
        return this.http.post(`${this.apiUrl}/${formType}/approve/${id}`, {});
    }

    reject(formType: string, id: number, remarks?: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/${formType}/reject/${id}`, { remarks });
    }

    revise(formType: string, id: number, revisionType: string, reason?: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/${formType}/revise/${id}`, { revisionType, reason });
    }

    getHistory(formType: string, id: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/${formType}/history/${id}`);
    }

    getAuditLog(formType: string, id: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/${formType}/audit-log/${id}`);
    }
}
