export interface RawDataReading {
    srNo: number;
    sampleId: string;
    parameter: string;
    unit: string;
    reading1: number | null;
    reading2: number | null;
    reading3: number | null;
    mean: number | null;
    sd: number | null;
    rsd: number | null;
    remarks: string;
}

export interface TechnicalRawDataNabl {
    id: number;
    formatNo: string;
    issueNo: string;
    revNo: string;
    date: string;

    testMethodName: string;
    testMethodRef: string;
    equipmentUsed: string;
    sampleDescription: string;
    analystName: string;

    readings: RawDataReading[];

    conclusion: string;
    preparedBy: string;
    issuedBy: string;
    reviewedApprovedBy: string;

    status: string;
    createdOn?: string;
}

export interface TechnicalRawDataNablListResponse {
    status: number;
    message: string;
    items: TechnicalRawDataNabl[];
    totalRecords: number;
    pageNumber: number;
    pageSize: number;
    success: boolean;
}

export interface TechnicalRawDataNablResponse {
    status: number;
    message: string;
    data: TechnicalRawDataNabl;
    success: boolean;
}
