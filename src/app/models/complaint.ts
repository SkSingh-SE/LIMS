export interface Complaint {
    id: number;
    monthYear: string;
    complaintNo: string;
    dateOfComplaint: string;
    complainantName: string;
    detailsOfComplaint: string;
    validationOfComplaint: string;
    outcomeOfInvestigation: string;
    correctiveActionsTaken: string;
    referenceNoDate: string;
    signatureQM?: string;

    // Header standard fields
    formatNo: string;
    docNo: string;
    issueNo: string | number;
    issueDate: string | Date;
    revNo: string | number;
    revDate: string | Date;
}
