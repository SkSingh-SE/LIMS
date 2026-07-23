import { Injectable } from "@angular/core";
import { environment } from "../../environments/environment";
import { Inventorymanagement, InventorymanagementListResponse, InventorymanagementResponse } from "../models/inventory-managementModel";
import { Observable } from "rxjs";
import { HttpClient } from "@angular/common/http";
import { InventoryManagementListComponent } from "../components/nabl/inventory-management/inventory-management-list/inventory-management-list.component";
@Injectable({
    providedIn: 'root',
})
export class InventorymanagementService {
    private apiUrl = environment.apiUrl + "/Nabl/InventoryMaster";

    constructor(private http: HttpClient) { }

    getAll(filter?: any): Observable<InventorymanagementListResponse> {
        return this.http.post<InventorymanagementListResponse>(this.apiUrl + "/list", filter);
    }
    delete(id: number): Observable<InventorymanagementResponse> {
        return this.http.delete<InventorymanagementResponse>(`${this.apiUrl}/delete/${id}`);
    }
    getDataById(id: number): Observable<Inventorymanagement | null> {
        return this.http.get<Inventorymanagement>(`${this.apiUrl}/details/${id}`);
    }
    create(data: Inventorymanagement): Observable<InventorymanagementResponse> {
        return this.http.post<InventorymanagementResponse>(`${this.apiUrl}/save`, data);
    }

    update(id: number, data: Inventorymanagement): Observable<InventorymanagementResponse> {
        data.id = id;
        return this.http.post<InventorymanagementResponse>(`${this.apiUrl}/save`, data);
    }
    getSuppliersDropdown(searchTerm: string = '', pageNo: number = 0, pageSize: number = 20) {
        return this.http.get<any[]>(`${this.apiUrl}/dropdown`, {
            params: {
                searchTerm: searchTerm,
                pageNo: pageNo,
                pageSize: pageSize
            }
        });
    }
    addQuantity(payload: any) {
        return this.http.post(`${this.apiUrl}/add-quantity`, payload);
    }
    getQuantityLogs(inventoryId: number): Observable<Inventorymanagement | null> {
        return this.http.get<Inventorymanagement>(`${this.apiUrl}/quantity-logs/${inventoryId}`);
    }
}