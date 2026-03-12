// F-25: Purchase Material Verification Record
export interface PurchaseMaterialVerificationItem {
    id?: number;
    materialName: string;
    poNumber: string;
    verifiedQuantity: number;
    observation: string;
    verificationStatus: 'Pass' | 'Fail' | 'Conditional';
}

export interface PurchaseMaterialVerification {
    id?: number;
    formatNo: string; // F-25
    documentNo: string;
    issueNo: string;
    revNo: string;
    date: Date | string;

    // Supplier info
    supplierName: string;
    invoiceNo: string;
    invoiceDate: Date | string;
    grnNo?: string;

    // Items
    items: PurchaseMaterialVerificationItem[];

    // Overall verification
    overallStatus: 'Accepted' | 'Rejected' | 'Hold';
    remarks: string;

    verifiedBy: string;
    approvedBy: string;

    isActive?: boolean;
}

export interface PurchaseMaterialVerificationResponse {
    status: number;
    message: string;
    data: PurchaseMaterialVerification;
    success: boolean;
}

export interface PurchaseMaterialVerificationListResponse {
    status: number;
    message: string;
    items: PurchaseMaterialVerification[];
    totalRecords: number;
    pageNumber: number;
    pageSize: number;
    success: boolean;
}
