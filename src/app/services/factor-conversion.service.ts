import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FactorConversionService {

  private apiUrl = environment.apiUrl + '/FactorConversion';

  constructor(private http: HttpClient) {}

  queryFactors(filter: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/list`, filter);
  }

  getFactorDetails(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/details/${id}`);
  }

  createFactor(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/create`, payload);
  }

  updateFactor(payload: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/update`, payload);
  }

  toggleFactorStatus(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/toggle-status/${id}`, {});
  }

  deleteFactor(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }

  getFactorDropdown(searchTerm: string, pageNumber: number, pageSize: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/dropdown?searchTerm=${encodeURIComponent(searchTerm || '')}&pageNo=${pageNumber}&pageSize=${pageSize}`);
  }

  validateFactor(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/validate`, payload);
  }
}
