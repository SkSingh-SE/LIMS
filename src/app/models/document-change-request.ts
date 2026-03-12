export interface DocumentChangeRequest {
    id: number;
    date: string;
    documentTitle: string;
    documentNo: string;
    issueNo: string | number;
    revNo: string | number;
    changesRequired: string;
    justification: string;
    initiatedBy: string;
    approvedBy: string;
    actionTaken: string;

    // Header standard fields
    formatNo: string;
    docNo: string;
    headerIssueNo: string | number;
    headerIssueDate: string | Date;
    headerRevNo: string | number;
    headerRevDate: string | Date;
}
