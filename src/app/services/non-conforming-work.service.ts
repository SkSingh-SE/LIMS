import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { NonConformingWork } from '../models/non-conforming-work';

@Injectable({
    providedIn: 'root'
})
export class NonConformingWorkService {
    private dummyData: NonConformingWork[] = [
        {
            id: 1,
            dateMonthYear: '13/09/25',
            ncDetail: '<p>In PTEF of tool steel score of 0.2" is 4.6 which is outside the acceptable performance</p>',
            rootCauseAnalysis: '<p>Surface contamination during grinding of PT sample</p>',
            correctiveAction: '<p>1. Polishing paper must not used for different material types</p>',
            closerDate: '2025-09-20',
            formatNo: 'F-41',
            docNo: 'DMSPL / Level-04 / Format / F-41',
            issueNo: '03',
            issueDate: '2021-10-01',
            revNo: '00',
            revDate: '--'
        }
    ];

    getAll(): Observable<NonConformingWork[]> {
        return of(this.dummyData);
    }

    getById(id: number): Observable<NonConformingWork | undefined> {
        return of(this.dummyData.find(d => d.id === id));
    }

    create(data: NonConformingWork): Observable<NonConformingWork> {
        const newItem = { ...data, id: this.dummyData.length + 1 };
        this.dummyData.push(newItem);
        return of(newItem);
    }

    update(id: number, data: NonConformingWork): Observable<NonConformingWork> {
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
