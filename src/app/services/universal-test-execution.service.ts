import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface SnapshotParameterDto {
  parameterMasterID: number;
  code: string;
  name: string;
  unit?: string;
  inputType: string;
  parameterType?: string; // 'Input' | 'Calculated' | 'Derived'
  decimalPrecision: number;
  isCalculated: boolean;
  formula?: string;
  formulaDependencies?: string[];
  specMin?: number;
  specMax?: number;
  specTarget?: number;
  comparisonCriteria?: string;
  acceptanceCriteria?: string;
  displayOrder: number;
  isRequired: boolean;
  aggregateType?: string;
}

export interface SnapshotConditionDto {
  conditionDimensionID?: number;
  dimensionName: string;
  unit?: string;
  configuredOperator?: string;
  configuredValue1?: string;
  configuredValue2?: string;
  selectedExecutionValue?: string;
}

export interface SnapshotEquipmentDto {
  equipmentID?: number;
  name: string;
  model?: string;
  calibrationNo?: string;
  calibratedOn?: string;
  validUpto?: string;
}

export interface SnapshotFactorDto {
  factorType: string;
  factorName: string;
  value: number;
  appliedOn?: string;
  description?: string;
}

export interface SnapshotMeasurementUncertaintyDto {
  uncertaintyType: string;
  value?: number;
  unit?: string;
  coverageFactor: number;
  basis: string;
  remarks?: string;
}

export interface SnapshotAcceptanceCriteriaDto {
  decisionRule: string;
  overallDecision: string;
  roundingRule: string;
  roundingPrecision: number;
  passFailThreshold?: string;
}

export interface SnapshotAttachmentDto {
  attachmentID?: number;
  fileName: string;
  fileType?: string;
  fileSizeBytes?: number;
  fileUrl?: string;
  uploadedOn?: string;
  uploadedByName?: string;
}

export interface TestExecutionConfigSnapshotDto {
  laboratoryTestID: number;
  laboratoryTestName?: string;
  laboratoryTestCode?: string;
  testName?: string;
  disciplineName?: string;
  standardID?: number;
  standardName?: string;
  testMethodSpecificationID?: number;
  testMethodName?: string;
  testMethodStandard?: string;
  specificationHeaderID?: number;
  specificationTitle?: string;
  specificationName?: string;
  gradeID?: number;
  gradeName?: string;
  snapshotDateUtc?: string;
  isFrozen?: boolean;

  // Execution Layout Metadata
  rendererType?: string; // 'ObservationMatrix' | 'MultiSpecimen' | 'MultiReading' | 'ParameterTable' | 'Qualitative' | 'Calculation' | 'Graph'
  specimenMode?: string;
  observationMode?: string;
  configuredSpecimenCount?: number;
  configuredReadingCount?: number;
  defaultAggregateType?: string;
  aggregateScope?: string;

  // 10 Configuration Categories
  parameters: SnapshotParameterDto[];
  conditions: SnapshotConditionDto[];
  equipment: SnapshotEquipmentDto[];
  factors: SnapshotFactorDto[];
  measurementUncertainty?: SnapshotMeasurementUncertaintyDto;
  acceptanceCriteria?: SnapshotAcceptanceCriteriaDto;
  attachments: SnapshotAttachmentDto[];
  generalRemarks?: string;
}

export interface ParameterObservationResultDto {
  id: number;
  testObservationID: number;
  parameterMasterID: number;
  parameterCode?: string;
  parameterName?: string;
  unit?: string;
  rawValue?: string;
  numericValue?: number;
  calculatedValue?: string;
  isFormulaCalculated: boolean;
  specMin?: number;
  specMax?: number;
  resultStatus?: string; // 'Pass' | 'Fail' | 'Marginal' | 'NotApplicable'
}

export interface TestObservationDto {
  id: number;
  testSpecimenID: number;
  readingNo: number;
  parameterObservationResults: ParameterObservationResultDto[];
}

export interface TestSpecimenDto {
  id: number;
  testExecutionID: number;
  sequenceNo: number;
  specimenIdentifier?: string;
  isDiscarded: boolean;
  discardReason?: string;
  testObservations: TestObservationDto[];
}

export interface TestExecutionDto {
  id: number;
  universalTestGroupID: number;
  branchID: number;
  branchName?: string;
  organizationID: number;
  executionAnalystID?: number;
  executionAnalystName?: string;
  startedOn: string;
  completedOn?: string;
  verifiedBy?: number;
  verifiedByName?: string;
  verifiedOn?: string;
  approvedBy?: number;
  approvedByName?: string;
  approvedOn?: string;
  reviewRemarks?: string;
  executionNo: number;
  isRetest: boolean;
  previousExecutionID?: number;
  status: string; // 'Planned' | 'InProgress' | 'Completed' | 'Verified' | 'Approved' | 'Rejected'
  executionConfigSnapshotID?: number;
  configSnapshot?: TestExecutionConfigSnapshotDto;
  testSpecimens: TestSpecimenDto[];

  // Context properties
  sampleID?: number;
  sampleNo?: string;
  caseNo?: string;
  clientName?: string;
  materialName?: string;
  testName?: string;
  standardName?: string;
  gradeName?: string;
}

export interface TestExecutionSaveDto {
  specimens: any[];
  conditions?: any[];
}

export interface ExecutionActionDto {
  remarks?: string;
}

export interface ParameterCalculationStepDto {
  parameterCode: string;
  parameterName: string;
  formula: string;
  dependencies: string[];
  substitutionTrace: string;
  formattedResult: string;
  isValid: boolean;
  errorMessage?: string;
}

export interface ExecutionCalculationTraceDto {
  dependencyDAG: string;
  steps: ParameterCalculationStepDto[];
}

export interface ParameterOverviewItemDto {
  parameterCode: string;
  parameterName: string;
  unit?: string;
  inputType: string;
  specRange?: string;
  averageValue?: string;
  finalValue?: string;
  status: string;
}

export interface SpecimenOverviewItemDto {
  sequenceNo: number;
  specimenIdentifier?: string;
  readingCount: number;
  complianceStatus: string;
}

export interface ResultsOverviewDto {
  totalReadings: number;
  calculatedResults: number;
  passedCount: number;
  failedCount: number;
  notApplicableCount: number;
  overallDecision: string;
  parameters: ParameterOverviewItemDto[];
  specimens: SpecimenOverviewItemDto[];
}

export interface NablScopeSummaryDto {
  inScopeCount: number;
  outOfScopeCount: number;
  scopeStatus: string; // 'Full' | 'Partial' | 'None'
  inScopeParameters: string[];
  outOfScopeParameters: string[];
}

export interface FormulaPreviewRequestDto {
  formula: string;
  variables: Record<string, number>;
  precision?: number;
}

export interface FormulaPreviewResponseDto {
  isValid: boolean;
  errorMessage?: string;
  result?: number;
  formattedResult?: string;
  substitutionTrace: string;
  dependencies: string[];
}

export interface ExecutionAttachmentUploadDto {
  fileName: string;
  fileType?: string;
  fileUrl?: string;
  fileSizeBytes?: number;
}

@Injectable({
  providedIn: 'root'
})
export class UniversalTestExecutionService {
  private apiUrl = `${environment.apiUrl}/UniversalTestExecution`;

  constructor(private http: HttpClient) { }

  private normalizeExecution(raw: any): TestExecutionDto {
    if (!raw) return raw;
    const exec = { ...raw };
    const specimensList = exec.specimens || exec.testSpecimens || [];
    exec.testSpecimens = specimensList.map((s: any) => {
      const obsList = s.observations || s.testObservations || [];
      return {
        ...s,
        testObservations: obsList.map((o: any) => ({
          ...o,
          parameterObservationResults: o.parameterResults || o.parameterObservationResults || []
        }))
      };
    });
    return exec;
  }

  getExecution(id: number): Observable<TestExecutionDto> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map(res => this.normalizeExecution(res?.data ?? res))
    );
  }

  getExecutionByGroup(groupId: number): Observable<TestExecutionDto> {
    return this.http.get<any>(`${this.apiUrl}/by-group/${groupId}`).pipe(
      map(res => this.normalizeExecution(res?.data ?? res))
    );
  }

  startExecution(groupId: number, isRetest: boolean = false): Observable<TestExecutionDto> {
    return this.http.post<any>(`${this.apiUrl}/start/${groupId}?isRetest=${isRetest}`, {}).pipe(
      map(res => this.normalizeExecution(res?.data ?? res))
    );
  }

  saveObservations(executionId: number, payload: TestExecutionSaveDto): Observable<TestExecutionDto> {
    return this.http.post<any>(`${this.apiUrl}/save-observations/${executionId}`, payload).pipe(
      map(res => this.normalizeExecution(res?.data ?? res))
    );
  }

  completeExecution(executionId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/complete/${executionId}`, {}).pipe(
      map(res => res?.data ?? res)
    );
  }

  verifyExecution(executionId: number, actionDto: ExecutionActionDto): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/verify/${executionId}`, actionDto).pipe(
      map(res => res?.data ?? res)
    );
  }

  approveExecution(executionId: number, actionDto: ExecutionActionDto): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/approve/${executionId}`, actionDto).pipe(
      map(res => res?.data ?? res)
    );
  }

  rejectExecution(executionId: number, actionDto: ExecutionActionDto): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/reject/${executionId}`, actionDto).pipe(
      map(res => res?.data ?? res)
    );
  }

  updateConfiguration(executionId: number, config: TestExecutionConfigSnapshotDto): Observable<TestExecutionDto> {
    return this.http.put<any>(`${this.apiUrl}/${executionId}/config`, config).pipe(
      map(res => this.normalizeExecution(res?.data ?? res))
    );
  }

  getCalculationTrace(executionId: number): Observable<ExecutionCalculationTraceDto> {
    return this.http.get<any>(`${this.apiUrl}/${executionId}/calculations-dag`).pipe(
      map(res => res?.data ?? res)
    );
  }

  getResultsOverview(executionId: number): Observable<ResultsOverviewDto> {
    return this.http.get<any>(`${this.apiUrl}/${executionId}/results-overview`).pipe(
      map(res => res?.data ?? res)
    );
  }

  getNablScopeSummary(executionId: number): Observable<NablScopeSummaryDto> {
    return this.http.get<any>(`${this.apiUrl}/${executionId}/nabl-scope`).pipe(
      map(res => res?.data ?? res)
    );
  }

  previewFormula(request: FormulaPreviewRequestDto): Observable<FormulaPreviewResponseDto> {
    return this.http.post<any>(`${this.apiUrl}/formula/preview`, request).pipe(
      map(res => res?.data ?? res)
    );
  }

  addAttachment(executionId: number, attachment: ExecutionAttachmentUploadDto): Observable<TestExecutionDto> {
    return this.http.post<any>(`${this.apiUrl}/${executionId}/attachment`, attachment).pipe(
      map(res => this.normalizeExecution(res?.data ?? res))
    );
  }
}
