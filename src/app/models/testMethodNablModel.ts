export interface TestMethodEntry {
    srNo: number;
    methodCode: string;
    methodName: string;
    referenceStandard: string;
    specificationCode: string;
    revisionNo: string;
    effectiveDate: string | Date;
    status: string;
    isVerified: number;
    isValidated: number;

    requirement?: string;
    latestIssueRev?: string;
    monthYear?: string;
}
export interface OriginDocEntry {
    docId: string;
    description: string;
    docSource: string;
    docType: string;
    issue: string; 
    status: string;
    monthYear?: string;
}

export interface TestMethodNabl {
    id: number;
    formatNo: string;
    issueNo: string;
    revNo: string;
    date: string;
    documentNo: string;
    listType: 'Test Method' | 'External Document';
    testMethodTitle: string; // e.g., "LIST OF TEST METHOD (CHEMICAL ANALYSIS)"

    testMethod: TestMethodEntry[];
    docEntries: OriginDocEntry[];

    preparedBy: string;
    issuedBy: string;
    reviewedBy: string;
    approvedBy: string;

    status: string;
    createdOn?: string;
}

export interface TestMethodNablListResponse {
    status: number;
    message: string;
    items: TestMethodNabl[];
    totalRecords: number;
    pageNumber: number;
    pageSize: number;
    success: boolean;
}

export interface TestMethodNablResponse {
    status: number;
    message: string;
    data: TestMethodNabl;
    success: boolean;
}
