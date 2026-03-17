import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { EnvironmentMonitoring, EnvironmentMonitoringListResponse, EnvironmentMonitoringResponse } from '../models/environmentMonitoringModel';

@Injectable({
    providedIn: 'root',
})
export class EnvironmentMonitoringService {
    private apiUrl = environment.apiUrl + '/Nabl/EnvironmentMonitoring';

    constructor(private http: HttpClient) {}

    getAll(params?: any): Observable<EnvironmentMonitoringListResponse> {
        return this.http.post<EnvironmentMonitoringListResponse>(this.apiUrl + '/list', params || {});
    }

    getById(id: number): Observable<EnvironmentMonitoring | null> {
        return this.http.get<EnvironmentMonitoring>(`${this.apiUrl}/details/${id}`);
    }

    create(data: EnvironmentMonitoring): Observable<EnvironmentMonitoringResponse> {
        return this.http.post<EnvironmentMonitoringResponse>(`${this.apiUrl}/save`, data);
    }

    update(id: number, data: EnvironmentMonitoring): Observable<EnvironmentMonitoringResponse> {
        data.id = id;
        return this.http.post<EnvironmentMonitoringResponse>(`${this.apiUrl}/save`, data);
    }

    delete(id: number): Observable<EnvironmentMonitoringResponse> {
        return this.http.delete<EnvironmentMonitoringResponse>(`${this.apiUrl}/delete/${id}`);
    }
}
