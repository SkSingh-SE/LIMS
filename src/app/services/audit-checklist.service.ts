import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { AuditChecklist } from '../models/audit-checklist';

@Injectable({
    providedIn: 'root'
})
export class AuditChecklistService {
    private dummyData: AuditChecklist[] = [
        {
            id: 1,
            areaDepartment: 'Mechanical Testing Lab',
            auditDate: '2024-11-20',
            auditorName: 'Mr. Arvind Sharma',
            auditeeName: 'Mr. R.K. Gupta',
            items: [
                {
                    clauseNo: '4.1',
                    requirement: 'Impartiality of laboratory activities',
                    observation: 'Laboratory activities are undertaken impartially and structured and managed so as to safeguard impartiality.',
                    compliance: 'Yes'
                },
                {
                    clauseNo: '4.2',
                    requirement: 'Confidentiality of information',
                    observation: 'Staff has signed confidentiality agreements.',
                    compliance: 'Yes'
                }
            ],
            formatNo: 'F-51',
            docNo: 'DMSPL / Level-04 / Format / F-51',
            issueNo: '03',
            issueDate: '2021-10-01',
            revNo: '00',
            revDate: '--'
        }
    ];

    getAll(): Observable<AuditChecklist[]> {
        return of(this.dummyData);
    }

    getById(id: number): Observable<AuditChecklist | undefined> {
        return of(this.dummyData.find(c => c.id === id));
    }

    create(data: AuditChecklist): Observable<AuditChecklist> {
        const newItem = { ...data, id: this.dummyData.length + 1 };
        this.dummyData.push(newItem);
        return of(newItem);
    }

    update(id: number, data: AuditChecklist): Observable<AuditChecklist> {
        const index = this.dummyData.findIndex(c => c.id === id);
        if (index !== -1) {
            this.dummyData[index] = { ...data, id };
            return of(this.dummyData[index]);
        }
        throw new Error('Record not found');
    }

    delete(id: number): Observable<boolean> {
        this.dummyData = this.dummyData.filter(c => c.id !== id);
        return of(true);
    }
}
