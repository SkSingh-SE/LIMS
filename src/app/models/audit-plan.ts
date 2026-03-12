export interface AuditPlan {
    id: number;
    auditType: string; // e.g., "Internal Audit", "Surveillance Audit"
    period: string; // e.g., "2024-25"
    areaDepartment: string;
    auditorName: string;
    scheduleDate: string | Date;
    scope: string;

    // Header standard fields
    formatNo: string;
    docNo: string;
    issueNo: string | number;
    issueDate: string | Date;
    revNo: string | number;
    revDate: string | Date;
}
