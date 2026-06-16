import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { TrainingPlan, TrainingPlanListResponse, TrainingPlanResponse } from '../models/trainingPlanModel';

@Injectable({
    providedIn: 'root',
})
export class TrainingPlanService {
    private apiUrl = environment.apiUrl + '/Nabl/TrainingPlan';

    constructor(private http: HttpClient) {}

    getAll(params?: any): Observable<TrainingPlanListResponse> {
        return this.http.post<TrainingPlanListResponse>(this.apiUrl + '/list', params || {});
    }

    getById(id: number): Observable<TrainingPlan | null> {
        return this.http.get<TrainingPlan>(`${this.apiUrl}/details/${id}`);
    }

    create(data: TrainingPlan): Observable<TrainingPlanResponse> {
        return this.http.post<TrainingPlanResponse>(`${this.apiUrl}/save`, data);
    }

    update(id: number, data: TrainingPlan): Observable<TrainingPlanResponse> {
        data.id = id;
        return this.http.post<TrainingPlanResponse>(`${this.apiUrl}/save`, data);
    }

    delete(id: number): Observable<TrainingPlanResponse> {
        return this.http.delete<TrainingPlanResponse>(`${this.apiUrl}/delete/${id}`);
    }
}
