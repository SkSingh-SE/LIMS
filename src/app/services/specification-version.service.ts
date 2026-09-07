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

export interface SpecificationVersionFilter {
  specificationHeaderID?: number | null;
  version?: string;
  year?: string;
  status?: VersionStatus | null;
  isDefault?: boolean | null;
  pageNumber: number;
  pageSize: number;
  sortColumn?: string;
  sortDirection?: string;
}

export interface SpecificationVersionListItem {
  id: number;
  specificationHeaderID: number;
  specificationCode: string;
  specificationName: string;
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

export interface SpecificationVersionParameter {
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

export interface SpecificationVersionDetail extends SpecificationVersionListItem {
  createdOn: string;
  createdBy: number;
  parameters: SpecificationVersionParameter[];
}

export interface SaveVersionParametersDto {
  parameters: SpecificationVersionParameter[];
}

export interface SpecificationVersionDropdownItem {
  id: number;
  version: string;
  year?: string;
  isDefault: boolean;
  status: VersionStatus;
  displayText: string;
}

export interface SpecificationDropdownItem {
  id: number;
  code: string;
  name: string;
  isActive: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SpecificationVersionService {
  private readonly baseUrl = `${environment.apiUrl}/SpecificationVersion`;

  constructor(private http: HttpClient) {}

  getVersions(filter: SpecificationVersionFilter): Observable<PagedResponse<SpecificationVersionListItem>> {
    return this.http.post<PagedResponse<SpecificationVersionListItem>>(`${this.baseUrl}/list`, filter);
  }

  getVersionDetails(id: number): Observable<SpecificationVersionDetail> {
    return this.http.get<SpecificationVersionDetail>(`${this.baseUrl}/details/${id}`);
  }

  createVersion(formData: FormData): Observable<SpecificationVersionListItem> {
    return this.http.post<SpecificationVersionListItem>(`${this.baseUrl}/create`, formData);
  }

  updateVersion(id: number, formData: FormData): Observable<SpecificationVersionListItem> {
    return this.http.put<SpecificationVersionListItem>(`${this.baseUrl}/update/${id}`, formData);
  }

  activateVersion(id: number): Observable<{ success: boolean; message: string }> {
    return this.http.put<{ success: boolean; message: string }>(`${this.baseUrl}/activate/${id}`, {});
  }

  supersedeVersion(id: number): Observable<{ success: boolean; message: string }> {
    return this.http.put<{ success: boolean; message: string }>(`${this.baseUrl}/supersede/${id}`, {});
  }

  withdrawVersion(id: number): Observable<{ success: boolean; message: string }> {
    return this.http.put<{ success: boolean; message: string }>(`${this.baseUrl}/withdraw/${id}`, {});
  }

  setDefaultVersion(id: number): Observable<{ success: boolean; message: string }> {
    return this.http.put<{ success: boolean; message: string }>(`${this.baseUrl}/set-default/${id}`, {});
  }

  getVersionParameters(id: number): Observable<SpecificationVersionParameter[]> {
    return this.http.get<SpecificationVersionParameter[]>(`${this.baseUrl}/parameters/${id}`);
  }

  saveVersionParameters(id: number, dto: SaveVersionParametersDto): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.baseUrl}/parameters/${id}`, dto);
  }

  getDropdownBySpecification(specId: number, includeAll: boolean = false): Observable<SpecificationVersionDropdownItem[]> {
    const query = includeAll ? '?includeAll=true' : '';
    return this.http.get<SpecificationVersionDropdownItem[]>(`${this.baseUrl}/dropdown/${specId}${query}`);
  }

  getSpecifications(): Observable<SpecificationDropdownItem[]> {
    return this.http.get<SpecificationDropdownItem[]>(`${this.baseUrl}/specifications`);
  }

  deleteVersion(id: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.baseUrl}/delete/${id}`);
  }
}
