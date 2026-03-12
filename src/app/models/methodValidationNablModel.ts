export interface ValidationParameter {
    parameter: string; // e.g., Specificity, Linearity, LOD, LOQ, Robustness
    description: string;
    acceptanceCriteria: string;
    observedValue: string;
    result: 'Pass' | 'Fail';
}

export interface MethodValidationNabl {
    id: number;
    formatNo: string;
    issueNo: string;
    revNo: string;
    date: string;
    documentNo: string;

    testMethodName: string;
    scope: string;
    equipmentUsed: string;
    reagentsUsed: string;

    validationParameters: ValidationParameter[];

    summaryOfResults: string;
    conclusion: string;

    preparedBy: string;
    reviewedBy: string;
    approvedBy: string;

    status: string;
    createdOn?: string;
}

export interface MethodValidationNablListResponse {
    status: number;
    message: string;
    items: MethodValidationNabl[];
    totalRecords: number;
    pageNumber: number;
    pageSize: number;
    success: boolean;
}

export interface MethodValidationNablResponse {
    status: number;
    message: string;
    data: MethodValidationNabl;
    success: boolean;
}
