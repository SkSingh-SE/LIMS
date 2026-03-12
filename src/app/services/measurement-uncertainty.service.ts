import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { MeasurementUncertainty, MeasurementUncertaintyListResponse, MeasurementUncertaintyResponse } from '../models/measurementUncertaintyModel';

@Injectable({
    providedIn: 'root'
})
export class MeasurementUncertaintyService {
    private records: MeasurementUncertainty[] = [
        {
            id: 1,
            formatNo: 'F-35',
            issueNo: '01',
            revNo: '00',
            date: '2025-08-10',
            documentNo: 'MU-2025-001',
            testParameter: 'Tensile Strength',
            testMethod: 'IS 2062:2011',
            equipmentUsed: 'UTM 400 KN (FIE Make)',
            sampleDescription: 'MS Flat 25mm x 12mm',
            numberOfReadings: 10,
            readings: [
                { srNo: 1, measuredValue: 415.2, unit: 'MPa' },
                { srNo: 2, measuredValue: 416.1, unit: 'MPa' },
                { srNo: 3, measuredValue: 414.8, unit: 'MPa' },
                { srNo: 4, measuredValue: 415.5, unit: 'MPa' },
                { srNo: 5, measuredValue: 416.3, unit: 'MPa' }
            ],
            mean: 415.58,
            standardDeviation: 0.62,
            typeAUncertainty: 0.277,
            typeBUncertainty: 0.289,
            combinedUncertainty: 0.40,
            expandedUncertainty: 0.80,
            coverageFactor: 2,
            effectiveDegreesOfFreedom: 9,
            confidenceLevel: '95%',
            uncertaintySources: [
                { source: 'Repeatability', type: 'Type A', distribution: 'Normal', standardUncertainty: 0.277, sensitivityCoefficient: 1, contribution: 0.0767 },
                { source: 'Resolution of UTM', type: 'Type B', distribution: 'Rectangular', standardUncertainty: 0.144, sensitivityCoefficient: 1, contribution: 0.0207 },
                { source: 'Calibration of UTM', type: 'Type B', distribution: 'Normal', standardUncertainty: 0.25, sensitivityCoefficient: 1, contribution: 0.0625 }
            ],
            remarks: 'Measurement performed as per ISO 17025 requirements',
            preparedBy: 'Lab Technician',
            reviewedBy: 'Quality Manager',
            approvedBy: 'Lab Director',
            status: 'Completed',
            createdOn: '2025-08-10'
        }
    ];

    constructor() { }

    getAll(params?: any): Observable<MeasurementUncertaintyListResponse> {
        const pageNo = params?.PageNumber || 1;
        const pageSize = params?.PageSize || 10;
        const searchTerm = params?.searchTerm || '';

        let filtered = [...this.records];
        if (searchTerm) {
            filtered = filtered.filter(r =>
                r.testParameter.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.documentNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.testMethod.toLowerCase().includes(searchTerm.toLowerCase())
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

    getById(id: number): Observable<MeasurementUncertainty | null> {
        return of(this.records.find(r => r.id === id) || null);
    }

    create(data: MeasurementUncertainty): Observable<MeasurementUncertaintyResponse> {
        const newRecord = { ...data, id: Date.now() };
        this.records.push(newRecord);
        return of({ status: 201, message: 'Created successfully', data: newRecord, success: true });
    }

    update(id: number, data: MeasurementUncertainty): Observable<MeasurementUncertaintyResponse> {
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
