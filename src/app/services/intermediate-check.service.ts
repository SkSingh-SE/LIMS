import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { IntermediateCheckRecord, IntermediateCheckListResponse, IntermediateCheckResponse } from '../models/intermediateCheckModel';

@Injectable({
    providedIn: 'root',
})
export class IntermediateCheckService {
    private apiUrl = environment.apiUrl + '/Nabl/IntermediateCheck';

    constructor(private http: HttpClient) {}

    getAll(params?: any): Observable<IntermediateCheckListResponse> {
        return this.http.post<IntermediateCheckListResponse>(this.apiUrl + '/list', params || {});
    }

    getById(id: number): Observable<IntermediateCheckRecord | null> {
        return this.http.get<IntermediateCheckRecord>(`${this.apiUrl}/details/${id}`);
    }

    create(data: IntermediateCheckRecord): Observable<IntermediateCheckResponse> {
        return this.http.post<IntermediateCheckResponse>(`${this.apiUrl}/save`, data);
    }

    update(id: number, data: IntermediateCheckRecord): Observable<IntermediateCheckResponse> {
        data.id = id;
        return this.http.post<IntermediateCheckResponse>(`${this.apiUrl}/save`, data);
    }

    delete(id: number): Observable<IntermediateCheckResponse> {
        return this.http.delete<IntermediateCheckResponse>(`${this.apiUrl}/delete/${id}`);
    }

    getByEquipmentId(equipmentId: number): Observable<IntermediateCheckListResponse> {
        return this.http.post<IntermediateCheckListResponse>(this.apiUrl + '/list', { equipmentId });
    }

    getPendingChecks(): Observable<IntermediateCheckListResponse> {
        return this.http.post<IntermediateCheckListResponse>(this.apiUrl + '/list', { status: 'pending' });
    }
}
