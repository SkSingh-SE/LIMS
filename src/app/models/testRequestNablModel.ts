export interface TestRequestNabl {
    id: number;
    formCode: string;
    issueNo: string;
    revNo: string;
    date: Date | string;
    documentNo: string; // Case No / TRN

    // Customer Info
    customerName: string;
    address: string;
    contactPerson: string;
    contactPhone: string;
    contactEmail: string;
    gstNo: string;

    // Sample Details (Simplified for NABL audit)
    samples: {
        sampleNo: string;
        description: string;
        quantity: number;
        testToPerform: string;
        metalClassification?: string;
        materialSpecification?: string;
    }[];

    // Request Details
    urgent: boolean;
    confirmityRequired: boolean;
    returnSample: boolean;
    holdTesting: boolean;
    poNumber?: string;

    // Dispatch & Billing
    billRequired: boolean;
    advancePIRequired: boolean;
    dispatchModes: string[];
    note: string;
    // Receipt Notes
    remarks: string;

    // Signatories
    preparedBy: string;
    reviewedBy: string;

    status: string;
    createdOn?: string;
}

export interface TestRequestNablListResponse {
    status: number;
    message: string;
    items: TestRequestNabl[];
    totalRecords: number;
    pageNumber: number;
    pageSize: number;
    success: boolean;
}

export interface TestRequestNablResponse {
    status: number;
    message: string;
    data: TestRequestNabl;
    success: boolean;
}
