import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SampleInwardService {

  private apiUrl = environment.apiUrl +"/SampleInward"; 

  constructor(private http: HttpClient) {}

  getAllSampleInward(filter:any): Observable<any> {
    return this.http.post<any>(this.apiUrl+"/list", filter);
  }

  getSampleInwardById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/details/${id}`);
  }
  getSampleInwardWithPlans(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/details-with-plan/${id}`);
  }
  getCaseNumber(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/case-number`);
  }

  createSampleInward(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/create`, payload);
  }

  updateSampleInward(payload: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/update`, payload);
  }

  testPlanSave(payload: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/plan`, payload);
  }

  deleteSampleInward(id: number): Observable<any> {
      return this.http.delete<any>(`${this.apiUrl}/delete/${id}`);
    }

  getSampleInwardDropdown(searchTerm:string,pageNumber:number, pageSize:number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/dropdown?searchTerm=${searchTerm}&pageNo=${pageNumber}&pageSize=${pageSize}`);
    }
  
}
