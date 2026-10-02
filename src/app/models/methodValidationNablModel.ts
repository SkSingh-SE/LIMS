export interface CrmMaterialParameters {
    crmSampleId: string; // e.g., Specificity, Linearity, LOD, LOQ, Robustness
    certificateNo: string;
    referenceValue: number;
    measurementUncertainty: number;
    unit: string;
}
export interface AccuracyStudy {
    crmSampleId: string; // e.g., Specificity, Linearity, LOD, LOQ, Robustness
    referenceValue: number;
    observationValue: number;
    difference: number;
    recovery: number;
    unit: string;
    status: string;
}
export interface PrecisionStudy {
    crmSampleId: string; // e.g., Specificity, Linearity, LOD, LOQ, Robustness
    referenceValue: number;
    unit: string;
    reading1: number;
    reading2: number;
    reading3: number;
    reading4: number;
    reading5: number;
    mean: number;
    sd: number;
    rsd: number;
    status: string;
}

export interface MethodValidationNabl {
    id: number;
    formatNo: string;
    issueNo: string;
    revNo: string;
    date: string;
    documentNo: string;
    verificationDate: string | Date;
    validationDate: string | Date;

    testMethodName: string;
    verifiedBy: string;
    validatedBy: string;
    referenceStandard: string;
    humidity: string;
    temperature: string;
    calibrationDueDate: string;
    equipmentId: string;
    equipmentName: string;
    testMethodCode: string;
    revIssue: string;
    scope: string;
    equipmentUsed: string;
    reagentsUsed: string;

    crmMaterialParameters: CrmMaterialParameters[];
    accuracyStudy: AccuracyStudy[];
    precisionStudy: PrecisionStudy[];

    summaryOfResults: string;
    conclusion: string;
    validStatus: string;

    preparedBy: string;
    reviewedBy: string;
    approvedBy: string;
    recoveryMin: number;
    recoveryMax: number;
    rsdMax: number;
    biasMax: number;
    measurementUncertainty: number;
    expandedUncertainty: number;
    coverageFactor: number;
    confidenceLevel: number;

    status: string;
    createdOn?: string;
    robustnessResults?: string;
    reasonNotValid?: string;
    validationType?: string;
    reasonForValidation?: string;
    validationScope?: string;
    accuracy: boolean;
    precision: boolean;
    repeatability: boolean;
    recovery: boolean;
    measurement: boolean;
    robustness: boolean;
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
