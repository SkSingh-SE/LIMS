import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { InternalAuditor } from '../models/internal-auditor';

@Injectable({
    providedIn: 'root',
})
export class InternalAuditorService {
    private apiUrl = environment.apiUrl + '/Nabl/InternalAuditor';

    constructor(private http: HttpClient) {}

    getAll(params: any = {}): Observable<any> {
        return this.http.post<any>(this.apiUrl + '/list', params || {});
    }

    getById(id: number): Observable<InternalAuditor | undefined> {
        return this.http.get<InternalAuditor>(`${this.apiUrl}/details/${id}`);
    }

    create(data: InternalAuditor): Observable<InternalAuditor> {
        return this.http.post<InternalAuditor>(`${this.apiUrl}/save`, data);
    }

    update(id: number, data: InternalAuditor): Observable<InternalAuditor> {
        data.id = id;
        return this.http.post<InternalAuditor>(`${this.apiUrl}/save`, data);
    }

    delete(id: number): Observable<boolean> {
        return this.http.delete<boolean>(`${this.apiUrl}/delete/${id}`);
    }
}
