import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

export interface BranchOptionDto {
  id: number;
  name: string;
  code: string;
}

export interface SpecificationVersionOptionDto {
  id: number;
  version: string;
  year?: string;
  status: string;
  isDefault: boolean;
  isActive: boolean;
  isSuperseded: boolean;
  effectiveDate?: string;
  supersededDate?: string;
}

export interface TestMethodVersionOptionDto {
  id: number;
  version: string;
  year?: string;
  status: string;
  isDefault: boolean;
  isActive: boolean;
  isSuperseded: boolean;
  effectiveDate?: string;
  supersededDate?: string;
}

export interface UniversalTestCardDto {
  id: number;
  code: string;
  name: string;
  disciplineID?: number;
  disciplineName?: string;
  labDepartmentID?: number;
  departmentName?: string;
  parameterCount: number;
  methodCount: number;
  conditionCount: number;
  isReady: boolean;
  readinessMessage: string;
}

export interface PlannedUniversalTestDto {
  universalTestGroupID: number;
  laboratoryTestID: number;
  laboratoryTestCode: string;
  laboratoryTestName: string;
  disciplineName?: string;
  testMethodSpecificationID?: number;
  testMethodName?: string;
  testMethodSpecificationVersionID?: number;
  testMethodVersion?: string;
  isSupersededMethodVersion: boolean;
  specificationHeaderID?: number;
  specificationName?: string;
  specificationVersionID?: number;
  specificationVersionName?: string;
  specificationGradeID?: number;
  gradeName?: string;
  branchID: number;
  branchName?: string;
  departmentID?: number;
  departmentName?: string;
  executionLayoutID?: number;
  executionLayoutCode?: string;
  executionLayoutName?: string;
  rendererType?: string;
  layoutResolutionLevel?: string;
  status: string;
  testExecutionID?: number;
  executionStatus?: string;
}

export interface UniversalPlanSampleSummaryDto {
  sampleID: number;
  sampleNo: string;
  sampleDetails?: string;
  specificationGradeID?: number;
  gradeName?: string;
  specificationHeaderID?: number;
  specificationName?: string;
  sampleDisciplineID?: number | null;
  sampleDisciplineName?: string | null;
  sampleTestPlanID: number;
  planStatus: string;
  planVersion: number;
  plannedTestCount: number;
  isCurrent?: boolean;
  isSelected?: boolean;
}

export interface UniversalPlanCopyRequestDto {
  sourceSampleID: number;
  targetSampleIDs: number[];
  executionBranchID?: number;
}

export interface UniversalPlanCopyDetailDto {
  targetSampleID: number;
  sampleNo: string;
  success: boolean;
  message: string;
  copiedTestCount: number;
}

export interface UniversalPlanCopyResultDto {
  success: boolean;
  message: string;
  totalTargets: number;
  successfulCopies: number;
  failedCopies: number;
  details: UniversalPlanCopyDetailDto[];
}

export interface UniversalPlanWorkspaceDto {
  inwardID: number;
  caseNo: string;
  sampleID: number;
  sampleNo: string;
  sampleDetails?: string;
  sampleDisciplineID?: number | null;
  sampleDisciplineName?: string | null;
  inwardDate: string;
  customerID: number;
  customerName: string;
  productMasterID?: number;
  productMasterName?: string;
  specificationGradeID?: number;
  gradeName?: string;
  specificationHeaderID?: number;
  specificationName?: string;
  standardReference?: string;
  specificationVersionID?: number;
  specificationVersionName?: string;
  isSupersededSpecVersion: boolean;
  availableSpecVersions: SpecificationVersionOptionDto[];
  branchID: number;
  branchName: string;
  availableBranches: BranchOptionDto[];
  sampleTestPlanID: number;
  planStatus: string;
  planVersion: number;
  isPlanLocked: boolean;
  availableSamples: UniversalPlanSampleSummaryDto[];
  availableTests: UniversalTestCardDto[];
  plannedTests: PlannedUniversalTestDto[];
}

export interface PreviewParameterDto {
  parameterID: number;
  parameterCode: string;
  parameterName: string;
  parameterUnit: string;
  inputType: string;
  isMandatory: boolean;
  isReportable: boolean;
  requirementText: string;
  minValue?: number;
  maxValue?: number;
  minTolerance?: number;
  maxTolerance?: number;
  acceptanceCriteria?: string;
  equation?: string;
  note?: string;
  hasRequirement: boolean;
  status: string;

  // Screen 14 Part C — resolution status & reason
  resolutionStatus: string;
  resolutionReason?: string;
  specificationLineID?: number;
  sourceSpecificationVersionID?: number;

  // Phase 1C — NABL scope coverage at planning (same validator semantics)
  scopeStatus?: string;
}

export interface PreviewConditionDto {
  conditionMasterID: number;
  conditionCode: string;
  conditionName: string;
  category: string;
  parameterUnit: string;
  isMandatory: boolean;
  configuredValue: string;
  hasConfiguration: boolean;
  status: string;
}

export interface PreviewEquipmentDto {
  equipmentRequirementMasterID?: number;
  requirementName: string;
  equipmentTypeID: number;
  equipmentTypeName?: string;
  isMandatory: boolean;
  equipmentID?: number;
  equipmentName?: string;
  equipmentCode?: string;
  serialNumber?: string;
  calibrationStatus: string;
  calibrationDueDate?: string;
  isValidForExecution: boolean;
  message?: string;
}

export interface UniversalPlanValidationSummaryDto {
  samplePass: boolean;
  sampleMessage?: string;
  productGradePass: boolean;
  productGradeMessage?: string;
  specificationPass: boolean;
  specificationMessage?: string;
  specificationVersionPass: boolean;
  specificationVersionMessage?: string;
  testDefinitionPass: boolean;
  testDefinitionMessage?: string;
  mandatoryParametersPass: boolean;
  mandatoryParametersMessage?: string;
  testMethodPass: boolean;
  testMethodMessage?: string;
  methodVersionPass: boolean;
  methodVersionMessage?: string;
  branchPass: boolean;
  branchMessage?: string;
  departmentRoutingPass: boolean;
  departmentRoutingMessage?: string;
  requiredConditionsPass: boolean;
  requiredConditionsMessage?: string;
  equipmentPass: boolean;
  equipmentMessage?: string;
  allPassed: boolean;
  blockingErrors: string[];
  warnings: string[];
}

export interface UniversalPlanPreviewRequestDto {
  sampleID: number;
  laboratoryTestID: number;
  specificationHeaderID?: number;
  specificationVersionID?: number;
  specificationGradeID?: number;
  testMethodSpecificationID?: number;
  testMethodSpecificationVersionID?: number;
  branchID: number;
  referenceDate?: string;
}

export interface UniversalPlanPreviewResponseDto {
  laboratoryTestID: number;
  laboratoryTestCode: string;
  laboratoryTestName: string;
  disciplineID?: number;
  disciplineName?: string;
  testMethodSpecificationID?: number;
  testMethodCode?: string;
  testMethodName?: string;
  testMethodStandard?: string;
  testMethodSpecificationVersionID?: number;
  testMethodVersion?: string;
  isSupersededMethodVersion: boolean;
  availableMethodVersions: TestMethodVersionOptionDto[];
  specificationHeaderID?: number;
  specificationTitle?: string;
  specificationVersionID: number;
  specificationVersionNumber?: string;
  isSupersededSpecVersion: boolean;
  specificationGradeID?: number;
  gradeName?: string;
  isStandardlessTest: boolean;
  branchID: number;
  branchName?: string;
  departmentID?: number;
  departmentName?: string;
  departmentRoutingSource: string;
  executionLayoutID?: number;
  executionLayoutCode?: string;
  executionLayoutName?: string;
  rendererType?: string;
  layoutResolutionLevel?: string;
  parameters: PreviewParameterDto[];
  conditions: PreviewConditionDto[];
  equipment: PreviewEquipmentDto[];
  validationSummary: UniversalPlanValidationSummaryDto;
  isConfigurationReady: boolean;
  tenant?: TenantContextDto;
}

export interface TenantContextDto {
  organizationID: number;
  branchID: number;
  companyCode: string;
}

export interface UniversalPlanTestItemDto {
  universalTestGroupID?: number;
  laboratoryTestID: number;
  testMethodSpecificationID?: number;
  testMethodSpecificationVersionID?: number;
  specificationHeaderID?: number;
  specificationGradeID?: number;
  specificationVersionID?: number;
  branchID?: number;
  isRetest: boolean;
}

export interface UniversalPlanSaveDto {
  sampleTestPlanID: number;
  sampleID: number;
  branchID: number;
  productMasterID?: number;
  specificationHeaderID?: number;
  specificationGradeID?: number;
  specificationVersionID?: number;
  tests: UniversalPlanTestItemDto[];
}

export interface UniversalPlanConfirmDto {
  sampleTestPlanID: number;
  sampleID: number;
  branchID: number;
  productMasterID?: number;
  specificationHeaderID?: number;
  specificationGradeID?: number;
  specificationVersionID?: number;
  tests: UniversalPlanTestItemDto[];
}

export interface UniversalPlanConfirmResultDto {
  success: boolean;
  message: string;
  sampleTestPlanID: number;
  planStatus: string;
  createdUniversalTestGroupIDs: number[];
}

@Injectable({
  providedIn: 'root'
})
export class UniversalPlanService {
  private readonly baseUrl = `${environment.apiUrl}/plan/universal`;

  constructor(private http: HttpClient) {}

  getWorkspace(inwardId: number, sampleId: number): Observable<UniversalPlanWorkspaceDto> {
    const params = new HttpParams().set('sampleId', sampleId.toString());
    return this.http.get<UniversalPlanWorkspaceDto>(`${this.baseUrl}/workspace/${inwardId}`, { params });
  }

  getInwardSamples(inwardId: number): Observable<UniversalPlanSampleSummaryDto[]> {
    return this.http.get<UniversalPlanSampleSummaryDto[]>(`${this.baseUrl}/inward-samples/${inwardId}`);
  }

  copyPlanToSamples(dto: UniversalPlanCopyRequestDto): Observable<UniversalPlanCopyResultDto> {
    return this.http.post<UniversalPlanCopyResultDto>(`${this.baseUrl}/copy-plan`, dto);
  }

  getMethodVersions(methodId: number): Observable<TestMethodVersionOptionDto[]> {
    return this.http.get<TestMethodVersionOptionDto[]>(`${this.baseUrl}/method-versions/${methodId}`);
  }

  previewTestConfiguration(req: UniversalPlanPreviewRequestDto): Observable<UniversalPlanPreviewResponseDto> {
    return this.http.post<UniversalPlanPreviewResponseDto>(`${this.baseUrl}/preview`, req);
  }

  saveDraftPlan(dto: UniversalPlanSaveDto): Observable<UniversalPlanConfirmResultDto> {
    return this.http.post<UniversalPlanConfirmResultDto>(`${this.baseUrl}/save-draft`, dto);
  }

  validatePlan(dto: UniversalPlanSaveDto): Observable<UniversalPlanValidationSummaryDto> {
    return this.http.post<UniversalPlanValidationSummaryDto>(`${this.baseUrl}/validate`, dto);
  }

  createTestGroups(dto: UniversalPlanConfirmDto): Observable<UniversalPlanConfirmResultDto> {
    return this.http.post<UniversalPlanConfirmResultDto>(`${this.baseUrl}/create-test-group`, dto);
  }
}
