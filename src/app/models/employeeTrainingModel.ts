export interface TrainingEvaluationResult {
    observedValue1: number | string;
    observedValue2: number | string;
    averageValue: number | string;
    originalValue: number | string;
    remarks: string;
}

export interface EmployeeTrainingRecord {
    id: number;
    employeeId: number;
    employeeName: string;
    qualification: string;
    dateOfJoining: string;
    position: string;

    // On Job Training Section
    trainingDate: string;
    trainerName: string;
    sampleName: string;
    trainerDesignation: string;
    sampleRefNo: string;
    parameter: string;
    testMethod: string;

    // Training Evaluation Section
    evaluationDate: string;
    evaluationMode: string; // e.g., Re-Testing
    evalParameter: string;
    evalTestMethod: string;
    evaluationResult: TrainingEvaluationResult;
    trainerComments: string;

    evaluationDoneBy: string;
    evaluationDateBottom: string;
}

export interface EmployeeTrainingRecordResponse {
    items: EmployeeTrainingRecord[];
    totalRecords: number;
    pageNumber: number;
    pageSize: number;
}
