import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { RiskAssessment } from '../models/risk-assessment';

@Injectable({
    providedIn: 'root'
})
export class RiskAssessmentService {
    private dummyData: RiskAssessment[] = [
        {
            id: 1,
            date: '2025-01-10',
            activityProcess: 'Sample Collection & Handling',
            riskIdentified: '<p>Contamination of samples during transport.</p>',
            opportunity: '<p>Use of specialized refrigerated transport containers.</p>',
            mitigationPlan: '<p>Standardize transport protocols and train staff on handling.</p>',
            responsibility: 'Lab Technician / Quality Manager',
            effectiveness: '<p>No contamination reported in last 3 months.</p>',
            formatNo: 'F-46',
            docNo: 'DMSPL / Level-04 / Format / F-46',
            issueNo: '03',
            issueDate: '2021-10-01',
            revNo: '00',
            revDate: '--'
        }
    ];

    getAll(): Observable<RiskAssessment[]> {
        return of(this.dummyData);
    }

    getById(id: number): Observable<RiskAssessment | undefined> {
        return of(this.dummyData.find(r => r.id === id));
    }

    create(data: RiskAssessment): Observable<RiskAssessment> {
        const newItem = { ...data, id: this.dummyData.length + 1 };
        this.dummyData.push(newItem);
        return of(newItem);
    }

    update(id: number, data: RiskAssessment): Observable<RiskAssessment> {
        const index = this.dummyData.findIndex(r => r.id === id);
        if (index !== -1) {
            this.dummyData[index] = { ...data, id };
            return of(this.dummyData[index]);
        }
        throw new Error('Record not found');
    }

    delete(id: number): Observable<boolean> {
        this.dummyData = this.dummyData.filter(r => r.id !== id);
        return of(true);
    }
}
