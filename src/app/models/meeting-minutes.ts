export interface Agendalist {
    agendaItem: string;
    discussion: string; // Quill
    decisiontaken: string; // Quill
}
export interface ParticipantItems {
    name: string;
    designation: string; // Quill
    department: string; // Quill
}

export interface ActionItem {
    action: string;
    responsibility: string;
    targetDate: string | Date;
    priority: string;
    stauts: string;
}

export interface MeetingMinutes {
    id: number;
    meetingDate: string | Date;
    date: string | Date;
    chairperson: string;
    reviewPeriod: string;
    agendaList: Agendalist[];
    actionItems: ActionItem[];
    participantItems: ParticipantItems[];

    // Header standard fields
    formatNo: string;
    docNo: string;
    issueNo: string | number;
    issueDate: string | Date;
    revNo: string | number;
    revDate: string | Date;
}
