// F-26: Supplier Evaluation Record
export interface SupplierEvaluationCriteria {
    id?: number;
    parameter: string;
    maxScore: number;
    scoreObtained: number;
    remarks: string;
}

export interface SupplierEvaluationRecord {
    id?: number;
    formatNo: string; // F-26
    documentNo: string;
    issueNo: string;
    revNo: string;
    date: Date | string;

    // Supplier info
    supplierName: string;
    contactPerson: string;
    materialsSupplied: string;
    evaluatingPeriodFrom: Date | string;
    evaluatingPeriodTo: Date | string;

    // Evaluation
    criteria: SupplierEvaluationCriteria[];
    totalScore: number;
    maxPossibleScore: number;
    percentageScore: number;

    // Conclusion
    recommendation: 'Approved' | 'Conditionally Approved' | 'Rejected';
    generalRemarks: string;

    evaluatedBy: string;
    approvedBy: string;

    isActive?: boolean;
}

export interface SupplierEvaluationRecordResponse {
    status: number;
    message: string;
    data: SupplierEvaluationRecord;
    success: boolean;
}

export interface SupplierEvaluationRecordListResponse {
    status: number;
    message: string;
    items: SupplierEvaluationRecord[];
    totalRecords: number;
    pageNumber: number;
    pageSize: number;
    success: boolean;
}
