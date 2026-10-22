import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuditSummary } from '../models/audit-summary';

@Injectable({
    providedIn: 'root',
})
export class AuditSummaryService {
    private apiUrl = environment.apiUrl + '/Nabl/AuditSummary';

    constructor(private http: HttpClient) { }

    getAll(params: any = {}): Observable<any> {
        return this.http.post<any>(this.apiUrl + '/list', params || {});
    }

    getById(id: number): Observable<AuditSummary | undefined> {
        return this.http.get<AuditSummary>(`${this.apiUrl}/details/${id}`);
    }
    create(data: AuditSummary): Observable<AuditSummary> {
        return this.http.post<AuditSummary>(`${this.apiUrl}/save`, data);
    }

    update(id: number, data: AuditSummary): Observable<AuditSummary> {
        data.id = id;
        return this.http.post<AuditSummary>(`${this.apiUrl}/save`, data);
    }

    delete(id: number): Observable<boolean> {
        return this.http.delete<boolean>(`${this.apiUrl}/delete/${id}`);
    }
    getSummaryByAuditPlanId(auditPlanId: number): Observable<any> {
        return this.http.get<any>(
            `${this.apiUrl}/audit-plan/${auditPlanId}`
        );
    }
}
