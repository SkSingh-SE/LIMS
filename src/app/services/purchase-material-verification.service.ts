import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { PurchaseMaterialVerification, PurchaseMaterialVerificationListResponse, PurchaseMaterialVerificationResponse } from '../models/purchaseMaterialVerificationModel';

@Injectable({
    providedIn: 'root'
})
export class PurchaseMaterialVerificationService {
    private dummyRecords: PurchaseMaterialVerification[] = [
        {
            id: 1,
            formatNo: 'F-25',
            documentNo: 'DMSPL-PMV-2025-001',
            issueNo: '01',
            revNo: '00',
            date: '2025-03-01',
            supplierName: 'Scientific Instruments Co.',
            invoiceNo: 'SIC/24-25/112',
            invoiceDate: '2025-02-28',
            grnNo: 'GRN/25/002',
            items: [
                { materialName: 'Digital Vernier Caliper', poNumber: 'PO/2025/005', verifiedQuantity: 2, observation: 'New, calibrated', verificationStatus: 'Pass' },
                { materialName: 'pH Buffer Solution pH 4.0', poNumber: 'PO/2025/005', verifiedQuantity: 5, observation: 'Sealed bottles', verificationStatus: 'Pass' }
            ],
            overallStatus: 'Accepted',
            remarks: '<p>All materials verified against PO specifications.</p>',
            verifiedBy: 'S. Gupta',
            approvedBy: 'Dr. A. Sharma',
            isActive: true
        }
    ];

    constructor() { }

    getAll(params?: any): Observable<PurchaseMaterialVerificationListResponse> {
        const pageNo = params?.PageNumber || 1;
        const pageSize = params?.PageSize || 10;
        const searchTerm = params?.searchTerm || '';

        let filteredRecords = [...this.dummyRecords];

        if (searchTerm) {
            filteredRecords = filteredRecords.filter(record =>
                record.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                record.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                record.documentNo.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        const totalRecords = filteredRecords.length;
        const startIndex = (pageNo - 1) * pageSize;
        const items = filteredRecords.slice(startIndex, startIndex + pageSize);

        return of({
            status: 200,
            message: 'Purchase material verification records retrieved successfully',
            items,
            totalRecords,
            pageNumber: pageNo,
            pageSize,
            success: true
        });
    }

    getById(id: number): Observable<PurchaseMaterialVerification | null> {
        const record = this.dummyRecords.find(r => r.id === id);
        return of(record || null);
    }

    create(data: PurchaseMaterialVerification): Observable<PurchaseMaterialVerificationResponse> {
        const newRecord = { ...data, id: Date.now() };
        this.dummyRecords.push(newRecord);
        return of({
            status: 201,
            message: 'Purchase material verification record created successfully',
            data: newRecord,
            success: true
        });
    }

    update(id: number, data: PurchaseMaterialVerification): Observable<PurchaseMaterialVerificationResponse> {
        const index = this.dummyRecords.findIndex(r => r.id === id);
        if (index > -1) {
            this.dummyRecords[index] = { ...data, id };
            return of({
                status: 200,
                message: 'Purchase material verification record updated successfully',
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

    delete(id: number): Observable<PurchaseMaterialVerificationResponse> {
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
            data: {} as PurchaseMaterialVerification,
            success: false
        });
    }
}
