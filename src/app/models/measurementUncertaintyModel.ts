export interface MeasurementUncertainty {
    id: number;
    formatNo: string;
    issueNo: string;
    revNo: string;
    date: string;
    documentNo: string;

    // Header Info
    testParameter: string;
    testMethod: string;
    equipmentUsed: string;
    sampleDescription: string;

    // Measurement Data
    numberOfReadings: number;
    readings: {
        srNo: number;
        measuredValue: number;
        unit: string;
    }[];

    // Statistical Analysis
    mean: number;
    standardDeviation: number;
    typeAUncertainty: number;
    typeBUncertainty: number;
    combinedUncertainty: number;
    expandedUncertainty: number;
    coverageFactor: number;
    effectiveDegreesOfFreedom: number;
    confidenceLevel: string;

    // Sources of Uncertainty
    uncertaintySources: {
        source: string;
        type: string; // Type A or Type B
        distribution: string;
        standardUncertainty: number;
        sensitivityCoefficient: number;
        contribution: number;
    }[];

    remarks: string;
    preparedBy: string;
    reviewedBy: string;
    approvedBy: string;
    status: string;
    createdOn?: string;
}

export interface MeasurementUncertaintyListResponse {
    status: number;
    message: string;
    items: MeasurementUncertainty[];
    totalRecords: number;
    pageNumber: number;
    pageSize: number;
    success: boolean;
}

export interface MeasurementUncertaintyResponse {
    status: number;
    message: string;
    data: MeasurementUncertainty;
    success: boolean;
}
