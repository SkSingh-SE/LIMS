// F-18: CRM Consumption Record
export interface CrmConsumptionRecord {
  id?: number;
  formatNo: string; // F-18
  documentNo: string;
  issueNo: string;
  revNo: string;
  date: Date | string;
  issueDate: Date | string;
  revDate?: Date | string;

  // Consumption Period
  consumptionMonth: number; // 1-12
  consumptionYear: number;

  // Reference Material Details
  referenceMaterialId: number;
  rmName: string;
  type: string;
  rmCode: string;
  materialClassification: string;
  certificateNo: string;
  validityDate: string | Date;
  batchNo: string;
  currentStock: number;
  unitOfMeasure: string;

  // Consumption Tracking
  openingQuantity: number;
  totalConsumed: number;
  remainingQuantity: number;
  availableQuantity: number;

  // Daily Consumption Records
  dailyConsumption: CrmDailyConsumption[];

  // Usage Details
  notes: string;
  // Summary
  totalConsumption: number;
  averageDailyConsumption: number;
  consumptionTrend: 'increasing' | 'decreasing' | 'stable';
  remarks?: string;

  // Personnel
  recordedBy: string;
  verifiedBy?: string;

  // Audit Fields
  createdBy?: string;
  createdOn?: Date | string;
  modifiedBy?: string;
  modifiedOn?: Date | string;
  isActive?: boolean;
}

export interface CrmDailyConsumption {
  consumptionDate: Date | string;
  purpose: string;
  quantityConsumed: number;
  equipmentOrTest: string;
  usedBy: string;
  performedBy: string;
  remarks?: string;
}

export interface CrmConsumptionResponse {
  status: number;
  message: string;
  data: CrmConsumptionRecord;
  success: boolean;
}

export interface CrmConsumptionListResponse {
  status: number;
  message: string;
  items: CrmConsumptionRecord[];
  totalRecords: number;
  pageNumber: number;
  pageSize: number;
  success: boolean;
}
