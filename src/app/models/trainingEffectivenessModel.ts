// F-10: Training Effectiveness Records
export interface TrainingEffectivenessAssessment {
  id?: number;
  assessmentType: 'Pre-Training' | 'Post-Training'; // Pre or Post
  parameter: string;
  score: number; // 1-10 scale
  remark?: string;
}

export interface TrainingEffectiveness {
  id?: number;
  formatNo: string; // F-10
  documentNo: string;
  issueNo: number;
  revNo: number;
  issueDate: Date | string;
  revDate?: Date | string;
  trainingCode: string;
  trainingName: string;
  trainingDate?: Date | string;
  participants: number;
  preTrainingAssessments: TrainingEffectivenessAssessment[];
  postTrainingAssessments: TrainingEffectivenessAssessment[];
  overallEffectivenessRating: number; // 1-10 scale
  recommendations?: string;
  evaluatedBy?: string;
  createdBy?: string;
  createdOn?: Date | string;
  modifiedBy?: string;
  modifiedOn?: Date | string;
  isActive?: boolean;
}

export interface TrainingEffectivenessResponse {
  status: number;
  message: string;
  data: TrainingEffectiveness;
  success: boolean;
}

export interface TrainingEffectivenessListResponse {
  status: number;
  message: string;
  items: TrainingEffectiveness[];
  totalRecords: number;
  pageNumber: number;
  pageSize: number;
  success: boolean;
}
