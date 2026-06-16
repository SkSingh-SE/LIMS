// F-21: Purchase Indent / Purchase Request
export interface PurchaseIndentItem {
    id?: number;
    description: string;
    quantity: number;
    unitOfMeasure: string;
    purpose: string;
    estimatedCost?: number;
}

export interface PurchaseIndent {
    id?: number;
    formatNo: string; // F-21
    documentNo: string;
    issueNo: string;
    revNo: string;
    date: Date | string;
    SupplierId?: number;
    // Indent Details
    departmentName: string;
    indentorName: string;
    priority: 'Low' | 'Medium' | 'High' | 'Urgent';
    technicalSpecification: string;
    justification: string;
    quantity: number;
    // Items List

    // Approval Status
    status: 'Draft' | 'Pending' | 'Approved' | 'Rejected';
    remarks?: string;
    expectedDate: Date | string;
    // Signatories
    preparedBy: string;
    piNo: string;
    unitOfMeasure: string;
    reviewedBy?: string;
    approvedBy?: string;

    // Audit Fields
    createdBy?: string;
    createdOn?: Date | string;
    isActive?: boolean;
}

export interface PurchaseIndentResponse {
    status: number;
    message: string;
    data: PurchaseIndent;
    success: boolean;
}

export interface PurchaseIndentListResponse {
    status: number;
    message: string;
    items: PurchaseIndent[];
    totalRecords: number;
    pageNumber: number;
    pageSize: number;
    success: boolean;
}
