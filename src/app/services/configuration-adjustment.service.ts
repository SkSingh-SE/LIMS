import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  ConfigurationAdjustmentDraftDto,
  ConfigurationAdjustmentDetailDto,
  ConfigurationAdjustmentListItemDto,
  AdjustedConfigurationDto,
  AdjustmentValidationResultDto,
  ApplyAdjustmentRequestDto,
  ApproveAdjustmentRequestDto,
  RejectAdjustmentRequestDto,
  DifferenceAuditDto,
  ComprehensiveDifferenceAuditDto,
  ExecutionDeviationRequestDto,
  DeviationLookupResultDto
} from '../models/universal-test-group.model';

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: string[];
}

@Injectable({ providedIn: 'root' })
export class ConfigurationAdjustmentService {
  private baseUrl = `${environment.apiUrl}/ConfigurationAdjustment`;

  constructor(private http: HttpClient) {}

  getByTestGroup(utgId: number): Observable<ApiResponse<ConfigurationAdjustmentDetailDto>> {
    return this.http.get<ApiResponse<ConfigurationAdjustmentDetailDto>>(`${this.baseUrl}/by-test-group/${utgId}`);
  }

  getById(id: number): Observable<ApiResponse<ConfigurationAdjustmentDetailDto>> {
    return this.http.get<ApiResponse<ConfigurationAdjustmentDetailDto>>(`${this.baseUrl}/${id}`);
  }

  getHistory(utgId: number): Observable<ApiResponse<ConfigurationAdjustmentListItemDto[]>> {
    return this.http.get<ApiResponse<ConfigurationAdjustmentListItemDto[]>>(`${this.baseUrl}/history/${utgId}`);
  }

  getDifferenceAudit(utgId: number): Observable<ApiResponse<ComprehensiveDifferenceAuditDto>> {
    return this.http.get<ApiResponse<ComprehensiveDifferenceAuditDto>>(`${this.baseUrl}/difference-audit/${utgId}`);
  }

  getAdjustedConfiguration(utgId: number, includeUnapproved: boolean = false): Observable<ApiResponse<AdjustedConfigurationDto>> {
    return this.http.get<ApiResponse<AdjustedConfigurationDto>>(`${this.baseUrl}/adjusted-configuration/${utgId}?includeUnapproved=${includeUnapproved}`);
  }

  saveDraft(dto: ConfigurationAdjustmentDraftDto): Observable<ApiResponse<ConfigurationAdjustmentDetailDto>> {
    return this.http.post<ApiResponse<ConfigurationAdjustmentDetailDto>>(`${this.baseUrl}/draft`, dto);
  }

  validate(dto: ConfigurationAdjustmentDraftDto): Observable<ApiResponse<AdjustmentValidationResultDto>> {
    return this.http.post<ApiResponse<AdjustmentValidationResultDto>>(`${this.baseUrl}/validate`, dto);
  }

  apply(dto: ApplyAdjustmentRequestDto): Observable<ApiResponse<ConfigurationAdjustmentDetailDto>> {
    return this.http.post<ApiResponse<ConfigurationAdjustmentDetailDto>>(`${this.baseUrl}/apply`, dto);
  }

  approve(dto: ApproveAdjustmentRequestDto): Observable<ApiResponse<ConfigurationAdjustmentDetailDto>> {
    return this.http.post<ApiResponse<ConfigurationAdjustmentDetailDto>>(`${this.baseUrl}/approve`, dto);
  }

  reject(dto: RejectAdjustmentRequestDto): Observable<ApiResponse<ConfigurationAdjustmentDetailDto>> {
    return this.http.post<ApiResponse<ConfigurationAdjustmentDetailDto>>(`${this.baseUrl}/reject`, dto);
  }

  getDeviationOptions(utgId: number, category: string = 'Equipment'): Observable<ApiResponse<DeviationLookupResultDto>> {
    return this.http.get<ApiResponse<DeviationLookupResultDto>>(`${this.baseUrl}/deviation-options/${utgId}?category=${category}`);
  }

  requestDeviation(dto: ExecutionDeviationRequestDto): Observable<ApiResponse<ConfigurationAdjustmentDetailDto>> {
    return this.http.post<ApiResponse<ConfigurationAdjustmentDetailDto>>(`${this.baseUrl}/request-deviation`, dto);
  }
}
