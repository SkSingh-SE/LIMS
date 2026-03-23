import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class TpiInspectionService {
  private apiUrl = environment.apiUrl + '/TpiInspection';
  constructor(private http: HttpClient) {}

  getAll(filter: any): Observable<any> {
    return this.http.post<any>(this.apiUrl + '/list', filter);
  }
  getBySample(sampleInwardId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/by-inward/${sampleInwardId}`);
  }
  getById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/details/${id}`);
  }
  create(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/create`, payload);
  }
  updateStatus(id: number, payload: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/update-status/${id}`, payload);
  }
  getPending(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/pending`);
  }

  exportReleaseNote(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/export/${id}`, { responseType: 'blob' });
  }
}
