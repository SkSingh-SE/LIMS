import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LabScopeService {

  private apiUrl = environment.apiUrl + '/LabScope';

  constructor(private http: HttpClient) {}

  queryScopes(filter: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/list`, filter);
  }

  getScopeDetails(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/details/${id}`);
  }

  getAccreditationContext(branchId?: number | null): Observable<any> {
    const qs = branchId ? `?branchId=${branchId}` : '';
    return this.http.get<any>(`${this.apiUrl}/accreditation-context${qs}`);
  }

  createScope(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/create`, payload);
  }

  updateScope(payload: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/update`, payload);
  }

  toggleScopeStatus(id: number, activate: boolean): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/toggle-status/${id}?activate=${activate}`, {});
  }

  deleteScope(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }

  validateScope(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/validate`, payload);
  }

  previewScope(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/preview`, payload);
  }
}
