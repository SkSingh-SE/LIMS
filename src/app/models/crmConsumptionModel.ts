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
  materialName: string;
  materialCode: string;
  batchNo: string;
  currentStock: number;
  unitOfMeasure: string;

  // Consumption Tracking
  openingStock: number;
  received: number;
  consumed: number;
  wastage: number;
  closingStock: number;

  // Daily Consumption Records
  dailyConsumption: CrmDailyConsumption[];

  // Usage Details
  purposeOfUse: string;
  testMethods: string[];
  departments: string[];

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
  date: Date | string;
  openingBalance: number;
  quantityConsumed: number;
  quantityWasted: number;
  closingBalance: number;
  purpose: string;
  testMethod?: string;
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
