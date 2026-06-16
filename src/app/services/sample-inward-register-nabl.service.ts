import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { SampleInwardRegisterNabl, SampleInwardRegisterNablListResponse, SampleInwardRegisterNablResponse } from '../models/sampleInwardRegisterNablModel';

@Injectable({
    providedIn: 'root',
})
export class SampleInwardRegisterNablService {
    private apiUrl = environment.apiUrl + '/Nabl/SampleInwardRegister';

    constructor(private http: HttpClient) {}

    getAll(params?: any): Observable<SampleInwardRegisterNablListResponse> {
        return this.http.post<SampleInwardRegisterNablListResponse>(this.apiUrl + '/list', params || {});
    }

    getById(id: number): Observable<SampleInwardRegisterNabl | null> {
        return this.http.get<SampleInwardRegisterNabl>(`${this.apiUrl}/details/${id}`);
    }

    create(data: SampleInwardRegisterNabl): Observable<SampleInwardRegisterNablResponse> {
        return this.http.post<SampleInwardRegisterNablResponse>(`${this.apiUrl}/save`, data);
    }

    update(id: number, data: SampleInwardRegisterNabl): Observable<SampleInwardRegisterNablResponse> {
        data.id = id;
        return this.http.post<SampleInwardRegisterNablResponse>(`${this.apiUrl}/save`, data);
    }

    delete(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/delete/${id}`);
    }
}
