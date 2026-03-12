import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { AuditSummary } from '../models/audit-summary';

@Injectable({
    providedIn: 'root'
})
export class AuditSummaryService {
    private dummyData: AuditSummary[] = [
        {
            id: 1,
            auditDate: '2024-11-20',
            areasCovered: 'Mechanical Testing, Quality Management System',
            majorNCs: 0,
            minorNCs: 2,
            observationSummary: '<p>Total 2 minor NCs were observed related to equipment calibration records and environmental monitoring logs.</p>',
            conclusion: '<p>The laboratory is generally compliant with ISO/IEC 17025. Continuous improvement is needed in documentation management.</p>',
            formatNo: 'F-52',
            docNo: 'DMSPL / Level-04 / Format / F-52',
            issueNo: '03',
            issueDate: '2021-10-01',
            revNo: '00',
            revDate: '--'
        }
    ];

    getAll(): Observable<AuditSummary[]> {
        return of(this.dummyData);
    }

    getById(id: number): Observable<AuditSummary | undefined> {
        return of(this.dummyData.find(s => s.id === id));
    }

    create(data: AuditSummary): Observable<AuditSummary> {
        const newItem = { ...data, id: this.dummyData.length + 1 };
        this.dummyData.push(newItem);
        return of(newItem);
    }

    update(id: number, data: AuditSummary): Observable<AuditSummary> {
        const index = this.dummyData.findIndex(s => s.id === id);
        if (index !== -1) {
            this.dummyData[index] = { ...data, id };
            return of(this.dummyData[index]);
        }
        throw new Error('Record not found');
    }

    delete(id: number): Observable<boolean> {
        this.dummyData = this.dummyData.filter(s => s.id !== id);
        return of(true);
    }
}
