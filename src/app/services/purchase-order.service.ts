import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { PurchaseOrder, PurchaseOrderListResponse, PurchaseOrderResponse } from '../models/purchaseOrderModel';

@Injectable({
    providedIn: 'root'
})
export class PurchaseOrderService {
    private dummyRecords: PurchaseOrder[] = [
        {
            id: 1,
            formatNo: 'F-22',
            documentNo: 'DMSPL-PO-2025-001',
            issueNo: '01',
            revNo: '00',
            date: '2025-02-05',
            supplierName: 'Global Chemical Supplies',
            supplierAddress: '123 Industrial Area, Mumbai',
            indentNo: 'DMSPL-PI-2025-001',
            poType: 'Regular',
            currency: 'INR',
            items: [
                { description: 'Conical Flask 250ml', quantity: 20, unitOfMeasure: 'Nos', unitPrice: 150, totalAmount: 3000 },
                { description: 'Whatman Filter Paper Grade 1', quantity: 5, unitOfMeasure: 'Box', unitPrice: 1200, totalAmount: 6000 }
            ],
            totalAmount: 9000,
            gstAmount: 1620,
            grandTotal: 10620,
            termsAndConditions: '<p>1. Delivery within 15 days.</p><p>2. Payment after verification.</p>',
            deliveryDate: '2025-02-20',
            paymentTerms: '30 Days Net',
            preparedBy: 'M. Sharma',
            authorizedBy: 'K. Jha',
            status: 'Sent',
            isActive: true
        }
    ];

    constructor() { }

    getAll(params?: any): Observable<PurchaseOrderListResponse> {
        const pageNo = params?.PageNumber || 1;
        const pageSize = params?.PageSize || 10;
        const searchTerm = params?.searchTerm || '';

        let filteredRecords = [...this.dummyRecords];

        if (searchTerm) {
            filteredRecords = filteredRecords.filter(record =>
                record.documentNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                record.supplierName.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        const totalRecords = filteredRecords.length;
        const startIndex = (pageNo - 1) * pageSize;
        const items = filteredRecords.slice(startIndex, startIndex + pageSize);

        return of({
            status: 200,
            message: 'Purchase orders retrieved successfully',
            items,
            totalRecords,
            pageNumber: pageNo,
            pageSize,
            success: true
        });
    }

    getById(id: number): Observable<PurchaseOrder | null> {
        const record = this.dummyRecords.find(r => r.id === id);
        return of(record || null);
    }

    create(data: PurchaseOrder): Observable<PurchaseOrderResponse> {
        const newRecord = { ...data, id: Date.now() };
        this.dummyRecords.push(newRecord);
        return of({
            status: 201,
            message: 'Purchase order created successfully',
            data: newRecord,
            success: true
        });
    }

    update(id: number, data: PurchaseOrder): Observable<PurchaseOrderResponse> {
        const index = this.dummyRecords.findIndex(r => r.id === id);
        if (index > -1) {
            this.dummyRecords[index] = { ...data, id };
            return of({
                status: 200,
                message: 'Purchase order updated successfully',
                data: this.dummyRecords[index],
                success: true
            });
        }
        return of({
            status: 404,
            message: 'Purchase order not found',
            data: data,
            success: false
        });
    }

    delete(id: number): Observable<PurchaseOrderResponse> {
        const index = this.dummyRecords.findIndex(r => r.id === id);
        if (index > -1) {
            const deletedRecord = this.dummyRecords.splice(index, 1)[0];
            return of({
                status: 200,
                message: 'Purchase order deleted successfully',
                data: deletedRecord,
                success: true
            });
        }
        return of({
            status: 404,
            message: 'Purchase order not found',
            data: {} as PurchaseOrder,
            success: false
        });
    }
}
