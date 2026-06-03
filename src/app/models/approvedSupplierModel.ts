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
    contactPerson: string;
    mobileNo: string;
    email: string;
    serviceProviderName: string;
    gstNo: string;
    address: string;


    // Registration/Approval Info
    registerNo?: string;
    approvalDate: Date | string;
    validUpTo?: Date | string;

    // Evaluation Info
    lastReviewDate?: Date | string;
    agreementDate?: Date | string;
    lastScore?: number;
    performanceRating?: 'A' | 'B' | 'C' | 'D';
    isPresentStatus: boolean;
    productApproved:boolean;

    // Status
    isBlacklisted: boolean;
    blacklistDate?: Date | string;
    blacklistReason?: string;
    remarks?: string;
    preparedBy: string; // General Manager
    reviewedBy?: string;
    approvedBy?: string;
    // Audit Fields
    createdBy?: string;
    createdOn?: Date | string;
    modifiedBy?: string;
    modifiedOn?: Date | string;
    isActive?: boolean;
    enlistmentDate: Date | string;
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
