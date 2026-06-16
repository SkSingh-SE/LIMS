import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { SampleLabelNabl, SampleLabelNablListResponse, SampleLabelNablResponse } from '../models/sampleLabelNablModel';

@Injectable({
    providedIn: 'root',
})
export class SampleLabelNablService {
    private apiUrl = environment.apiUrl + '/Nabl/SampleLabel';

    constructor(private http: HttpClient) {}

    getAll(params?: any): Observable<SampleLabelNablListResponse> {
        return this.http.post<SampleLabelNablListResponse>(this.apiUrl + '/list', params || {});
    }

    getById(id: number): Observable<SampleLabelNabl | null> {
        return this.http.get<SampleLabelNabl>(`${this.apiUrl}/details/${id}`);
    }

    create(data: SampleLabelNabl): Observable<SampleLabelNablResponse> {
        return this.http.post<SampleLabelNablResponse>(`${this.apiUrl}/save`, data);
    }

    update(id: number, data: SampleLabelNabl): Observable<SampleLabelNablResponse> {
        data.id = id;
        return this.http.post<SampleLabelNablResponse>(`${this.apiUrl}/save`, data);
    }

    delete(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/delete/${id}`);
    }
}
