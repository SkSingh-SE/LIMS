import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { InductionTrainingRecord, InductionTrainingResponse } from '../models/inductionTrainingModel';

@Injectable({
    providedIn: 'root'
})
export class InductionTrainingService {
    private records: InductionTrainingRecord[] = [
        {
            id: 1,
            formatNo: 'F-6',
            issueNo: '01',
            revNo: '00',
            date: '2025-07-16',
            employeeName: 'Mr. Pratik Thorat',
            qualification: 'Dip. Mech.',
            dateOfJoining: '2025-05-03',
            position: 'Mech. Engineer',

            trainingDate: '2025-07-16',
            trainerName: 'Ankit Gurach',
            trainerDesignation: 'Mech. dep. H.O.D.',
            sampleName: 'Test piece',
            sampleRefNo: '25-054602',
            parameter: 'U.T.S.',
            testMethodSop: 'IS 1608 : 1',

            evaluationDate: '2025-07-16',
            evaluationMode: 'Re-Testing',
            evalParameter: 'U.T.S.',
            evalTestMethodSop: 'IS : 1608 - 1',
            observedValue1: '512.325',
            observedValue2: '-',
            observedValueAverage: '-',
            originalValue: '510.268',
            remarks: 'Satisfactory',
            trainerComments: 'Satisfactory'
        }
    ];

    private nextId = 2;

    constructor() { }

    getAll(filter: any): Observable<InductionTrainingResponse> {
        let filtered = [...this.records];
        if (filter.searchTerm) {
            filtered = filtered.filter(r => r.employeeName.toLowerCase().includes(filter.searchTerm.toLowerCase()));
        }
        const totalRecords = filtered.length;
        return of({
            items: filtered,
            totalRecords,
            pageNumber: filter.PageNumber || 1,
            pageSize: filter.PageSize || 10
        });
    }

    getById(id: number): Observable<InductionTrainingRecord | undefined> {
        return of(this.records.find(r => r.id === id));
    }

    create(record: InductionTrainingRecord): Observable<any> {
        const newRecord = { ...record, id: this.nextId++ };
        this.records.push(newRecord);
        return of({ success: true, message: 'Induction training record created successfully', id: newRecord.id });
    }

    update(id: number, record: InductionTrainingRecord): Observable<any> {
        const index = this.records.findIndex(r => r.id === id);
        if (index !== -1) {
            this.records[index] = { ...record, id };
            return of({ success: true, message: 'Induction training record updated successfully' });
        }
        return of({ success: false, message: 'Record not found' });
    }

    delete(id: number): Observable<any> {
        const index = this.records.findIndex(r => r.id === id);
        if (index !== -1) {
            this.records.splice(index, 1);
            return of({ success: true, message: 'Induction training record deleted successfully' });
        }
        return of({ success: false, message: 'Record not found' });
    }
}
