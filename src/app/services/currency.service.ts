import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class CurrencyService {
  private apiUrl = environment.apiUrl + '/CurrencyMaster';

  constructor(private http: HttpClient) {}

  getDropdown(searchTerm: string = '', pageNo: number = 0, pageSize: number = 20): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.apiUrl}/dropdown?searchTerm=${searchTerm}&pageNo=${pageNo}&pageSize=${pageSize}`
    );
  }

  getDefault(): Observable<{ id: number; name: string } | null> {
    return this.http.get<{ id: number; name: string } | null>(`${this.apiUrl}/default`);
  }

  setDefault(id: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/set-default/${id}`, {});
  }
}
