import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface TestMethodListItem {
  id: number;
  code: string;
  name: string;
  standardReference?: string;
  analysisTechniqueID?: number;
  analysisTechniqueName?: string;
  analysisTechniqueCode?: string;
  description?: string;
  isActive: boolean;
  createdOn: string;
  modifiedOn?: string;
}

export interface TestMethodDetail {
  id: number;
  code: string;
  name: string;
  standardReference?: string;
  analysisTechniqueID?: number;
  analysisTechniqueName?: string;
  analysisTechniqueCode?: string;
  description?: string;
  isActive: boolean;
  createdBy: number;
  createdOn: string;
  modifiedBy?: number;
  modifiedOn?: string;
  companyCode: string;
}

export interface TestMethodCreateDto {
  code: string;
  name: string;
  standardReference?: string;
  analysisTechniqueID?: number | null;
  description?: string;
}

export interface TestMethodUpdateDto {
  id: number;
  code: string;
  name: string;
  standardReference?: string;
  analysisTechniqueID?: number | null;
  description?: string;
}

export interface TestMethodDropdownItem {
  id: number;
  code: string;
  name: string;
  standardReference?: string;
  analysisTechniqueID?: number;
  analysisTechniqueCode?: string;
}

export interface PagedResponse<T> {
  items: T[];
  totalRecords: number;
  pageNumber: number;
  pageSize: number;
  totalPages?: number;
}

@Injectable({
  providedIn: 'root'
})
export class TestMethodService {
  private apiUrl = `${environment.apiUrl}/TestMethod`;

  constructor(private http: HttpClient) {}

  getTestMethods(
    filter: any,
    code?: string,
    name?: string,
    techniqueId?: number | null,
    status?: string
  ): Observable<PagedResponse<TestMethodListItem>> {
    let params = new HttpParams();
    if (code) params = params.set('code', code);
    if (name) params = params.set('name', name);
    if (techniqueId && techniqueId > 0) params = params.set('techniqueId', techniqueId.toString());
    if (status) params = params.set('status', status);

    return this.http.post<PagedResponse<TestMethodListItem>>(`${this.apiUrl}/list`, filter, { params });
  }

  getTestMethodById(id: number): Observable<TestMethodDetail> {
    return this.http.get<TestMethodDetail>(`${this.apiUrl}/details/${id}`);
  }

  createTestMethod(dto: TestMethodCreateDto): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/create`, dto);
  }

  updateTestMethod(dto: TestMethodUpdateDto): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/update`, dto);
  }

  toggleStatus(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/toggle-status/${id}`, {});
  }

  getActiveDropdown(): Observable<TestMethodDropdownItem[]> {
    return this.http.get<TestMethodDropdownItem[]>(`${this.apiUrl}/dropdown`);
  }
}
