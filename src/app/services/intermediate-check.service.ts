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

    constructor(private http: HttpClient) { }

    getAll(params?: any): Observable<IntermediateCheckListResponse> {
        return this.http.post<IntermediateCheckListResponse>(this.apiUrl + '/list', params || {});
    }

    getById(id: number): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/details/${id}`);
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

    getByEquipmentId(equipmentId: number): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}//equipment-details/${equipmentId}`);
    }

    getPendingChecks(): Observable<IntermediateCheckListResponse> {
        return this.http.post<IntermediateCheckListResponse>(this.apiUrl + '/list', { status: 'pending' });
    }
    getAllEquipments(searchTearm: string = '', pageNo: number = 0, pageSize: number = 20, recordId?: number | null) {
        let url =
            `${this.apiUrl}/equipmentslist` +
            `?searchTearm=${(searchTearm || '')}` +
            `&pageNo=${pageNo}` +
            `&pageSize=${pageSize}`;
        if (recordId) {
            url += `&recordId=${recordId}`;
        }
        return this.http.get<any[]>(url);
    }
}
