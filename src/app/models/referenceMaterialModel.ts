// F-17: Master List of CRM (Reference Material)
export interface ReferenceMaterial {
  id?: number;
  formatNo: string; // F-17
  documentNo: string;
  issueNo: string;
  revNo: string;
  date: Date | string;
  issueDate: Date | string;
  revDate?: Date | string;

  // Material Details
  rmName: string;
  rmCode: string;
  type: 'chemical' | 'physical' | 'biological' | 'instrumental';
  manufacturer: string;
  supplier: string;
  materialDescription: string;
  matrixType: string;
  batchNo: string;
  lotNo?: string;
  parameters: Parameters[];
  // Technical Specifications
  specifications: string;
  // Certification Details
  certificateOfAnalysis: boolean;
  certificateNo?: string;
  certifiedBy?: string;
  unitOfMeasure?: string;
  certificationDate?: Date | string;
  validityDate?: Date | string;
  traceability?: string;

  initialQuantity: number;
  availableQuantity: number;
  minimumQuantity: number;
  storageLocation: string;
  itemCode: string;
  itemId: string;
  itemName: string;
  preparedBy: string;
  reviewedBy: string;
  approvedBy: string;

  // Usage Details
  usageFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'as-needed';
  criticality: 'critical' | 'important' | 'normal';

  // Quality Control
  qualityCheckFrequency: string;
  lastQualityCheck?: Date | string;
  nextQualityCheck?: Date | string;

  // Audit Fields
  createdBy?: string;
  createdOn?: Date | string;
  modifiedBy?: string;
  modifiedOn?: Date | string;
  isActive?: boolean;
}
export interface Parameters {
  parameterName: string;
  certifiedValue: number;
  lowerLimit: number;
  upperLimit: number;
  unit: string;
  measurementUncertainty: number;
  remarks: string;

}
export interface ReferenceMaterialResponse {
  status: number;
  message: string;
  data: ReferenceMaterial;
  success: boolean;
}

export interface ReferenceMaterialListResponse {
  status: number;
  message: string;
  items: ReferenceMaterial[];
  totalRecords: number;
  pageNumber: number;
  pageSize: number;
  success: boolean;
}
