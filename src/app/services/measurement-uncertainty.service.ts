import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { MeasurementUncertainty, MeasurementUncertaintyListResponse, MeasurementUncertaintyResponse } from '../models/measurementUncertaintyModel';

@Injectable({
    providedIn: 'root',
})
export class MeasurementUncertaintyService {
    private apiUrl = environment.apiUrl + '/Nabl/MeasurementUncertainty';

    constructor(private http: HttpClient) { }

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
        data.id = id;
        return this.http.post<MeasurementUncertaintyResponse>(`${this.apiUrl}/save`, data);
    }

    delete(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/delete/${id}`);
    }
    getNextMUNo() {

        return this.http.get<any>(`${this.apiUrl}/next-mu-no`);
    }
}
