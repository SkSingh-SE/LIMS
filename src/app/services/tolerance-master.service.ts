import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ToleranceMasterService {
  private apiUrl = environment.apiUrl + '/ToleranceMaster';

  constructor(private http: HttpClient) {}

  getAllToleranceMasters(filter: any): Observable<any> {
    return this.http.post<any>(this.apiUrl + '/list', filter);
  }

  getToleranceMasterById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/details/${id}`);
  }

  createToleranceMaster(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/create`, payload);
  }

  updateToleranceMaster(payload: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/update`, payload);
  }

  deleteToleranceMaster(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/delete/${id}`);
  }
}
