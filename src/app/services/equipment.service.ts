import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class EquipmentService {
  private apiUrl = environment.apiUrl + '/EquipmentMaster';

  constructor(private http: HttpClient) {}

  getAllEquipments(filter: any): Observable<any> {
    return this.http.post<any>(this.apiUrl + '/list', filter);
  }

  getEquipmentById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/details/${id}`);
  }

  createEquipment(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/create`, payload);
  }

  addEquipmentCalibration(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/add-calibration`, payload);
  }
  addEquipmentMaintenance(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/add-maintenance`, payload);
  }
  addEquipmentSOP(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/add-sop`, payload);
  }
  deleteEquipmentSOP(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/delete-sop`, payload);
  }

  updateEquipment(payload: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/update`, payload);
  }

  deleteEquipment(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/delete/${id}`);
  }

  getEquipmentDropdown(searchTerm: string, pageNumber: number, pageSize: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/dropdown?searchTerm=${searchTerm}&pageNo=${pageNumber}&pageSize=${pageSize}`);
  }
}
