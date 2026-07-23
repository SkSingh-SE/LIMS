import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ProductMasterService {
  private apiUrl = environment.apiUrl + '/ProductMaster';

  constructor(private http: HttpClient) {}

  getAll(filter: any): Observable<any> {
    return this.http.post<any>(this.apiUrl + '/list', filter);
  }

  getById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/details/${id}`);
  }

  create(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/create`, payload);
  }

  update(payload: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/update`, payload);
  }

  delete(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }

  getDropdown(searchTerm: string, pageNumber: number = 0, pageSize: number = 20): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/dropdown?searchTerm=${encodeURIComponent(searchTerm || '')}&pageNo=${pageNumber}&pageSize=${pageSize}`);
  }

  getGradeParameters(gradeId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/grade-parameters/${gradeId}`);
  }

  getPrefixOptions(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/prefix-options`);
  }

  addPrefixOption(prefix: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/prefix-options/add`, JSON.stringify(prefix), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  uploadSpecFile(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<any>(`${this.apiUrl}/upload-spec-file`, formData);
  }
}
