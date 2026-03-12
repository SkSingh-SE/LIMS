import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { SampleLabelNabl, SampleLabelNablListResponse, SampleLabelNablResponse } from '../models/sampleLabelNablModel';

@Injectable({
    providedIn: 'root'
})
export class SampleLabelNablService {
    private records: SampleLabelNabl[] = [
        {
            id: 1,
            formatNo: 'F-33',
            issueNo: '03',
            revNo: '00',
            sampleId: 'S-231101-01',
            receiptDate: '2023-11-01',
            description: 'Stainless Steel Rod',
            quantity: '2 Nos',
            testParameters: 'Chemical Analysis',
            preparedBy: 'Receptionist',
            status: 'Active',
            createdOn: '2023-11-01'
        }
    ];

    constructor() { }

    getAll(params?: any): Observable<SampleLabelNablListResponse> {
        const pageNo = params?.PageNumber || 1;
        const pageSize = params?.PageSize || 10;
        const searchTerm = params?.searchTerm || '';

        let filtered = [...this.records];
        if (searchTerm) {
            filtered = filtered.filter(r =>
                r.sampleId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.description.toLowerCase().includes(searchTerm.toLowerCase())
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

    getById(id: number): Observable<SampleLabelNabl | null> {
        return of(this.records.find(r => r.id === id) || null);
    }

    create(data: SampleLabelNabl): Observable<SampleLabelNablResponse> {
        const newRecord = { ...data, id: Date.now() };
        this.records.push(newRecord);
        return of({ status: 201, message: 'Created successfully', data: newRecord, success: true });
    }

    update(id: number, data: SampleLabelNabl): Observable<SampleLabelNablResponse> {
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
