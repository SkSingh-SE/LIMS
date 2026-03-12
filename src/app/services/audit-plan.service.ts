import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { AuditPlan } from '../models/audit-plan';

@Injectable({
    providedIn: 'root'
})
export class AuditPlanService {
    private dummyData: AuditPlan[] = [
        {
            id: 1,
            auditType: 'Internal Audit',
            period: '2024-25',
            areaDepartment: 'Mechanical Testing Lab',
            auditorName: 'Mr. Arvind Sharma',
            scheduleDate: '2024-11-20',
            scope: 'Quality System & Technical Competence as per ISO 17025',
            formatNo: 'F-50',
            docNo: 'DMSPL / Level-04 / Format / F-50',
            issueNo: '03',
            issueDate: '2021-10-01',
            revNo: '00',
            revDate: '--'
        }
    ];

    getAll(): Observable<AuditPlan[]> {
        return of(this.dummyData);
    }

    getById(id: number): Observable<AuditPlan | undefined> {
        return of(this.dummyData.find(p => p.id === id));
    }

    create(data: AuditPlan): Observable<AuditPlan> {
        const newItem = { ...data, id: this.dummyData.length + 1 };
        this.dummyData.push(newItem);
        return of(newItem);
    }

    update(id: number, data: AuditPlan): Observable<AuditPlan> {
        const index = this.dummyData.findIndex(p => p.id === id);
        if (index !== -1) {
            this.dummyData[index] = { ...data, id };
            return of(this.dummyData[index]);
        }
        throw new Error('Record not found');
    }

    delete(id: number): Observable<boolean> {
        this.dummyData = this.dummyData.filter(p => p.id !== id);
        return of(true);
    }
}
