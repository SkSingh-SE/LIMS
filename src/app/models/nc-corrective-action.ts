export interface NcCorrectiveAction {
    id: number;
    date: string;
    correctiveActionDate: string;
    verifiedDate: string;
    implementedDate: string;
    ncNo: string;
    clauseNo: string;
    section: string;
    activityAssessed: string;
    auditor: string;
    auditee: string;
    ncObserved: string;
    correctiveActionProposed: string;
    timeRequired: string;
    proposedBy: string;
    approvedBy: string;
    correctiveActionTaken: string;
    preventiveAction: string;
    effectivenessOfAction: string;

    // Header standard fields
    formatNo: string;
    docNo: string;
    issueNo: string | number;
    issueDate: string | Date;
    revNo: string | number;
    revDate: string | Date;
}
