export interface RetestParameter {
    srNo: number;
    parameterTested: string;
    originalResult: string;
    retestResult: string;
    acceptableLimits: string;
    deviation: string;
    status: string; // Satisfactory / Not Satisfactory
}

export interface RetestingOfRetainedSample {
    id: number;
    formatNo: string;
    issueNo: string;
    revNo: string;
    date: string;
    documentNo: string;

    // Header Info
    discipline: string;
    groupSubgroup: string;
    sampleName: string;
    originalSampleId: string; // Original TRN / Sample ID
    dateOfOriginalTesting: string;
    dateOfRetesting: string;

    // Retest Parameters
    parameters: RetestParameter[];

    // Review & Signatures
    remarks: string;
    analyst: string;
    authorizedSignatory: string;
    status: string;
    createdOn?: string;
}

export interface RetestingOfRetainedSampleListResponse {
    status: number;
    message: string;
    items: RetestingOfRetainedSample[];
    totalRecords: number;
    pageNumber: number;
    pageSize: number;
    success: boolean;
}

export interface RetestingOfRetainedSampleResponse {
    status: number;
    message: string;
    data: RetestingOfRetainedSample;
    success: boolean;
}
