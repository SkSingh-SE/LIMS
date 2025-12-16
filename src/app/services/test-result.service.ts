import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TestResultSaveDto, TestResultDashboardItem, LongTermTestDto, MoveToLongTermDto, LongTermRecordDto } from '../models/testResultModels';

@Injectable({
  providedIn: 'root'
})
export class TestResultService {
  private apiUrl = environment.apiUrl + "/TestResults"; // Replace with actual API

  constructor(private http: HttpClient) { }

  // ================================================================
  // Dashboard & Listing
  // ================================================================
  /**
   * Get all test results with filters (sample-wise dashboard)
   */
  getAllTestResults(filter: any): Observable<any> {
    return this.http.post<any>(this.apiUrl + "/list", filter);
  }

  /**
   * Get dashboard items (sample-wise listing for testing dashboard)
   */
  getDashboardItems(filter: any): Observable<TestResultDashboardItem[]> {
    return this.http.post<TestResultDashboardItem[]>(this.apiUrl + "/dashboard", filter);
  }

  // ================================================================
  // Test Result Details & Payload
  // ================================================================
  /**
   * Get test result header details
   */
  getTestResultHeader(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/details/${id}`);
  }

  /**
   * Get full result payload for a sample (for perform testing)
   */
  getFullResultPayload(sampleId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/full-result-payload/${sampleId}`);
  }

  // ================================================================
  // Save & Update Operations
  // ================================================================
  /**
   * Save test results
   */
  saveTestResult(payload: TestResultSaveDto): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/save-test-result`, payload);
  }

  /**
   * Update test result
   */
  updateTestResult(payload: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/update`, payload);
  }

  /**
   * Update a single parameter
   */
  updateParameter(headerId: number, parameterId: number, param: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/update-parameter/${headerId}/parameter/${parameterId}`, param);
  }

  // ================================================================
  // Test Start / Complete Flow
  // ================================================================
  /**
   * Start a test (mark as Started)
   */
  startTest(headerId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/start-test/${headerId}`, {});
  }

  /**
   * Complete a test (mark as Completed)
   */
  completeTest(headerId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/complete-test/${headerId}`, {});
  }

  /**
   * Complete test result (legacy)
   */
  completeTestResult(payload: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/complete`, payload);
  }

  /**
   * Complete header (legacy)
   */
  completeHeader(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/complete/${id}`);
  }

  // ================================================================
  // Long-Term Test Operations
  // ================================================================
  /**
   * Get list of all long-term tests
   */
  getLongTermTests(filter?: any): Observable<any> {
    return this.http.post<LongTermTestDto[]>(`${this.apiUrl}/long-term/list`, filter || {});
  }

  /**
   * Move test to long-term tracking
   */
  moveToLongTerm(headerId: number, durationHours: number): Observable<any> {
    const payload: MoveToLongTermDto = { headerId, durationHours };
    return this.http.post<any>(`${this.apiUrl}/move-to-long-term`, payload);
  }

  /**
   * Record intermediate reading for long-term test
   */
  longTermRecord(payload: LongTermRecordDto): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/long-term/record`, payload);
  }

  /**
   * Complete long-term test
   */
  completeLongTerm(longTermTestId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/long-term/complete/${longTermTestId}`, {});
  }

  /**
   * Get long-term test details
   */
  getLongTermTestDetail(longTermTestId: number): Observable<LongTermTestDto> {
    return this.http.get<LongTermTestDto>(`${this.apiUrl}/long-term/${longTermTestId}`);
  }

  // ================================================================
  // Dropdown & Utility
  // ================================================================
  /**
   * Get test result dropdown options
   */
  getTestResultDropdown(searchTerm: string, pageNumber: number, pageSize: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/dropdown?searchTerm=${searchTerm}&pageNo=${pageNumber}&pageSize=${pageSize}`);
  }

  /**
   * Delete test result
   */
  deleteTestResult(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/delete/${id}`);
  }

  getParametersForHeader(headerId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/parameters/header/${headerId}`);
  }

  // ================================================================
  // Image Uploads (Test-wise)
  // ================================================================
  /**
   * Get images for a test header
   * GET /api/test-results/{headerId}/images
   */
  getTestImages(headerId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${headerId}/images`);
  }

  /**
   * Upload multiple images for a test header. Expects FormData with files and captions.
   * POST /api/test-results/{headerId}/images
   */
  uploadTestImages(headerId: number, files: File[], captions?: string[]): Observable<any> {
    const fd = new FormData();
    if (files && files.length) {
      for (let i = 0; i < files.length; i++) {
        fd.append('files', files[i], files[i].name);
      }
    }
    if (captions && captions.length) {
      // send captions as JSON string; backend may accept this or per-file captions
      fd.append('captions', JSON.stringify(captions));
    }

    return this.http.post<any>(`${this.apiUrl}/${headerId}/images`, fd);
  }
}
