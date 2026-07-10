export interface InitialTestingLogs {
    srNo: number;
    dateOfTesting: string;
    sampleId: string;
    resultPrefix: string;
    resultValue: number;
    initialEmployeeId: number;
    initialEmployeeName: string;
    initialEmployeeSelected: string;
    initialRemarks: string; // Satisfactory / Not Satisfactory
}
export interface RetestingLogs {
    srNo: number;
    qcMonth: string;
    dateOfRetesting: string;
    sampleId: string;
    previousPrefix: string;
    previousValue: number;
    retestPrefix: string;
    retestValue: number;
    difference: number;
    acceptableLimit: number;
    deviation: string;
    resultStatus: string; // Satisfactory / Not Satisfactory
    testedById: number; // Satisfactory / Not Satisfactory
    testedByName: string; // Satisfactory / Not Satisfactory
    remarks: string; // Satisfactory / Not Satisfactory
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
    retestingLogs: RetestingLogs[];
    initialTestingLogs:InitialTestingLogs[];

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
