export interface EmployeeAuthorization {
    id: number;
    departmentName: string;
    departmentId: number;
    personnelName: string;
    uid: string;
    equipment: string;
    testMethodAuthorization: string;
    testAuthorization: string;
    approvedBy: string;
    reviewedBy: string;
    preparedBy: string;
    formCode: string;
    documentNo: string;
    issueNo: string;
    revNo: string;
    date: string | Date;
    labTestAuth: { id: number; name: string;labTestName:string}[];
    testMethodAuth: { id: number; name: string;testMethodName:string }[];
    employeeEquipmentAuth: { id: number; name: string;uid: string;equipmentName:string }[];

}

export interface EmployeeAuthorizationResponse {
    items: EmployeeAuthorization[];
    totalRecords: number;
    pageNumber: number;
    pageSize: number;
}
