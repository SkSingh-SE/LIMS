import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { SupplierConfidentiality, SupplierConfidentialityListResponse, SupplierConfidentialityResponse } from '../models/supplierConfidentialityModel';

@Injectable({
    providedIn: 'root'
})
export class SupplierConfidentialityService {
    private dummyRecords: SupplierConfidentiality[] = [
        {
            id: 1,
            formatNo: 'F-2',
            issueNo: '01',
            revNo: '00',
            date: '2025-01-10',
            supplierId: 1,
            supplierName: 'Precision Tech Tools',
            contactPerson: 'Robert Wilson',
            address: 'Industrial Area Phase 2, Pune',
            agreementDate: '2025-01-10',
            validUntil: '2026-01-09',
            reviewedBy: 'Quality Manager',
            reviewedDate: '2025-01-10',
            approvedBy: 'Director',
            approvalDate: '2025-01-10',
            status: 'active',
            isActive: true
        }
    ];

    constructor() { }

    getAll(params?: any): Observable<SupplierConfidentialityListResponse> {
        const pageNo = params?.PageNumber || 1;
        const pageSize = params?.PageSize || 10;
        const searchTerm = params?.searchTerm || '';

        let filteredRecords = [...this.dummyRecords];

        if (searchTerm) {
            filteredRecords = filteredRecords.filter(record =>
                record.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                record.contactPerson.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        const totalRecords = filteredRecords.length;
        const startIndex = (pageNo - 1) * pageSize;
        const items = filteredRecords.slice(startIndex, startIndex + pageSize);

        return of({
            status: 200,
            message: 'Records retrieved successfully',
            items,
            totalRecords,
            pageNumber: pageNo,
            pageSize,
            success: true
        });
    }

    getById(id: number): Observable<SupplierConfidentiality | null> {
        const record = this.dummyRecords.find(r => r.id === id);
        return of(record || null);
    }

    create(data: SupplierConfidentiality): Observable<SupplierConfidentialityResponse> {
        const newRecord = { ...data, id: Date.now() };
        this.dummyRecords.push(newRecord);
        return of({
            status: 201,
            message: 'Record created successfully',
            data: newRecord,
            success: true
        });
    }

    update(id: number, data: SupplierConfidentiality): Observable<SupplierConfidentialityResponse> {
        const index = this.dummyRecords.findIndex(r => r.id === id);
        if (index > -1) {
            this.dummyRecords[index] = { ...data, id };
            return of({
                status: 200,
                message: 'Record updated successfully',
                data: this.dummyRecords[index],
                success: true
            });
        }
        return of({
            status: 404,
            message: 'Record not found',
            data: data,
            success: false
        });
    }

    delete(id: number): Observable<SupplierConfidentialityResponse> {
        const index = this.dummyRecords.findIndex(r => r.id === id);
        if (index > -1) {
            const deletedRecord = this.dummyRecords.splice(index, 1)[0];
            return of({
                status: 200,
                message: 'Record deleted successfully',
                data: deletedRecord,
                success: true
            });
        }
        return of({
            status: 404,
            message: 'Record not found',
            data: {} as SupplierConfidentiality,
            success: false
        });
    }
}
