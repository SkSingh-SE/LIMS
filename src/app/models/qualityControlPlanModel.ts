export interface QualityControlActivity {
    srNo: number;
    activityName: string;
    plannedFrequency: string;
    targetCriteria: string;
    plannedDate: string;
    actualDate: string;
    resultStatus: string;
    remarks: string;
}

export interface QualityControlPlan {
    id: number;
    formatNo: string;
    issueNo: string;
    revNo: string;
    date: string;
    documentNo: string;

    // Header Info
    planYear: string;
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
