import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { EquipmentHistoryRecord, EquipmentHistoryListResponse, EquipmentHistoryResponse } from '../models/equipmentHistoryModel';

@Injectable({
    providedIn: 'root',
})
export class EquipmentHistoryService {
    private apiUrl = environment.apiUrl + '/Nabl/EquipmentHistory';

    constructor(private http: HttpClient) {}

    getAll(params?: any): Observable<EquipmentHistoryListResponse> {
        return this.http.post<EquipmentHistoryListResponse>(this.apiUrl + '/list', params || {});
    }

    getById(id: number): Observable<EquipmentHistoryRecord | null> {
        return this.http.get<EquipmentHistoryRecord>(`${this.apiUrl}/details/${id}`);
    }

    create(data: EquipmentHistoryRecord): Observable<EquipmentHistoryResponse> {
        return this.http.post<EquipmentHistoryResponse>(`${this.apiUrl}/save`, data);
    }

    update(id: number, data: EquipmentHistoryRecord): Observable<EquipmentHistoryResponse> {
        data.id = id;
        return this.http.post<EquipmentHistoryResponse>(`${this.apiUrl}/save`, data);
    }

    delete(id: number): Observable<EquipmentHistoryResponse> {
        return this.http.delete<EquipmentHistoryResponse>(`${this.apiUrl}/delete/${id}`);
    }

    getByEquipmentId(equipmentId: number): Observable<EquipmentHistoryListResponse> {
        return this.http.post<EquipmentHistoryListResponse>(this.apiUrl + '/list', { equipmentId });
    }
}
