export interface ConditionMasterDto {
  id: number;
  code: string;
  name: string;
  category: string;
  valueType: string;
  parameterUnitID?: number | null;
  parameterUnitName?: string | null;
  parameterUnitSymbol?: string | null;
  allowedOperators: string[];
  allowedValues?: string[] | null;
  allowedValuesJson?: string | null;
  defaultValue?: string | null;
  description?: string | null;
  displayOrder: number;
  isActive: boolean;
  createdBy: number;
  createdOn: string;
  modifiedBy?: number | null;
  modifiedOn?: string | null;
  companyCode: string;
  referenceCount: number;
}

export interface ConditionMasterCreateDto {
  code: string;
  name: string;
  category: string;
  valueType: string;
  parameterUnitID?: number | null;
  allowedOperators: string[];
  allowedValues?: string[] | null;
  defaultValue?: string | null;
  description?: string | null;
  displayOrder: number;
  isActive: boolean;
}

export interface ConditionMasterUpdateDto {
  id: number;
  code: string;
  name: string;
  category: string;
  valueType: string;
  parameterUnitID?: number | null;
  allowedOperators: string[];
  allowedValues?: string[] | null;
  defaultValue?: string | null;
  description?: string | null;
  displayOrder: number;
  isActive: boolean;
}

export interface ConditionMasterDropdownDto {
  id: number;
  code: string;
  name: string;
  category: string;
  valueType: string;
  parameterUnitID?: number | null;
  unitSymbol?: string | null;
  allowedOperators: string[];
  allowedValues?: string[] | null;
  defaultValue?: string | null;
  isActive: boolean;
}
