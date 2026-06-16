export interface RiskAssessment {
    id: number;
    date: string | Date;
    activityProcess: string;
    riskIdentified: string;
    opportunity: string;
    mitigationPlan: string;
    responsibility: string;
    effectiveness: string;

    // Header standard fields
    formatNo: string;
    docNo: string;
    issueNo: string | number;
    issueDate: string | Date;
    revNo: string | number;
    revDate: string | Date;
}
