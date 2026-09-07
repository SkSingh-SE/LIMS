import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SpecificationMasterService {
  private apiUrl = environment.apiUrl + '/SpecificationMaster';

  constructor(private http: HttpClient) {}

  getAllSpecifications(filter: any): Observable<any> {
    return this.http.post<any>(this.apiUrl + '/list', filter);
  }

  getSpecificationById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/details/${id}`);
  }

  createSpecification(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/create`, payload);
  }

  updateSpecification(payload: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/update`, payload);
  }

  toggleStatus(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/toggle-status/${id}`, {});
  }

  getSpecificationDropdown(searchTerm: string, pageNumber: number, pageSize: number): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/dropdown?searchTerm=${encodeURIComponent(searchTerm || '')}&pageNo=${pageNumber}&pageSize=${pageSize}`
    );
  }

  getStandardOrganizations(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/standard-organizations`);
  }
}
