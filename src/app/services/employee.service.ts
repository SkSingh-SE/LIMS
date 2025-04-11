import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EmployeeService {
  private apiUrl = environment.apiUrl +"/EmployeeMaster";
  constructor(private http: HttpClient) { }

  getAllEmployees(filter:any): Observable<any> {
    return this.http.post<any>(this.apiUrl+"/list", filter);
  }
  getEmployeeById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/details/${id}`);
  }
  createEmployee(employee: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/create`, employee);
  }
  updateEmployee(id: number, employee: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/update`, employee);
  }
  deleteEmployee(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/delete/${id}`);
  }
  getEmployeeDropdown(searchTerm:string,pageNumber:number, pageSize:number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/dropdown?searchTerm=${searchTerm}&pageNo=${pageNumber}&pageSize=${pageSize}`);
  }
  getAreasWithPinCode(pincode: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/AreaMaster/getAreaWithPincode?pincode=${pincode}`);
  }
  updateQualifications(qualifications: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/qualification/update`, qualifications);
  }
  updateDocuments(documents: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/document/update`, documents);
  }

}
