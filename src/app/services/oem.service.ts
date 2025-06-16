import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class OEMService {

  private apiUrl = environment.apiUrl +"/OEMMaster";
  
    constructor(private http: HttpClient) {}
  
    getAllOEMs(filter:any): Observable<any> {
      return this.http.post<any>(this.apiUrl+"/list", filter);
    }
  
    getOEMById(id: number): Observable<any> {
      return this.http.get<any>(`${this.apiUrl}/details/${id}`);
    }
  
    createOEM(payload: any): Observable<any> {
      return this.http.post<any>(`${this.apiUrl}/create`, payload);
    }
  
    updateOEM( payload: any): Observable<any> {
      return this.http.put<any>(`${this.apiUrl}/update`, payload);
    }
  
    deleteOEM(id: number): Observable<any> {
      return this.http.delete<any>(`${this.apiUrl}/delete/${id}`);
    }

    getOEMDropdown(searchTerm:string,pageNumber:number, pageSize:number): Observable<any> {
      return this.http.get<any>(`${this.apiUrl}/dropdown?searchTerm=${searchTerm}&pageNo=${pageNumber}&pageSize=${pageSize}`);
    }
}
