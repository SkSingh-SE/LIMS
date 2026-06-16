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
  dependsOnParamsJson?: string;
  specMinValue?: number | null;
  specMaxValue?: number | null;
  acceptanceCriteria?: string;
  isStandalone?: boolean;
  sourceTestMethodId?: number | null;
  resultStatus?: 'Pass' | 'Fail' | 'Marginal' | null;
}

// ================================================================
// Standalone Parameter DTO (for adding standalone parameters)
// ================================================================
export interface AddStandaloneParameterDto {
  parameterName: string;
  unit: string;
  formulaExpression?: string;
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
