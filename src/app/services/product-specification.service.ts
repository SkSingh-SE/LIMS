import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProductSpecificationService {

  private apiUrl = environment.apiUrl +"/ProductSpecification"; 
  
    constructor(private http: HttpClient) {}
  
    getAllProductSpecifications(filter:any): Observable<any> {
      return this.http.post<any>(this.apiUrl+"/list", filter);
    }
    getAllCustomProductSpecifications(filter:any): Observable<any> {
      return this.http.post<any>(this.apiUrl+"/customList", filter);
    }
  
    getProductSpecificationById(id: number): Observable<any> {
      return this.http.get<any>(`${this.apiUrl}/details/${id}`);
    }
  
    createProductSpecification(payload: any): Observable<any> {
      return this.http.post<any>(`${this.apiUrl}/create`, payload);
    }
  
    updateProductSpecification( payload: any): Observable<any> {
      return this.http.put<any>(`${this.apiUrl}/update`, payload);
    }
  
    deleteProductSpecification(id: number): Observable<any> {
      return this.http.delete<any>(`${this.apiUrl}/delete/${id}`);
    }

    getProductSpecificationDropdown(searchTerm:string,pageNumber:number, pageSize:number): Observable<any> {
      return this.http.get<any>(`${this.apiUrl}/dropdown?searchTerm=${searchTerm}&pageNo=${pageNumber}&pageSize=${pageSize}`);
    }
}
