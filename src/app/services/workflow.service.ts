import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WorkflowService {

  private apiUrl = environment.apiUrl +"/Workflow"; // Replace with actual API

    constructor(private http: HttpClient) {}

    getAllWorkflows(filter:any): Observable<any> {
      return this.http.post<any>(this.apiUrl+"/list", filter);
    }

    getWorkflowById(id: number): Observable<any> {
      return this.http.get<any>(`${this.apiUrl}/details/${id}`);
    }

    createWorkflow(payload: any): Observable<any> {
      return this.http.post<any>(`${this.apiUrl}/create`, payload);
    }

    updateWorkflow( payload: any): Observable<any> {
      return this.http.put<any>(`${this.apiUrl}/update`, payload);
    }
     performWorkflowAction(payload: any): Observable<any> {
      return this.http.post<any>(`${this.apiUrl}/perform-action`, payload);
    }
}
