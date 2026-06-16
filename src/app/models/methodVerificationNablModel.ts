export interface CRMParameter {
    crmSampleId: string;
    certificateNo: string;
    referenceValue: number;
    unit: string;
    measurementUncertainty: string;
}

export interface VerificationData {
    crmSampleId: string;
    referenceValue: number;
    unit: number;
    observationValue: number;
    difference: number;
    recovery: number;
    status: string;

}

export interface MethodVerificationNabl {
    id: number;
    formatNo: string;
    issueNo: string;
    revNo: string;
    date: string;
    documentNo: string;

    testMethodName: string;
    testMethodCode: string;
    revIssue: string;
    verificationDate: string | Date;
    calibrationDueDate: string | Date;
    referenceStandard: string;
    equipmentId: string;
    equipmentName: string;
    verificationStatus: string;
    humidity: string;
    temperature: string;
    verifiedBy: string;
    reasonNotVerified: string;
    recoveryMin: string;
    recoveryMax: string;
    rsdMax: string;
    biasMax: string;

    crmParameters: CRMParameter[];
    verificationData: VerificationData[];

    conclusion: string; // e.g., "The method is verified as fit for purpose."

    preparedBy: string;
    reviewedBy: string;
    approvedBy: string;

    status: string;
    createdOn?: string;
}

export interface MethodVerificationNablListResponse {
    status: number;
    message: string;
    items: MethodVerificationNabl[];
    totalRecords: number;
    pageNumber: number;
    pageSize: number;
    success: boolean;
}

export interface MethodVerificationNablResponse {
    status: number;
    message: string;
    data: MethodVerificationNabl;
    success: boolean;
}
