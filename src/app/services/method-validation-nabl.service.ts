import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { MethodValidationNabl, MethodValidationNablListResponse, MethodValidationNablResponse } from '../models/methodValidationNablModel';

@Injectable({
    providedIn: 'root'
})
export class MethodValidationNablService {
    private records: MethodValidationNabl[] = [
        {
            id: 1,
            formatNo: 'F-30',
            issueNo: '03',
            revNo: '00',
            date: '2021-06-01',
            documentNo: 'DMSPL/Level-04/Format/F-30',
            testMethodName: 'Analysis of Trace Metals by ICP-OES',
            scope: 'Environmental and Industrial Samples',
            equipmentUsed: 'ICP-OES (EQ-45)',
            reagentsUsed: 'Nitric Acid (AR Grade), Multielement Standards',
            validationParameters: [
                { parameter: 'Specificity', description: 'Checking for interference', acceptanceCriteria: 'No significant peak overlap', observedValue: 'No overlap observed', result: 'Pass' },
                { parameter: 'LOD', description: 'Limit of Detection', acceptanceCriteria: '< 0.05 ppm', observedValue: '0.02 ppm', result: 'Pass' }
            ],
            summaryOfResults: 'All parameters validated successfully within defined criteria.',
            conclusion: 'The method is validated and fit for the intended use.',
            preparedBy: 'Senior Chemist',
            reviewedBy: 'Technical Manager',
            approvedBy: 'Quality Manager',
            status: 'Active',
            createdOn: '2021-06-01'
        }
    ];

    constructor() { }

    getAll(params?: any): Observable<MethodValidationNablListResponse> {
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

    getById(id: number): Observable<MethodValidationNabl | null> {
        return of(this.records.find(r => r.id === id) || null);
    }

    create(data: MethodValidationNabl): Observable<MethodValidationNablResponse> {
        const newRecord = { ...data, id: Date.now() };
        this.records.push(newRecord);
        return of({ status: 201, message: 'Created successfully', data: newRecord, success: true });
    }

    update(id: number, data: MethodValidationNabl): Observable<MethodValidationNablResponse> {
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
