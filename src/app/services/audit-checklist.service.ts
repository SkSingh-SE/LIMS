import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuditChecklist } from '../models/audit-checklist';

@Injectable({
    providedIn: 'root',
})
export class AuditChecklistService {
    private apiUrl = environment.apiUrl + '/Nabl/AuditChecklist';

    constructor(private http: HttpClient) {}

    getAll(): Observable<AuditChecklist[]> {
        return this.http.post<AuditChecklist[]>(this.apiUrl + '/list', {});
    }

    getById(id: number): Observable<AuditChecklist | undefined> {
        return this.http.get<AuditChecklist>(`${this.apiUrl}/details/${id}`);
    }

    create(data: AuditChecklist): Observable<AuditChecklist> {
        return this.http.post<AuditChecklist>(`${this.apiUrl}/save`, data);
    }

    update(id: number, data: AuditChecklist): Observable<AuditChecklist> {
        data.id = id;
        return this.http.post<AuditChecklist>(`${this.apiUrl}/save`, data);
    }

    delete(id: number): Observable<boolean> {
        return this.http.delete<boolean>(`${this.apiUrl}/delete/${id}`);
    }
}
