import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SubGroupService {

  private apiUrl = environment.apiUrl + "/SubGroupMaster";

  constructor(private http: HttpClient) { }

  getAllSubGroups(filter: any): Observable<any> {
    return this.http.post<any>(this.apiUrl + "/list", filter);
  }

  getSubGroupById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/details/${id}`);
  }

  createSubGroup(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/create`, payload);
  }

  updateSubGroup(payload: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/update`, payload);
  }

  deleteSubGroup(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/delete/${id}`);
  }

  getSubGroupDropdown(searchTerm: string, pageNumber: number, pageSize: number, groupId?: number | null): Observable<any> {
    if (groupId) {
      return this.http.get<any>(`${this.apiUrl}/dropdownByGroupId?groupId=${groupId}`);
    }
    let url = `${this.apiUrl}/dropdown?searchTerm=${encodeURIComponent(searchTerm || '')}&pageNo=${pageNumber}&pageSize=${pageSize}`;
    return this.http.get<any>(url);
  }
  getDropdownByGroupId(groupId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/dropdownByGroupId?groupId=${groupId}`);
  }
}
