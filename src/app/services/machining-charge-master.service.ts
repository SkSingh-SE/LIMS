import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MachiningChargeMasterService {

  private apiUrl = environment.apiUrl + '/MachiningChargeMaster';

  constructor(private http: HttpClient) {}

  getAllMachiningChargeMasters(filter: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/list`, filter);
  }

  getMachiningChargeMasterById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/details/${id}`);
  }

  createMachiningChargeMaster(payload: FormData): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/create`, payload);
  }

  updateMachiningChargeMaster(payload: FormData): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/update`, payload);
  }

  deleteMachiningChargeMaster(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/delete/${id}`);
  }

  getMachiningChargeMasterDropdown(searchTerm: string, pageNumber: number, pageSize: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/dropdown?searchTerm=${searchTerm}&pageNo=${pageNumber}&pageSize=${pageSize}`);
  }

  getByTest(labTestId: number, standardId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/by-test?labTestId=${labTestId}&standardId=${standardId}`);
  }
}
