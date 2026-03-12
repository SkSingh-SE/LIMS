import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { SampleInwardRegisterNabl, SampleInwardRegisterNablListResponse, SampleInwardRegisterNablResponse } from '../models/sampleInwardRegisterNablModel';

@Injectable({
    providedIn: 'root'
})
export class SampleInwardRegisterNablService {
    private records: SampleInwardRegisterNabl[] = [
        {
            id: 1,
            formatNo: 'F-31',
            issueNo: '03',
            revNo: '00',
            date: '2021-06-01',
            documentNo: 'DMSPL/Level-04/Format/F-31',
            entries: [
                {
                    srNo: 1,
                    receiptDate: '2023-11-01',
                    sampleDescription: 'Stainless Steel Rod',
                    quantity: '2 Nos',
                    customerName: 'Steel Corp',
                    testRequestRef: 'TR/23/001',
                    targetCompletionDate: '2023-11-05',
                    remarks: 'Urgent'
                }
            ],
            preparedBy: 'Receptionist',
            reviewedBy: 'Quality Manager',
            status: 'Active',
            createdOn: '2021-06-01'
        }
    ];

    constructor() { }

    getAll(params?: any): Observable<SampleInwardRegisterNablListResponse> {
        const pageNo = params?.PageNumber || 1;
        const pageSize = params?.PageSize || 10;
        const searchTerm = params?.searchTerm || '';

        let filtered = [...this.records];
        if (searchTerm) {
            filtered = filtered.filter(r =>
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

    getById(id: number): Observable<SampleInwardRegisterNabl | null> {
        return of(this.records.find(r => r.id === id) || null);
    }

    create(data: SampleInwardRegisterNabl): Observable<SampleInwardRegisterNablResponse> {
        const newRecord = { ...data, id: Date.now() };
        this.records.push(newRecord);
        return of({ status: 201, message: 'Created successfully', data: newRecord, success: true });
    }

    update(id: number, data: SampleInwardRegisterNabl): Observable<SampleInwardRegisterNablResponse> {
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
