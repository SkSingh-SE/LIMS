export interface SampleInwardEntry {
    srNo: number;
    receiptDate: string;
    sampleDescription: string;
    quantity: string;
    customerName: string;
    testRequestRef: string; // F-27 Ref
    targetCompletionDate: string;
    remarks: string;
}

export interface SampleInwardRegisterNabl {
    id: number;
    formatNo: string;
    issueNo: string;
    revNo: string;
    date: string;
    documentNo: string;

    entries: SampleInwardEntry[];

    preparedBy: string;
    reviewedBy: string;

    status: string;
    createdOn?: string;
}

export interface SampleInwardRegisterNablListResponse {
    status: number;
    message: string;
    items: SampleInwardRegisterNabl[];
    totalRecords: number;
    pageNumber: number;
    pageSize: number;
    success: boolean;
}

export interface SampleInwardRegisterNablResponse {
    status: number;
    message: string;
    data: SampleInwardRegisterNabl;
    success: boolean;
}
