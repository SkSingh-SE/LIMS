// F-24: Incoming Material Inspection Record
export interface IncomingMaterialResult {
    id?: number;
    parameterName: string;
    requirement: string;
    observation: string;
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
    batchNo: string;
    lotNo?: string;
    quantityReceived: number;
    unitOfMeasure: string;

    // Receipt Info
    invoiceNo: string;
    invoiceDate: Date | string;
    grnNo?: string;

    // Inspection Results
    results: IncomingMaterialResult[];

    // Outcome
    inspectionStatus: 'Accepted' | 'Rejected' | 'Conditional';
    deviations: string;
    correctiveActions: string;

    inspectedBy: string;
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
