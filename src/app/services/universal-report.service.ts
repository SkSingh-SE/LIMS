import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class UniversalReportService {
  private apiUrl = `${environment.apiUrl}/UniversalReport`;

  constructor(private http: HttpClient) { }

  preview(executionId: number, formatCode?: string): Observable<any> {
    const url = formatCode
      ? `${this.apiUrl}/preview/${executionId}?formatCode=${encodeURIComponent(formatCode)}`
      : `${this.apiUrl}/preview/${executionId}`;
    return this.http.get<any>(url).pipe(
      map(res => res?.data ?? res)
    );
  }

  listByExecution(executionId: number): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/by-execution/${executionId}`).pipe(
      map(res => res?.data ?? res ?? [])
    );
  }

  getById(reportId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${reportId}`).pipe(
      map(res => res?.data ?? res)
    );
  }

  generate(executionId: number, remarks?: string, formatCode?: string): Observable<any> {
    const body: any = { remarks: remarks ?? null };
    if (formatCode) body.reportFormatCode = formatCode;
    return this.http.post<any>(`${this.apiUrl}/generate/${executionId}`, body).pipe(
      map(res => res?.data ?? res)
    );
  }

  getAvailableFormats(): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/formats`).pipe(
      map(res => res?.data ?? res ?? [])
    );
  }

  release(reportId: number, remarks?: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${reportId}/release`, { remarks: remarks ?? null }).pipe(
      map(res => res?.data ?? res)
    );
  }

  reissue(reportId: number, reason: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${reportId}/reissue`, { reason }).pipe(
      map(res => res?.data ?? res)
    );
  }

  voidReport(reportId: number, reason: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${reportId}/void`, { reason }).pipe(
      map(res => res?.data ?? res)
    );
  }

  download(reportId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${reportId}/download`, { responseType: 'blob' });
  }
}
