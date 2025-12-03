import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MaterialSpecificationService {

  private apiUrl = environment.apiUrl + "/MaterialSpecification";

  constructor(private http: HttpClient) { }

  getAllMaterialSpecifications(filter: any): Observable<any> {
    return this.http.post<any>(this.apiUrl + "/list", filter);
  }

  getAllCustomMaterialSpecifications(filter: any): Observable<any> {
    return this.http.post<any>(this.apiUrl + "/customList", filter);
  }

  getMaterialSpecificationById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/details/${id}`);
  }

  createMaterialSpecification(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/create`, payload);
  }

  updateMaterialSpecification(payload: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/update`, payload);
  }

  deleteMaterialSpecification(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/delete/${id}`);
  }

  getMaterialSpecificationDropdown(searchTerm: string, pageNumber: number, pageSize: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/dropdown?searchTerm=${searchTerm}&pageNo=${pageNumber}&pageSize=${pageSize}`);
  }

  getMaterialSpecificationGradeDropdown(searchTerm: string, pageNumber: number, pageSize: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/grade-dropdown?searchTerm=${searchTerm}&pageNo=${pageNumber}&pageSize=${pageSize}`);
  }

  getGradeDropdownByMetalId(searchTerm: string, pageNumber: number, pageSize: number, metalId: number = 0): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/grade-dropdown-metal-wise?searchTerm=${searchTerm}&pageNo=${pageNumber}&pageSize=${pageSize}&metalId=${metalId}`);
  }

  getDefaultStandardBySpecificationId(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/default-standard/${id}`);
  }

  getTestMethodsBySpecifications(spec1: number, spec2: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/test-methods?spec1=${spec1}&spec2=${spec2}`);
  }

  getChemicalElementsBySpecifications(spec1Id: number, spec2Id: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/GetChemicalElementsBySpecifications?spec1Id=${spec1Id}&spec2Id=${spec2Id}`);
  }
}
