import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CrmConsumptionRecord, CrmConsumptionListResponse, CrmConsumptionResponse } from '../models/crmConsumptionModel';

@Injectable({
    providedIn: 'root',
})
export class CrmConsumptionService {
    private apiUrl = environment.apiUrl + '/Nabl/CrmConsumption';

    constructor(private http: HttpClient) { }

    getAll(params?: any): Observable<CrmConsumptionListResponse> {
        return this.http.post<CrmConsumptionListResponse>(this.apiUrl + '/list', params || {});
    }

    getById(id: number): Observable<CrmConsumptionRecord | null> {
        return this.http.get<CrmConsumptionRecord>(`${this.apiUrl}/details/${id}`);
    }

    create(data: CrmConsumptionRecord): Observable<CrmConsumptionResponse> {
        return this.http.post<CrmConsumptionResponse>(`${this.apiUrl}/save`, data);
    }

    update(id: number, data: CrmConsumptionRecord): Observable<CrmConsumptionResponse> {
        data.id = id;
        return this.http.post<CrmConsumptionResponse>(`${this.apiUrl}/save`, data);
    }

    delete(id: number): Observable<CrmConsumptionResponse> {
        return this.http.delete<CrmConsumptionResponse>(`${this.apiUrl}/delete/${id}`);
    }

    getByMaterialId(materialId: number): Observable<CrmConsumptionListResponse> {
        return this.http.post<CrmConsumptionListResponse>(this.apiUrl + '/list', { referenceMaterialId: materialId });
    }

    getByPeriod(month: number, year: number): Observable<CrmConsumptionListResponse> {
        return this.http.post<CrmConsumptionListResponse>(this.apiUrl + '/list', { consumptionMonth: month, consumptionYear: year });
    }
    addConsumptionLog(payload: any) {
        return this.http.post(`${this.apiUrl}/add-consumption`, payload)
    }
    save(data: CrmConsumptionRecord): Observable<CrmConsumptionResponse> {
        return this.http.post<CrmConsumptionResponse>(`${this.apiUrl}/save`, data);
    }
}
