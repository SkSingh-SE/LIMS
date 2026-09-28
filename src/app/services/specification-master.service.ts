import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface SpecificationGradeDto {
  id: number;
  specificationHeaderID: number;
  specificationCode?: string;
  specificationName?: string;
  grade: string;
  remarks?: string;
  isActive: boolean;
  requirementCount?: number;
  hasDownstreamReferences?: boolean;
}

export interface SpecificationGradeCreateDto {
  grade: string;
  remarks?: string;
  isActive?: boolean;
}

export interface SpecificationGradeUpdateDto {
  id: number;
  grade: string;
  remarks?: string;
  isActive: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class SpecificationMasterService {
  private apiUrl = environment.apiUrl + '/SpecificationMaster';

  constructor(private http: HttpClient) {}

  getAllSpecifications(filter: any): Observable<any> {
    return this.http.post<any>(this.apiUrl + '/list', filter);
  }

  getSpecificationById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/details/${id}`);
  }

  createSpecification(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/create`, payload);
  }

  updateSpecification(payload: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/update`, payload);
  }

  toggleStatus(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/toggle-status/${id}`, {});
  }

  getSpecificationDropdown(searchTerm: string, pageNumber: number, pageSize: number): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/dropdown?searchTerm=${encodeURIComponent(searchTerm || '')}&pageNo=${pageNumber}&pageSize=${pageSize}`
    );
  }

  getStandardOrganizations(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/standard-organizations`);
  }

  // --- Grade Lifecycle Endpoints ---

  getGrades(specId: number, includeInactive: boolean = false): Observable<SpecificationGradeDto[]> {
    return this.http.get<SpecificationGradeDto[]>(`${this.apiUrl}/${specId}/grades?includeInactive=${includeInactive}`);
  }

  getGrade(gradeId: number): Observable<SpecificationGradeDto> {
    return this.http.get<SpecificationGradeDto>(`${this.apiUrl}/grades/${gradeId}`);
  }

  createGrade(specId: number, payload: SpecificationGradeCreateDto): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${specId}/grades`, payload);
  }

  updateGrade(gradeId: number, payload: SpecificationGradeUpdateDto): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/grades/${gradeId}`, payload);
  }

  toggleGradeStatus(gradeId: number): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/grades/${gradeId}/toggle-status`, {});
  }
}

