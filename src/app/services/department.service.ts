import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DepartmentService {

  private apiUrl = environment.apiUrl +"/DepartmentMaster"; // Replace with actual API
  
    constructor(private http: HttpClient) {}
  
    getAllDepartments(filter:any): Observable<any> {
      return this.http.post<any>(this.apiUrl+"/list", filter);
    }
  
    getDepartmentById(id: number): Observable<any> {
      return this.http.get<any>(`${this.apiUrl}/details/${id}`);
    }
  
    createDepartment(designation: any): Observable<any> {
      return this.http.post<any>(`${this.apiUrl}/create`, designation);
    }
  
    updateDepartment( designation: any): Observable<any> {
      return this.http.put<any>(`${this.apiUrl}/update`, designation);
    }
  
    deleteDepartment(id: number): Observable<any> {
      return this.http.delete<any>(`${this.apiUrl}/delete/${id}`);
    }

    getDepartmentDropdown(searchTerm:string,pageNumber:number, pageSize:number): Observable<any> {
      return this.http.get<any>(`${this.apiUrl}/dropdown?searchTerm=${searchTerm}&pageNo=${pageNumber}&pageSize=${pageSize}`);
    }
}
