export interface EmployeeAuthorization {
    id: number;
    department: string;
    personnelName: string;
    uid: string;
    equipment: string;
    testMethodAuthorization: string;
    testAuthorization: string;
}

export interface EmployeeAuthorizationResponse {
    items: EmployeeAuthorization[];
    totalRecords: number;
    pageNumber: number;
    pageSize: number;
}
