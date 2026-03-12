import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { FeedbackAnalysis } from '../models/feedback-analysis';

@Injectable({
    providedIn: 'root'
})
export class FeedbackAnalysisService {
    private dummyData: FeedbackAnalysis[] = [
        {
            id: 1,
            period: 'April 2024 to March 2025',
            totalFeedbackReceived: 15,
            analysisSummary: '<p>Most customers are satisfied with the quality and technical competence. timly delivery has improved by 20% compared to previous year.</p>',
            actionsTaken: '<p>Implemented automated email notifications for report readiness to further improve delivery speed.</p>',
            formatNo: 'F-48',
            docNo: 'DMSPL / Level-04 / Format / F-48',
            issueNo: '03',
            issueDate: '2021-10-01',
            revNo: '00',
            revDate: '--'
        }
    ];

    getAll(): Observable<FeedbackAnalysis[]> {
        return of(this.dummyData);
    }

    getById(id: number): Observable<FeedbackAnalysis | undefined> {
        return of(this.dummyData.find(a => a.id === id));
    }

    create(data: FeedbackAnalysis): Observable<FeedbackAnalysis> {
        const newItem = { ...data, id: this.dummyData.length + 1 };
        this.dummyData.push(newItem);
        return of(newItem);
    }

    update(id: number, data: FeedbackAnalysis): Observable<FeedbackAnalysis> {
        const index = this.dummyData.findIndex(a => a.id === id);
        if (index !== -1) {
            this.dummyData[index] = { ...data, id };
            return of(this.dummyData[index]);
        }
        throw new Error('Record not found');
    }

    delete(id: number): Observable<boolean> {
        this.dummyData = this.dummyData.filter(a => a.id !== id);
        return of(true);
    }
}
