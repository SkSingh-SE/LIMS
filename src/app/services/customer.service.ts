import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CustomerService {

  private apiUrl = environment.apiUrl +"/CustomerMaster"; // Replace with actual API
  private CustomerUrl = environment.apiUrl +"/Customer"; 
    constructor(private http: HttpClient) {}
  
    getAllCustomers(filter:any): Observable<any> {
      return this.http.post<any>(this.CustomerUrl+"/list", filter);
    }
  
    getCustomerById(id: number): Observable<any> {
      return this.http.get<any>(`${this.CustomerUrl}/details/${id}`);
    }
  
    createCustomer(designation: any): Observable<any> {
      return this.http.post<any>(`${this.CustomerUrl}/create`, designation);
    }
  
    updateCustomer( designation: any): Observable<any> {
      return this.http.put<any>(`${this.CustomerUrl}/update`, designation);
    }
  
    deleteCustomer(id: number): Observable<any> {
      return this.http.delete<any>(`${this.CustomerUrl}/delete/${id}`);
    }

    getCustomerDropdown(searchTerm:string,pageNumber:number, pageSize:number): Observable<any> {
      return this.http.get<any>(`${this.CustomerUrl}/dropdown?searchTerm=${searchTerm}&pageNo=${pageNumber}&pageSize=${pageSize}`);
    }
}