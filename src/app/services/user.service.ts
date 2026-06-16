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


  getUserById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/details/${id}`);
  }

  getUserByEmployeeId(employeeId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/by-employee/${employeeId}`);
  }
  updateUserByEmployeeId(employeeId: number, payload: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/by-employee/${employeeId}`, payload);
  }

  updateUser(payload: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/update`, payload);
  }

  resetPassword(employeeId: number, newPassword: string) {
    return this.http.post<void>(`${this.apiUrl}/reset-password`, { employeeId, newPassword });
  }

  sendOtp(employeeId: number, method: 'email' | 'sms') {
    return this.http.post(`${this.apiUrl}/2fa/send-otp`, {
      employeeId,
      method
    });
  }

  verifyOtp(employeeId: number, otp: string) {
    return this.http.post(`${this.apiUrl}/2fa/verify`, {
      employeeId,
      otp
    });
  }

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

  getUserMenuWithPermissions(userId: number): Observable<any> {
    return this.http.get<any>(`${this.pApiUrl}/user-menu/${userId}`);
  }
}
