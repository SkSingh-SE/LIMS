import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class PriceDimensionTypeService {
  private apiUrl = environment.apiUrl + '/PriceDimensionType';

  constructor(private http: HttpClient) {}

  getAll(filter: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/list`, filter);
  }

  getById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/details/${id}`);
  }

  create(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/create`, data);
  }

  update(data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/update`, data);
  }

  delete(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/delete/${id}`);
  }

  getDropdown(searchTerm?: string, pageNo: number = 0, pageSize: number = 20): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.apiUrl}/dropdown?searchTerm=${searchTerm || ''}&pageNo=${pageNo}&pageSize=${pageSize}`
    );
  }
}
