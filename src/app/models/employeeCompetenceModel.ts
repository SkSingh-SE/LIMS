export interface CompetenceEvaluationParameter {
    name: string;
    rating: 'Excellent' | 'Very Good' | 'Good' | 'Average' | 'Poor' | '';
}

export interface EmployeeCompetenceReport {
    id: number;
    employeeId: number;
    employeeName: string;
    designationName: string;
    evaluationPeriodFrom: string;
    evaluationPeriodTo: string;
    parameters: CompetenceEvaluationParameter[];
    overallRating: number;
    specificTrainingRequired: string;
    evaluationDoneBy: string;
    evaluationDate: string;
}

export interface EmployeeCompetenceReportResponse {
    items: EmployeeCompetenceReport[];
    totalRecords: number;
    pageNumber: number;
    pageSize: number;
}
