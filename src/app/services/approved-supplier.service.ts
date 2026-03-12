import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { ApprovedSupplier, ApprovedSupplierListResponse, ApprovedSupplierResponse } from '../models/approvedSupplierModel';

@Injectable({
    providedIn: 'root'
})
export class ApprovedSupplierService {
    private dummyRecords: ApprovedSupplier[] = [
        {
            id: 1,
            formatNo: 'F-20',
            documentNo: 'DMSPL-ALS-2025-01',
            issueNo: '01',
            revNo: '00',
            date: '2025-01-15',

            supplierName: 'Scientific Solutions Pvt Ltd',
            contactDetails: 'Mr. Rajesh Kumar (9876543210)',
            productsServicesSupplied: 'Chemical Reagents, Lab Glassware',
            registrationNo: 'REG-SCI-001',
            approvalDate: '2025-01-10',
            validUpTo: '2026-01-10',

            lastEvaluationDate: '2025-01-05',
            lastScore: 92,
            performanceGrade: 'A',

            isBlacklisted: false,
            remarks: 'Reliable supplier for critical reagents.',

            createdBy: 'Admin',
            createdOn: '2025-01-15',
            isActive: true
        },
        {
            id: 2,
            formatNo: 'F-20',
            documentNo: 'DMSPL-ALS-2025-01',
            issueNo: '01',
            revNo: '00',
            date: '2025-01-15',

            supplierName: 'Industrial Glass House',
            contactDetails: 'Mr. Amit Shah (9988776655)',
            productsServicesSupplied: 'Beakers, Flasks, Pipettes',
            registrationNo: 'REG-IGH-002',
            approvalDate: '2024-12-20',
            validUpTo: '2025-12-20',

            lastEvaluationDate: '2024-12-15',
            lastScore: 85,
            performanceGrade: 'B',

            isBlacklisted: false,
            remarks: 'Lead time sometimes exceeds 15 days.',

            createdBy: 'Admin',
            createdOn: '2025-01-15',
            isActive: true
        }
    ];

    constructor() { }

    getAll(params?: any): Observable<ApprovedSupplierListResponse> {
        const pageNo = params?.PageNumber || 1;
        const pageSize = params?.PageSize || 10;
        const searchTerm = params?.searchTerm || '';

        let filteredRecords = [...this.dummyRecords];

        if (searchTerm) {
            filteredRecords = filteredRecords.filter(record =>
                record.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                record.registrationNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                record.productsServicesSupplied.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        const totalRecords = filteredRecords.length;
        const startIndex = (pageNo - 1) * pageSize;
        const items = filteredRecords.slice(startIndex, startIndex + pageSize);

        return of({
            status: 200,
            message: 'Approved supplier list retrieved successfully',
            items,
            totalRecords,
            pageNumber: pageNo,
            pageSize,
            success: true
        });
    }

    getById(id: number): Observable<ApprovedSupplier | null> {
        const record = this.dummyRecords.find(r => r.id === id);
        return of(record || null);
    }

    create(data: ApprovedSupplier): Observable<ApprovedSupplierResponse> {
        const newRecord = { ...data, id: Date.now() };
        this.dummyRecords.push(newRecord);
        return of({
            status: 201,
            message: 'Approved supplier entry created successfully',
            data: newRecord,
            success: true
        });
    }

    update(id: number, data: ApprovedSupplier): Observable<ApprovedSupplierResponse> {
        const index = this.dummyRecords.findIndex(r => r.id === id);
        if (index > -1) {
            this.dummyRecords[index] = { ...data, id };
            return of({
                status: 200,
                message: 'Approved supplier entry updated successfully',
                data: this.dummyRecords[index],
                success: true
            });
        }
        return of({
            status: 404,
            message: 'Approved supplier entry not found',
            data: data,
            success: false
        });
    }

    delete(id: number): Observable<ApprovedSupplierResponse> {
        const index = this.dummyRecords.findIndex(r => r.id === id);
        if (index > -1) {
            const deletedRecord = this.dummyRecords.splice(index, 1)[0];
            return of({
                status: 200,
                message: 'Approved supplier entry deleted successfully',
                data: deletedRecord,
                success: true
            });
        }
        return of({
            status: 404,
            message: 'Approved supplier entry not found',
            data: {} as ApprovedSupplier,
            success: false
        });
    }
}
