import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class CoolingMediumService {
  private apiUrl = environment.apiUrl + '/CoolingMediumMaster';

  constructor(private http: HttpClient) {}

  getAllCoolingMediums(filter: any): Observable<any> {
    return this.http.post<any>(this.apiUrl + '/list', filter);
  }

  getCoolingMediumById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/details/${id}`);
  }

  createCoolingMedium(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/create`, payload);
  }

  updateCoolingMedium(payload: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/update`, payload);
  }

  deleteCoolingMedium(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/delete/${id}`);
  }

  getCoolingMediumDropdown(searchTerm: string, pageNumber: number, pageSize: number): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/dropdown?searchTerm=${searchTerm}&pageNo=${pageNumber}&pageSize=${pageSize}`,
    );
  }
}
