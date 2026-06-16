import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface SmartSuggestRequest {
  specificationGradeId?: number;
  metalClassificationId?: number;
  productConditionId?: number;
  customerId?: number;
}

export interface SmartSuggestResult {
  suggestedTests: SuggestedTestDto[];
  specMatchCount: number;
  customerHistoryCount: number;
  globalFrequencyCount: number;
  trendingCount: number;
}

export interface SuggestedTestDto {
  laboratoryTestID: number;
  laboratoryTestName: string;
  subGroup: string;
  source: string;
  isPerBatch: boolean;
  testMethodStandardID?: number;
  testMethodStandardName?: string;
  score: number;
  tags: string[];
}

@Injectable({ providedIn: 'root' })
export class TestAutoSuggestService {
  private apiUrl = environment.apiUrl + '/TestAutoSuggest';

  constructor(private http: HttpClient) {}

  getBySpecification(specHeaderId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/by-specification/${specHeaderId}`);
  }

  getByProductSpec(productSpecId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/by-product-spec/${productSpecId}`);
  }

  getUnified(specHeaderId?: number, productSpecId?: number): Observable<any> {
    let params: any = {};
    if (specHeaderId) params.specificationHeaderId = specHeaderId;
    if (productSpecId) params.productSpecificationId = productSpecId;
    return this.http.get<any>(`${this.apiUrl}/unified`, { params });
  }

  getSmartSuggestions(request: SmartSuggestRequest): Observable<SmartSuggestResult> {
    return this.http.post<SmartSuggestResult>(`${this.apiUrl}/smart`, request);
  }
}
