// F-2: Supplier Confidentiality Agreement
export interface SupplierConfidentiality {
    id?: number;
    formatNo: string; // F-2
    documentNo?: string;
    issueNo: string;
    revNo: string;
    date: Date | string;

    supplierId: number;
    supplierName: string;
    contactPerson: string;
    address: string;

    agreementDate: Date | string;
    validUntil: Date | string;

    // Review & Approval
    reviewedBy: string;
    reviewedDate: Date | string;
    approvedBy: string;
    approvalDate: Date | string;

    status: 'active' | 'expired' | 'terminated';
    remarks?: string;

    // Audit Fields
    createdBy?: string;
    createdOn?: Date | string;
    modifiedBy?: string;
    modifiedOn?: Date | string;
    isActive?: boolean;
}

export interface SupplierConfidentialityResponse {
    status: number;
    message: string;
    data: SupplierConfidentiality;
    success: boolean;
}

export interface SupplierConfidentialityListResponse {
    status: number;
    message: string;
    items: SupplierConfidentiality[];
    totalRecords: number;
    pageNumber: number;
    pageSize: number;
    success: boolean;
}
