import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface TestLayoutTemplateDto {
  id?: number;
  layoutCode: string;
  layoutName: string;
  revision: string;
  version: number;
  status: string;
  isDefault: boolean;
  isGlobalDefault?: boolean;
  laboratoryTestID?: number | null;
  laboratoryTestName?: string;
  mappedTestCount?: number;
  mappedTestIDs?: number[];
  mappedLeafNodes?: any[];
  laboratoryTestSubGroupID?: number | null;
  subGroupName?: string;
  laboratoryTestAnalysisTypeID?: number | null;
  analysisTypeName?: string;
  leafNode?: string | null;
  applyToLeaf: boolean;
  sectionCount: number;
  archetypeSummary?: string;
  layoutConfigJson: string;
  outputPayloadSchemaJson?: string;
  createdOn?: string;
  modifiedOn?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TestLayoutService {
  private apiUrl = `${environment.apiUrl}/TestLayoutTemplate`;

  constructor(private http: HttpClient) {}

  getAllLayouts(filter: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/list`, filter);
  }

  getLayoutById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/details/${id}`);
  }

  getLayoutByHierarchy(testId?: number | null, subGroupId?: number | null, analysisTypeId?: number | null, leafNode?: string | null): Observable<any> {
    let url = `${this.apiUrl}/by-hierarchy`;
    const params: string[] = [];
    if (testId && testId > 0) params.push(`testId=${testId}`);
    if (subGroupId && subGroupId > 0) params.push(`subGroupId=${subGroupId}`);
    if (analysisTypeId && analysisTypeId > 0) params.push(`analysisTypeId=${analysisTypeId}`);
    if (leafNode) params.push(`leafNode=${encodeURIComponent(leafNode)}`);
    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }
    return this.http.get<any>(url);
  }

  createLayout(payload: TestLayoutTemplateDto): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/create`, payload);
  }

  updateLayout(payload: TestLayoutTemplateDto): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/update`, payload);
  }

  deleteLayout(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/delete/${id}`);
  }

  getDropdown(testId?: number, searchTerm?: string, pageNo: number = 1, pageSize: number = 20): Observable<any> {
    let url = `${this.apiUrl}/dropdown?pageNo=${pageNo}&pageSize=${pageSize}`;
    if (testId) url += `&testId=${testId}`;
    if (searchTerm) url += `&searchTerm=${encodeURIComponent(searchTerm)}`;
    return this.http.get<any>(url);
  }
}
