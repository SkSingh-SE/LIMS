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
  materialName: string;
  materialCode: string;
  category: string;
  type: 'chemical' | 'physical' | 'biological' | 'instrumental';
  grade: string;
  manufacturer: string;
  manufacturerCode?: string;
  batchNo: string;
  lotNo?: string;

  // Technical Specifications
  specifications: string;
  purity?: number; // percentage
  concentration?: string;
  physicalState: 'solid' | 'liquid' | 'gas';
  storageConditions: string;
  shelfLife: number; // in months
  expiryDate: Date | string;

  // Certification Details
  certificateOfAnalysis: boolean;
  certificateNo?: string;
  certifiedBy?: string;
  certificationDate?: Date | string;
  traceability?: string;

  // Inventory Details
  currentStock: number;
  unitOfMeasure: string;
  minimumStock: number;
  maximumStock: number;
  reorderLevel: number;
  storageLocation: string;

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
