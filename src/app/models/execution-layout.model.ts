export interface ExecutionLayoutItemDto {
  id: number;
  executionLayoutSectionID?: number;
  referenceType: string;
  referenceID?: number | null;
  displayLabel?: string | null;
  displayOrder: number;
  isVisible: boolean;
  isEditable: boolean;
  isRequired: boolean;
  isActive?: boolean;
  referenceName?: string | null;
  referenceCode?: string | null;
  referenceIsActive?: boolean;
  customLabel?: string | null;
  parameterName?: string | null;
  instructions?: string | null;
}

export interface ExecutionLayoutSectionDto {
  id: number;
  executionLayoutID?: number;
  sectionCode: string;
  sectionName: string;
  sectionType: string;
  displayOrder: number;
  isVisible: boolean;
  isCollapsible: boolean;
  isRequired: boolean;
  isActive?: boolean;
  presentationStyle?: string;
  sectionTypeDisplayName?: string;
  instructions?: string | null;
  items: ExecutionLayoutItemDto[];
}

export interface ExecutionLayoutDto {
  id: number;
  code: string;
  name: string;
  layoutName?: string | null;
  description?: string | null;
  rendererType?: string | null;
  displayOrder: number;
  isActive: boolean;
  companyCode?: string;
  createdByName?: string | null;
  createdOn?: string;
  modifiedByName?: string | null;
  modifiedOn?: string | null;
  sections: ExecutionLayoutSectionDto[];
}

export interface ExecutionLayoutListItemDto {
  id: number;
  code: string;
  name: string;
  rendererType?: string | null;
  sectionsCount: number;
  isActive: boolean;
  modifiedByName?: string | null;
  modifiedOn?: string | null;
  isValid: boolean;
  validationErrors: string[];
}

export interface ExecutionLayoutListResponse {
  items: ExecutionLayoutListItemDto[];
  totalRecords: number;
  pageNumber: number;
  pageSize: number;
}

export interface SectionTypeMetaDto {
  sectionType: string;
  displayName: string;
  description: string;
  defaultPresentationStyle: string;
  allowedReferenceTypes: string[];
}

export interface PresentationStyleMetaDto {
  style: string;
  displayName: string;
  description: string;
}

export interface ExecutionLayoutMetadataDto {
  sectionTypes: SectionTypeMetaDto[];
  presentationStyles: PresentationStyleMetaDto[];
  allowedRendererTypes: string[];
}
