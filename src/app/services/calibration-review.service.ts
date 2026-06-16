import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CalibrationCertificate, CalibrationReviewListResponse, CalibrationReviewResponse } from '../models/calibrationReviewModel';

@Injectable({
    providedIn: 'root',
})
export class CalibrationReviewService {
    private apiUrl = environment.apiUrl + '/Nabl/CalibrationReview';

    constructor(private http: HttpClient) {}

    getAll(params?: any): Observable<CalibrationReviewListResponse> {
        return this.http.post<CalibrationReviewListResponse>(this.apiUrl + '/list', params || {});
    }

    getById(id: number): Observable<CalibrationCertificate | null> {
        return this.http.get<CalibrationCertificate>(`${this.apiUrl}/details/${id}`);
    }

    create(data: CalibrationCertificate): Observable<CalibrationReviewResponse> {
        return this.http.post<CalibrationReviewResponse>(`${this.apiUrl}/save`, data);
    }

    update(id: number, data: CalibrationCertificate): Observable<CalibrationReviewResponse> {
        data.id = id;
        return this.http.post<CalibrationReviewResponse>(`${this.apiUrl}/save`, data);
    }

    delete(id: number): Observable<CalibrationReviewResponse> {
        return this.http.delete<CalibrationReviewResponse>(`${this.apiUrl}/delete/${id}`);
    }

    getPendingReviews(): Observable<CalibrationReviewListResponse> {
        return this.http.post<CalibrationReviewListResponse>(this.apiUrl + '/list', { reviewStatus: 'pending' });
    }
}
