import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DisciplineService {

  private apiUrl = environment.apiUrl +"/DisciplineMaster"; 
  
    constructor(private http: HttpClient) {}
  
    getAllDisciplines(filter:any): Observable<any> {
      return this.http.post<any>(this.apiUrl+"/list", filter);
    }
  
    getDisciplineById(id: number): Observable<any> {
      return this.http.get<any>(`${this.apiUrl}/details/${id}`);
    }
  
    createDiscipline(payload: any): Observable<any> {
      return this.http.post<any>(`${this.apiUrl}/create`, payload);
    }
  
    updateDiscipline( payload: any): Observable<any> {
      return this.http.put<any>(`${this.apiUrl}/update`, payload);
    }
  
    deleteDiscipline(id: number): Observable<any> {
      return this.http.delete<any>(`${this.apiUrl}/delete/${id}`);
    }

    getDisciplineDropdown(searchTerm:string,pageNumber:number, pageSize:number): Observable<any> {
      return this.http.get<any>(`${this.apiUrl}/dropdown?searchTerm=${searchTerm}&pageNo=${pageNumber}&pageSize=${pageSize}`);
    }
}
