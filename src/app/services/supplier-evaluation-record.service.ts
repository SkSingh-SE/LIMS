import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { SupplierEvaluationRecord, SupplierEvaluationRecordListResponse, SupplierEvaluationRecordResponse } from '../models/supplierEvaluationRecordModel';

@Injectable({
    providedIn: 'root',
})
export class SupplierEvaluationRecordService {
    private apiUrl = environment.apiUrl + '/Nabl/SupplierEvaluation';

    constructor(private http: HttpClient) { }

    getAll(params?: any): Observable<SupplierEvaluationRecordListResponse> {
        return this.http.post<SupplierEvaluationRecordListResponse>(this.apiUrl + '/list', params || {});
    }

    getById(id: number): Observable<SupplierEvaluationRecord | null> {
        return this.http.get<SupplierEvaluationRecord>(`${this.apiUrl}/details/${id}`);
    }

    create(data: SupplierEvaluationRecord): Observable<SupplierEvaluationRecordResponse> {
        return this.http.post<SupplierEvaluationRecordResponse>(`${this.apiUrl}/save`, data);
    }

    update(id: number, data: SupplierEvaluationRecord): Observable<SupplierEvaluationRecordResponse> {
        data.id = id;
        return this.http.post<SupplierEvaluationRecordResponse>(`${this.apiUrl}/save`, data);
    }

    delete(id: number): Observable<SupplierEvaluationRecordResponse> {
        return this.http.delete<SupplierEvaluationRecordResponse>(`${this.apiUrl}/delete/${id}`);
    }
    getAllSuppliers(searchTerm: string = '', pageNo: number = 0, pageSize: number = 20) {
        return this.http.get<any[]>(`${this.apiUrl}/allsupplierlist`, {
            params: {
                searchTerm: searchTerm,
                pageNo: pageNo,
                pageSize: pageSize
            }
        });
    }
    getSupplierEvaluationDetails(supplierName: string, fromDate: string, toDate: string) {
        return this.http.get<any>(`${this.apiUrl}/supplier-evaluation-details`, {
            params: {
                supplierName: supplierName,
                fromDate: fromDate,
                toDate: toDate
            }
        });
    }
    getReceivedItems(poNo: string, supplierName: string) {
        return this.http.get<any>(`${this.apiUrl}/receive-items-details/`, {
            params: {
                poNo: poNo,
                supplierName: supplierName
            }
        });
    }
    getPoItemsDetailsByPoNo(poNo: string, supplierName: string) {
        return this.http.get<any>(`${this.apiUrl}/po-items-details/`, {
            params: {
                poNo: poNo,
                supplierName: supplierName
            }
        });
    }
    getIndentByPo(indentNo: string) {
        return this.http.get<any>(`${this.apiUrl}/indent-details/`, {
            params: {
                indentNo: indentNo
            }
        });
    }
    getInspectionPlanDetailByinspectionPlanNo(inspectionPlanNo: string) {
        return this.http.get<any>(`${this.apiUrl}/inspectionplan-details/`, {
            params: {
                inspectionPlanNo: inspectionPlanNo
            }
        });
    }
}
