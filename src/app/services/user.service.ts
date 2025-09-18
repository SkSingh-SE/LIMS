import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  private apiUrl = environment.apiUrl + "/Users"; // Replace with actual API

  constructor(private http: HttpClient) { }

  // getAllUsers(filter:any): Observable<any> {
  //   return this.http.post<any>(this.apiUrl+"/list", filter);
  // }

  // getUserById(id: number): Observable<any> {
  //   return this.http.get<any>(`${this.apiUrl}/details/${id}`);
  // }

  // createUser(payload: any): Observable<any> {
  //   return this.http.post<any>(`${this.apiUrl}/create`, payload);
  // }

  // updateUser( payload: any): Observable<any> {
  //   return this.http.put<any>(`${this.apiUrl}/update`, payload);
  // }

  // deleteUser(id: number): Observable<any> {
  //   return this.http.delete<any>(`${this.apiUrl}/delete/${id}`);
  // }

  getUserDropdown(searchTerm: string, pageNumber: number, pageSize: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/getUserDropdown?searchTerm=${searchTerm}&pageNo=${pageNumber}&pageSize=${pageSize}`);
  }

  // Permission related methods
  private pApiUrl = environment.apiUrl + "/UserPermission";

  getPermissions(): Observable<any> {
    return this.http.get<any>(`${this.pApiUrl}/all-permission`);
  }

  getUserPermissions(userId: string): Observable<any> {
    return this.http.get<any>(`${this.pApiUrl}/user-permission/${userId}`);
  }
  updateUserPermissions(userId: string, permissions: any): Observable<any> {
    return this.http.post<any>(`${this.pApiUrl}/update?userId=${userId}`, permissions);
  }
  getPermissionDropdown(searchTerm: string, pageNumber: number, pageSize: number): Observable<any> {
    return this.http.get<any>(`${this.pApiUrl}/dropdown?searchTerm=${searchTerm}&pageNo=${pageNumber}&pageSize=${pageSize}`);
  }

}
