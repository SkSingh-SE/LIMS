import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MenuService {

  private apiUrl = environment.apiUrl + "/MenuMaster";

  constructor(private http: HttpClient) { }

  getAllMenus(filter: any): Observable<any> {
    return this.http.post<any>(this.apiUrl + "/list", filter);
  }

  getMenuById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/details/${id}`);
  }

  createMenu(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/create`, payload);
  }

  updateMenu(payload: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/update`, payload);
  }

  deleteMenu(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/delete/${id}`);
  }

  getMenuDropdown(searchTerm: string, pageNumber: number, pageSize: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/dropdown?searchTerm=${searchTerm}&pageNo=${pageNumber}&pageSize=${pageSize}`);
  }

  //Menu Permission Methods
  getSubMenuDropdown(searchTerm: string, pageNumber: number, pageSize: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/submenu-dropdown?searchTerm=${searchTerm}&pageNo=${pageNumber}&pageSize=${pageSize}`);
  }
  updatePermission(id: number, payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/update-permission?menuId=${id}`, payload);
  }
  getPermissions(id: number): Observable<any> {
    return this.http.get<any>(this.apiUrl + `/get-permission/${id}`);
  }
  getAllSubMenus(filter: any): Observable<any> {
    return this.http.post<any>(this.apiUrl + "/submenu-list", filter);
  }
}
