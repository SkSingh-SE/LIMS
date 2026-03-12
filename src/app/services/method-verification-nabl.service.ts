import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { MethodVerificationNabl, MethodVerificationNablListResponse, MethodVerificationNablResponse } from '../models/methodVerificationNablModel';

@Injectable({
    providedIn: 'root'
})
export class MethodVerificationNablService {
    private records: MethodVerificationNabl[] = [
        {
            id: 1,
            formatNo: 'F-29',
            issueNo: '03',
            revNo: '00',
            date: '2021-06-01',
            documentNo: 'DMSPL/Level-04/Format/F-29',
            testMethodName: 'Chemical Analysis of Steel - Carbon Content',
            referenceStandard: 'ASTM E350',
            equipmentUsed: 'Carbon-Sulfur Analyzer (EQ-01)',
            matrix: 'Steel',
            range: '0.01% - 2.50%',
            performanceParameters: [
                { parameter: 'Accuracy', acceptanceCriteria: '± 5% of CRM', observedValue: '2.5% deviation', result: 'Pass' },
                { parameter: 'Precision (RSD)', acceptanceCriteria: '< 2%', observedValue: '0.8%', result: 'Pass' }
            ],
            rawData: [
                { sampleId: 'CRM-101', reading1: 0.152, reading2: 0.154, reading3: 0.151, mean: 0.152, sd: 0.0015, rsd: 1.0 }
            ],
            conclusion: 'The method is verified and found suitable for routine analysis.',
            preparedBy: 'Quality Analyst',
            reviewedBy: 'Technical Manager',
            approvedBy: 'Quality Manager',
            status: 'Active',
            createdOn: '2021-06-01'
        }
    ];

    constructor() { }

    getAll(params?: any): Observable<MethodVerificationNablListResponse> {
        const pageNo = params?.PageNumber || 1;
        const pageSize = params?.PageSize || 10;
        const searchTerm = params?.searchTerm || '';

        let filtered = [...this.records];
        if (searchTerm) {
            filtered = filtered.filter(r =>
                r.testMethodName.toLowerCase().includes(searchTerm.toLowerCase()) ||
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

    getById(id: number): Observable<MethodVerificationNabl | null> {
        return of(this.records.find(r => r.id === id) || null);
    }

    create(data: MethodVerificationNabl): Observable<MethodVerificationNablResponse> {
        const newRecord = { ...data, id: Date.now() };
        this.records.push(newRecord);
        return of({ status: 201, message: 'Created successfully', data: newRecord, success: true });
    }

    update(id: number, data: MethodVerificationNabl): Observable<MethodVerificationNablResponse> {
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
