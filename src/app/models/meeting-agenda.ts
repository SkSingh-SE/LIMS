export interface Attendee {
    name: string;
    designation: string;
}

export interface AgendaItem {
    item: string;
}

export interface MeetingAgenda {
    id: number;
    meetingDate: string | Date;
    meetingTime: string;
    venue: string;
    chairperson: string;
    participants: Attendee[];
    agendaItems: AgendaItem[];

    // Header standard fields
    formatNo: string;
    docNo: string;
    issueNo: string | number;
    issueDate: string | Date;
    date: string | Date;
    revNo: string | number;
    revDate: string | Date;
}
