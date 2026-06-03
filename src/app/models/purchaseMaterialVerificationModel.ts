// F-25: Purchase Material Verification Record
export interface PurchaseMaterialVerificationItem {
    id?: number;
    materialName: string;
    receviceQty: number;
    approvedQty: number;
    rejectedQty: number;
    orderedQty: number;
    verificationDetails: string;
    inspectionQtyStatus: string;
    verificationDone: string;
}

export interface PurchaseMaterialVerification {
    id?: number;
    formCode: string; // F-25
    documentNo: string;
    issueNo: string;
    revNo: string;
    date: Date | string;

    // Supplier info
    supplierName: string;
    invoiceNo: string;
    invoiceDate: Date | string;
    grnNo?: string;
    grnNumber?: string;
    email: string;
    phoneNo: string;
    gstNo: string;
    address: string;
    orderType: string;
    poDate: string;
    correctiveActions: string;
    deviations: string;
    poNo: string;
    inspectionBy: string;
    purchaseOrderNo: string;

    // Items
    itemsParameters: PurchaseMaterialVerificationItem[];

    // Overall verification
    overallStatus: 'Accepted' | 'Rejected' | 'Hold';
    remarks: string;

    verifiedBy: string;
    preparedBy: string;
    reviewedBy: string;
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
