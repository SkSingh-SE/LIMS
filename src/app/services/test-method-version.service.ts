import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type VersionStatus = 0 | 1 | 2 | 3; // 0: Draft, 1: Active, 2: Superseded, 3: Withdrawn

export interface PagedResponse<T> {
  items: T[];
  data?: T[];
  totalRecords: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage?: boolean;
  hasNextPage?: boolean;
}

export interface TestMethodVersionFilter {
  testMethodSpecificationID?: number | null;
  version?: string;
  year?: string;
  status?: VersionStatus | null;
  isDefault?: boolean | null;
  pageNumber: number;
  pageSize: number;
  sortColumn?: string;
  sortDirection?: string;
}

export interface TestMethodVersionListItem {
  id: number;
  testMethodSpecificationID: number;
  testMethodCode: string;
  testMethodName: string;
  version: string;
  year?: string;
  status: VersionStatus;
  statusName: string;
  effectiveDate?: string;
  supersededDate?: string;
  reviewDate?: string;
  changeReason?: string;
  isDefault: boolean;
  standardFile?: string;
  standardFilePath?: string;
  uploadReferenceID?: number;
  parametersCount: number;
  isParentActive: boolean;
}

export interface TestMethodVersionParameter {
  id?: number;
  parameterID: number;
  parameterCode?: string;
  parameterName?: string;
  unitID?: number;
  unitName?: string;
  unitSymbol?: string;
  parameterUnitEquivalentID?: number;
  sortOrder: number;
  comment?: string;
}

export interface TestMethodVersionDetail extends TestMethodVersionListItem {
  createdOn: string;
  createdBy: number;
  parameters: TestMethodVersionParameter[];
}

export interface SaveVersionParametersDto {
  parameters: TestMethodVersionParameter[];
}

export interface TestMethodVersionDropdownItem {
  id: number;
  version: string;
  year?: string;
  isDefault: boolean;
  status: VersionStatus;
  displayText: string;
}

@Injectable({
  providedIn: 'root'
})
export class TestMethodVersionService {
  private readonly baseUrl = `${environment.apiUrl}/TestMethodVersion`;

  constructor(private http: HttpClient) {}

  getVersions(filter: TestMethodVersionFilter): Observable<PagedResponse<TestMethodVersionListItem>> {
    return this.http.post<PagedResponse<TestMethodVersionListItem>>(`${this.baseUrl}/list`, filter);
  }

  getVersionDetails(id: number): Observable<TestMethodVersionDetail> {
    return this.http.get<TestMethodVersionDetail>(`${this.baseUrl}/details/${id}`);
  }

  createVersion(formData: FormData): Observable<TestMethodVersionListItem> {
    return this.http.post<TestMethodVersionListItem>(`${this.baseUrl}/create`, formData);
  }

  updateVersion(id: number, formData: FormData): Observable<TestMethodVersionListItem> {
    return this.http.put<TestMethodVersionListItem>(`${this.baseUrl}/update/${id}`, formData);
  }

  setDefaultVersion(id: number): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.baseUrl}/set-default/${id}`, {});
  }

  getVersionParameters(id: number): Observable<TestMethodVersionParameter[]> {
    return this.http.get<TestMethodVersionParameter[]>(`${this.baseUrl}/parameters/${id}`);
  }

  saveVersionParameters(id: number, dto: SaveVersionParametersDto): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.baseUrl}/parameters/${id}`, dto);
  }

  getDropdownByMethod(methodId: number): Observable<TestMethodVersionDropdownItem[]> {
    return this.http.get<TestMethodVersionDropdownItem[]>(`${this.baseUrl}/dropdown/${methodId}`);
  }
}
