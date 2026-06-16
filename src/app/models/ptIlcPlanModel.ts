export interface PTILCYear {
    ptActivity: string;
    status: string;
    remarks: string;
}
export interface PTILCActivity {
    accreditedDiscipline: string;
    groupSubgroup: string;
    years: PTILCYear[];
}

export interface PtIlcPlan {
    id: number;
    formatNo: string;
    issueNo: string;
    revNo: string;
    date: string;
    periodStartDate: string;
    periodEndDate: string;
    documentNo: string;

    // Header Info
    laboratoryId: string;
    laboratoryName: string;
    fieldOfAccreditation: string;
    periodOfParticipation: string;

    // PT/ILC Entries
    activities: PTILCActivity[];

    // Notes
    note: string;

    // Signatories
    preparedBy: string;
    approvedBy: string;
    reviewedBy: string;
    issuedBy: string;
    reviewedApprovedBy: string;
    status: string;
    createdOn?: string;
}

export interface PtIlcPlanListResponse {
    status: number;
    message: string;
    items: PtIlcPlan[];
    totalRecords: number;
    pageNumber: number;
    pageSize: number;
    success: boolean;
}

export interface PtIlcPlanResponse {
    status: number;
    message: string;
    data: PtIlcPlan;
    success: boolean;
}
