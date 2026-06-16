import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ParameterCategoryService {
  private apiUrl = environment.apiUrl + '/ParameterCategoryMaster';

  constructor(private http: HttpClient) {}

  getAllParameterCategories(filter: any): Observable<any> {
    return this.http.post<any>(this.apiUrl + '/list', filter);
  }

  getParameterCategoryById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/details/${id}`);
  }

  createParameterCategory(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/create`, payload);
  }

  updateParameterCategory(payload: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/update`, payload);
  }

  deleteParameterCategory(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/delete/${id}`);
  }

  getParameterCategoryDropdown(searchTerm: string, pageNumber: number, pageSize: number): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/dropdown?searchTerm=${searchTerm}&pageNo=${pageNumber}&pageSize=${pageSize}`,
    );
  }
}
