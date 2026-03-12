import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { TestRequestNabl, TestRequestNablListResponse, TestRequestNablResponse } from '../models/testRequestNablModel';

@Injectable({
    providedIn: 'root'
})
export class TestRequestNablService {
    private records: TestRequestNabl[] = [
        {
            id: 1,
            formatNo: 'F-27',
            issueNo: '01',
            revNo: '00',
            date: '2025-07-25',
            documentNo: 'TRN-2025-001',
            customerName: 'Demo Customer Ltd',
            address: 'Industrial Area, Phase 1, Mumbai',
            contactPerson: 'Mr. Amit Shah',
            mobileNo: '9898989898',
            email: 'amit@demo.com',
            gstNo: '27AAAAA1111A1Z1',
            samples: [
                {
                    sampleNo: 'S-001',
                    description: 'Stainless Steel Plate',
                    quantity: 2,
                    condition: 'Good',
                    metalClassification: 'Ferrous'
                }
            ],
            urgent: false,
            returnSample: true,
            holdTesting: false,
            billRequired: true,
            advancePIRequired: false,
            dispatchModes: ['Email', 'Courier'],
            remarks: 'Handle with care',
            preparedBy: 'Admin',
            reviewedBy: 'Lab Manager',
            status: 'Completed',
            createdOn: '2025-07-25'
        }
    ];

    constructor() { }

    getAll(params?: any): Observable<TestRequestNablListResponse> {
        const pageNo = params?.PageNumber || 1;
        const pageSize = params?.PageSize || 10;
        const searchTerm = params?.searchTerm || '';

        let filtered = [...this.records];
        if (searchTerm) {
            filtered = filtered.filter(r =>
                r.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.documentNo.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        const totalItems = filtered.length;
        const items = filtered.slice((pageNo - 1) * pageSize, pageNo * pageSize);

        return of({
            status: 200,
            message: 'Records retrieved successfully',
            items,
            totalRecords: totalItems,
            pageNumber: pageNo,
            pageSize,
            success: true
        });
    }

    getById(id: number): Observable<TestRequestNabl | null> {
        return of(this.records.find(r => r.id === id) || null);
    }

    create(data: TestRequestNabl): Observable<TestRequestNablResponse> {
        const newRecord = { ...data, id: Date.now() };
        this.records.push(newRecord);
        return of({ status: 201, message: 'Created successfully', data: newRecord, success: true });
    }

    update(id: number, data: TestRequestNabl): Observable<TestRequestNablResponse> {
        const index = this.records.findIndex(r => r.id === id);
        if (index > -1) {
            this.records[index] = { ...data, id };
            return of({ status: 200, message: 'Updated successfully', data: this.records[index], success: true });
        }
        return of({ status: 404, message: 'Not found', data, success: false });
    }

    delete(id: number): Observable<any> {
        const index = this.records.findIndex(r => r.id === id);
        if (index > -1) {
            this.records.splice(index, 1);
            return of({ status: 200, message: 'Deleted successfully', success: true });
        }
        return of({ status: 404, message: 'Not found', success: false });
    }
}
