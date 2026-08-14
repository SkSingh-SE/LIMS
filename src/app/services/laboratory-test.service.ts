import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LaboratoryTestService {

  private apiUrl = environment.apiUrl + "/LaboratoryTest";

  constructor(private http: HttpClient) {}

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
    return this.http.get<any>(`${this.apiUrl}/general-dropdown?searchTerm=${searchTerm}&pageNo=${pageNumber}&pageSize=${pageSize}`);
  }

  getLaboratoryTestDropdownForChemicals(searchTerm: string, pageNumber: number, pageSize: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/chemical-dropdown?searchTerm=${searchTerm}&pageNo=${pageNumber}&pageSize=${pageSize}`);
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

  getStandardsBySubGroup(subGroupId: number): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/lab-test-subgroup/standards/${subGroupId}`);
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
}
