// F-8: Training Plan
export interface TrainingCourse {
  id?: number;
  courseCode: string;
  courseName: string;
  provider?: string;
  duration: number; // in days
  targetAudience?: string;
  objectives?: string;
  tentativeMonth?: string;
  agency?: 'Internal' | 'External';
  remarks?: string;
  isActive?: boolean;
}

export interface TrainingPlan {
  id?: number;
  formatNo: string; // F-8
  documentNo: string;
  issueNo: string;
  revNo: string;
  date: Date | string;
  issueDate: Date | string;
  revDate?: Date | string;
  planDate: Date | string;
  planningYear: number;
  courses: TrainingCourse[];
  totalBudget?: number;
  approvalStatus: 'Draft' | 'Pending' | 'Approved' | 'Rejected';
  createdBy?: string;
  createdOn?: Date | string;
  modifiedBy?: string;
  modifiedOn?: Date | string;
  isActive?: boolean;
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
