import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { UniversalTestGroupListItemDto, UniversalTestGroupDetailDto, EffectiveConfigurationDto, ValidationSummaryDto } from '../models/universal-test-group.model';

@Injectable({ providedIn: 'root' })
export class UniversalTestGroupService {
  private baseUrl = `${environment.apiUrl}/TestGroup`;

  constructor(private http: HttpClient) {}

  getByInward(inwardId: number): Observable<UniversalTestGroupListItemDto[]> {
    return this.http.get<UniversalTestGroupListItemDto[]>(`${this.baseUrl}/list/by-inward/${inwardId}`);
  }

  getBySample(sampleId: number): Observable<UniversalTestGroupListItemDto[]> {
    return this.http.get<UniversalTestGroupListItemDto[]>(`${this.baseUrl}/list/by-sample/${sampleId}`);
  }

  getByPlan(planId: number): Observable<UniversalTestGroupListItemDto[]> {
    return this.http.get<UniversalTestGroupListItemDto[]>(`${this.baseUrl}/list/by-plan/${planId}`);
  }

  getAll(): Observable<UniversalTestGroupListItemDto[]> {
    return this.http.get<UniversalTestGroupListItemDto[]>(`${this.baseUrl}/list`);
  }

  getDetails(id: number): Observable<UniversalTestGroupDetailDto> {
    return this.http.get<UniversalTestGroupDetailDto>(`${this.baseUrl}/details/${id}`);
  }

  getEffectiveConfiguration(id: number): Observable<EffectiveConfigurationDto> {
    return this.http.get<EffectiveConfigurationDto>(`${this.baseUrl}/effective-configuration/${id}`);
  }

  getValidation(id: number): Observable<ValidationSummaryDto> {
    return this.http.get<ValidationSummaryDto>(`${this.baseUrl}/validation/${id}`);
  }
}
