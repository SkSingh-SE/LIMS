import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { FeedbackAnalysis } from '../models/feedback-analysis';

@Injectable({
    providedIn: 'root',
})
export class FeedbackAnalysisService {
    private apiUrl = environment.apiUrl + '/Nabl/FeedbackAnalysis';

    constructor(private http: HttpClient) { }

    getAll(params: any = {}): Observable<any> {
        return this.http.post<any>(this.apiUrl + '/list', params || {});
    }

    getById(id: number): Observable<FeedbackAnalysis | undefined> {
        return this.http.get<FeedbackAnalysis>(`${this.apiUrl}/details/${id}`);
    }

    create(data: FeedbackAnalysis): Observable<FeedbackAnalysis> {
        return this.http.post<FeedbackAnalysis>(`${this.apiUrl}/save`, data);
    }

    update(id: number, data: FeedbackAnalysis): Observable<FeedbackAnalysis> {
        data.id = id;
        return this.http.post<FeedbackAnalysis>(`${this.apiUrl}/save`, data);
    }

    delete(id: number): Observable<boolean> {
        return this.http.delete<boolean>(`${this.apiUrl}/delete/${id}`);
    }
    getCustomerDropdown(searchTerm: string, pageNumber: number, pageSize: number): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/customer-dropdown?searchTerm=${searchTerm}&pageNo=${pageNumber}&pageSize=${pageSize}`);
    }
    getFeedbackDetails(id: number) {
        return this.http.get<any>(`${this.apiUrl}/feedback-details/${id}`);
    }
    getNextAnalysisNoNo() {

        return this.http.get<any>(`${this.apiUrl}/next-analysis-no`);
    }
}

