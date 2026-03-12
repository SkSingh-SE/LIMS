import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { TechnicalRawDataNabl, TechnicalRawDataNablListResponse, TechnicalRawDataNablResponse } from '../models/technicalRawDataNablModel';

@Injectable({
    providedIn: 'root'
})
export class TechnicalRawDataNablService {
    private records: TechnicalRawDataNabl[] = [
        {
            id: 1,
            formatNo: 'F-34',
            issueNo: '03',
            revNo: '00',
            date: '2023-11-01',
            testMethodName: 'Chemical Analysis - OES',
            testMethodRef: 'IS 228 Part-1',
            equipmentUsed: 'Optical Emission Spectrometer',
            sampleDescription: 'Stainless Steel Rod',
            analystName: 'John Doe',
            readings: [
                { srNo: 1, sampleId: 'S-231101-01', parameter: 'C %', unit: '%', reading1: 0.045, reading2: 0.046, reading3: 0.044, mean: 0.045, sd: 0.001, rsd: 2.22, remarks: '' }
            ],
            conclusion: 'All readings are within acceptable limits.',
            preparedBy: 'Lab Analyst',
            issuedBy: 'Quality Manager',
            reviewedApprovedBy: 'Technical Manager',
            status: 'Active',
            createdOn: '2023-11-01'
        }
    ];

    constructor() { }

    getAll(params?: any): Observable<TechnicalRawDataNablListResponse> {
        const pageNo = params?.PageNumber || 1;
        const pageSize = params?.PageSize || 10;
        const searchTerm = params?.searchTerm || '';

        let filtered = [...this.records];
        if (searchTerm) {
            filtered = filtered.filter(r =>
                r.testMethodName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.analystName.toLowerCase().includes(searchTerm.toLowerCase())
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

    getById(id: number): Observable<TechnicalRawDataNabl | null> {
        return of(this.records.find(r => r.id === id) || null);
    }

    create(data: TechnicalRawDataNabl): Observable<TechnicalRawDataNablResponse> {
        const newRecord = { ...data, id: Date.now() };
        this.records.push(newRecord);
        return of({ status: 201, message: 'Created successfully', data: newRecord, success: true });
    }

    update(id: number, data: TechnicalRawDataNabl): Observable<TechnicalRawDataNablResponse> {
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
