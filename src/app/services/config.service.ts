import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private apiUrl = environment.apiUrl + "/Configurations";
  constructor(private http: HttpClient) { }

  getAllConfigurations(filter: any): Observable<any> {
    return this.http.post<any>(this.apiUrl + "/list", filter);
  }

  getConfigurationsById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/details/${id}`);
  }

  createConfigurations(designation: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/create`, designation);
  }

  updateConfigurations(designation: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/update`, designation);
  }

  deleteConfigurations(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/delete/${id}`);
  }

  getConfigurationsDropdown(searchTerm: string, pageNumber: number, pageSize: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/dropdown?searchTerm=${searchTerm}&pageNo=${pageNumber}&pageSize=${pageSize}`);
  }
}
