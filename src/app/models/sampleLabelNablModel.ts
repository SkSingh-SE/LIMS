export interface SampleLabelNabl {
    id: number;
    formatNo: string;
    issueNo: string;
    revNo: string;

    sampleId: string;
    receiptDate: string;
    description: string;
    quantity: string;
    testParameters: string;
    preparedBy: string;

    status: string;
    createdOn?: string;
}

export interface SampleLabelNablListResponse {
    status: number;
    message: string;
    items: SampleLabelNabl[];
    totalRecords: number;
    pageNumber: number;
    pageSize: number;
    success: boolean;
}

export interface SampleLabelNablResponse {
    status: number;
    message: string;
    data: SampleLabelNabl;
    success: boolean;
}
