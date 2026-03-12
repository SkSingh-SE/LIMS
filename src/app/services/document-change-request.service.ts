import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { DocumentChangeRequest } from '../models/document-change-request';

@Injectable({
    providedIn: 'root'
})
export class DocumentChangeRequestService {
    private dummyData: DocumentChangeRequest[] = [
        {
            id: 1,
            date: '2025-10-15',
            documentTitle: 'Quality System Manual',
            documentNo: 'DMSPL/QSM/LEVEL-01',
            issueNo: '04',
            revNo: '00',
            changesRequired: '<p>Update the organization chart to reflect new departments.</p>',
            justification: '<p>Addition of Chemical OES and Mechanical divisions.</p>',
            initiatedBy: 'Quality Manager',
            approvedBy: 'Managing Director',
            actionTaken: '<p>Revised QSM Issue No. 05 released.</p>',
            formatNo: 'F-44',
            docNo: 'DMSPL / Level-04 / Format / F-44',
            headerIssueNo: '03',
            headerIssueDate: '2021-10-01',
            headerRevNo: '00',
            headerRevDate: '--'
        }
    ];

    getAll(): Observable<DocumentChangeRequest[]> {
        return of(this.dummyData);
    }

    getById(id: number): Observable<DocumentChangeRequest | undefined> {
        return of(this.dummyData.find(d => d.id === id));
    }

    create(data: DocumentChangeRequest): Observable<DocumentChangeRequest> {
        const newItem = { ...data, id: this.dummyData.length + 1 };
        this.dummyData.push(newItem);
        return of(newItem);
    }

    update(id: number, data: DocumentChangeRequest): Observable<DocumentChangeRequest> {
        const index = this.dummyData.findIndex(d => d.id === id);
        if (index !== -1) {
            this.dummyData[index] = { ...data, id };
            return of(this.dummyData[index]);
        }
        throw new Error('Record not found');
    }

    delete(id: number): Observable<boolean> {
        this.dummyData = this.dummyData.filter(d => d.id !== id);
        return of(true);
    }
}
