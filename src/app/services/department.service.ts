import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DepartmentService {
  private apiUrl = environment.apiUrl + '/DepartmentMaster';

  constructor(private http: HttpClient) {}

  getAllDepartments(filter: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/list`, filter);
  }

  getDepartmentById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/details/${id}`);
  }

  createDepartment(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/create`, payload);
  }

  updateDepartment(payload: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/update`, payload);
  }

  deleteDepartment(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/delete/${id}`);
  }

  toggleDepartmentStatus(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/toggle-status/${id}`, {});
  }

  getAuthorizedBranches(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/branches`);
  }

  getBranchDisciplines(branchId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/branch-disciplines/${branchId}`);
  }

  getDepartmentDropdown(searchTerm: string, pageNumber: number, pageSize: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/dropdown?searchTerm=${searchTerm}&pageNo=${pageNumber}&pageSize=${pageSize}`);
  }
}
