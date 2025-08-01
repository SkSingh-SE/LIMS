import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DispatchModeService {

  private apiUrl = environment.apiUrl +"/DispatchMode"; // Replace with actual API
  
    constructor(private http: HttpClient) {}
  
    getAllDispatchModes(filter:any): Observable<any> {
      return this.http.post<any>(this.apiUrl+"/list", filter);
    }
  
    getDispatchModeById(id: number): Observable<any> {
      return this.http.get<any>(`${this.apiUrl}/details/${id}`);
    }
  
    createDispatchMode(designation: any): Observable<any> {
      return this.http.post<any>(`${this.apiUrl}/create`, designation);
    }
  
    updateDispatchMode( designation: any): Observable<any> {
      return this.http.put<any>(`${this.apiUrl}/update`, designation);
    }
  
    deleteDispatchMode(id: number): Observable<any> {
      return this.http.delete<any>(`${this.apiUrl}/delete/${id}`);
    }

    getDispatchModeDropdown(searchTerm:string,pageNumber:number, pageSize:number): Observable<any> {
      return this.http.get<any>(`${this.apiUrl}/dropdown?searchTerm=${searchTerm}&pageNo=${pageNumber}&pageSize=${pageSize}`);
    }
}
