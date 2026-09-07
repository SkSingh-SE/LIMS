export interface SpecificationRequirementContext {
  specificationHeaderID: number;
  specificationCode: string;
  specificationName: string;
  standardReference?: string;

  specificationVersionID: number;
  versionNumber: string;
  year?: string;
  versionStatus: 'Draft' | 'Active' | 'Superseded' | 'Withdrawn';
  isDefaultVersion: boolean;
  effectiveDate?: string;
  isEditable: boolean;

  specificationGradeID: number;
  gradeName: string;
  metalClassificationName?: string;

  totalRequirementsCount: number;
}

export interface RequirementDimensionCondition {
  id: number;
  conditionMasterID?: number;
  testConditionDimensionID: number;
  conditionCode?: string;
  conditionName?: string;
  dimensionName?: string;
  unit?: string;
  valueType?: string;
  operator: string;
  value1: string;
  value2?: string;
}

export interface RequirementTestMethodMapping {
  id: number;
  laboratoryTestID?: number;
  laboratoryTestName?: string;
  testMethodSpecificationID?: number;
  testMethodSpecificationName?: string;
  numberOfTestSpecimen?: number;
  displayOrder?: number;
}

export interface SpecificationRequirementItem {
  id: number;
  specificationVersionID: number;
  specificationGradeID: number;

  // Section 1: Definition
  parameterID: number;
  parameterName: string;
  parameterCode?: string;
  parameterSymbol?: string;
  parameterUnitID?: number;
  parameterUnitName?: string;
  parameterUnitSymbol?: string;
  inputType: string;
  textValue?: string;
  legacyType: string;

  // Section 2: Limits & Tolerances
  minValue?: number;
  maxValue?: number;
  lowerLimitValue?: string;
  upperLimitValue?: string;
  lowerLimitDecimalValue?: number;
  upperLimitDecimalValue?: number;
  minTolerance?: number;
  maxTolerance?: number;
  formattedLimits: string;

  // Section 3: Equations
  equation?: string;
  minEquation?: string;
  maxEquation?: string;
  hasEquations?: boolean;
  parameterFormula?: string;
  parameterFormulaDisplay?: string;
  parameterIsCalculated?: boolean;

  // Section 4: Applicability & Conditions
  productSizeMasterID?: number;
  productSizeName?: string;
  heatTreatmentID?: number;
  heatTreatmentName?: string;
  specimenOrientationID?: number;
  specimenOrientationName?: string;
  dimensionalFactorID?: number;
  productConditionID1?: number;
  productConditionID2?: number;
  conditions: RequirementDimensionCondition[];
  conditionsSummary: string;

  // Section 5: Test Method Applicability
  laboratoryTestID?: number;
  laboratoryTestName?: string;
  testMethods: RequirementTestMethodMapping[];
  testMethodsSummary: string;

  // Section 6: Instructions & Reporting
  testCondition?: string;
  testNote?: string;

  // Section 7: Status & Lock
  isLocked: boolean;
}

export interface SaveSpecificationRequirement {
  id: number;
  specificationVersionID: number;
  specificationGradeID: number;

  // Section 1: Definition
  parameterID: number;
  parameterUnitID?: number;
  parameterUnitEquivalentID?: number;
  inputType: string;
  textValue?: string;
  legacyType: string;

  // Section 2: Limits & Tolerances
  minValue?: number;
  maxValue?: number;
  lowerLimitValue?: string;
  upperLimitValue?: string;
  lowerLimitDecimalValue?: number;
  upperLimitDecimalValue?: number;
  minTolerance?: number;
  maxTolerance?: number;

  // Section 3: Equations
  equation?: string;
  minEquation?: string;
  maxEquation?: string;

  // Section 4: Applicability & Conditions
  productSizeMasterID?: number;
  heatTreatmentID?: number;
  specimenOrientationID?: number;
  dimensionalFactorID?: number;
  productConditionID1?: number;
  productConditionID2?: number;
  conditions: RequirementDimensionCondition[];

  // Section 5: Test Method Applicability
  laboratoryTestID?: number;
  testMethods: RequirementTestMethodMapping[];

  // Section 6: Instructions & Reporting
  testCondition?: string;
  testNote?: string;
}

export interface CopyVersionRequirementsPayload {
  sourceVersionID: number;
  targetVersionID: number;
  specificationGradeID?: number;
}
