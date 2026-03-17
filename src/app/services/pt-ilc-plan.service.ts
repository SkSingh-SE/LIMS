import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { PtIlcPlan, PtIlcPlanListResponse, PtIlcPlanResponse } from '../models/ptIlcPlanModel';

@Injectable({
    providedIn: 'root',
})
export class PtIlcPlanService {
    private apiUrl = environment.apiUrl + '/Nabl/PtIlcPlan';

    constructor(private http: HttpClient) {}

    getAll(params?: any): Observable<PtIlcPlanListResponse> {
        return this.http.post<PtIlcPlanListResponse>(this.apiUrl + '/list', params || {});
    }

    getById(id: number): Observable<PtIlcPlan | null> {
        return this.http.get<PtIlcPlan>(`${this.apiUrl}/details/${id}`);
    }

    create(data: PtIlcPlan): Observable<PtIlcPlanResponse> {
        return this.http.post<PtIlcPlanResponse>(`${this.apiUrl}/save`, data);
    }

    update(id: number, data: PtIlcPlan): Observable<PtIlcPlanResponse> {
        data.id = id;
        return this.http.post<PtIlcPlanResponse>(`${this.apiUrl}/save`, data);
    }

    delete(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/delete/${id}`);
    }
}
