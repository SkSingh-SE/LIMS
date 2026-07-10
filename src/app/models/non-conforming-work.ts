export interface NonConformingWork {
    id: number;
    ncDate: string | Date;
    date: string | Date;
    ncDetail: string;
    rootCauseAnalysis: string;
    correctiveAction: string;
    closerDate: string | Date;
    signatureTDQM?: string;

    // Header standard fields
    formatNo: string;
    docNo: string;
    issueNo: string | number;
    issueDate: string | Date;
    revNo: string | number;
    revDate: string | Date;
}
