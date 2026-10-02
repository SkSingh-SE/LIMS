export interface InductionTrainingRecord {
    id: number;
    formatNo: string;
    issueNo: string;
    revNo: string;
    date: Date | string;
    employeeName: string;
    qualification: string;
    dateOfJoining: string | Date;
    position: string;

    // On Job Training
    trainingDate: string | Date;
    trainerName: string;
    trainerDesignation: string;
    sampleName: string;
    sampleRefNo: string;
    parameter: string;
    testMethodSop: string;

    // Training Evaluation
    evaluationDate: string | Date;
    evaluationMode: string; // 'Retesting' or 'Replicate testing'
    evalParameter: string;
    evalTestMethodSop: string;

    observedValue1: number | string;
    observedValue2: number | string;
    observedValueAverage: number | string;
    originalValue: number | string;
    remarks: string;
    performanceLevel: string;

    trainerComments: string;
    preparedBy: string;
    reviewedBy: string;
    approvedBy: string;
}

export interface InductionTrainingResponse {
    items: InductionTrainingRecord[];
    totalRecords: number;
    pageNumber: number;
    pageSize: number;
}
