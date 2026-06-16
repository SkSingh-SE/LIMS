export interface CompetenceEvaluationParameter {
    name: string;
    rating: 'Excellent' | 'Very Good' | 'Good' | 'Average' | 'Poor' | '';
}

export interface EmployeeCompetenceReport {
    id: number;
    employeeId: number;
    employeeName: string;
    documentNo: string;
    designationName: string;
    evaluationPeriodFrom: string | Date;
    evaluationPeriodTo: string | Date;
    parameters: CompetenceEvaluationParameter[];
    overallRating: number;
    specificTrainingRequired: string;
    evaluationDoneBy: string;
    evaluationDate: string | Date;
    preparedBy: string;
    reviewedBy: string;
    approvedBy: string;
}

export interface EmployeeCompetenceReportResponse {
    items: EmployeeCompetenceReport[];
    totalRecords: number;
    pageNumber: number;
    pageSize: number;
}
