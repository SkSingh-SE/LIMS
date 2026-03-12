export interface TestMethodEntry {
    srNo: number;
    specificationCode: string; // or Document Identification
    details: string; // or Title
    requirement?: string;
    latestIssueRev?: string;
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
    title: string; // e.g., "LIST OF TEST METHOD (CHEMICAL ANALYSIS)"

    entries: TestMethodEntry[];

    preparedBy: string;
    issuedBy: string;
    reviewedBy: string;

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
