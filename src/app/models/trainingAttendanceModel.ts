// F-9: Training Attendance Record
export interface AttendanceParticipant {
    id?: number;
    slNo: number;
    participantName: string;
    feedback: 'Good' | 'Satisfactory' | 'Not Good';
    signature?: string; // Base64 or path
}

export interface TrainingAttendance {
    id?: number;
    formatNo: string; // F-9
    issueNo: string;
    revNo: string;
    date: Date | string;

    // Specific fields
    trainingProgramTitle: string;
    trainingVenue: string;
    facultyName: string;
    dateTime: string; // e.g., "03/09/25 & 4:00 pm"

    participants: AttendanceParticipant[];
    remarks?: string;
    facultySignature?: string;

    // Approval
    preparedBy?: string;
    issuedBy?: string;
    reviewedApprovedBy?: string;

    createdBy?: string;
    createdOn?: Date | string;
    modifiedBy?: string;
    modifiedOn?: Date | string;
    isActive?: boolean;
}

export interface TrainingAttendanceResponse {
    status: number;
    message: string;
    data: TrainingAttendance;
    success: boolean;
}

export interface TrainingAttendanceListResponse {
    status: number;
    message: string;
    items: TrainingAttendance[];
    totalRecords: number;
    pageNumber: number;
    pageSize: number;
    success: boolean;
}
