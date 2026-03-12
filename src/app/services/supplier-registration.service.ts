import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { SupplierRegistration, SupplierRegistrationListResponse, SupplierRegistrationResponse } from '../models/supplierRegistrationModel';

@Injectable({
    providedIn: 'root'
})
export class SupplierRegistrationService {
    private dummyRecords: SupplierRegistration[] = [
        {
            id: 1,
            formatNo: 'F-19',
            documentNo: 'SR-2025-001',
            issueNo: '01',
            revNo: '00',
            date: '2025-01-10',

            supplierName: 'Scientific Solutions Pvt Ltd',
            address: 'Plot 45, Industrial Area, Mumbai - 400001',
            contactPerson: 'Mr. Rajesh Kumar',
            designation: 'Sales Manager',
            mobileNo: '9876543210',
            email: 'sales@scisolutions.com',
            website: 'www.scisolutions.com',

            natureOfBusiness: 'Manufacturer',
            productsServicesOffered: 'Chemical Reagents, Lab Glassware',
            gstNo: '27AAACS1234A1Z1',
            panNo: 'AAACS1234A',
            isoCertified: true,
            isoDetails: 'ISO 9001:2015 Certified',

            bankDetails: {
                bankName: 'HDFC Bank',
                accountNo: '50100234567890',
                ifscCode: 'HDFC0001234',
                branch: 'Mumbai Main'
            },

            documentsSubmitted: {
                gstCertificate: true,
                panCard: true,
                isoCertificate: true,
                cancelledCheque: true,
                msmeCertificate: false
            },

            registrationStatus: 'Approved',
            recordedBy: 'Admin',
            createdBy: 'Admin',
            createdOn: '2025-01-10',
            isActive: true
        }
    ];

    constructor() { }

    getAll(params?: any): Observable<SupplierRegistrationListResponse> {
        const pageNo = params?.PageNumber || 1;
        const pageSize = params?.PageSize || 10;
        const searchTerm = params?.searchTerm || '';

        let filteredRecords = [...this.dummyRecords];

        if (searchTerm) {
            filteredRecords = filteredRecords.filter(record =>
                record.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                record.gstNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                record.contactPerson.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        const totalRecords = filteredRecords.length;
        const startIndex = (pageNo - 1) * pageSize;
        const items = filteredRecords.slice(startIndex, startIndex + pageSize);

        return of({
            status: 200,
            message: 'Supplier registration records retrieved successfully',
            items,
            totalRecords,
            pageNumber: pageNo,
            pageSize,
            success: true
        });
    }

    getById(id: number): Observable<SupplierRegistration | null> {
        const record = this.dummyRecords.find(r => r.id === id);
        return of(record || null);
    }

    create(data: SupplierRegistration): Observable<SupplierRegistrationResponse> {
        const newRecord = { ...data, id: Date.now() };
        this.dummyRecords.push(newRecord);
        return of({
            status: 201,
            message: 'Supplier registration record created successfully',
            data: newRecord,
            success: true
        });
    }

    update(id: number, data: SupplierRegistration): Observable<SupplierRegistrationResponse> {
        const index = this.dummyRecords.findIndex(r => r.id === id);
        if (index > -1) {
            this.dummyRecords[index] = { ...data, id };
            return of({
                status: 200,
                message: 'Supplier registration record updated successfully',
                data: this.dummyRecords[index],
                success: true
            });
        }
        return of({
            status: 404,
            message: 'Supplier registration record not found',
            data: data,
            success: false
        });
    }

    delete(id: number): Observable<SupplierRegistrationResponse> {
        const index = this.dummyRecords.findIndex(r => r.id === id);
        if (index > -1) {
            const deletedRecord = this.dummyRecords.splice(index, 1)[0];
            return of({
                status: 200,
                message: 'Supplier registration record deleted successfully',
                data: deletedRecord,
                success: true
            });
        }
        return of({
            status: 404,
            message: 'Supplier registration record not found',
            data: {} as SupplierRegistration,
            success: false
        });
    }
}
