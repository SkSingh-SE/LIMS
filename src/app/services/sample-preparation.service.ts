import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SamplePreparationService {
  private apiUrl = environment.apiUrl + '/SamplePreparation';

  constructor(private http: HttpClient) {}

  getAll(filter: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/list`, filter);
  }

  getById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/details/${id}`);
  }

  getBySample(sampleId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/by-sample/${sampleId}`);
  }

  create(dto: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/create`, dto);
  }

  update(dto: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/update`, dto);
  }

  updateStatus(id: number, dto: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/status/${id}`, dto);
  }

  refreshCharges(sampleId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/refresh-charges/${sampleId}`, {});
  }
}
