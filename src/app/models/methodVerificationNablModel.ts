export interface VerificationParameter {
    parameter: string;
    acceptanceCriteria: string;
    observedValue: string;
    result: 'Pass' | 'Fail';
    remarks?: string;
}

export interface VerificationData {
    sampleId: string;
    reading1: number;
    reading2: number;
    reading3: number;
    mean: number;
    sd: number;
    rsd: number;
}

export interface MethodVerificationNabl {
    id: number;
    formatNo: string;
    issueNo: string;
    revNo: string;
    date: string;
    documentNo: string;

    testMethodName: string;
    referenceStandard: string;
    equipmentUsed: string;
    matrix: string;
    range: string;

    performanceParameters: VerificationParameter[];
    rawData: VerificationData[];

    conclusion: string; // e.g., "The method is verified as fit for purpose."

    preparedBy: string;
    reviewedBy: string;
    approvedBy: string;

    status: string;
    createdOn?: string;
}

export interface MethodVerificationNablListResponse {
    status: number;
    message: string;
    items: MethodVerificationNabl[];
    totalRecords: number;
    pageNumber: number;
    pageSize: number;
    success: boolean;
}

export interface MethodVerificationNablResponse {
    status: number;
    message: string;
    data: MethodVerificationNabl;
    success: boolean;
}
