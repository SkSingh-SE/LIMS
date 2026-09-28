export interface UniversalTestGroupListItemDto {
  id: number;
  sampleTestPlanID: number;
  sampleID: number;
  sampleNo: string;
  inwardCaseNo: string;
  inwardID: number;
  laboratoryTestID: number;
  laboratoryTestCode: string;
  laboratoryTestName: string;
  disciplineName?: string;
  status: string;
  branchID: number;
  branchName?: string;
  departmentName?: string;
  hasExecution: boolean;
  latestExecutionID?: number;
  executionStatus?: string;
  hasSnapshot: boolean;
  hasAdjustment?: boolean;
  adjustmentStatus?: string;
  createdOn: string;
}

export interface UniversalTestGroupDetailDto {
  id: number;
  sampleTestPlanID: number;
  sampleID: number;
  sampleNo: string;
  inwardCaseNo: string;
  inwardID: number;
  inwardDate: string;
  customerName: string;
  customerID?: number;
  sampleDetails?: string;
  productMasterID?: number;
  productName?: string;
  specificationGradeID?: number;
  gradeName?: string;
  specificationHeaderID?: number;
  specificationTitle?: string;
  standardReference?: string;
  specificationVersionID?: number;
  specificationVersionName?: string;
  specificationVersionStatus?: string;
  isSupersededSpecVersion: boolean;
  isStandardless: boolean;
  laboratoryTestID: number;
  laboratoryTestCode: string;
  laboratoryTestName: string;
  laboratoryTestDescription?: string;
  disciplineID?: number;
  disciplineName?: string;
  labDepartmentID?: number;
  testMethodSpecificationID?: number;
  testMethodCode?: string;
  testMethodName?: string;
  testMethodStandard?: string;
  testMethodSpecificationVersionID?: number;
  testMethodVersion?: string;
  testMethodVersionStatus?: string;
  isSupersededMethodVersion: boolean;
  methodEffectiveDate?: string;
  branchID: number;
  branchName?: string;
  departmentID?: number;
  departmentName?: string;
  departmentRoutingSource: string;
  status: string;
  companyCode: string;
  organizationID: number;
  createdOn: string;
  createdByName?: string;
  modifiedOn?: string;
  modifiedByName?: string;
  hasExecution: boolean;
  latestExecutionID?: number;
  latestExecutionStatus?: string;
  hasSnapshot: boolean;
  canOpenExecution: boolean;
  canOpenExecutionReason: string;
  hasAdjustment?: boolean;
  adjustmentStatus?: string;
  adjustmentNumber?: string;
  adjustmentID?: number;
  siblingTestGroupIDs: number[];
}

export interface PlannedParameterDto {
  parameterID: number;
  parameterCode: string;
  parameterName: string;
  parameterUnit?: string;
  inputType?: string;
  decimalPrecision?: number;
  calculationRole?: string;
  equation?: string;
  isMandatory: boolean;
  isReportable: boolean;
  requirementText: string;
  minValue?: number;
  maxValue?: number;
  minTolerance?: number;
  maxTolerance?: number;
  acceptanceCriteria?: string;
  resolutionStatus: string;
  resolutionReason?: string;
  hasRequirement: boolean;
  specificationLineID?: number;
  formulaDependencies: string[];
}

export interface PlannedConfigurationSnapshotDto {
  universalTestGroupID: number;
  laboratoryTestID: number;
  laboratoryTestCode: string;
  laboratoryTestName: string;
  disciplineID?: number;
  disciplineName?: string;
  specificationHeaderID?: number;
  specificationCode?: string;
  specificationTitle?: string;
  standardReference?: string;
  specificationVersionID?: number;
  specificationVersionNumber?: string;
  specificationGradeID?: number;
  gradeName?: string;
  testMethodSpecificationID?: number;
  testMethodCode?: string;
  testMethodName?: string;
  testMethodStandard?: string;
  testMethodSpecificationVersionID?: number;
  testMethodVersion?: string;
  executionLayoutID?: number;
  executionLayoutCode?: string;
  executionLayoutName?: string;
  rendererType?: string;
  branchID: number;
  branchName?: string;
  departmentID?: number;
  departmentName?: string;
  isStandardlessTest: boolean;
  isSupersededSpecVersion: boolean;
  isSupersededMethodVersion: boolean;
  parameters: PlannedParameterDto[];
  conditions: any[];
  equipmentRequirements: any[];
}

export interface EffectiveParameterRowDto {
  parameterID: number;
  parameterCode: string;
  parameterName: string;
  symbol?: string;
  unit?: string;
  unitSource: string;
  inputType: string;
  decimalPrecision?: number;
  calculationRole?: string;
  isCalculated: boolean;
  formula?: string;
  formulaDependencies: string[];
  isMandatory: boolean;
  isReportable: boolean;
  requirementText: string;
  minValue?: number;
  maxValue?: number;
  minTolerance?: number;
  maxTolerance?: number;
  acceptanceCriteria?: string;
  resolutionStatus: string;
  resolutionReason?: string;
  requirementSource: string;
  specificationLineID?: number;
  status: string;

  // Live Master Comparison & Drift
  masterUnit?: string;
  masterFormula?: string;
  masterMinValue?: number;
  masterMaxValue?: number;
  masterDecimalPrecision?: number;
  masterDriftStatus: string; // UNCHANGED, CHANGED, MISSING, INVALID
  driftCategory?: string; // Presentation, Operational, Scientific, Compliance
}

export interface EffectiveRequirementRowDto {
  parameterID: number;
  parameterCode: string;
  parameterName: string;
  requirementType: string;
  min?: number;
  max?: number;
  minTolerance?: number;
  maxTolerance?: number;
  acceptanceCriteria?: string;
  equation?: string;
  minEquation?: string;
  maxEquation?: string;
  conditionContext?: string;
  source: string;
  specificationLineID?: number;
  resolutionStatus: string;
  status: string;
}

export interface EffectiveConditionRowDto {
  conditionMasterID: number;
  conditionCode: string;
  conditionName: string;
  category: string;
  unit?: string;
  operator: string;
  configuredValue: string;
  requirementContext: string;
  isMandatory: boolean;
  hasConfiguration: boolean;
  status: string;
}

export interface EffectiveMethodDto {
  testMethodSpecificationID?: number;
  testMethodCode?: string;
  testMethodName?: string;
  standardReference?: string;
  testMethodSpecificationVersionID?: number;
  version?: string;
  year?: string;
  status?: string;
  effectiveDate?: string;
  supersededDate?: string;
  isSuperseded: boolean;
  isDefault: boolean;
  source: string;
}

export interface EffectiveEquipmentRowDto {
  equipmentID?: number;
  name: string;
  model?: string;
  equipmentType?: string;
  equipmentTypeID?: number;
  equipmentTypeName?: string;
  isRequired: boolean;
  isMandatory: boolean;
  equipmentRequirementID?: number;
  requirementCode?: string;
  requirementName?: string;
  matchingEquipmentCount: number;
  availableEquipmentCount: number;
  readinessStatus: string; // READY, WARNING, BLOCKED
  blockingReason?: string;
  status: string;
  calibrationStatus: string;
  calibratedOn?: string;
  validUpto?: string;
  calibrationNo?: string;
}

export interface EffectiveFactorRowDto {
  factorConversionID: number;
  code: string;
  name: string;
  description?: string;
  factorType: string;
  factorValue: number;
  inputParameterID: number;
  inputParameterCode?: string;
  inputParameterName?: string;
  outputParameterID: number;
  outputParameterCode?: string;
  outputParameterName?: string;
  appliedOn?: string;
  isMandatory: boolean;
  scopeLevel: string; // Version, Method, Test, Global
  status: string;
}

export interface EffectiveUncertaintyDto {
  isConfigured: boolean;
  measurementUncertaintyMasterID?: number;
  masterCode?: string;
  masterName?: string;
  uncertaintyType?: string;
  combinedUncertainty?: number;
  expandedUncertainty?: number;
  value?: number;
  unit?: string;
  coverageFactor?: number;
  confidenceLevel?: number;
  basis?: string;
  componentsJson?: string;
  remarks?: string;
  status: string;
}

export interface EffectiveAcceptanceCriteriaDto {
  isConfigured: boolean;
  acceptanceCriteriaID?: number;
  code?: string;
  name?: string;
  description?: string;
  evaluationType?: string;
  comparisonType?: string;
  decisionRule?: string;
  roundingRule?: string;
  roundingPrecision?: number;
  resolutionSource: string;
  status: string;
}

export interface EffectiveLayoutDto {
  plannedExecutionLayoutID?: number;
  plannedLayoutCode?: string;
  plannedLayoutName?: string;
  plannedRendererType?: string;
  effectiveExecutionLayoutID?: number;
  effectiveLayoutCode?: string;
  effectiveLayoutName?: string;
  effectiveRendererType?: string;
  layoutResolutionLevel: string;
  resolutionStatus: string; // UNCHANGED, LAYOUT_DRIFT, UNASSIGNED
  reason?: string;
}

export interface ValidationItemDto {
  check: string;
  status: string; // PASS, WARNING, BLOCKED, N/A
  source: string;
  message?: string;
}

export interface ValidationSummaryDto {
  overallStatus: string; // READY, WARNING, BLOCKED
  blockingCount: number;
  warningCount: number;
  allPassed: boolean;
  items: ValidationItemDto[];
  blockingErrors: string[];
  warnings: string[];
}

export interface EffectiveConfigurationDto {
  universalTestGroupID: number;
  testGroup: UniversalTestGroupDetailDto;
  plannedBaseline?: PlannedConfigurationSnapshotDto;
  effectiveConfiguration: any;
  snapshotPreview: any;
  parameters: EffectiveParameterRowDto[];
  requirements: EffectiveRequirementRowDto[];
  conditions: EffectiveConditionRowDto[];
  method: EffectiveMethodDto;
  equipment: EffectiveEquipmentRowDto[];
  factors: EffectiveFactorRowDto[];
  uncertainty?: EffectiveUncertaintyDto;
  acceptanceCriteria?: EffectiveAcceptanceCriteriaDto;
  layout: EffectiveLayoutDto;
  validation: ValidationSummaryDto;
}

export interface ConfigurationAdjustmentItemDto {
  id?: number;
  configurationAdjustmentID?: number;
  universalTestGroupID?: number;
  targetCategory: string; // Parameter, Requirement, Condition, Equipment, Factor, Uncertainty, AcceptanceCriteria, Layout
  section?: string;
  targetEntityID?: number;
  entityID?: number;
  entityCode?: string;
  entityName?: string;
  targetProperty: string;
  fieldName?: string;
  adjustmentType: string; // Add, Remove, Override, Substitute
  changeType?: string;
  originalValue?: string;
  adjustedValue?: string;
  plannedValue?: string;
  effectiveValue?: string;
  previousAdjustedValue?: string;
  newAdjustedValue?: string;
  reason: string;
  authorizationCategory: string;
  authorizationStatus?: string;
  authorizedBy?: number;
  authorizedByName?: string;
  authorizedOn?: string;
  isAuthorized: boolean;
  createdBy?: number;
  createdByName?: string;
  createdOn?: string;
}

export interface ConfigurationAdjustmentDraftDto {
  id?: number;
  universalTestGroupID: number;
  adjustmentReason: string;
  items: ConfigurationAdjustmentItemDto[];
  concurrencyToken?: string;
}

export interface ConfigurationAdjustmentDetailDto {
  id: number;
  universalTestGroupID: number;
  adjustmentNumber: number;
  status: string; // Draft, Applied, Approved, Rejected
  adjustmentReason?: string;
  overallReason?: string;
  appliedAt?: string;
  appliedOn?: string;
  appliedBy?: number;
  appliedByName?: string;
  approvedAt?: string;
  approvedOn?: string;
  approvedBy?: number;
  approvedByName?: string;
  approvalRemarks?: string;
  rejectedAt?: string;
  rejectedOn?: string;
  rejectedBy?: number;
  rejectedByName?: string;
  rejectionReason?: string;
  adjustedConfigurationJson?: string;
  concurrencyToken: string;
  createdBy?: number;
  createdOn: string;
  createdByName?: string;
  canApply?: boolean;
  canApprove?: boolean;
  items: ConfigurationAdjustmentItemDto[];
}

export interface ConfigurationAdjustmentListItemDto {
  id: number;
  universalTestGroupID: number;
  adjustmentNumber: number;
  status: string;
  adjustmentReason?: string;
  overallReason?: string;
  appliedAt?: string;
  appliedOn?: string;
  appliedBy?: number;
  appliedByName?: string;
  approvedAt?: string;
  approvedOn?: string;
  approvedBy?: number;
  approvedByName?: string;
  approvalRemarks?: string;
  rejectedAt?: string;
  rejectedOn?: string;
  rejectedBy?: number;
  rejectedByName?: string;
  rejectionReason?: string;
  modifiedBy?: number;
  modifiedByName?: string;
  modifiedOn?: string;
  itemsCount?: number;
  itemCount?: number;
  createdOn: string;
  createdBy?: number;
  createdByName?: string;
}

export interface AdjustedConfigurationDto {
  universalTestGroupID: number;
  adjustmentID: number;
  adjustmentNumber: number;
  status: string;
  adjustmentStatus?: string;
  adjustedConfigurationJson?: string;
  plannedBaseline?: PlannedConfigurationSnapshotDto;
  effectiveConfiguration?: any;

  // Authoritative Planning Headers (Deviation)
  testMethodSpecificationID?: number;
  testMethodCode?: string;
  testMethodName?: string;
  testMethodSpecificationVersionID?: number;
  testMethodVersionNumber?: string;
  specificationHeaderID?: number;
  specificationCode?: string;
  specificationName?: string;
  specificationVersionID?: number;
  specificationVersionNumber?: string;
  specificationGradeID?: number;
  specificationGradeName?: string;

  parameters?: EffectiveParameterRowDto[];
  requirements?: EffectiveRequirementRowDto[];
  conditions?: EffectiveConditionRowDto[];
  equipment?: EffectiveEquipmentRowDto[];
  factors?: EffectiveFactorRowDto[];
  uncertainty?: EffectiveUncertaintyDto;
  acceptanceCriteria?: EffectiveAcceptanceCriteriaDto;
  layout?: EffectiveLayoutDto;
  validation?: ValidationSummaryDto;
  items: ConfigurationAdjustmentItemDto[];
}

export interface ExecutionDeviationRequestDto {
  universalTestGroupID: number;
  deviationCategory: string; // TestMethod, Specification, Equipment, ExecutionLayout
  targetEntityID?: number;
  selectedAlternativeID: number;
  selectedAlternativeSecondaryID?: number;
  reason: string;
  evidenceReference?: string;
  concurrencyToken?: string;
  submitForApproval: boolean;
}

export interface DeviationOptionDto {
  id: number;
  code: string;
  name: string;
  description?: string;
  secondaryInfo?: string;
  secondaryID?: number;
  isCurrent: boolean;
}

export interface DeviationLookupResultDto {
  universalTestGroupID: number;
  deviationCategory: string;
  currentValueDisplay: string;
  currentEntityID?: number;
  availableOptions: DeviationOptionDto[];
}

export interface AdjustmentValidationItemDto {
  targetCategory: string;
  targetProperty: string;
  targetEntityID?: number;
  status: string; // PASS, WARNING, BLOCKED
  message: string;
  authorizationRequired: boolean;
}

export interface AdjustmentValidationResultDto {
  isValid: boolean;
  canApply: boolean;
  blockingCount: number;
  warningCount: number;
  items: AdjustmentValidationItemDto[];
  blockingErrors: string[];
  warnings: string[];
}

export interface ApplyAdjustmentRequestDto {
  configurationAdjustmentID: number;
  universalTestGroupID: number;
  concurrencyToken: string;
}

export interface ApproveAdjustmentRequestDto {
  configurationAdjustmentID: number;
  universalTestGroupID: number;
  approvalRemarks?: string;
  concurrencyToken: string;
}

export interface RejectAdjustmentRequestDto {
  configurationAdjustmentID: number;
  universalTestGroupID: number;
  rejectionReason: string;
  concurrencyToken: string;
}

export interface DifferenceAuditComparisonItemDto {
  section: string;
  entityType: string;
  entityID?: number;
  entityCode?: string;
  entityName?: string;
  fieldName: string;
  classification: 'ADDED' | 'REMOVED' | 'CHANGED' | 'UNCHANGED';
  plannedValue?: string;
  effectiveValue?: string;
  adjustedValue?: string;
  reason?: string;
  authorizationStatus?: string;
  createdByName?: string;
  createdOn?: string;
  authorizedByName?: string;
  authorizedOn?: string;
}

export interface DifferenceAuditDto {
  universalTestGroupID: number;
  adjustments: ConfigurationAdjustmentDetailDto[];
  allDifferenceItems: ConfigurationAdjustmentItemDto[];
}

export interface ComprehensiveDifferenceAuditDto {
  universalTestGroupID: number;
  adjustmentNumber: number;
  adjustmentStatus: string;
  totalItems: number;
  addedCount: number;
  removedCount: number;
  changedCount: number;
  unchangedCount: number;
  comparisonItems: DifferenceAuditComparisonItemDto[];
  adjustmentItems: ConfigurationAdjustmentItemDto[];
  history: ConfigurationAdjustmentDetailDto[];
}
