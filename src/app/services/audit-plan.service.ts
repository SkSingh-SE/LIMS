import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuditPlan } from '../models/audit-plan';

@Injectable({
    providedIn: 'root',
})
export class AuditPlanService {
    private apiUrl = environment.apiUrl + '/Nabl/AuditPlan';

    constructor(private http: HttpClient) {}

    getAll(): Observable<AuditPlan[]> {
        return this.http.post<AuditPlan[]>(this.apiUrl + '/list', {});
    }

    getById(id: number): Observable<AuditPlan | undefined> {
        return this.http.get<AuditPlan>(`${this.apiUrl}/details/${id}`);
    }

    create(data: AuditPlan): Observable<AuditPlan> {
        return this.http.post<AuditPlan>(`${this.apiUrl}/save`, data);
    }

    update(id: number, data: AuditPlan): Observable<AuditPlan> {
        data.id = id;
        return this.http.post<AuditPlan>(`${this.apiUrl}/save`, data);
    }

    delete(id: number): Observable<boolean> {
        return this.http.delete<boolean>(`${this.apiUrl}/delete/${id}`);
    }
}
