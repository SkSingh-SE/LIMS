import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class CustomerPOService {
  private apiUrl = environment.apiUrl + '/customer-po';

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

  update(id: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/update/${id}`, data);
  }

  delete(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/delete/${id}`);
  }

  getDropdown(customerId: number, searchTerm?: string, pageNo: number = 0, pageSize: number = 20): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.apiUrl}/dropdown/${customerId}?searchTerm=${searchTerm || ''}&pageNo=${pageNo}&pageSize=${pageSize}`
    );
  }

  getUtilization(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/utilization/${id}`);
  }
}
