import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CompanyCategoryService {
  private apiUrl = environment.apiUrl + "/CompanyCategory";
  constructor(private http: HttpClient) { }

  getAllCompanyCategories(filter: any): Observable<any> {
    return this.http.post<any>(this.apiUrl + "/list", filter);
  }

  getCompanyCategoryById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/details/${id}`);
  }

  createCompanyCategory(designation: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/create`, designation);
  }

  updateCompanyCategory(designation: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/update`, designation);
  }

  deleteCompanyCategory(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/delete/${id}`);
  }

  getCompanyCategoryDropdown(searchTerm: string, pageNumber: number, pageSize: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/dropdown?searchTerm=${searchTerm}&pageNo=${pageNumber}&pageSize=${pageSize}`);
  }
}
