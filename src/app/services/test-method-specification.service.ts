import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TestMethodSpecificationService {

  private apiUrl = environment.apiUrl +"/TestMethodSpecification";
  
    constructor(private http: HttpClient) {}
  
    getAllTestMethodSpecifications(filter:any): Observable<any> {
      return this.http.post<any>(this.apiUrl+"/list", filter);
    }
  
    getTestMethodSpecificationById(id: number): Observable<any> {
      return this.http.get<any>(`${this.apiUrl}/details/${id}`);
    }
  
    createTestMethodSpecification(payload: any): Observable<any> {
      return this.http.post<any>(`${this.apiUrl}/create`, payload);
    }
  
    updateTestMethodSpecification( payload: any): Observable<any> {
      return this.http.put<any>(`${this.apiUrl}/update`, payload);
    }
  
    deleteTestMethodSpecification(id: number): Observable<any> {
      return this.http.delete<any>(`${this.apiUrl}/delete/${id}`);
    }
    enable_disableTestMethodSpecification(id: number): Observable<any> {
      return this.http.delete<any>(`${this.apiUrl}/enable-disable/${id}`);
    }
    

    getTestMethodSpecificationDropdown(searchTerm:string,pageNumber:number, pageSize:number): Observable<any> {
      return this.http.get<any>(`${this.apiUrl}/dropdown?searchTerm=${searchTerm}&pageNo=${pageNumber}&pageSize=${pageSize}`);
    }

   
}
