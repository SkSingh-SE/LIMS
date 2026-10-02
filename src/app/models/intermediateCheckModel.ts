// F-16: Intermediate Check Records
export interface IntermediateCheckRecord {
  id?: number;
  formatNo: string; // F-16
  documentNo: string;
  issueNo: string;
  revNo: string;
  date: Date | string;
  nextCalibrationDueDate: Date | string;
  lastCalibrationDate: Date | string;
  issueDate: Date | string;
  revDate?: Date | string;

  // Check Period
  checkMonth: number; // 1-12
  checkYear: number;
  location: string; // Lab location/room

  // Equipment Details
  equipmentId: number;
  equipmentName: string;
  equipmentNo: string;

  // Daily Check Records (28-31 days depending on month)
  intermediateCheckLogs: IntermediateCheckDailyRecord[];
  totalChecksPerformed: number;

  // Summary
  deviationsObserved?: string;
  correctiveActions?: string;
  nextCalibrationDue: Date | string;

  // Personnel
  checkedBy: string;
  verifiedBy?: string;

  // Audit Fields
  createdBy?: string;
  createdOn?: Date | string;
  modifiedBy?: string;
  modifiedOn?: Date | string;
  isActive?: boolean;
}

export interface IntermediateCheckDailyRecord {
  checkDate: Date | string;
  checkType: string;
  referenceStandard: string;
  referenceValue?: number;
  observedValue?: number;
  acceptanceCriteria: number;
  auditeeId?: number;
  result?: string;
  auditeeName?: string;
}

export interface IntermediateCheckResponse {
  status: number;
  message: string;
  data: IntermediateCheckRecord;
  success: boolean;
}

export interface IntermediateCheckListResponse {
  status: number;
  message: string;
  items: IntermediateCheckRecord[];
  totalRecords: number;
  pageNumber: number;
  pageSize: number;
  success: boolean;
}
