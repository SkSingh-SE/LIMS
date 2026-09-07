import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  SpecificationRequirementContext,
  SpecificationRequirementItem,
  SaveSpecificationRequirement,
  CopyVersionRequirementsPayload
} from '../models/specification-requirement.model';

@Injectable({
  providedIn: 'root'
})
export class SpecificationRequirementService {
  private readonly baseUrl = `${environment.apiUrl}/SpecificationRequirement`;

  constructor(private http: HttpClient) {}

  getContext(specId: number, versionId: number, gradeId: number): Observable<SpecificationRequirementContext> {
    return this.http.get<SpecificationRequirementContext>(`${this.baseUrl}/context`, {
      params: { specId: specId.toString(), versionId: versionId.toString(), gradeId: gradeId.toString() }
    });
  }

  getList(versionId: number, gradeId: number): Observable<SpecificationRequirementItem[]> {
    return this.http.get<SpecificationRequirementItem[]>(`${this.baseUrl}/list`, {
      params: { versionId: versionId.toString(), gradeId: gradeId.toString() }
    });
  }

  getDetails(id: number): Observable<SpecificationRequirementItem> {
    return this.http.get<SpecificationRequirementItem>(`${this.baseUrl}/details/${id}`);
  }

  create(dto: SaveSpecificationRequirement): Observable<{ id: number; message: string }> {
    return this.http.post<{ id: number; message: string }>(`${this.baseUrl}/create`, dto);
  }

  update(id: number, dto: SaveSpecificationRequirement): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.baseUrl}/update/${id}`, dto);
  }

  delete(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/delete/${id}`);
  }

  copyVersion(payload: CopyVersionRequirementsPayload): Observable<{ count: number; message: string }> {
    return this.http.post<{ count: number; message: string }>(`${this.baseUrl}/copy-version`, payload);
  }

  activateVersion(versionId: number): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.baseUrl}/activate-version/${versionId}`, {});
  }

  getConditions(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/conditions`);
  }

  getConditionDimensions(): Observable<any[]> {
    return this.getConditions();
  }
}
