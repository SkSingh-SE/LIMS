export interface QualityControlActivity {
    srNo: number;
    activityName: string;
    referenceType: string;
    frequencyType: string;
    resultStatus: string;
    referenceName: string;
    effectiveFrom: string;
    acceptanceCriteria: string;
    departmentID: number;
    employeeId: number;
    referenceId: number;
    testMethodId: number;
    remarks: string;
    departmentName: string;
    testMethod: string;
    employeeName: string;
}

export interface QualityControlPlan {
    id: number;
    formatNo: string;
    issueNo: string;
    revNo: string;
    date: string;
    effectiveFrom: string;
    effectiveTo: string;
    documentNo: string;

    // Header Info
    planYear: string;
    planNo: string;
    retentionPeriod: string;
    discipline: string;
    materialProductGroup: string;
    labIncharge: string;

    // Plan Entries
    activities: QualityControlActivity[];

    // Review & Signatures
    preparedBy: string;
    reviewedBy: string;
    approvedBy: string;
    status: string;
    createdOn?: string;
}

export interface QualityControlPlanListResponse {
    status: number;
    message: string;
    items: QualityControlPlan[];
    totalRecords: number;
    pageNumber: number;
    pageSize: number;
    success: boolean;
}

export interface QualityControlPlanResponse {
    status: number;
    message: string;
    data: QualityControlPlan;
    success: boolean;
}
