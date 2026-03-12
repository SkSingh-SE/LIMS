import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { ResponsibilityAuthorityMatrix, ResponsibilityAuthorityMatrixResponse } from '../models/responsibilityAuthorityMatrixModel';

@Injectable({
    providedIn: 'root'
})
export class ResponsibilityAuthorityService {

    private nextId = 3;

    private dummyData: ResponsibilityAuthorityMatrix[] = [
        {
            id: 1,
            designationId: 4,
            designationName: 'General Manager',
            formatNo: 'F-4',
            issueNo: '01',
            date: '2025-01-01',
            revNo: '00',
            responsibilities:
                '<ul><li>Ensuring compliance with ISO/IEC 17025:2017.</li>' +
                '<li>Ensuring that the management system is implemented and followed at all times.</li>' +
                '<li>Providing necessary resources for the laboratory activities.</li>' +
                '<li>Maintaining customer satisfaction and handling complaints.</li>' +
                '<li>Reporting to the top management on the performance of the QMS.</li></ul>',
            authorities:
                '<ul><li>Signing of the Test Reports.</li>' +
                '<li>Handling the non-conforming Testing.</li>' +
                '<li>Approval of laboratory budget and resource allocation.</li>' +
                '<li>Suspending lab operations in case of serious technical issues.</li></ul>',
            employeeAccepted: true,
            acceptanceTimestamp: '2025-01-02T10:00:00Z',
            preparedBy: 'General Manager',
            issuedBy: 'Quality Manager',
            reviewedApprovedBy: 'Managing Director',
            createdBy: 'Admin',
            createdOn: '2025-01-01T09:00:00Z',
            isActive: true
        },
        {
            id: 2,
            designationId: 3,
            designationName: 'Quality Manager',
            formatNo: 'F-4',
            issueNo: '01',
            date: '2025-01-01',
            revNo: '00',
            responsibilities:
                '<ul><li>Implementation and maintenance of the Quality Management System.</li>' +
                '<li>Organizing internal audits and management review meetings.</li>' +
                '<li>Liaising with NABL and other accreditation bodies.</li>' +
                '<li>Ensuring that all quality-related documents are controlled.</li></ul>',
            authorities:
                '<ul><li>Approving quality procedures and SOPs.</li>' +
                '<li>Authorizing the release of quality records.</li>' +
                '<li>Identifying and initiating actions to prevent occurrences of non-conformities.</li></ul>',
            employeeAccepted: false,
            preparedBy: 'General Manager',
            issuedBy: 'Quality Manager',
            reviewedApprovedBy: 'Managing Director',
            createdBy: 'Admin',
            createdOn: '2025-01-01T09:30:00Z',
            isActive: true
        }
    ];

    constructor() { }

    getAll(filter: any): Observable<ResponsibilityAuthorityMatrixResponse> {
        let filtered = [...this.dummyData];

        if (filter.searchTerm) {
            const term = filter.searchTerm.toLowerCase();
            filtered = filtered.filter(
                item =>
                    item.designationName?.toLowerCase().includes(term) ||
                    item.formatNo.toLowerCase().includes(term) ||
                    item.issueNo.toLowerCase().includes(term)
            );
        }

        const totalRecords = filtered.length;
        const pageNumber = filter.PageNumber || 1;
        const pageSize = filter.PageSize || 10;
        const start = (pageNumber - 1) * pageSize;
        const items = filtered.slice(start, start + pageSize);

        return of({
            items,
            totalRecords,
            pageNumber,
            pageSize
        });
    }

    getById(id: number): Observable<ResponsibilityAuthorityMatrix | undefined> {
        return of(this.dummyData.find(item => item.id === id));
    }

    getByDesignationId(designationId: number): Observable<ResponsibilityAuthorityMatrix | undefined> {
        return of(this.dummyData.find(item => item.designationId === designationId));
    }

    create(data: ResponsibilityAuthorityMatrix): Observable<any> {
        const newItem: ResponsibilityAuthorityMatrix = {
            ...data,
            id: this.nextId++,
            createdBy: 'Admin',
            createdOn: new Date().toISOString(),
            isActive: true
        };
        this.dummyData.push(newItem);
        return of({ message: 'Responsibility & Authority Matrix created successfully', id: newItem.id });
    }

    update(data: ResponsibilityAuthorityMatrix): Observable<any> {
        const index = this.dummyData.findIndex(item => item.id === data.id);
        if (index > -1) {
            this.dummyData[index] = {
                ...this.dummyData[index],
                ...data,
                modifiedBy: 'Admin',
                modifiedOn: new Date().toISOString()
            };
            return of({ message: 'Responsibility & Authority Matrix updated successfully' });
        }
        return of({ message: 'Responsibility & Authority Matrix not found' });
    }

    delete(id: number): Observable<any> {
        const index = this.dummyData.findIndex(item => item.id === id);
        if (index > -1) {
            this.dummyData.splice(index, 1);
            return of({ message: 'Responsibility & Authority Matrix deleted successfully' });
        }
        return of({ message: 'Responsibility & Authority Matrix not found' });
    }
}
