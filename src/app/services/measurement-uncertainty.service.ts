import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MeasurementUncertainty, MeasurementUncertaintyListResponse, MeasurementUncertaintyResponse } from '../models/measurementUncertaintyModel';

@Injectable({
  providedIn: 'root'
})
export class MeasurementUncertaintyService {
    private apiUrl = environment.apiUrl + '/Nabl/MeasurementUncertainty';

    constructor(private http: HttpClient) {}

    getAll(params?: any): Observable<MeasurementUncertaintyListResponse> {
        return this.http.post<MeasurementUncertaintyListResponse>(this.apiUrl + '/list', params || {});
    }

    getById(id: number): Observable<MeasurementUncertainty | null> {
        return this.http.get<MeasurementUncertainty>(`${this.apiUrl}/details/${id}`);
    }

    create(data: MeasurementUncertainty): Observable<MeasurementUncertaintyResponse> {
        return this.http.post<MeasurementUncertaintyResponse>(`${this.apiUrl}/save`, data);
    }

    update(id: number, data: MeasurementUncertainty): Observable<MeasurementUncertaintyResponse> {
        return this.http.post<MeasurementUncertaintyResponse>(`${this.apiUrl}/save`, data);
    }

    delete(id: number): Observable<any> {
        return this.http.delete<any>(`${this.apiUrl}/${id}`);
    }
}
