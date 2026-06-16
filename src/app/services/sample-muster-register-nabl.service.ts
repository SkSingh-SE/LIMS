import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { SampleMusterRegisterNabl, SampleMusterRegisterNablListResponse, SampleMusterRegisterNablResponse } from '../models/sampleMusterRegisterNablModel';

@Injectable({
    providedIn: 'root',
})
export class SampleMusterRegisterNablService {
    private apiUrl = environment.apiUrl + '/Nabl/SampleMusterRegister';

    constructor(private http: HttpClient) {}

    getAll(params?: any): Observable<SampleMusterRegisterNablListResponse> {
        return this.http.post<SampleMusterRegisterNablListResponse>(this.apiUrl + '/list', params || {});
    }

    getById(id: number): Observable<SampleMusterRegisterNabl | null> {
        return this.http.get<SampleMusterRegisterNabl>(`${this.apiUrl}/details/${id}`);
    }

    create(data: SampleMusterRegisterNabl): Observable<SampleMusterRegisterNablResponse> {
        return this.http.post<SampleMusterRegisterNablResponse>(`${this.apiUrl}/save`, data);
    }

    update(id: number, data: SampleMusterRegisterNabl): Observable<SampleMusterRegisterNablResponse> {
        data.id = id;
        return this.http.post<SampleMusterRegisterNablResponse>(`${this.apiUrl}/save`, data);
    }

    delete(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/delete/${id}`);
    }
}
