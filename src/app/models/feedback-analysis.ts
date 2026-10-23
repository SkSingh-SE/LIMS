export interface FeedbackAnalysis {
    id: number;
    period: string; // e.g., "April 2024 to March 2025"
    totalFeedbackReceived: number;
    analysisSummary: string;
    actionsTaken: string;
    feedbackRatings: FeedbackRating[];
    // Header standard fields
    formatNo: string;
    docNo: string;
    issueNo: string | number;
    issueDate: string | Date;
    date: string | Date;
    analysisDate: string | Date;
    verificationDate: string | Date;
    targetCompletionDate: string | Date;
    feedbackDate: string | Date;
    revNo: string | number;
    revDate: string | Date;
}
export interface FeedbackRating {
    parameterName: string;
    rating: number; // 1-5 or similar
}

