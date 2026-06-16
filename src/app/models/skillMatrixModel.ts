export interface EmployeeSkill {
    employeeId: number;
    employeeName: string;
    designationName: string;
    skills: { [skillName: string]: string }; // skillName -> level (e.g., 'P', 'C', 'D', 'N')
}

export interface SkillMatrix {
    id: number;
    designationId: number;
    designationName?: string;
    formatNo: string; // F-6 or F-6A
    issueNo: string;
    date: string;
    revNo: string;
    title: string;
    decision?: string;
    remarks?: string;
    skills: string[];
    employeeSkills: EmployeeSkill[];
    preparedBy?: string;
    issuedBy?: string;
    reviewedApprovedBy?: string;
    lastUpdated?: string;
    createdBy?: string;
    createdOn?: string;
    modifiedBy?: string;
    modifiedOn?: string;
    isActive?: boolean;
    approvedBy?: string;
    reviewedBy?:string;
    
}

export interface SkillMatrixResponse {
    items: SkillMatrix[];
    totalRecords: number;
    pageNumber?: number;
    pageSize?: number;
}

// Skill Matrix Decision Model (F-6A)
export interface DecisionRow {
    skillArea: string;
    competencyRequirement: string;
    evaluationMethod: string;
    authorized: boolean; // Y/N
}

export interface SkillMatrixDecision {
    id: number;
    designationId: number;
    designationName: string;
    formatNo: string; // F-6A
    issueNo: string;
    date: string;
    revNo: string;
    title: string;
    rows: DecisionRow[];
    preparedBy?: string;
    issuedBy?: string;
    reviewedApprovedBy?: string;
    lastUpdated?: string;
    createdBy?: string;
    createdOn?: string;
    modifiedBy?: string;
    modifiedOn?: string;
    isActive?: boolean;
}

export interface SkillMatrixDecisionResponse {
    items: SkillMatrixDecision[];
    totalRecords: number;
    pageNumber?: number;
    pageSize?: number;
}
