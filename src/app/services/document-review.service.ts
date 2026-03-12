import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { DocumentReview } from '../models/document-review';

@Injectable({
    providedIn: 'root'
})
export class DocumentReviewService {
    private dummyData: DocumentReview[] = [
        {
            id: 1,
            srNo: 1,
            documentName: 'Level - 01 Document (QM)',
            lastReviewDate: '2023-08-11',
            nextReviewDate: '2024-12-30',
            reviewDoneBy: 'Technical Director',
            formatNo: 'F-45',
            docNo: 'DMSPL / Level-04 / Format / F-45',
            issueNo: '03',
            issueDate: '2021-10-01',
            revNo: '00',
            revDate: '--'
        },
        {
            id: 2,
            srNo: 2,
            documentName: 'Level - 02 Document (MSP)',
            lastReviewDate: '2023-08-11',
            nextReviewDate: '2024-12-30',
            reviewDoneBy: 'Technical Director',
            formatNo: 'F-45',
            docNo: 'DMSPL / Level-04 / Format / F-45',
            issueNo: '03',
            issueDate: '2021-10-01',
            revNo: '00',
            revDate: '--'
        }
    ];

    getAll(): Observable<DocumentReview[]> {
        return of(this.dummyData);
    }

    getById(id: number): Observable<DocumentReview | undefined> {
        return of(this.dummyData.find(d => d.id === id));
    }

    create(data: DocumentReview): Observable<DocumentReview> {
        const newItem = { ...data, id: this.dummyData.length + 1, srNo: this.dummyData.length + 1 };
        this.dummyData.push(newItem);
        return of(newItem);
    }

    update(id: number, data: DocumentReview): Observable<DocumentReview> {
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
