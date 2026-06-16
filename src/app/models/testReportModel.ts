export interface TestResultItem {
    srNo: number;
    testParameter: string;
    testMethod: string;
    result: string;
    unit: string;
    requirement: string; // Specified limit / IS requirement
}

export interface TestReport {
    id: number;
    formatNo: string; // F-39
    issueNo: string;
    revNo: string;
    documentNo: string; // Report No / ULR No.
    dateOfIssue: string;

    // Customer Info
    customerName: string;
    customerAddress: string;
    customerReference: string; // PO No / Letter ref

    // Sample Info
    sampleDescription: string;
    sampleId: string; // Lab TRN / Ref No
    conditionOnReceipt: string;
    quantity: string;
    heatNoBatchNo: string;
    dateOfReceipt: string;
    dateOfTesting: string;
    environmentalConditions: string;

    // Test Results
    results: TestResultItem[];

    // Footer & Remarks
    remarks: string; // Can be rich text
    statementOfConformity: string;

    // Signatures
    preparedBy: string;
    reviewedBy: string;
    approvedBy: string; // Authorized Signatory
    status: string; // Draft / Approved / Issued
    createdOn?: string;
}

export interface TestReportListResponse {
    status: number;
    message: string;
    items: TestReport[];
    totalRecords: number;
    pageNumber: number;
    pageSize: number;
    success: boolean;
}

export interface TestReportResponse {
    status: number;
    message: string;
    data: TestReport;
    success: boolean;
}
