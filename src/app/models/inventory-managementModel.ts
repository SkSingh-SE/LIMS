export interface Inventorymanagement {
    id?: number;
    itemCode: string;
    itemName: string;
    itemCategory: string;
    manufacturer: string;
    batchNo: string;
    unit: string;
    itemDescription?: string;
    departmentID?: string;
    supplierId?: string;
    supplier?: string;
    quantity: number;
    minimumQuantity: number;
    storageLocation: string;
    date: string | Date;
    remarks: string;
}
export interface InventorymanagementResponse {
    status: number;
    message: string;
    data: Inventorymanagement;
    success: boolean;
}
export interface InventorymanagementListResponse {
    status: number;
    message: string;
    items: Inventorymanagement[];
    totalRecords: number;
    pageNumber: number;
    pageSize: number;
    success: boolean;
}