export interface Complaint {
    id: number;
    monthYear: string;
    complaintNo: string;
    complaintDate: string;
    complainantName: string;
    complaintDescription: string;
    validationOfComplaint: string;
    outcomeOfInvestigation: string;
    correctiveAction: string;
    referenceNoDate: string | Date;
    signatureQM?: string;

    // Header standard fields
    formatNo: string;
    docNo: string;
    issueNo: string | number;
    date: string | Date;
    revNo: string | number;
    revDate: string | Date;
}
