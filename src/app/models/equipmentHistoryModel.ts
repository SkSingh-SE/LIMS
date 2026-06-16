// F-14: Equipment History Card
export interface EquipmentHistoryRecord {
  id?: number;
  formatNo: string;
  issueNo: string;
  revNo: string;
  date: Date | string;
  equipmentId: number;
  equipmentName: string;
  equipmentNo: string;
  recordType: 'calibration' | 'maintenance' | 'repair' | 'modification' | 'verification';
  recordDate: Date | string;
  performedBy: string;
  agency?: string; // For calibration
  certificateNo?: string; // For calibration
  nextDueDate?: Date | string; // For calibration/maintenance
  description: string;
  observations?: string;
  actionsTaken?: string;
  cost?: number;
  status: 'completed' | 'pending' | 'in-progress';
  documents?: string[]; // File paths or URLs
  createdBy?: string;
  createdOn?: Date | string;
  modifiedBy?: string;
  modifiedOn?: Date | string;
  isActive?: boolean;
}

export interface EquipmentHistoryResponse {
  status: number;
  message: string;
  data: EquipmentHistoryRecord;
  success: boolean;
}

export interface EquipmentHistoryListResponse {
  status: number;
  message: string;
  items: EquipmentHistoryRecord[];
  totalRecords: number;
  pageNumber: number;
  pageSize: number;
  success: boolean;
}
