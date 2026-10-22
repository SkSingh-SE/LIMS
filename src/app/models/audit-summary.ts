export interface AuditSummary {
    id: number;
    auditDate: string | Date;
    areasCovered: string;
    majorNCs: number;
    minorNCs: number;
    observationSummary: string; // Quill
    conclusion: string; // Quill

    // Header standard fields
    formatNo: string;
    docNo: string;
    issueNo: string | number;
    issueDate: string | Date;
    revNo: string | number;
    revDate: string | Date;
    departmentSummary: AuditDepartmentSummary[];
}
interface AuditDepartmentSummary {

    departmentId: number;

    departmentName: string;

    totalAudits: number;

    completedAudits: number;

    inProgressAudits: number;

    scheduledAudits: number;

    majorNcrs: number;

    minorNcrs: number;

    observations: number;
}