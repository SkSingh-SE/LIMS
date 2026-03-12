export interface PtIlcPlanEntry {
    srNo: number;
    accreditedDiscipline: string;
    groupSubgroup: string;
    ptActivityYear1: string;
    ptActivityYear2: string;
    statusYear1: string;
    statusYear2: string;
    remarksYear1: string;
    remarksYear2: string;
}

export interface PtIlcPlan {
    id: number;
    formatNo: string;
    issueNo: string;
    revNo: string;
    date: string;
    documentNo: string;

    // Header Info
    laboratoryId: string;
    laboratoryName: string;
    fieldOfAccreditation: string;
    periodOfParticipation: string;

    // PT/ILC Entries
    entries: PtIlcPlanEntry[];

    // Notes
    notes: string;

    // Signatories
    preparedBy: string;
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
