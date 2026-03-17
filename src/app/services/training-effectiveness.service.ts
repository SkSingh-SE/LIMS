import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { TrainingEffectiveness, TrainingEffectivenessListResponse, TrainingEffectivenessResponse } from '../models/trainingEffectivenessModel';

@Injectable({
    providedIn: 'root',
})
export class TrainingEffectivenessService {
    private apiUrl = environment.apiUrl + '/Nabl/TrainingEffectiveness';

    constructor(private http: HttpClient) {}

    getAll(params?: any): Observable<TrainingEffectivenessListResponse> {
        return this.http.post<TrainingEffectivenessListResponse>(this.apiUrl + '/list', params || {});
    }

    getById(id: number): Observable<TrainingEffectiveness | null> {
        return this.http.get<TrainingEffectiveness>(`${this.apiUrl}/details/${id}`);
    }

    create(data: TrainingEffectiveness): Observable<TrainingEffectivenessResponse> {
        return this.http.post<TrainingEffectivenessResponse>(`${this.apiUrl}/save`, data);
    }

    update(id: number, data: TrainingEffectiveness): Observable<TrainingEffectivenessResponse> {
        data.id = id;
        return this.http.post<TrainingEffectivenessResponse>(`${this.apiUrl}/save`, data);
    }

    delete(id: number): Observable<TrainingEffectivenessResponse> {
        return this.http.delete<TrainingEffectivenessResponse>(`${this.apiUrl}/delete/${id}`);
    }
}
