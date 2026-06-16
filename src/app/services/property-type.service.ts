import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class PropertyTypeService {
  private apiUrl = environment.apiUrl + '/PropertyTypeMaster';

  constructor(private http: HttpClient) {}

  getAllPropertyTypes(filter: any): Observable<any> {
    return this.http.post<any>(this.apiUrl + '/list', filter);
  }

  getPropertyTypeById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/details/${id}`);
  }

  createPropertyType(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/create`, payload);
  }

  updatePropertyType(payload: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/update`, payload);
  }

  deletePropertyType(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/delete/${id}`);
  }

  getPropertyTypeDropdown(searchTerm: string, pageNumber: number, pageSize: number): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/dropdown?searchTerm=${searchTerm}&pageNo=${pageNumber}&pageSize=${pageSize}`,
    );
  }
}
