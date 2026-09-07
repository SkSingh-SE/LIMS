export interface LaboratoryTestListDto {
  id: number;
  code: string;
  name: string;
  disciplineID?: number | null;
  disciplineName?: string | null;
  labDepartmentID?: number | null;
  departmentName?: string | null;
  testDuration?: number | null;
  description?: string | null;
  isActive: boolean;
  parameterCount: number;
  methodCount: number;
  conditionCount: number;
  companyCode: string;
  createdOn: string;
}

export interface LaboratoryTestParameterItemDto {
  id: number;
  laboratoryTestID: number;
  parameterID: number;
  parameterCode: string;
  parameterName: string;
  parameterUnit?: string | null;
  inputType?: string | null;
  isMandatory: boolean;
  isReportable: boolean;
  displayOrder: number;
  isActive: boolean;
}

export interface LaboratoryTestMethodItemDto {
  id: number;
  laboratoryTestID: number;
  testMethodSpecificationID: number;
  methodCode: string;
  methodName?: string;
  displayTitle: string;
  standardReference?: string | null;
  analysisTechniqueName?: string | null;
  isDefault: boolean;
  displayOrder: number;
  isActive: boolean;
}

export interface LaboratoryTestConditionItemDto {
  id: number;
  laboratoryTestID: number;
  conditionMasterID: number;
  conditionCode: string;
  conditionName: string;
  category: string;
  valueType: string;
  parameterUnit?: string | null;
  isMandatory: boolean;
  displayOrder: number;
  isActive: boolean;
}

export interface LaboratoryTestDetailDto {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  disciplineID?: number | null;
  disciplineName?: string | null;
  labDepartmentID?: number | null;
  departmentName?: string | null;
  testDuration?: number | null;
  equation?: string | null;
  isChemicalTest: boolean;
  isMechanical: boolean;
  isActive: boolean;
  companyCode: string;
  createdBy: number;
  createdByName?: string | null;
  createdOn: string;
  modifiedBy?: number | null;
  modifiedByName?: string | null;
  modifiedOn?: string | null;

  parameters: LaboratoryTestParameterItemDto[];
  methods: LaboratoryTestMethodItemDto[];
  conditions: LaboratoryTestConditionItemDto[];
}

export interface LaboratoryTestCreateDto {
  code: string;
  name: string;
  description?: string | null;
  disciplineID?: number | null;
  labDepartmentID?: number | null;
  testDuration?: number | null;
  isActive: boolean;

  parameters: LaboratoryTestParameterItemDto[];
  methods: LaboratoryTestMethodItemDto[];
  conditions: LaboratoryTestConditionItemDto[];
}

export interface LaboratoryTestUpdateDto {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  disciplineID?: number | null;
  labDepartmentID?: number | null;
  testDuration?: number | null;
  isActive: boolean;

  parameters: LaboratoryTestParameterItemDto[];
  methods: LaboratoryTestMethodItemDto[];
  conditions: LaboratoryTestConditionItemDto[];
}

export interface LaboratoryTestDropdownDto {
  id: number;
  code: string;
  name: string;
  disciplineID?: number | null;
  disciplineName?: string | null;
}
