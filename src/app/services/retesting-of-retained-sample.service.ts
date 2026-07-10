import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { RetestingOfRetainedSample, RetestingOfRetainedSampleListResponse, RetestingOfRetainedSampleResponse } from '../models/retestingOfRetainedSampleModel';

@Injectable({
    providedIn: 'root',
})
export class RetestingOfRetainedSampleService {
    private apiUrl = environment.apiUrl + '/Nabl/Retesting';

    constructor(private http: HttpClient) { }

    getAll(params?: any): Observable<RetestingOfRetainedSampleListResponse> {
        return this.http.post<RetestingOfRetainedSampleListResponse>(this.apiUrl + '/list', params || {});
    }

    getById(id: number): Observable<RetestingOfRetainedSample | null> {
        return this.http.get<RetestingOfRetainedSample>(`${this.apiUrl}/details/${id}`);
    }

    create(data: RetestingOfRetainedSample): Observable<RetestingOfRetainedSampleResponse> {
        return this.http.post<RetestingOfRetainedSampleResponse>(`${this.apiUrl}/save`, data);
    }

    update(id: number, data: RetestingOfRetainedSample): Observable<RetestingOfRetainedSampleResponse> {
        data.id = id;
        return this.http.post<RetestingOfRetainedSampleResponse>(`${this.apiUrl}/save`, data);
    }

    delete(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/delete/${id}`);
    }
    getQCPlanNo(searchTerm: string, pageNumber: number, pageSize: number): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/qcplanno-dropdown?searchTerm=${searchTerm}&pageNo=${pageNumber}&pageSize=${pageSize}`);
    }

    getQcDetails(id: number): Observable<any> {
        return this.http.get<any[]>(`${this.apiUrl}/qcDetails/${id}`);
    }
}
