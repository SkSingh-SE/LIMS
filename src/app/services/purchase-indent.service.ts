import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { PurchaseIndent, PurchaseIndentListResponse, PurchaseIndentResponse } from '../models/purchaseIndentModel';

@Injectable({
    providedIn: 'root'
})
export class PurchaseIndentService {
    private dummyRecords: PurchaseIndent[] = [
        {
            id: 1,
            formatNo: 'F-21',
            documentNo: 'DMSPL-PI-2025-001',
            issueNo: '01',
            revNo: '00',
            date: '2025-01-20',
            departmentName: 'Chemical Laboratory',
            indentorName: 'Dr. Ramesh Kumar',
            priority: 'Medium',
            items: [
                { description: 'Conical Flask 250ml', quantity: 20, unitOfMeasure: 'Nos', purpose: 'Daily testing' },
                { description: 'Whatman Filter Paper Grade 1', quantity: 5, unitOfMeasure: 'Box', purpose: 'Filtration process' }
            ],
            status: 'Approved',
            remarks: 'Required for new project starting February.',
            preparedBy: 'D.R. Kumar',
            isActive: true
        }
    ];

    constructor() { }

    getAll(params?: any): Observable<PurchaseIndentListResponse> {
        const pageNo = params?.PageNumber || 1;
        const pageSize = params?.PageSize || 10;
        const searchTerm = params?.searchTerm || '';

        let filteredRecords = [...this.dummyRecords];

        if (searchTerm) {
            filteredRecords = filteredRecords.filter(record =>
                record.documentNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                record.departmentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                record.indentorName.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        const totalRecords = filteredRecords.length;
        const startIndex = (pageNo - 1) * pageSize;
        const items = filteredRecords.slice(startIndex, startIndex + pageSize);

        return of({
            status: 200,
            message: 'Purchase indents retrieved successfully',
            items,
            totalRecords,
            pageNumber: pageNo,
            pageSize,
            success: true
        });
    }

    getById(id: number): Observable<PurchaseIndent | null> {
        const record = this.dummyRecords.find(r => r.id === id);
        return of(record || null);
    }

    create(data: PurchaseIndent): Observable<PurchaseIndentResponse> {
        const newRecord = { ...data, id: Date.now() };
        this.dummyRecords.push(newRecord);
        return of({
            status: 201,
            message: 'Purchase indent created successfully',
            data: newRecord,
            success: true
        });
    }

    update(id: number, data: PurchaseIndent): Observable<PurchaseIndentResponse> {
        const index = this.dummyRecords.findIndex(r => r.id === id);
        if (index > -1) {
            this.dummyRecords[index] = { ...data, id };
            return of({
                status: 200,
                message: 'Purchase indent updated successfully',
                data: this.dummyRecords[index],
                success: true
            });
        }
        return of({
            status: 404,
            message: 'Purchase indent not found',
            data: data,
            success: false
        });
    }

    delete(id: number): Observable<PurchaseIndentResponse> {
        const index = this.dummyRecords.findIndex(r => r.id === id);
        if (index > -1) {
            const deletedRecord = this.dummyRecords.splice(index, 1)[0];
            return of({
                status: 200,
                message: 'Purchase indent deleted successfully',
                data: deletedRecord,
                success: true
            });
        }
        return of({
            status: 404,
            message: 'Purchase indent not found',
            data: {} as PurchaseIndent,
            success: false
        });
    }
}
