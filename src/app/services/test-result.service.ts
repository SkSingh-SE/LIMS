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

  loadParametersFromSpec(headerId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/load-parameters/${headerId}`, {});
  }

  // ================================================================
  // Phase 2A: Enhanced Test Execution
  // ================================================================
  /**
   * Trigger formula calculations for a test header
   */
  calculateParameters(headerId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/calculate-parameters/${headerId}`, {});
  }

  /**
   * Add a standalone parameter to a test header
   */
  addStandaloneParameter(headerId: number, dto: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/add-standalone-parameter/${headerId}`, dto);
  }

  /**
   * Add a parameter from another test method
   */
  addParameterFromMethod(headerId: number, dto: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/add-parameter-from-method/${headerId}`, dto);
  }

  /**
   * Get lab room environment conditions at test time
   */
  getEnvironmentAtTime(headerId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/environment-at-time/${headerId}`);
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

  // ================================================================
  // Phase 2B: Test-Level Price Calculation
  // ================================================================
  /**
   * Calculate test price based on parameters × InvoiceCasePrice
   */
  calculatePrice(headerId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/calculate-price/${headerId}`, {});
  }

  /**
   * Get price breakdown per parameter
   */
  getPriceBreakdown(headerId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/price-breakdown/${headerId}`);
  }

  /**
   * Override calculated price with manual amount and reason
   */
  overridePrice(headerId: number, dto: { amount: number; reason: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/override-price/${headerId}`, dto);
  }

  /**
   * Get price summary: calculated, override, final price
   */
  getPriceSummary(headerId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/price-summary/${headerId}`);
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

  // ================================================================
  // Phase 1: NABL Scope Validation
  // ================================================================
  getNablScopeCheck(headerId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/nabl-scope-check/${headerId}`);
  }

  // ================================================================
  // Phase 2: Uncertainty Integration
  // ================================================================
  getUncertainty(headerId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/uncertainty/${headerId}`);
  }

  // ================================================================
  // Orientation Mismatch Check
  // ================================================================
  checkOrientationMismatch(headerId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/orientation-check/${headerId}`);
  }

  // ================================================================
  // Phase 4: Machine Data Integration
  // ================================================================
  fetchMachineData(dto: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/machine-integration/push-data`, dto);
  }

  getPendingMachineTests(equipmentId: number): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/machine-integration/pending-tests/${equipmentId}`);
  }

  getMachineDataLogs(headerId: number): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/machine-integration/logs/${headerId}`);
  }

  // ================================================================
  // Phase 5: Test Verification Workflow
  // ================================================================
  submitForVerification(headerId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/submit-for-verification/${headerId}`, {});
  }

  getVerificationList(filter: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/verification-list`, filter);
  }

  verifyTest(headerId: number, comments: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/verify/${headerId}`, { comments });
  }

  rejectVerification(headerId: number, comments: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/reject-verification/${headerId}`, { comments });
  }

  getPreparationStatus(sampleId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/preparation-status/${sampleId}`);
  }

  // ================================================================
  // Phase 6: Unified Price View
  // ================================================================
  getUnifiedPriceSummary(sampleId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/unified-price-summary/${sampleId}`);
  }

  // ================================================================
  // Machining Charge Line Items
  // ================================================================
  getMachiningItems(sampleId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/machining-items/${sampleId}`);
  }

  addMachiningItem(sampleId: number, dto: { description: string; amount: number; remark?: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/machining-items/${sampleId}`, dto);
  }

  updateMachiningItem(itemId: number, dto: { description: string; amount: number; remark?: string }): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/machining-items/${itemId}`, dto);
  }

  deleteMachiningItem(itemId: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/machining-items/${itemId}`);
  }
}
