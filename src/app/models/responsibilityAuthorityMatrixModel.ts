export interface ResponsibilityAuthorityMatrix {
    id: number;
    designationId: number;
    designationName?: string;
    formatNo: string; // Fixed F-4
    issueNo: string;
    date: string;
    revNo: string;

    // Responsibility List (HTML string for bullet points)
    responsibilities: string;

    // Authority List (HTML string for bullet points)
    authorities: string;

    // Acceptance & Approval
    employeeAccepted: boolean;
    acceptanceTimestamp?: string;
    employeeSignature?: string;

    preparedBy: string; // General Manager
    issuedBy: string;   // Quality Manager
    reviewedApprovedBy: string; // Managing Director

    // Audit fields
    createdBy?: string;
    createdOn?: string;
    modifiedBy?: string;
    modifiedOn?: string;
    isActive?: boolean;
}

export interface ResponsibilityAuthorityMatrixResponse {
    items: ResponsibilityAuthorityMatrix[];
    totalRecords: number;
    pageNumber: number;
    pageSize: number;
}
