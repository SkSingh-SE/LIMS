import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';

export interface WorkflowAction {
  id: string;
  action: 'Next' | 'Cancel' | 'Back';
  name: string;
}

export interface ReportingListItem {
  sampleNo: string;
  sampleId: number;
  caseNo: string;
  customer: string;
  material: string;
  condition: string;
  status: 'Pending' | 'Completed' | 'ReadyForReport' | 'Report Pending' | 'Approved';
  reportHeaderId?: string;
  workflowInstanceId?: string;
  canTakeAction?: boolean;
  actions?: WorkflowAction[];
}

export interface TestParameter {
  parameterID: string;
  parameterName: string;
  value: number | string;
  unit: string;
  minValue: number | string;
  maxValue: number | string;
  isWithinLimit: boolean;
  remarks?: string;
}

export interface MechanicalTest {
  testResultHeaderId: string;
  testName: string;
  reportNo: string;
  specification1Name: string;
  specification2Name?: string;
  status: 'Completed' | 'Running' | 'Pending' | 'Failed';
  parameters: TestParameter[];
}

export interface ChemicalTest {
  testResultHeaderId: string;
  testName: string;
  reportNo: string;
  specification1Name: string;
  specification2Name?: string;
  status: 'Completed' | 'Running' | 'Pending' | 'Failed';
  parameters: TestParameter[];
}

export interface LongTermTestReading {
  recordedAt: string;
  parsed?: any;
}

export interface LongTermTest {
  longTermTestId: string;
  testName: string;
  durationHours: number;
  startedAt: string;
  endedAt?: string;
  status: 'Completed' | 'Running' | 'Pending' | 'Failed';
  parameters: Array<{ parameterName: string; value: number | string }>;
  readings: LongTermTestReading[];
}

export interface AmendmentDetails {
  amendmentRequestId: string;
  reason: string;
  fileName: string;
  filePath: string;
  requestedOn: string;
}
export interface ReportingPreview {
  reportHeaderId: string;
  workflowInstanceId: string;
  sampleNo: string;
  caseNo: string;
  customer: string;
  material: string;
  condition: string;
  reportNo: string;
  status: 'Pending' | 'Completed' | 'Approved' | 'Rejected';
  mechanicalTests: MechanicalTest[];
  chemicalTests: ChemicalTest[];
  longTermTests: LongTermTest[];
  actions: WorkflowAction[];
  amendment: AmendmentDetails | null;
}

@Injectable({
  providedIn: 'root'
})
export class ReportingService {
  private apiUrl = environment.apiUrl + "/Reporting";
  private dummyReportingList: ReportingListItem[] = [
    {
      sampleId: 101,
      sampleNo: 'S-001',
      caseNo: '24-00012',
      customer: 'ABC Metals',
      material: 'TMT',
      condition: 'As Rolled',
      status: 'ReadyForReport',
      reportHeaderId: 'RH-1001',
      workflowInstanceId: 'WF-9001',
      canTakeAction: true
    },
    {
      sampleId: 102,
      sampleNo: 'S-002',
      caseNo: '24-00013',
      customer: 'Shreenath Steel',
      material: 'Billet',
      condition: 'Hot Rolled',
      status: 'Completed',
      reportHeaderId: 'RH-1002',
      workflowInstanceId: 'WF-9002',
      canTakeAction: false
    },
    {
      sampleId: 103,
      sampleNo: 'S-003',
      caseNo: '24-00014',
      customer: 'Tata Steel',
      material: 'Wire Rod',
      condition: 'Finished',
      status: 'Completed'
    },
    {
      sampleId: 104,
      sampleNo: 'S-004',
      caseNo: '24-00015',
      customer: 'JSW Steel',
      material: 'Plate',
      condition: 'Cold Rolled',
      status: 'Report Pending',
      reportHeaderId: 'RH-1004',
      workflowInstanceId: 'WF-9004',
      canTakeAction: true
    },
    {
      sampleId: 105,
      sampleNo: 'S-005',
      caseNo: '24-00016',
      customer: 'ArcelorMittal',
      material: 'Coil',
      condition: 'Hot Rolled',
      status: 'Pending'
    },
    {
      sampleId: 106,
      sampleNo: 'S-006',
      caseNo: '24-00017',
      customer: 'SAIL',
      material: 'Bar',
      condition: 'As Rolled',
      status: 'Approved',
      reportHeaderId: 'RH-1006',
      workflowInstanceId: 'WF-9006',
      canTakeAction: false
    }
  ];

  constructor(private http: HttpClient) { }

  getReportDashboardList(filter: any): Observable<any> {
    return this.http.post<any>(this.apiUrl + "/list", filter);
  }

  getReportingList(): Observable<ReportingListItem[]> {
    return of(this.dummyReportingList);
  }

  getReportReview(reportHeaderId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/preview/${reportHeaderId}`);
  }


  getReportPreview(sampleId: string): Observable<ReportingPreview> {
    // Call actual API endpoint
    return this.http.get<ReportingPreview>(`${this.apiUrl}/preview/${sampleId}`);
  }


  takeWorkflowAction(payload: any): Observable<any> {
    return this.http.post<any>(this.apiUrl + '/perform-action', payload);
  }

  /**
   * Generate PDF for an approved/completed report
   * @param sampleId - ID of the report header
   * @returns Observable with PDF generation response
   */
  generateReportPdf(sampleId: string | number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/generate-pdf/${sampleId}`, {});
  }

  submitAmendment(formData: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/request-amendment`, formData);
  }
}
