import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LabScopeService {

  private apiUrl = environment.apiUrl +"/LabScopeMaster"; 
  
    constructor(private http: HttpClient) {}
  
    getAllLabScopes(filter:any): Observable<any> {
      return this.http.post<any>(this.apiUrl+"/list", filter);
    }
  
    getLabScopeById(id: number): Observable<any> {
      return this.http.get<any>(`${this.apiUrl}/details/${id}`);
    }
  
    createLabScope(payload: any): Observable<any> {
      return this.http.post<any>(`${this.apiUrl}/create`, payload);
    }
  
    updateLabScope( payload: any): Observable<any> {
      return this.http.put<any>(`${this.apiUrl}/update`, payload);
    }
  
    deleteLabScope(id: number): Observable<any> {
      return this.http.delete<any>(`${this.apiUrl}/delete/${id}`);
    }

    getUnifiedTests(searchTerm?: string, pageNo: number = 1, pageSize: number = 50): Observable<any[]> {
      const term = searchTerm ? encodeURIComponent(searchTerm) : '';
      return this.http.get<any[]>(`${this.apiUrl}/unified-tests?searchTerm=${term}&pageNo=${pageNo}&pageSize=${pageSize}`);
    }

    getNablValidity(): Observable<any> {
      return this.http.get<any>(`${this.apiUrl}/nabl-validity`);
    }

}
