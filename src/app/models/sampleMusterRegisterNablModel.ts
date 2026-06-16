export interface SampleMusterEntry {
    srNo: number;
    sampleId: string;
    receiptDate: string;
    description: string;
    testParameters: string;
    analystName: string;
    analysisStartDate: string;
    analysisEndDate: string;
    status: 'In Progress' | 'Completed' | 'Pending';
    remarks: string;
}

export interface SampleMusterRegisterNabl {
    id: number;
    formatNo: string;
    issueNo: string;
    revNo: string;
    date: string;
    documentNo: string;

    entries: SampleMusterEntry[];

    preparedBy: string;
    reviewedBy: string;

    status: string;
    createdOn?: string;
}

export interface SampleMusterRegisterNablListResponse {
    status: number;
    message: string;
    items: SampleMusterRegisterNabl[];
    totalRecords: number;
    pageNumber: number;
    pageSize: number;
    success: boolean;
}

export interface SampleMusterRegisterNablResponse {
    status: number;
    message: string;
    data: SampleMusterRegisterNabl;
    success: boolean;
}
