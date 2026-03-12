// F-22: Purchase Order
export interface PurchaseOrderItem {
    id?: number;
    description: string;
    quantity: number;
    unitOfMeasure: string;
    unitPrice: number;
    totalAmount: number;
}

export interface PurchaseOrder {
    id?: number;
    formatNo: string; // F-22
    documentNo: string;
    issueNo: string;
    revNo: string;
    date: Date | string;

    // Supplier Info
    supplierId?: number;
    supplierName: string;
    supplierAddress: string;
    gstNo?: string;

    // Order Details
    indentNo?: string;
    poType: 'Regular' | 'Rate Contract' | 'Service';
    currency: string;

    // Items
    items: PurchaseOrderItem[];
    totalAmount: number;
    gstAmount: number;
    grandTotal: number;

    // Terms & Conditions
    termsAndConditions: string;
    deliveryDate: Date | string;
    paymentTerms: string;

    // Signatories
    preparedBy: string;
    authorizedBy: string;

    // Status
    status: 'Draft' | 'Sent' | 'Completed' | 'Cancelled';
    isActive?: boolean;
}

export interface PurchaseOrderResponse {
    status: number;
    message: string;
    data: PurchaseOrder;
    success: boolean;
}

export interface PurchaseOrderListResponse {
    status: number;
    message: string;
    items: PurchaseOrder[];
    totalRecords: number;
    pageNumber: number;
    pageSize: number;
    success: boolean;
}
