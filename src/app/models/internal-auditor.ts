export interface InternalAuditor {
    id: number;
    auditorName: string;
    qualification: string;
    trainingDate: string | Date;
    examScore: number | string;
    remarks: string;

    // Header standard fields
    formatNo: string;
    docNo: string;
    issueNo: string | number;
    issueDate: string | Date;
    revNo: string | number;
    revDate: string | Date;
}
