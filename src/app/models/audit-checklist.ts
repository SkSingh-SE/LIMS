export interface ChecklistItem {
    clauseNo: string;
    requirement: string;
    observation: string;
    compliance: 'Yes' | 'No' | 'NA';
}

export interface AuditChecklist {
    id: number;
    areaDepartment: string;
    auditDate: string | Date;
    auditorName: string;
    auditeeName: string;
    items: ChecklistItem[];

    // Header standard fields
    formatNo: string;
    docNo: string;
    issueNo: string | number;
    issueDate: string | Date;
    revNo: string | number;
    revDate: string | Date;
}
