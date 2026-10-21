/**
 * Test Result Related Models and DTOs
 */

// ================================================================
// Dashboard Item (Sample-wise listing)
// ================================================================
export interface TestResultDashboardItem {
  sampleId: number;
  sampleNo: string;
  caseNo: string;
  customerName: string;
  material: string;
  condition: string;
  tests: string; // comma-separated test names
  status: 'Pending' | 'Started' | 'In Progress' | 'Completed';
  hasLongTermTests: boolean;
  planId: number;
}

// ================================================================
// Test Result Parameter DTO
// ================================================================
export interface TestResultParameterDto {
  id: number;
  parameterID?: number;
  parameterName: string;
  unit: string;
  value?: number | null;
  remarks?: string;
  minValue?: number | null;
  maxValue?: number | null;
  isWithinLimit?: boolean | null;
  altered?: boolean;
  // Phase 2A fields
  formulaExpression?: string;
  formulaDisplay?: string;
  dependsOnParamsJson?: string;
  specMinValue?: number | null;
  specMaxValue?: number | null;
  acceptanceCriteria?: string;
  isStandalone?: boolean;
  sourceTestMethodId?: number | null;
  resultStatus?: 'Pass' | 'Fail' | 'Marginal' | null;
  isReportable?: boolean;
}

// ================================================================
// Hybrid Architecture Typed Collections DTOs
// ================================================================
export interface TestResultReadingDto {
  id?: number;
  testResultHeaderId?: number;
  testResultParameterId?: number | null;
  parameterCode?: string;
  parameterName?: string;
  specimenCode?: string;
  locationCode?: string;
  sequenceNo?: number;
  readingNumber?: number;
  value?: number | null;
  readingValue?: number | null;
  unit?: string;
  isVoided?: boolean;
  voidReason?: string | null;
  displayOrder?: number;
  isExcluded?: boolean;
  remarks?: string;
}

export interface TestResultLocationDto {
  id?: number;
  testResultHeaderId?: number;
  locationCode: string;
  displayName?: string;
  locationName?: string;
  sequenceNo?: number;
  displayOrder?: number;
  isReportable: boolean;
  isRuntimeAdded?: boolean;
  addedReason?: string | null;
  isVoided?: boolean;
  voidReason?: string | null;
  remarks?: string;
}

export interface TestResultTraversePointDto {
  id?: number;
  testResultHeaderId?: number;
  specimenCode?: string;
  traverseCode?: string;
  sequenceNo?: number;
  pointSequence?: number;
  distance?: number;
  distanceMm?: number;
  hardnessValue: number | null;
  hardnessUnit?: string;
  depthRatio?: number | null;
  isBelowCutoff?: boolean | null;
  isReportable?: boolean;
  isVoided?: boolean;
}

export interface TestResultChecklistItemDto {
  id?: number;
  testResultHeaderId?: number;
  itemCode?: string;
  checklistCode?: string;
  itemDescription?: string;
  itemLabel?: string;
  category?: string;
  status: 'Pass' | 'Fail' | 'NA' | 'Pending' | string;
  verifiedBy?: string;
  remarks?: string;
  checkedBy?: number;
  checkedAt?: string;
  isMandatory?: boolean;
  isReportable?: boolean;
  isVoided?: boolean;
}

export interface TestResultObservationDto {
  id?: number;
  testResultHeaderId?: number;
  observationCode?: string;
  category: string;
  observationText: string;
  displayOrder?: number;
  sequenceNo?: number;
  isReportable: boolean;
  isRuntimeAdded?: boolean;
  addedReason?: string | null;
  isVoided?: boolean;
  voidReason?: string | null;
}

export interface TestResultAuditLogDto {
  id: number;
  testResultHeaderId: number;
  action: string;
  fieldName: string;
  oldValue?: string;
  newValue?: string;
  changedBy: string;
  changedAt: string;
  reason?: string;
}

export interface RetestComparisonDto {
  currentHeaderId: number;
  retestOfHeaderId: number;
  retestReasonCode?: string;
  approvalSealHash?: string;
  isApprovedAndLocked: boolean;
  parameterComparisons: Array<{
    parameterName: string;
    unit: string;
    originalValue?: number | null;
    originalStatus?: string;
    retestValue?: number | null;
    retestStatus?: string;
    delta?: number | null;
    deltaPercent?: number | null;
    isSignificantDifference: boolean;
  }>;
}

// ================================================================
// Standalone Parameter DTO (for adding standalone parameters)
// ================================================================
export interface AddStandaloneParameterDto {
  parameterName: string;
  unit: string;
  formulaExpression?: string;
  formulaDisplay?: string;
  specMinValue?: number | null;
  specMaxValue?: number | null;
}

// ================================================================
// Add Parameter From Method DTO
// ================================================================
export interface AddParameterFromMethodDto {
  testMethodId: number;
  parameterID: number;
}

// ================================================================
// Test Group DTO (General or Chemical)
// ================================================================
export interface TestResultGroupDto {
  headerId: number;
  generalTestId?: number;
  chemicalTestId?: number;
  testMethodId?: number;
  laboratoryTestId?: number;
  labTestId?: number;
  name: string;
  specification: string;
  status: 'Pending' | 'Started' | 'In Progress' | 'Completed';
  reportNo?: string;
  parameters: TestResultParameterDto[];
  supportsLongTerm?: boolean;
  // Execution Layout Hybrid fields
  layoutTemplateId?: number | null;
  layoutVersion?: string | null;
  layoutSnapshotJson?: string | null;
  executionExtraJson?: string | null;
  roomTemperature?: number | null;
  roomHumidity?: number | null;
  retestOfHeaderId?: number | null;
  retestReasonCode?: string | null;
  readings?: TestResultReadingDto[];
  locations?: TestResultLocationDto[];
  traversePoints?: TestResultTraversePointDto[];
  checklist?: TestResultChecklistItemDto[];
  observations?: TestResultObservationDto[];
}

// ================================================================
// Test Result Save DTO
// ================================================================
export interface TestResultSaveDto {
  inwardId: number;
  sampleId: number;
  planId: number;
  generalTests: TestResultGroupDto[];
  chemicalTests: TestResultGroupDto[];
  status?: 'Pending' | 'Started' | 'In Progress' | 'Completed';
}

// ================================================================
// Full Payload Response (from API)
// ================================================================
export interface TestResultFullPayload {
  inward: {
    id: number;
    caseNo: string;
    customerName: string;
  };
  sample: {
    id: number;
    sampleNo: string;
    details: string;
    metalClassification: string;
    productCondition: string;
    remarks: string;
    additionalDetails?: any[];
  };
  plans: Array<{
    planId: number;
    generalTests: TestResultGroupDto[];
    chemicalTests: TestResultGroupDto[];
  }>;
}

// ================================================================
// Long Term Test DTO
// ================================================================
export interface LongTermTestDto {
  id: number;
  headerId: number;
  sampleNo: string;
  testName: string;
  status: string ; // 'Pending' | 'Started' | 'In Progress' | 'Completed' | 'Active'  | 'Paused';
  durationHours: number;
  startedAt: Date;
  completedAt?: Date;
  readings: LongTermReadingDto[];
}

// ================================================================
// Long Term Reading DTO
// ================================================================
export interface LongTermReadingDto {
  id: number;
  longTermTestId: number;
  recordedAt: Date;
  parameterId: number;
  parameterName: string;
  value: number;
  remarks?: string;
  parsed?: LongTermReadingParsed;
}
export interface LongTermReadingParsed {
  ParameterId: number;
  ParameterName: string;
  Value: number;
  Remarks?: string;
  RecordedAt: Date;
}

// ================================================================
// Move to Long Term Request DTO
// ================================================================
export interface MoveToLongTermDto {
  headerId: number;
  durationHours: number;
}

// ================================================================
// Long Term Record Request DTO
// ================================================================
export interface LongTermRecordDto {
  longTermTestId: number;
  parameterId: number;
  value: number;
  remarks?: string;
}
