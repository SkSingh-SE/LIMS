export interface NonConformingWork {
    id: number;
    dateMonthYear: string;
    ncDetail: string;
    rootCauseAnalysis: string;
    correctiveAction: string;
    closerDate: string;
    signatureTDQM?: string;

    // Header standard fields
    formatNo: string;
    docNo: string;
    issueNo: string | number;
    issueDate: string | Date;
    revNo: string | number;
    revDate: string | Date;
}
