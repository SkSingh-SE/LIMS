import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EquipmentTypeService {

  private apiUrl = environment.apiUrl +"/EquipmentTypeMaster";
  
    constructor(private http: HttpClient) {}
  
    getAllEquipmentTypes(filter:any): Observable<any> {
      return this.http.post<any>(this.apiUrl+"/list", filter);
    }
  
    getEquipmentTypeById(id: number): Observable<any> {
      return this.http.get<any>(`${this.apiUrl}/details/${id}`);
    }
  
    createEquipmentType(payload: any): Observable<any> {
      return this.http.post<any>(`${this.apiUrl}/create`, payload);
    }
  
    updateEquipmentType( payload: any): Observable<any> {
      return this.http.put<any>(`${this.apiUrl}/update`, payload);
    }
  
    deleteEquipmentType(id: number): Observable<any> {
      return this.http.delete<any>(`${this.apiUrl}/delete/${id}`);
    }

    getEquipmentTypeDropdown(searchTerm:string,pageNumber:number, pageSize:number): Observable<any> {
      return this.http.get<any>(`${this.apiUrl}/dropdown?searchTerm=${searchTerm}&pageNo=${pageNumber}&pageSize=${pageSize}`);
    }
}
