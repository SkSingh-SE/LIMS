export interface AuditPlan {
    id: number;

    auditType: string;
    planningYear?: number | null;
    leadAuditorId?: number | null;
    leadAuditorName?: string;

    scope: string;
    auditObjective?: string;
    auditCriteria?: string;
    remarks?: string;

    formatNo: string;
    docNo: string;
    issueNo: string | number;
    issueDate: string | Date | null;
    revNo: string | number;
    revDate: string | Date | null;
    date: string | Date;

    scheduleDateFrom: string | Date;
    scheduleDateTo: string | Date;

    scheduleItems: ScheduleItem[];
}

export interface ScheduleItem {
    id: number;

    auditPlanId?: number;

    departmentId: number;
    departmentName: string;

    isoClauses: AuditScheduleIsoClause[];

    scheduleDate: string | Date;

    auditorId: number;
    auditorName: string;

    auditeeId: number;
    auditeeName: string;

    status: string;
    checklistId: number | null;
}

export interface AuditScheduleIsoClause {
    clauseId: number;
    clauseName: string;
}