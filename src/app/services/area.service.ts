import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AreaService {
  private apiUrl = environment.apiUrl + "/AreaMaster";
  constructor(private http: HttpClient) { }

  getAreasWithPinCode(pincode: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/getAreaWithPincode?pincode=${pincode}`);
  }
  getAreaById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/details/${id}`);
  }
}
