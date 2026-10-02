export interface NonConformingWork {

    id?: number;

    // ============================
    // Header Information
    // ============================

    formatNo: string;
    documentNo: string;
    issueNo: string;
    issueDate?: string | Date | null;
    revNo: string;
    revDate?: string | Date | null;
    date?: string | Date | null;

    // ============================
    // Workflow
    // ============================

    currentStep: number;
    status?: string;

    // ============================
    // General Information
    // ============================

    ncNo?: string;
    ncDate?: string | Date | null;

    departmentId?: number | null;
    departmentName?: string | null;

    reportedByEmployeeId?: number | null;
    reportedByEmployeeName?: string | null;

    source?: string;
    category?: string;
    priority?: string;

    referenceModule?: string | null;
    referenceId?: number | null;
    referenceNo?: string | null;

    customerAffected?: boolean;

    description?: string;
    immediateAction?: string;
    problemDescription?: string;

    // ============================
    // Investigation
    // ============================

    assignedToEmployeeId?: number | null;
    assignedToEmployeeName?: string | null;

    investigationDate?: string | Date | null;
    investigationMethod?: string;
    requestStep?: number;  
    rootCause?: string;
    contributingFactors?: string;
    investigationDetails?: string;
    recommendedAction?: string;

    // ============================
    // Corrective Action
    // ============================

    actionNo?: string;

    correctiveAction?: string;

    responsiblePersonId?: number | null;
    responsiblePersonName?: string | null;

    targetDate?: string | Date | null;
    completionDate?: string | Date | null;

    resourcesRequired?: string;
    preventiveAction?: string;

    // ============================
    // Verification
    // ============================

    verificationDate?: string | Date | null;

    verifiedByEmployeeId?: number | null;
    verifiedByEmployeeName?: string | null;

    verificationMethod?: string;
    observation?: string;
    result?: string;
    remarks?: string;

    // ============================
    // Closure
    // ============================

    closureDate?: string | Date | null;

    closedByEmployeeId?: number | null;
    closedByEmployeeName?: string | null;

    finalRemarks?: string;

    // Closed / Pending / Reopened
    closureStatus?: string;

}