import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { MasterDocument } from '../models/master-document';

@Injectable({
    providedIn: 'root'
})
export class MasterDocumentService {
    private dummyData: MasterDocument[] = [
        {
            id: 1,
            srNo: 1,
            documentName: 'Quality System Manual (QSM)',
            documentNo: 'DMSPL/QSM/LEVEL-01',
            issueNo: '04',
            issueDate: '2023-06-05',
            revNo: '00',
            revDate: '2023-06-05',
            copyHolder: 'Quality Manager',
            formatNo: 'F-43',
            docNo: 'DMSPL / Level-04 / Format / F-43'
        },
        {
            id: 2,
            srNo: 2,
            documentName: 'Management System Procedures (MSP)',
            documentNo: 'DMSPL/MSP/LEVEL-02',
            issueNo: '04',
            issueDate: '2023-06-05',
            revNo: '00',
            revDate: '2023-06-05',
            copyHolder: 'Quality Manager',
            formatNo: 'F-43',
            docNo: 'DMSPL / Level-04 / Format / F-43'
        },
        {
            id: 3,
            srNo: 3,
            documentName: 'Master List of Forms & Formats F1 to F54',
            documentNo: 'DMSPL/Level-04/Format/F-',
            issueNo: '03',
            issueDate: '2021-10-01',
            revNo: '00',
            revDate: '2021-10-01',
            copyHolder: 'Quality Manager & Lab Common Drive',
            formatNo: 'F-43',
            docNo: 'DMSPL / Level-04 / Format / F-43'
        }
    ];

    getAll(): Observable<MasterDocument[]> {
        return of(this.dummyData);
    }

    getById(id: number): Observable<MasterDocument | undefined> {
        return of(this.dummyData.find(d => d.id === id));
    }

    create(data: MasterDocument): Observable<MasterDocument> {
        const newItem = { ...data, id: this.dummyData.length + 1, srNo: this.dummyData.length + 1 };
        this.dummyData.push(newItem);
        return of(newItem);
    }

    update(id: number, data: MasterDocument): Observable<MasterDocument> {
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
