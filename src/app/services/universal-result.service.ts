import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class UniversalResultService {
  private apiUrl = `${environment.apiUrl}/UniversalResult`;

  constructor(private http: HttpClient) { }

  getByExecution(executionId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/by-execution/${executionId}`).pipe(
      map(res => res?.data ?? res)
    );
  }

  getById(resultId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${resultId}`).pipe(
      map(res => res?.data ?? res)
    );
  }

  evaluate(executionId: number, remarks?: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/evaluate/${executionId}`, { remarks: remarks ?? null }).pipe(
      map(res => res?.data ?? res)
    );
  }

  finalize(resultId: number, concurrencyToken: string, remarks?: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/finalize/${resultId}`, { concurrencyToken, remarks: remarks ?? null }).pipe(
      map(res => res?.data ?? res)
    );
  }

  phase9Handoff(executionId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/phase9-handoff/${executionId}`).pipe(
      map(res => res?.data ?? res)
    );
  }
}
