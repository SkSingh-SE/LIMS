// F-8: Training Plan
export interface TrainingPlan {
  id?: number;
  formatNo: string; // F-8
  documentNo: string;
  issueNo: string;
  revNo: string;
  date: Date | string;
  issueDate: Date | string;
  revDate?: Date | string;
  PlannedDate: Date | string;
  planningYear: number;
  totalBudget?: number;
  approvalStatus: 'Draft' | 'Pending' | 'Approved' | 'Rejected';
  createdBy?: string;
  createdOn?: Date | string;
  modifiedBy?: string;
  modifiedOn?: Date | string;
  isActive?: boolean;
  preparedBy?: string;
  approvedBy?: string;
  preparedDate?: Date | string;
  approvedDate?: Date | string;
  reviewedBy?: string;
  reviewedDate?: Date | string;
  trainingTopic: string;
  provider?: string;
  duration: string; // in days
  targetAudience?: string;
  planMonth?: string;
  agency?: 'Internal' | 'External';
  completionRemarks?: string;
}

export interface TrainingPlanResponse {
  status: number;
  message: string;
  data: TrainingPlan;
  success: boolean;
}

export interface TrainingPlanListResponse {
  status: number;
  message: string;
  items: TrainingPlan[];
  totalRecords: number;
  pageNumber: number;
  pageSize: number;
  success: boolean;
}
