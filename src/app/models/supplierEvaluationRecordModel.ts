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
    evaluationDate: Date | string;

    // Evaluation
    criteria: SupplierEvaluationCriteria[];
    totalScore: number;
    maxPossibleScore: number;
    percentageScore: number;
    purchaseOrders?: PurchaseOrderSummary[];
    incomingPlan?: IncomingInspectionSummary[];
    // Conclusion
    recommendation: 'Approved' | 'Conditionally Approved' | 'Rejected';
    generalRemarks: string;

    evaluatedBy: string;
    preparedBy: string;
    reviewedBy: string;
    approvedBy: string;

    isActive?: boolean;
    toContinued?: boolean;
    toRemoved?: boolean;
    acceptableLimitMin?: number;
}
export interface PurchaseOrderSummary {
    poNo?: string;
    poDate?: string | Date;
    referenceIndentNo?: string;
    deliveryDate?: string | Date;
    supplierName?: string;
}

export interface IncomingInspectionSummary {
    purchaseOrderNo?: string;
    inspectionPlanNoName?: string;
    inspectionResult?: string;
    finalStatus?: string;
    supplierName?: string;
    date: string | Date;
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
