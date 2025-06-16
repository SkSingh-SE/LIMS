import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.development';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class CalibrationAgencyService {

  private apiUrl = environment.apiUrl +"/CalibrationAgencyMaster"; 
  
    constructor(private http: HttpClient) {}
  
    getAllCalibrationAgencies(filter:any): Observable<any> {
      return this.http.post<any>(this.apiUrl+"/list", filter);
    }
  
    getCalibrationAgencyById(id: number): Observable<any> {
      return this.http.get<any>(`${this.apiUrl}/details/${id}`);
    }
  
    createCalibrationAgency(payload: any): Observable<any> {
      return this.http.post<any>(`${this.apiUrl}/create`, payload);
    }
  
    updateCalibrationAgency( payload: any): Observable<any> {
      return this.http.put<any>(`${this.apiUrl}/update`, payload);
    }
  
    deleteCalibrationAgency(id: number): Observable<any> {
      return this.http.delete<any>(`${this.apiUrl}/delete/${id}`);
    }

    getCalibrationAgencyDropdown(searchTerm:string,pageNumber:number, pageSize:number): Observable<any> {
      return this.http.get<any>(`${this.apiUrl}/dropdown?searchTerm=${searchTerm}&pageNo=${pageNumber}&pageSize=${pageSize}`);
    }
}
