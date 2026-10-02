// F-12: Environment Condition & Humidity Record
export interface EnvironmentDailyRecord {
  date: Date | string;
  temperature: number; // in Celsius
  humidity: number; // percentage
  pressure?: number;
  airQuality?: string;
  remarks?: string;
}

export interface EnvironmentMonitoring {
  id?: number;
  FormCode: string; // F-12
  documentNo: string;
  issueNo: string;
  revNo: string;
  date: Date | string;
  issueDate: Date | string;
  revDate?: Date | string;
  monitoringMonth: number; // 1-12
  monitoringYear: number;
  location: string; // Lab location/room
  minTempLimit?: number;
  maxTempLimit?: number;
  minHumidityLimit?: number;
  maxHumidityLimit?: number;
  dailyRecords: EnvironmentDailyRecord[]; // 28-31 days depending on month
  totalRecordssTaken?: number;
  deviationsObserved?: string;
  correctionsTaken?: string;
  recordedBy?: string;
  createdBy?: string;
  createdOn?: Date | string;
  modifiedBy?: string;
  modifiedOn?: Date | string;
  isActive?: boolean;
  roomName: string; // For display purposes
  labRoomId?: number; // For storing the selected room's ID
  preparedBy: string;
  preparedDate: Date | string;
  reviewedBy?: string;
  reviewedDate?: Date | string;
  approvedBy?: string;
  approvedDate?: Date | string;

}

export interface EnvironmentMonitoringResponse {
  status: number;
  message: string;
  data: EnvironmentMonitoring;
  success: boolean;
}

export interface EnvironmentMonitoringListResponse {
  status: number;
  message: string;
  items: EnvironmentMonitoring[];
  totalRecords: number;
  pageNumber: number;
  pageSize: number;
  success: boolean;
}
