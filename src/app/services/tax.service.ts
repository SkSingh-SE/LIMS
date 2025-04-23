import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TaxService {

  private apiUrl = environment.apiUrl +"/Tax"; // Replace with actual API
  
    constructor(private http: HttpClient) {}
  
    getAllTaxes(filter:any): Observable<any> {
      return this.http.post<any>(this.apiUrl+"/list", filter);
    }
  
    getTaxById(id: number): Observable<any> {
      return this.http.get<any>(`${this.apiUrl}/details/${id}`);
    }
  
    createTax(designation: any): Observable<any> {
      return this.http.post<any>(`${this.apiUrl}/create`, designation);
    }
  
    updateTax( designation: any): Observable<any> {
      return this.http.put<any>(`${this.apiUrl}/update`, designation);
    }
  
    deleteTax(id: number): Observable<any> {
      return this.http.delete<any>(`${this.apiUrl}/delete/${id}`);
    }

    getTaxDropdown(searchTerm:string,pageNumber:number, pageSize:number): Observable<any> {
      return this.http.get<any>(`${this.apiUrl}/dropdown?searchTerm=${searchTerm}&pageNo=${pageNumber}&pageSize=${pageSize}`);
    }
}
