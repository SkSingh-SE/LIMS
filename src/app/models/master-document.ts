export interface MasterDocument {
    id: number;
    srNo: number;
    documentName: string;
    documentNo: string;
    issueNo: string | number;
    issueDate: string | Date;
    revNo: string | number;
    revDate: string | Date;
    date: string | Date;
    effectiveDate: string | Date;
    nextReviewDate: string | Date;
    copyHolder: string;
    hasReview: boolean;
    reviewId: number;
    reviewStatus: string;

    controlledCopies: ControlledCopies[];
    // Header standard fields
    formatNo: string;
    docNo: string;
}
export interface ControlledCopies {
    holderName: string;
    departmentId: number;
    departmentName: string;
    location: string;
    dateIssued: string | Date;
}