import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { TestMethodNabl, TestMethodNablListResponse, TestMethodNablResponse } from '../models/testMethodNablModel';

@Injectable({
    providedIn: 'root'
})
export class TestMethodNablService {
    private records: TestMethodNabl[] = [
        {
            id: 1,
            formatNo: 'F-28',
            issueNo: '03',
            revNo: '00',
            date: '2021-10-01',
            documentNo: 'DMSPL/Level-04/Format/F-28',
            listType: 'Test Method',
            title: 'LIST OF TEST METHOD (CHEMICAL ANALYSIS)',
            entries: [
                { srNo: 1, specificationCode: 'ASTM E1086 2014', details: 'Standard test method for analysis of austenitic stainless steel by spark atomic emission spectrometry' },
                { srNo: 2, specificationCode: 'ASTM E1251 17a', details: 'Standard test method for analysis of aluminum and aluminum alloys by spark atomic emission spectrometry' }
            ],
            preparedBy: 'General Manager',
            issuedBy: 'Quality Manager',
            reviewedBy: 'Managing Director',
            status: 'Active',
            createdOn: '2021-10-01'
        }
    ];

    constructor() { }

    getAll(params?: any): Observable<TestMethodNablListResponse> {
        const pageNo = params?.PageNumber || 1;
        const pageSize = params?.PageSize || 10;
        const searchTerm = params?.searchTerm || '';

        let filtered = [...this.records];
        if (searchTerm) {
            filtered = filtered.filter(r =>
                r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
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

    getById(id: number): Observable<TestMethodNabl | null> {
        return of(this.records.find(r => r.id === id) || null);
    }

    create(data: TestMethodNabl): Observable<TestMethodNablResponse> {
        const newRecord = { ...data, id: Date.now() };
        this.records.push(newRecord);
        return of({ status: 201, message: 'Created successfully', data: newRecord, success: true });
    }

    update(id: number, data: TestMethodNabl): Observable<TestMethodNablResponse> {
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
