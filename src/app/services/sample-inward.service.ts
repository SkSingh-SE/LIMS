import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SampleInwardService {

  private apiUrl = environment.apiUrl + "/SampleInward";

  constructor(private http: HttpClient) { }

  getAllSampleInward(filter: any): Observable<any> {
    return this.http.post<any>(this.apiUrl + "/list", filter);
  }

  getPlanList(filter: any): Observable<any> {
    return this.http.post<any>(this.apiUrl + "/plan-list", filter);
  }

  getReviewList(filter: any): Observable<any> {
    return this.http.post<any>(this.apiUrl + "/review-list", filter);
  }

  getSampleInwardById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/details/${id}`);
  }
  getSampleInwardWithPlans(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/details-with-plan/${id}`);
  }
  getCaseNumber(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/case-number`);
  }

  createSampleInward(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/create`, payload);
  }

  updateSampleInward(payload: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/update`, payload);
  }

  testPlanSave(payload: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/plan`, payload);
  }

  sendTestPlanForReview(payload: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/plan-for-review`, payload);
  }

  deleteSampleInward(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/delete/${id}`);
  }

  getSampleInwardDropdown(searchTerm: string, pageNumber: number, pageSize: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/dropdown?searchTerm=${searchTerm}&pageNo=${pageNumber}&pageSize=${pageSize}`);
  }

  getPreparationInwardDropdown(searchTerm: string, pageNumber: number, pageSize: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/preparation-inward-dropdown?searchTerm=${searchTerm}&pageNo=${pageNumber}&pageSize=${pageSize}`);
  }

  // Plan History & Replan endpoints
  private planApiUrl = environment.apiUrl + '/Plan';

  getPlanHistory(planId: number): Observable<any> {
    return this.http.get<any>(`${this.planApiUrl}/history/${planId}`);
  }

  requestReplan(planId: number, reason: string): Observable<any> {
    return this.http.post<any>(`${this.planApiUrl}/request-replan/${planId}`, { reason });
  }

  approveReplan(requestId: number, remarks?: string): Observable<any> {
    return this.http.post<any>(`${this.planApiUrl}/approve-replan/${requestId}`, { remarks: remarks || '' });
  }

  rejectReplan(requestId: number, remarks?: string): Observable<any> {
    return this.http.post<any>(`${this.planApiUrl}/reject-replan/${requestId}`, { remarks: remarks || '' });
  }

  updatePaymentInfo(id: number, payload: { purchaseOrderId: number | null; advancePayment: number; billRequired: boolean; advancePIRequired: boolean; holdTestingUntilPIApproved: boolean }): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${id}/payment`, payload);
  }

  updateSamplePrep(sampleId: number, dto: any): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/update-prep/${sampleId}`, dto);
  }

  cancelSample(sampleDetailId: number, reason: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/cancel-sample`, { sampleDetailId, reason });
  }

  deleteSample(sampleDetailId: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/delete-sample/${sampleDetailId}`);
  }

  stopReport(inwardId: number, reason: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/stop-report/${inwardId}`, { reason });
  }

  unstopReport(inwardId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/unstop-report/${inwardId}`, {});
  }

  verifyAndLockReview(inwardId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/verify-and-lock-review/${inwardId}`, {});
  }

  requestInwardReplan(inwardId: number, reason: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/request-replan`, { inwardId, reason });
  }

  approveInwardReplan(replanRequestId: number, remarks?: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/approve-replan`, { replanRequestId, remarks: remarks || '' });
  }

  // Decision Engine Cascade APIs
  getProductMasterCascade(id: number): Observable<any> {
    return this.http.get<any>(`${this.planApiUrl}/cascade/product-master/${id}`);
  }

  getProductMasterSizeLimits(id: number, sizeId: number): Observable<any> {
    return this.http.get<any>(`${this.planApiUrl}/cascade/product-master/${id}/size/${sizeId}`);
  }

  getMetalClassificationCascade(id: number): Observable<any> {
    return this.http.get<any>(`${this.planApiUrl}/cascade/metal-classification/${id}`);
  }

  getMaterialSpecCascade(id: number): Observable<any> {
    return this.http.get<any>(`${this.planApiUrl}/cascade/material-spec/${id}`);
  }

  getLabTestCascade(id: number): Observable<any> {
    return this.http.get<any>(`${this.planApiUrl}/cascade/lab-test/${id}`);
  }

  getTechniqueAnalysisTypes(techniqueId: number, metalId: number): Observable<any> {
    return this.http.get<any>(`${this.planApiUrl}/cascade/technique/${techniqueId}/metal/${metalId}`);
  }

  downloadInwardChallanPdf(inwardId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${inwardId}/print-challan`, { responseType: 'blob' });
  }
}
