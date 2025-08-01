import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { DesignationResponse } from '../models/designationModel';

@Injectable({
  providedIn: 'root'
})
export class DesignationService {
  private apiUrl = environment.apiUrl +"/DesignationMaster"; // Replace with actual API

  constructor(private http: HttpClient) {}

  getAllDesignations(filter:any): Observable<DesignationResponse> {
    return this.http.post<DesignationResponse>(this.apiUrl+"/list", filter);
  }

  getDesignationById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/details/${id}`);
  }

  createDesignation(designation: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/create`, designation);
  }

  updateDesignation(designation: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/update`, designation);
  }

  deleteDesignation(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/delete/${id}`);
  }

  getDesignationDropdown(searchTerm:string,pageNumber:number, pageSize:number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/dropdown?searchTerm=${searchTerm}&pageNo=${pageNumber}&pageSize=${pageSize}`);
  }
}
