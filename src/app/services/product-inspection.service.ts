import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { ProductInspection, ProductInspectionListResponse, ProductInspectionResponse } from '../models/productInspectionModel';

@Injectable({
    providedIn: 'root'
})
export class ProductInspectionService {
    private dummyRecords: ProductInspection[] = [
        {
            id: 1,
            formatNo: 'F-23',
            documentNo: 'DMSPL-IP-2025-001',
            issueNo: '01',
            revNo: '00',
            date: '2025-02-10',
            productName: 'Glass Beakers',
            productCode: 'GL-BK-01',
            category: 'Product',
            inspectionStage: 'Incoming',
            parameters: [
                {
                    parameterName: 'Visual Clarity',
                    requirement: 'No air bubbles or cracks',
                    methodOfCheck: 'Visual Inspection',
                    frequency: 'Every Batch',
                    acceptanceCriteria: '100% Clear'
                },
                {
                    parameterName: 'Dimensional Accuracy',
                    requirement: 'Height 150mm ± 1mm',
                    methodOfCheck: 'Vernier Caliper',
                    frequency: '5% of Batch',
                    acceptanceCriteria: 'Within Tolerance'
                }
            ],
            remarks: '<p>Standard inspection plan for laboratory glassware.</p>',
            preparedBy: 'J. Doe',
            reviewedBy: 'A. Smith',
            approvedBy: 'R. Wilson',
            status: 'Approved',
            isActive: true
        }
    ];

    constructor() { }

    getAll(params?: any): Observable<ProductInspectionListResponse> {
        const pageNo = params?.PageNumber || 1;
        const pageSize = params?.PageSize || 10;
        const searchTerm = params?.searchTerm || '';

        let filteredRecords = [...this.dummyRecords];

        if (searchTerm) {
            filteredRecords = filteredRecords.filter(record =>
                record.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                record.productCode.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        const totalRecords = filteredRecords.length;
        const startIndex = (pageNo - 1) * pageSize;
        const items = filteredRecords.slice(startIndex, startIndex + pageSize);

        return of({
            status: 200,
            message: 'Inspection plans retrieved successfully',
            items,
            totalRecords,
            pageNumber: pageNo,
            pageSize,
            success: true
        });
    }

    getById(id: number): Observable<ProductInspection | null> {
        const record = this.dummyRecords.find(r => r.id === id);
        return of(record || null);
    }

    create(data: ProductInspection): Observable<ProductInspectionResponse> {
        const newRecord = { ...data, id: Date.now() };
        this.dummyRecords.push(newRecord);
        return of({
            status: 201,
            message: 'Inspection plan created successfully',
            data: newRecord,
            success: true
        });
    }

    update(id: number, data: ProductInspection): Observable<ProductInspectionResponse> {
        const index = this.dummyRecords.findIndex(r => r.id === id);
        if (index > -1) {
            this.dummyRecords[index] = { ...data, id };
            return of({
                status: 200,
                message: 'Inspection plan updated successfully',
                data: this.dummyRecords[index],
                success: true
            });
        }
        return of({
            status: 404,
            message: 'Inspection plan not found',
            data: data,
            success: false
        });
    }

    delete(id: number): Observable<ProductInspectionResponse> {
        const index = this.dummyRecords.findIndex(r => r.id === id);
        if (index > -1) {
            const deletedRecord = this.dummyRecords.splice(index, 1)[0];
            return of({
                status: 200,
                message: 'Inspection plan deleted successfully',
                data: deletedRecord,
                success: true
            });
        }
        return of({
            status: 404,
            message: 'Inspection plan not found',
            data: {} as ProductInspection,
            success: false
        });
    }
}
