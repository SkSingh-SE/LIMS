export interface DiscussionItem {
    agendaItem: string;
    discussion: string; // Quill
    decision: string; // Quill
}

export interface ActionItem {
    action: string;
    responsibility: string;
    targetDate: string | Date;
}

export interface MeetingMinutes {
    id: number;
    meetingDate: string | Date;
    chairperson: string;
    reviewPeriod: string;
    discussions: DiscussionItem[];
    actionItems: ActionItem[];

    // Header standard fields
    formatNo: string;
    docNo: string;
    issueNo: string | number;
    issueDate: string | Date;
    revNo: string | number;
    revDate: string | Date;
}
