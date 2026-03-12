export interface FeedbackRating {
    parameter: string;
    rating: number; // 1-5 or similar
}

export interface CustomerFeedback {
    id: number;
    customerName: string;
    contactPerson: string;
    date: string | Date;
    ratings: FeedbackRating[];
    comments: string;
    suggestions: string;

    // Header standard fields
    formatNo: string;
    docNo: string;
    issueNo: string | number;
    issueDate: string | Date;
    revNo: string | number;
    revDate: string | Date;
}
