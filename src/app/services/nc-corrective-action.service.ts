import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { NcCorrectiveAction } from '../models/nc-corrective-action';

@Injectable({
    providedIn: 'root'
})
export class NcCorrectiveActionService {
    private dummyData: NcCorrectiveAction[] = [
        {
            id: 1,
            date: '2025-12-01',
            ncNo: 'NC-03',
            clauseNo: '7.4.2',
            section: 'Chemical - OES',
            activityAssessed: 'Segregation of samples',
            auditor: 'Mr. Rajesh Pamecha',
            auditee: 'Mr. N.H. Parmar (MD)',
            ncObserved: '<p>There is no proper segregation between tested samples and in-process samples.</p>',
            correctiveActionProposed: '<p>Separate area for tested and in-process samples has been designated with proper place & stickers.</p>',
            timeRequired: '02 days',
            proposedBy: 'GM',
            approvedBy: 'MD',
            correctiveActionTaken: '<p>Separate area for tested and in-process samples has been marked by label.</p>',
            preventiveAction: '<p>This will be monitored and checked regularly.</p>',
            effectivenessOfAction: '<p>The corrective action is effective and satisfactory.</p>',
            formatNo: 'F-42',
            docNo: 'DMSPL / Level-04 / Format / F-42',
            issueNo: '03',
            issueDate: '2021-10-01',
            revNo: '00',
            revDate: '--'
        }
    ];

    getAll(): Observable<NcCorrectiveAction[]> {
        return of(this.dummyData);
    }

    getById(id: number): Observable<NcCorrectiveAction | undefined> {
        return of(this.dummyData.find(d => d.id === id));
    }

    create(data: NcCorrectiveAction): Observable<NcCorrectiveAction> {
        const newItem = { ...data, id: this.dummyData.length + 1 };
        this.dummyData.push(newItem);
        return of(newItem);
    }

    update(id: number, data: NcCorrectiveAction): Observable<NcCorrectiveAction> {
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
