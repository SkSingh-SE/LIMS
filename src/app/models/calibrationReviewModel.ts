// F-15: Review of Calibration Certificates
export interface CalibrationCertificate {
  id?: number;
  formatNo: string; // F-15
  documentNo: string;
  issueNo: string;
  revNo: string;
  date: Date | string;
  issueDate: Date | string;
  revDate?: Date | string;

  // Certificate Details
  certificateNo: string;
  calibrationDate: Date | string;
  nextCalibrationDate: Date | string;
  calibratingAgency: string;
  agencyAccreditationNo?: string;
  certificateValidFrom: Date | string;
  certificateValidTo: Date | string;

  // Equipment Details
  equipmentId: number;
  equipmentName: string;
  equipmentNo: string;
  equipmentIdentification: string;
  manufacturer: string;
  model: string;
  serialNo: string;

  // Calibration Details
  calibrationProcedure: string;
  environmentalConditions: string;
  referenceStandards: string[];
  calibrationPoints: CalibrationPoint[];
  uncertainty?: string;
  remarks?: string;

  // Review Details
  reviewDate: Date | string;
  reviewedBy: string;
  reviewStatus: 'approved' | 'rejected' | 'conditional-approval' | 'requires-clarification';
  reviewComments?: string;
  approvedBy?: string;
  approvalDate?: Date | string;

  // Audit Fields
  createdBy?: string;
  createdOn?: Date | string;
  modifiedBy?: string;
  modifiedOn?: Date | string;
  isActive?: boolean;
}

export interface CalibrationPoint {
  parameter: string;
  nominalValue: number;
  measuredValue: number;
  deviation: number;
  tolerance: number;
  passFail: 'pass' | 'fail';
  uncertainty?: number;
}

export interface CalibrationReviewResponse {
  status: number;
  message: string;
  data: CalibrationCertificate;
  success: boolean;
}

export interface CalibrationReviewListResponse {
  status: number;
  message: string;
  items: CalibrationCertificate[];
  totalRecords: number;
  pageNumber: number;
  pageSize: number;
  success: boolean;
}
