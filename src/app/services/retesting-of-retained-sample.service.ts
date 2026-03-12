import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { RetestingOfRetainedSample, RetestingOfRetainedSampleListResponse, RetestingOfRetainedSampleResponse } from '../models/retestingOfRetainedSampleModel';

@Injectable({
    providedIn: 'root'
})
export class RetestingOfRetainedSampleService {
    private records: RetestingOfRetainedSample[] = [
        {
            id: 1,
            formatNo: 'F-38',
            issueNo: '01',
            revNo: '00',
            date: '2025-06-12',
            documentNo: 'RRS-2025-001',
            discipline: 'Mechanical',
            groupSubgroup: 'Metals & Alloys',
            sampleName: 'TMT Bar 12mm',
            originalSampleId: 'TRN-2025-1045',
            dateOfOriginalTesting: '2025-05-10',
            dateOfRetesting: '2025-06-12',
            parameters: [
                {
                    srNo: 1,
                    parameterTested: 'Yield Stress',
                    originalResult: '520 MPa',
                    retestResult: '518 MPa',
                    acceptableLimits: '± 5% variation',
                    deviation: '-0.38%',
                    status: 'Satisfactory'
                },
                {
                    srNo: 2,
                    parameterTested: 'Tensile Strength',
                    originalResult: '610 MPa',
                    retestResult: '615 MPa',
                    acceptableLimits: '± 5% variation',
                    deviation: '+0.82%',
                    status: 'Satisfactory'
                }
            ],
            remarks: 'Retesting results are well within acceptable limits of reproducibility.',
            analyst: 'Rahul Singh',
            authorizedSignatory: 'Deepak Kumar',
            status: 'Completed',
            createdOn: '2025-06-12'
        }
    ];

    constructor() { }

    getAll(params?: any): Observable<RetestingOfRetainedSampleListResponse> {
        const pageNo = params?.PageNumber || 1;
        const pageSize = params?.PageSize || 10;
        const searchTerm = params?.searchTerm || '';

        let filtered = [...this.records];
        if (searchTerm) {
            filtered = filtered.filter(r =>
                r.sampleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.documentNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.originalSampleId.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        const totalItems = filtered.length;
        const items = filtered.slice((pageNo - 1) * pageSize, pageNo * pageSize);

        return of({ status: 200, message: 'Records retrieved successfully', items, totalRecords: totalItems, pageNumber: pageNo, pageSize, success: true });
    }

    getById(id: number): Observable<RetestingOfRetainedSample | null> {
        return of(this.records.find(r => r.id === id) || null);
    }

    create(data: RetestingOfRetainedSample): Observable<RetestingOfRetainedSampleResponse> {
        const newRecord = { ...data, id: Date.now() };
        this.records.push(newRecord);
        return of({ status: 201, message: 'Created successfully', data: newRecord, success: true });
    }

    update(id: number, data: RetestingOfRetainedSample): Observable<RetestingOfRetainedSampleResponse> {
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
