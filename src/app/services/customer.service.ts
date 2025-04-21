import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CustomerService {

  private apiUrl = environment.apiUrl +"/CustomerTypeMaster"; // Replace with actual API
  private customerTypeUrl = environment.apiUrl +"/CustomerType"; 
    constructor(private http: HttpClient) {}
  
    getAllCustomerTypes(filter:any): Observable<any> {
      return this.http.post<any>(this.customerTypeUrl+"/list", filter);
    }
  
    getCustomerTypeById(id: number): Observable<any> {
      return this.http.get<any>(`${this.customerTypeUrl}/details/${id}`);
    }
  
    createCustomerType(designation: any): Observable<any> {
      return this.http.post<any>(`${this.customerTypeUrl}/create`, designation);
    }
  
    updateCustomerType( designation: any): Observable<any> {
      return this.http.put<any>(`${this.customerTypeUrl}/update`, designation);
    }
  
    deleteCustomerType(id: number): Observable<any> {
      return this.http.delete<any>(`${this.customerTypeUrl}/delete/${id}`);
    }

    getCustomerTypeDropdown(searchTerm:string,pageNumber:number, pageSize:number): Observable<any> {
      return this.http.get<any>(`${this.customerTypeUrl}/dropdown?searchTerm=${searchTerm}&pageNo=${pageNumber}&pageSize=${pageSize}`);
    }
}