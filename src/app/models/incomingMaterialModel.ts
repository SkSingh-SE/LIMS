// F-24: Incoming Material Inspection Record
export interface IncomingMaterialResult {
    id?: number;
    parameterName: string;
    requirement: string;
    referenceStandard: string;
    methodOfCheck: string;
    observation: string;
    frequency: string;
    acceptanceCriteria: string;
    result: 'Pass' | 'Fail' | 'NA';
}
export interface ItemsParameters {
    id?: number;
    batchNo: string;
    coaAvailable: string;
    expiryDate: Date | string;
    lotNo: string;
    invoiceNo: string;
    orderedQty: number;
    unit: number;
    receviceQty: number;
    materialCode: string;
    materialName: string;
    result: 'Pass' | 'Fail' | 'NA';
}

export interface IncomingMaterial {
    id?: number;
    formatNo: string; // F-24
    documentNo: string;
    issueNo: string;
    revNo: string;
    date: Date | string;

    // Material & Batch Info
    materialName: string;
    materialCode: string;
    supplierName: string;
    email: string;
    inspectionPlanNoName: string;
    phoneNo: string;
    batchNo: string;
    address: string;
    gstNo: string;
    orderType: string;
    lotNo?: string;
    quantity: number;
    unitOfMeasure: string;

    // Receipt Info
    invoiceNo: string;
    invoiceDate: Date | string;
    grnNo?: string;
    purchaseOrderNo?: string;
    indentNoPoNo?: string;

    // Inspection Results
    inspectionParameters: IncomingMaterialResult[];
    itemsParameters: ItemsParameters[];
    // Outcome
    inspectionResult: 'Accepted' | 'Rejected' | 'Conditional';
    deviations: string;
    correctiveActions: string;
    approvedBy: string;
    reviewedBy: string;
    productName: string;
    productCode: string;
    category: string;
    inspectionStage: string;
    riskLevel: string;
    generalRemarks: string;
    preparedBy: string;
    receivedBy: string;
    inspectionBy: string;

    inspectedBy: string;
    storageLocation: string;
    verifiedBy: string;

    isActive?: boolean;
}

export interface IncomingMaterialResponse {
    status: number;
    message: string;
    data: IncomingMaterial;
    success: boolean;
}

export interface IncomingMaterialListResponse {
    status: number;
    message: string;
    items: IncomingMaterial[];
    totalRecords: number;
    pageNumber: number;
    pageSize: number;
    success: boolean;
}
