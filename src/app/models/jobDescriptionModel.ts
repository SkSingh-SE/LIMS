export interface JobDescription {
    id: number;
    formatNo: string;
    issueNo: string;
    revNo: string;
    date: string;
    designationId: number;
    designationName?: string;
    departmentId: number;
    departmentName?: string;
    reportingTo: string;
    documentNo: string;

    // Section II – Education & Experience
    minimumQualification: string;
    technicalTraining: string;
    experience: string;

    // Section III – Principal Accountabilities
    principalAccountabilities: string;

    // Section IV – Authorities
    authorityStopTesting: boolean;
    authorityIssueReports: boolean;
    authorityAccessConfidential: boolean;
    authorityEquipmentCalibration: boolean;

    // Section V – QMS Responsibilities
    qmsResponsibilities: string;

    // Section VI – Confidentiality Clause
    confidentialityClause: string;

    // Section VII – Approval
    preparedByName: string;
    approvedByName: string;
    employeeAccepted: boolean;

    // Audit fields
    createdBy?: string;
    createdOn?: string;
    modifiedBy?: string;
    modifiedOn?: string;
    isActive?: boolean;
}

export interface JobDescriptionResponse {
    items: JobDescription[];
    totalRecords: number;
    pageNumber: number;
    pageSize: number;
}
