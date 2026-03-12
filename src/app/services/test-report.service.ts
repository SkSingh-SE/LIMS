import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { TestReport, TestReportListResponse, TestReportResponse } from '../models/testReportModel';

@Injectable({
    providedIn: 'root'
})
export class TestReportService {
    private records: TestReport[] = [
        {
            id: 1,
            formatNo: 'F-39',
            issueNo: '01',
            revNo: '00',
            documentNo: 'TC-2025-08129',
            dateOfIssue: '2025-08-15',
            customerName: 'XYZ Construction Pvt Ltd',
            customerAddress: 'Plot No 45, Industrial Area, Phase II, New Delhi',
            customerReference: 'PO-4599-25 dated 10-Aug-2025',
            sampleDescription: 'TMT Rebar Fe 500D (12mm dia)',
            sampleId: 'TRN-25-1042',
            conditionOnReceipt: 'Satisfactory',
            quantity: '3 Pieces (1m each)',
            heatNoBatchNo: 'H-9821',
            dateOfReceipt: '2025-08-11',
            dateOfTesting: '2025-08-12 to 2025-08-14',
            environmentalConditions: 'Temperature: 25±2°C, Humidity: 55±5% RH',
            results: [
                {
                    srNo: 1,
                    testParameter: 'Yield Stress',
                    testMethod: 'IS 1608 (Part 1):2018',
                    result: '525.4',
                    unit: 'N/mm²',
                    requirement: 'Min 500.0'
                },
                {
                    srNo: 2,
                    testParameter: 'Tensile Strength',
                    testMethod: 'IS 1608 (Part 1):2018',
                    result: '612.8',
                    unit: 'N/mm²',
                    requirement: 'Min 565.0'
                },
                {
                    srNo: 3,
                    testParameter: '% Elongation',
                    testMethod: 'IS 1608 (Part 1):2018',
                    result: '18.5',
                    unit: '%',
                    requirement: 'Min 16.0'
                }
            ],
            remarks: '<p>The tested sample <strong>conforms</strong> to the requirements of IS 1786:2008 for Fe 500D grade with respect to the above parameters tested.</p>',
            statementOfConformity: 'Conforming',
            preparedBy: 'Lab Technician',
            reviewedBy: 'Technical Manager',
            approvedBy: 'Quality Director',
            status: 'Approved',
            createdOn: '2025-08-15'
        }
    ];

    constructor() { }

    getAll(params?: any): Observable<TestReportListResponse> {
        const pageNo = params?.PageNumber || 1;
        const pageSize = params?.PageSize || 10;
        const searchTerm = params?.searchTerm || '';

        let filtered = [...this.records];
        if (searchTerm) {
            filtered = filtered.filter(r =>
                r.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.documentNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.sampleDescription.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        const totalItems = filtered.length;
        const items = filtered.slice((pageNo - 1) * pageSize, pageNo * pageSize);

        return of({ status: 200, message: 'Records retrieved successfully', items, totalRecords: totalItems, pageNumber: pageNo, pageSize, success: true });
    }

    getById(id: number): Observable<TestReport | null> {
        return of(this.records.find(r => r.id === id) || null);
    }

    create(data: TestReport): Observable<TestReportResponse> {
        const newRecord = { ...data, id: Date.now() };
        this.records.push(newRecord);
        return of({ status: 201, message: 'Created successfully', data: newRecord, success: true });
    }

    update(id: number, data: TestReport): Observable<TestReportResponse> {
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
