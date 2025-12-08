import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TestResultService {
private apiUrl = environment.apiUrl +"/TestResult"; // Replace with actual API

    constructor(private http: HttpClient) {}

    getAllTestResults(filter:any): Observable<any> {
      return this.http.post<any>(this.apiUrl+"/list", filter);
    }

    getTestResultHeader(id: number): Observable<any> {
      return this.http.get<any>(`${this.apiUrl}/details/${id}`);
    }

    completeHeader(id: number): Observable<any> {
      return this.http.get<any>(`${this.apiUrl}/complete/${id}`);
    }

    createTestResult(payload: any): Observable<any> {
      return this.http.post<any>(`${this.apiUrl}/create`, payload);
    }

    updateTestResult( payload: any): Observable<any> {
      return this.http.put<any>(`${this.apiUrl}/update`, payload);
    }

    updateParameter(headerId:number, parameterId:number, parameter:any): Observable<any> {
      return this.http.put<any>(`${this.apiUrl}/update-parameter`, {headerId, parameterId, parameter});
    }

    deleteTestResult(id: number): Observable<any> {
      return this.http.delete<any>(`${this.apiUrl}/delete/${id}`);
    }

    getTestResultDropdown(searchTerm:string,pageNumber:number, pageSize:number): Observable<any> {
      return this.http.get<any>(`${this.apiUrl}/dropdown?searchTerm=${searchTerm}&pageNo=${pageNumber}&pageSize=${pageSize}`);
    }
}
