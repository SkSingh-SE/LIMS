import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  ConditionMasterDto,
  ConditionMasterCreateDto,
  ConditionMasterUpdateDto,
  ConditionMasterDropdownDto
} from '../models/condition-master.model';

@Injectable({
  providedIn: 'root',
})
export class ConditionMasterService {
  private apiUrl = environment.apiUrl + '/ConditionMaster';

  constructor(private http: HttpClient) {}

  getAllConditionMasters(filter: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/list`, filter);
  }

  getConditionMasterById(id: number): Observable<ConditionMasterDto> {
    return this.http.get<ConditionMasterDto>(`${this.apiUrl}/details/${id}`);
  }

  createConditionMaster(payload: ConditionMasterCreateDto): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/create`, payload);
  }

  updateConditionMaster(payload: ConditionMasterUpdateDto): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/update`, payload);
  }

  toggleStatus(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/toggle-status/${id}`, {});
  }

  deleteConditionMaster(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/delete/${id}`);
  }

  getConditionMasterDropdown(searchTerm: string = '', pageNumber: number = 0, pageSize: number = 50): Observable<ConditionMasterDropdownDto[]> {
    return this.http.get<ConditionMasterDropdownDto[]>(
      `${this.apiUrl}/dropdown?searchTerm=${encodeURIComponent(searchTerm)}&pageNo=${pageNumber}&pageSize=${pageSize}`
    );
  }
}
