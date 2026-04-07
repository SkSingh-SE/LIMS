import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { RiskAssessment } from '../models/risk-assessment';

@Injectable({
    providedIn: 'root',
})
export class RiskAssessmentService {
    private apiUrl = environment.apiUrl + '/Nabl/RiskAssessment';

    constructor(private http: HttpClient) {}

    getAll(params: any = {}): Observable<any> {
        return this.http.post<any>(this.apiUrl + '/list', params || {});
    }

    getById(id: number): Observable<RiskAssessment | undefined> {
        return this.http.get<RiskAssessment>(`${this.apiUrl}/details/${id}`);
    }

    create(data: RiskAssessment): Observable<RiskAssessment> {
        return this.http.post<RiskAssessment>(`${this.apiUrl}/save`, data);
    }

    update(id: number, data: RiskAssessment): Observable<RiskAssessment> {
        data.id = id;
        return this.http.post<RiskAssessment>(`${this.apiUrl}/save`, data);
    }

    delete(id: number): Observable<boolean> {
        return this.http.delete<boolean>(`${this.apiUrl}/delete/${id}`);
    }
}
