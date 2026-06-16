// F-23: Product & Service Inspection Plan
export interface InspectionParameter {
    id?: number;
    parameterName: string;
    requirement: string;
    referenceStandard: string;
    methodOfCheck: string;
    frequency: string;
    acceptanceCriteria: string;
}

export interface ProductInspection {
    id?: number;
    formatNo: string; // F-23
    documentNo: string;
    issueNo: string;
    revNo: string;
    date: Date | string;

    productName: string;
    productCode: string;
    category: string; // Product / Service

    // Inspection Details
    inspectionStage: string; // Incoming / In-process / Final
    parameters: InspectionParameter[];

    remarks: string;
    preparedBy: string;
    reviewedBy: string;
    approvedBy: string;
    planNo: string;
    risklevel: string;

    status: 'Pending' | 'Approved' | 'Revised';
    isActive?: boolean;
}

export interface ProductInspectionResponse {
    status: number;
    message: string;
    data: ProductInspection;
    success: boolean;
}

export interface ProductInspectionListResponse {
    status: number;
    message: string;
    items: ProductInspection[];
    totalRecords: number;
    pageNumber: number;
    pageSize: number;
    success: boolean;
}
