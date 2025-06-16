import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ParameterService {

  private apiUrl = environment.apiUrl +"/ParameterMaster"; 
  
    constructor(private http: HttpClient) {}
  
    getAllChemicalParameters(filter:any): Observable<any> {
      return this.http.post<any>(this.apiUrl+"/chemical-list", filter);
    }
    getAllMechanicalParameters(filter:any): Observable<any> {
      return this.http.post<any>(this.apiUrl+"/mechanical-list", filter);
    }
  
    getParameterById(id: number): Observable<any> {
      return this.http.get<any>(`${this.apiUrl}/details/${id}`);
    }
  
    createParameter(payload: any): Observable<any> {
      return this.http.post<any>(`${this.apiUrl}/create`, payload);
    }
  
    updateParameter( payload: any): Observable<any> {
      return this.http.put<any>(`${this.apiUrl}/update`, payload);
    }
  
    deleteParameter(id: number): Observable<any> {
      return this.http.delete<any>(`${this.apiUrl}/delete/${id}`);
    }

    getParameterDropdown(searchTerm:string,pageNumber:number, pageSize:number): Observable<any> {
      return this.http.get<any>(`${this.apiUrl}/dropdown?searchTerm=${searchTerm}&pageNo=${pageNumber}&pageSize=${pageSize}`);
    }
     getChemicalParameterDropdown(searchTerm:string,pageNumber:number, pageSize:number): Observable<any> {
      return this.http.get<any>(`${this.apiUrl}/chemical-dropdown?searchTerm=${searchTerm}&pageNo=${pageNumber}&pageSize=${pageSize}`);
    }
     getMechanicalParameterDropdown(searchTerm:string,pageNumber:number, pageSize:number): Observable<any> {
      return this.http.get<any>(`${this.apiUrl}/mechanical-dropdown?searchTerm=${searchTerm}&pageNo=${pageNumber}&pageSize=${pageSize}`);
    }
  
}
