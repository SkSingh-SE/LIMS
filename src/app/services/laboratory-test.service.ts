import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  LaboratoryTestListDto,
  LaboratoryTestDetailDto,
  LaboratoryTestCreateDto,
  LaboratoryTestUpdateDto,
  LaboratoryTestDropdownDto
} from '../models/laboratory-test.model';

@Injectable({
  providedIn: 'root'
})
export class LaboratoryTestService {

  private apiUrl = environment.apiUrl + "/LaboratoryTest";

  constructor(private http: HttpClient) {}

  // ── Screen 13: Universal Test Definition Methods ──

  getPagedUniversalTests(
    filter: any,
    disciplineId?: number | null,
    departmentId?: number | null,
    isActive?: boolean | null
  ): Observable<{ items: LaboratoryTestListDto[]; totalRecords: number; pageNumber: number; pageSize: number }> {
    let url = `${this.apiUrl}/paged`;
    const params: string[] = [];
    if (disciplineId !== undefined && disciplineId !== null) params.push(`disciplineId=${disciplineId}`);
    if (departmentId !== undefined && departmentId !== null) params.push(`departmentId=${departmentId}`);
    if (isActive !== undefined && isActive !== null) params.push(`isActive=${isActive}`);
    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }
    return this.http.post<any>(url, filter);
  }

  getUniversalTestDetails(id: number): Observable<LaboratoryTestDetailDto> {
    return this.http.get<LaboratoryTestDetailDto>(`${this.apiUrl}/details/${id}`);
  }

  createUniversalTest(payload: LaboratoryTestCreateDto): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/create`, payload);
  }

  updateUniversalTest(payload: LaboratoryTestUpdateDto): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/update`, payload);
  }

  toggleTestStatus(id: number): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/toggle-status/${id}`, {});
  }

  deleteUniversalTest(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/delete/${id}`);
  }

  getUniversalDropdown(disciplineId?: number): Observable<LaboratoryTestDropdownDto[]> {
    let url = `${this.apiUrl}/universal-dropdown`;
    if (disciplineId) url += `?disciplineId=${disciplineId}`;
    return this.http.get<LaboratoryTestDropdownDto[]>(url);
  }

  checkCodeUnique(code: string, excludeId?: number): Observable<{ isUnique: boolean }> {
    let url = `${this.apiUrl}/check-code-unique?code=${encodeURIComponent(code)}`;
    if (excludeId) url += `&excludeId=${excludeId}`;
    return this.http.get<{ isUnique: boolean }>(url);
  }

  // ── Legacy / Cross-module Methods ──

  getAllLaboratoryTests(filter: any): Observable<any> {
    return this.http.post<any>(this.apiUrl + "/list", filter);
  }

  getLaboratoryTestById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/details/${id}`);
  }

  getPricingTemplate(labTestId: number, analysisTypeId?: number): Observable<any[]> {
    let url = `${this.apiUrl}/pricing-template/${labTestId}`;
    if (analysisTypeId) {
      url += `?analysisTypeId=${analysisTypeId}`;
    }
    return this.http.get<any[]>(url);
  }

  createLaboratoryTest(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/create`, payload);
  }

  updateLaboratoryTest(payload: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/update`, payload);
  }

  deleteLaboratoryTest(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/delete/${id}`);
  }

  duplicateLaboratoryTest(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/duplicate/${id}`, {});
  }

  getLaboratoryTestDropdown(searchTerm: string, pageNumber: number, pageSize: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/dropdown?searchTerm=${searchTerm}&pageNo=${pageNumber}&pageSize=${pageSize}`);
  }

  getLaboratoryTestDropdownForGeneral(searchTerm: string, pageNumber: number, pageSize: number): Observable<any> {
    const term = searchTerm && searchTerm !== 'undefined' && searchTerm !== 'null' ? encodeURIComponent(searchTerm) : '';
    return this.http.get<any>(`${this.apiUrl}/general-dropdown?searchTerm=${term}&pageNo=${pageNumber}&pageSize=${pageSize}`);
  }

  getLaboratoryTestDropdownForChemicals(searchTerm: string, pageNumber: number, pageSize: number): Observable<any> {
    const term = searchTerm && searchTerm !== 'undefined' && searchTerm !== 'null' ? encodeURIComponent(searchTerm) : '';
    return this.http.get<any>(`${this.apiUrl}/chemical-dropdown?searchTerm=${term}&pageNo=${pageNumber}&pageSize=${pageSize}`);
  }

  getUnifiedTestMethodDropdown(searchTerm: string, pageNumber: number, pageSize: number): Observable<any> {
    const term = searchTerm && searchTerm !== 'undefined' && searchTerm !== 'null' ? encodeURIComponent(searchTerm) : '';
    return this.http.get<any>(`${this.apiUrl}/unified-dropdown?searchTerm=${term}&pageNo=${pageNumber}&pageSize=${pageSize}`);
  }

  getDistinctTestNames(searchTerm: string, pageSize: number = 20): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/distinct-names?searchTerm=${searchTerm}&pageSize=${pageSize}`);
  }

  // ── LaboratoryTestSubGroup API ──
  getSubGroupsByLabTest(labTestId: number): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/lab-test-subgroup/by-test/${labTestId}`);
  }

  getSubGroupDetails(id: number): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/lab-test-subgroup/details/${id}`);
  }

  getTestMethodSpecificationBySubGroup(subGroupId: number): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/lab-test-subgroup/test-method-specification/${subGroupId}`);
  }

  getStandardsBySubGroup(subGroupId: number): Observable<any[]> {
    return this.getTestMethodSpecificationBySubGroup(subGroupId);
  }

  getTestMethodSpecificationByLabTest(labTestId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/test-method-specification/${labTestId}`);
  }

  getStandardsByLabTest(labTestId: number): Observable<any[]> {
    return this.getTestMethodSpecificationByLabTest(labTestId);
  }

  evaluateCompliance(payload: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/plan-compliance/evaluate`, payload);
  }

  getAnalysisTypeParameters(analysisTypeId: number): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/plan-compliance/analysis-type-parameters/${analysisTypeId}`);
  }

  createSubGroup(payload: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/lab-test-subgroup/create`, payload);
  }

  updateSubGroup(payload: any): Observable<any> {
    return this.http.put<any>(`${environment.apiUrl}/lab-test-subgroup/update`, payload);
  }

  deleteSubGroup(id: number): Observable<any> {
    return this.http.delete<any>(`${environment.apiUrl}/lab-test-subgroup/delete/${id}`);
  }

  // ── LaboratoryTestAnalysisType API ──
  getAnalysisTypesBySubGroup(subGroupId: number): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/lab-test-analysistype/by-subgroup/${subGroupId}`);
  }

  getAnalysisTypeDetails(id: number): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/lab-test-analysistype/details/${id}`);
  }

  createAnalysisType(payload: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/lab-test-analysistype/create`, payload);
  }

  updateAnalysisType(payload: any): Observable<any> {
    return this.http.put<any>(`${environment.apiUrl}/lab-test-analysistype/update`, payload);
  }

  deleteAnalysisType(id: number): Observable<any> {
    return this.http.delete<any>(`${environment.apiUrl}/lab-test-analysistype/delete/${id}`);
  }

  getTestMethodSpecificationByAnalysisType(analysisTypeId: number): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/lab-test-analysistype/test-method-specification/${analysisTypeId}`);
  }

  getStandardsByAnalysisType(analysisTypeId: number): Observable<any[]> {
    return this.getTestMethodSpecificationByAnalysisType(analysisTypeId);
  }
}
