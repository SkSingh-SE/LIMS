import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { SupplierEvaluationRecord, SupplierEvaluationRecordListResponse, SupplierEvaluationRecordResponse } from '../models/supplierEvaluationRecordModel';

@Injectable({
    providedIn: 'root'
})
export class SupplierEvaluationRecordService {
    private dummyRecords: SupplierEvaluationRecord[] = [
        {
            id: 1,
            formatNo: 'F-26',
            documentNo: 'DMSPL-SER-2025-001',
            issueNo: '01',
            revNo: '00',
            date: '2025-03-05',
            supplierName: 'Scientific Instruments Co.',
            contactPerson: 'Mr. Arvind Khanna',
            materialsSupplied: 'Lab Reagents & Glassware',
            evaluatingPeriodFrom: '2024-03-01',
            evaluatingPeriodTo: '2025-02-28',
            criteria: [
                { parameter: 'Quality of Materials Supplied', maxScore: 40, scoreObtained: 38, remarks: 'Consistently high quality' },
                { parameter: 'Delivery Compliance', maxScore: 30, scoreObtained: 28, remarks: 'Minor delays twice' },
                { parameter: 'Pricing & Commercial Terms', maxScore: 15, scoreObtained: 12, remarks: 'Slightly higher pricing' },
                { parameter: 'After Sales Support / Response', maxScore: 15, scoreObtained: 14, remarks: 'Good technical support' }
            ],
            totalScore: 92,
            maxPossibleScore: 100,
            percentageScore: 92,
            recommendation: 'Approved',
            generalRemarks: '<p>Supplier meets all requirements efficiently. Approved for the next year.</p>',
            evaluatedBy: 'R. K. Verma',
            approvedBy: 'Dr. A. Sharma',
            isActive: true
        }
    ];

    constructor() { }

    getAll(params?: any): Observable<SupplierEvaluationRecordListResponse> {
        const pageNo = params?.PageNumber || 1;
        const pageSize = params?.PageSize || 10;
        const searchTerm = params?.searchTerm || '';

        let filteredRecords = [...this.dummyRecords];

        if (searchTerm) {
            filteredRecords = filteredRecords.filter(record =>
                record.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                record.documentNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                record.recommendation.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        const totalRecords = filteredRecords.length;
        const startIndex = (pageNo - 1) * pageSize;
        const items = filteredRecords.slice(startIndex, startIndex + pageSize);

        return of({
            status: 200,
            message: 'Supplier evaluation records retrieved successfully',
            items,
            totalRecords,
            pageNumber: pageNo,
            pageSize,
            success: true
        });
    }

    getById(id: number): Observable<SupplierEvaluationRecord | null> {
        const record = this.dummyRecords.find(r => r.id === id);
        return of(record || null);
    }

    create(data: SupplierEvaluationRecord): Observable<SupplierEvaluationRecordResponse> {
        const newRecord = { ...data, id: Date.now() };
        this.dummyRecords.push(newRecord);
        return of({
            status: 201,
            message: 'Record created successfully',
            data: newRecord,
            success: true
        });
    }

    update(id: number, data: SupplierEvaluationRecord): Observable<SupplierEvaluationRecordResponse> {
        const index = this.dummyRecords.findIndex(r => r.id === id);
        if (index > -1) {
            this.dummyRecords[index] = { ...data, id };
            return of({
                status: 200,
                message: 'Record updated successfully',
                data: this.dummyRecords[index],
                success: true
            });
        }
        return of({
            status: 404,
            message: 'Record not found',
            data: data,
            success: false
        });
    }

    delete(id: number): Observable<SupplierEvaluationRecordResponse> {
        const index = this.dummyRecords.findIndex(r => r.id === id);
        if (index > -1) {
            const deletedRecord = this.dummyRecords.splice(index, 1)[0];
            return of({
                status: 200,
                message: 'Record deleted successfully',
                data: deletedRecord,
                success: true
            });
        }
        return of({
            status: 404,
            message: 'Record not found',
            data: {} as SupplierEvaluationRecord,
            success: false
        });
    }
}
