export interface CompetenceRequirement {
    id: number;
    formatNo: string;
    issueNo: string;
    revNo: string;
    date: Date | string;
    positionId?: number;
    positionName?: string;
    minimumEducation: string;
    minimumExperience: string;
    approvedBy: string;
    isExternal?: boolean;
    relatedActivity?: string; // For external
    preparedBy: string;
    reviewedBy: string;
}

export interface CompetenceRequirementResponse {
    items: CompetenceRequirement[];
    totalRecords: number;
    pageNumber: number;
    pageSize: number;
}
