import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { IncomingMaterial, IncomingMaterialListResponse, IncomingMaterialResponse } from '../models/incomingMaterialModel';

@Injectable({
    providedIn: 'root'
})
export class IncomingMaterialService {
    private dummyRecords: IncomingMaterial[] = [
        {
            id: 1,
            formatNo: 'F-24',
            documentNo: 'DMSPL-IM-2025-001',
            issueNo: '01',
            revNo: '00',
            date: '2025-02-15',
            materialName: 'Sodium Chloride (AR Grade)',
            materialCode: 'CHEM-001',
            supplierName: 'Merck India Ltd',
            batchNo: 'B240120',
            quantityReceived: 50,
            unitOfMeasure: 'Kg',
            invoiceNo: 'MER/2025/456',
            invoiceDate: '2025-02-10',
            grnNo: 'GRN/25/001',
            results: [
                { parameterName: 'Physical Appearance', requirement: 'White Crystalline Powder', observation: 'Complies', result: 'Pass' },
                { parameterName: 'Assay (%)', requirement: 'Min 99.5%', observation: '99.8%', result: 'Pass' },
                { parameterName: 'Moisture', requirement: 'Max 0.1%', observation: '0.04%', result: 'Pass' }
            ],
            inspectionStatus: 'Accepted',
            deviations: '<p>None</p>',
            correctiveActions: '<p>N/A</p>',
            inspectedBy: 'R. K. Verma',
            verifiedBy: 'S. Gupta',
            isActive: true
        }
    ];

    constructor() { }

    getAll(params?: any): Observable<IncomingMaterialListResponse> {
        const pageNo = params?.PageNumber || 1;
        const pageSize = params?.PageSize || 10;
        const searchTerm = params?.searchTerm || '';

        let filteredRecords = [...this.dummyRecords];

        if (searchTerm) {
            filteredRecords = filteredRecords.filter(record =>
                record.materialName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                record.batchNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                record.supplierName.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        const totalRecords = filteredRecords.length;
        const startIndex = (pageNo - 1) * pageSize;
        const items = filteredRecords.slice(startIndex, startIndex + pageSize);

        return of({
            status: 200,
            message: 'Incoming material records retrieved successfully',
            items,
            totalRecords,
            pageNumber: pageNo,
            pageSize,
            success: true
        });
    }

    getById(id: number): Observable<IncomingMaterial | null> {
        const record = this.dummyRecords.find(r => r.id === id);
        return of(record || null);
    }

    create(data: IncomingMaterial): Observable<IncomingMaterialResponse> {
        const newRecord = { ...data, id: Date.now() };
        this.dummyRecords.push(newRecord);
        return of({
            status: 201,
            message: 'Incoming material record created successfully',
            data: newRecord,
            success: true
        });
    }

    update(id: number, data: IncomingMaterial): Observable<IncomingMaterialResponse> {
        const index = this.dummyRecords.findIndex(r => r.id === id);
        if (index > -1) {
            this.dummyRecords[index] = { ...data, id };
            return of({
                status: 200,
                message: 'Incoming material record updated successfully',
                data: this.dummyRecords[index],
                success: true
            });
        }
        return of({
            status: 404,
            message: 'Incoming material record not found',
            data: data,
            success: false
        });
    }

    delete(id: number): Observable<IncomingMaterialResponse> {
        const index = this.dummyRecords.findIndex(r => r.id === id);
        if (index > -1) {
            const deletedRecord = this.dummyRecords.splice(index, 1)[0];
            return of({
                status: 200,
                message: 'Incoming material record deleted successfully',
                data: deletedRecord,
                success: true
            });
        }
        return of({
            status: 404,
            message: 'Incoming material record not found',
            data: {} as IncomingMaterial,
            success: false
        });
    }
}
