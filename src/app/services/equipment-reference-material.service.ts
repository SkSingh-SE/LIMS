import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class EquipmentReferenceMaterialService {
  private apiUrl = environment.apiUrl + '/EquipmentReferenceMaterial';

  constructor(private http: HttpClient) {}

  getByEquipment(equipmentId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/by-equipment/${equipmentId}`);
  }

  create(payload: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, payload);
  }

  update(payload: any): Observable<any> {
    return this.http.put<any>(this.apiUrl, payload);
  }

  delete(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }
}
