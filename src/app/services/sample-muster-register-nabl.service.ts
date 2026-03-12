import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { SampleMusterRegisterNabl, SampleMusterRegisterNablListResponse, SampleMusterRegisterNablResponse } from '../models/sampleMusterRegisterNablModel';

@Injectable({
    providedIn: 'root'
})
export class SampleMusterRegisterNablService {
    private records: SampleMusterRegisterNabl[] = [
        {
            id: 1,
            formatNo: 'F-32',
            issueNo: '03',
            revNo: '00',
            date: '2021-06-01',
            documentNo: 'DMSPL/Level-04/Format/F-32',
            entries: [
                {
                    srNo: 1,
                    sampleId: 'S-231101-01',
                    receiptDate: '2023-11-01',
                    description: 'Stainless Steel Rod',
                    testParameters: 'Chemical Analysis',
                    analystName: 'John Doe',
                    analysisStartDate: '2023-11-02',
                    analysisEndDate: '2023-11-04',
                    status: 'Completed',
                    remarks: 'Passed'
                }
            ],
            preparedBy: 'Lab Incharge',
            reviewedBy: 'Technical Manager',
            status: 'Active',
            createdOn: '2021-06-01'
        }
    ];

    constructor() { }

    getAll(params?: any): Observable<SampleMusterRegisterNablListResponse> {
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

    getById(id: number): Observable<SampleMusterRegisterNabl | null> {
        return of(this.records.find(r => r.id === id) || null);
    }

    create(data: SampleMusterRegisterNabl): Observable<SampleMusterRegisterNablResponse> {
        const newRecord = { ...data, id: Date.now() };
        this.records.push(newRecord);
        return of({ status: 201, message: 'Created successfully', data: newRecord, success: true });
    }

    update(id: number, data: SampleMusterRegisterNabl): Observable<SampleMusterRegisterNablResponse> {
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
