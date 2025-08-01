import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GroupService {

  private apiUrl = environment.apiUrl +"/GroupMaster"; 
  
    constructor(private http: HttpClient) {}
  
    getAllGroups(filter:any): Observable<any> {
      return this.http.post<any>(this.apiUrl+"/list", filter);
    }
  
    getGroupById(id: number): Observable<any> {
      return this.http.get<any>(`${this.apiUrl}/details/${id}`);
    }
  
    createGroup(payload: any): Observable<any> {
      return this.http.post<any>(`${this.apiUrl}/create`, payload);
    }
  
    updateGroup( payload: any): Observable<any> {
      return this.http.put<any>(`${this.apiUrl}/update`, payload);
    }
  
    deleteGroup(id: number): Observable<any> {
      return this.http.delete<any>(`${this.apiUrl}/delete/${id}`);
    }

    getGroupDropdown(searchTerm:string,pageNumber:number, pageSize:number,disciplineId:number|null): Observable<any> {
      let url = this.apiUrl+"/dropdown?searchTerm="+searchTerm+"&pageNo="+pageNumber+"&pageSize="+pageSize;
      if(disciplineId){
        url += "&disciplineId="+disciplineId;
      }
      return this.http.get<any>(url);
    }
}
