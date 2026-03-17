import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { QualityControlPlan, QualityControlPlanListResponse, QualityControlPlanResponse } from '../models/qualityControlPlanModel';

@Injectable({
    providedIn: 'root',
})
export class QualityControlPlanService {
    private apiUrl = environment.apiUrl + '/Nabl/QualityControlPlan';

    constructor(private http: HttpClient) {}

    getAll(params?: any): Observable<QualityControlPlanListResponse> {
        return this.http.post<QualityControlPlanListResponse>(this.apiUrl + '/list', params || {});
    }

    getById(id: number): Observable<QualityControlPlan | null> {
        return this.http.get<QualityControlPlan>(`${this.apiUrl}/details/${id}`);
    }

    create(data: QualityControlPlan): Observable<QualityControlPlanResponse> {
        return this.http.post<QualityControlPlanResponse>(`${this.apiUrl}/save`, data);
    }

    update(id: number, data: QualityControlPlan): Observable<QualityControlPlanResponse> {
        data.id = id;
        return this.http.post<QualityControlPlanResponse>(`${this.apiUrl}/save`, data);
    }

    delete(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/delete/${id}`);
    }
}
