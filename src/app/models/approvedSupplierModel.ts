// F-20: Approved List of Suppliers
export interface ApprovedSupplier {
    id?: number;
    formatNo: string; // F-20
    documentNo: string;
    issueNo: string;
    revNo: string;
    date: Date | string;

    // Supplier Details
    supplierName: string;
    contactDetails: string; // Contact person + No
    productsServicesSupplied: string;

    // Registration/Approval Info
    registrationNo?: string;
    approvalDate: Date | string;
    validUpTo?: Date | string;

    // Evaluation Info
    lastEvaluationDate?: Date | string;
    lastScore?: number;
    performanceGrade?: 'A' | 'B' | 'C' | 'D';

    // Status
    isBlacklisted: boolean;
    remarks?: string;

    // Audit Fields
    createdBy?: string;
    createdOn?: Date | string;
    modifiedBy?: string;
    modifiedOn?: Date | string;
    isActive?: boolean;
}

export interface ApprovedSupplierResponse {
    status: number;
    message: string;
    data: ApprovedSupplier;
    success: boolean;
}

export interface ApprovedSupplierListResponse {
    status: number;
    message: string;
    items: ApprovedSupplier[];
    totalRecords: number;
    pageNumber: number;
    pageSize: number;
    success: boolean;
}
