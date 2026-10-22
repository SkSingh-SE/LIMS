// F-9: Training Attendance Record
export interface AttendanceParticipant {
    id?: number;
    slNo: number;
    participantName: string;
    typesofParticipant: string;
    participantId: number;
    designation: string;
    evaluation: string;
    evaluationId: number;
    status: string;
    feedback: 'Good' | 'Satisfactory' | 'Not Good';
    uploadReferenceID?: number; // ID returned from file upload API
    filePath?: string; // Path returned from file upload API
    fileName?: string; // Original file name
}

export interface TrainingAttendance {
    id?: number;
    formatNo: string; // F-9
    issueNo: string;
    revNo: string;
    date: Date | string;
    planDate: Date | string;

    // Specific fields
    trainingPlanName: string;
    trainingTopic: string;
    month: string;
    trainingPlanId: number;
    planningYear: number;
    venueMode: string;
    trainerName: string;
    trainingDatetime: string; // e.g., "03/09/25 & 4:00 pm"
    audience: string; // e.g., "03/09/25 & 4:00 pm"
    agency: string; // e.g., "03/09/25 & 4:00 pm"
    providerAgencyName: string; // e.g., "03/09/25 & 4:00 pm"

    participants: AttendanceParticipant[];
    genearalRemarks?: string;
    facultySignature?: string;
    questionSet?: string;

    // Approval
    preparedBy?: string;
    issuedBy?: string;
    reviewedApprovedBy?: string;
    approvedBy?: string;
    reviewedBy?: string;
    createdBy?: string;
    createdOn?: Date | string;
    modifiedBy?: string;
    modifiedOn?: Date | string;
    isActive?: boolean;
    evaluationRequired?: boolean;
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
