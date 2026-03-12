export interface DocumentReview {
    id: number;
    srNo: number;
    documentName: string;
    lastReviewDate: string;
    nextReviewDate: string;
    reviewDoneBy: string;

    // Header standard fields
    formatNo: string;
    docNo: string;
    issueNo: string | number;
    issueDate: string | Date;
    revNo: string | number;
    revDate: string | Date;
}
