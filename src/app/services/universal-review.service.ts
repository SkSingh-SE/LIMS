import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class UniversalReviewService {
  private apiUrl = `${environment.apiUrl}/UniversalReview`;

  constructor(private http: HttpClient) { }

  assignReviewer(resultId: number, reviewerId: number, remarks?: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${resultId}/assign-reviewer`, { reviewerID: reviewerId, reviewerId, remarks: remarks ?? null }).pipe(
      map(res => res?.data ?? res)
    );
  }

  createFinding(resultId: number, dto: { findingType: string; description: string; severity: string; isBlocking: boolean }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${resultId}/findings`, dto).pipe(
      map(res => res?.data ?? res)
    );
  }

  resolveFinding(findingId: number, resolution: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/findings/${findingId}/resolve`, { resolution }).pipe(
      map(res => res?.data ?? res)
    );
  }

  requestRework(resultId: number, concurrencyToken: string, remarks: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${resultId}/request-rework`, { concurrencyToken, remarks }).pipe(
      map(res => res?.data ?? res)
    );
  }

  verify(resultId: number, concurrencyToken: string, remarks?: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${resultId}/verify`, { concurrencyToken, remarks: remarks ?? null }).pipe(
      map(res => res?.data ?? res)
    );
  }

  approve(resultId: number, concurrencyToken: string, remarks?: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${resultId}/approve`, { concurrencyToken, remarks: remarks ?? null }).pipe(
      map(res => res?.data ?? res)
    );
  }

  reject(resultId: number, concurrencyToken: string, remarks: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${resultId}/reject`, { concurrencyToken, remarks }).pipe(
      map(res => res?.data ?? res)
    );
  }
}
