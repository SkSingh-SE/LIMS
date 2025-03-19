export interface Designation {
    id: number;
    name: string;
    description?: string;
    createdBy?: number;
    createdOn: string;
    modifiedBy?: number;
    modifiedOn?: string;
    companyCode?: string;
    isActive?: boolean;
  }
  
  export interface DesignationResponse {
    items: Designation[];
    totalRecords: number;
    pageNumber: number;
    pageSize: number;
  }
  