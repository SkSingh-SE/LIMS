import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { MeetingMinutes } from '../models/meeting-minutes';

@Injectable({
    providedIn: 'root'
})
export class MeetingMinutesService {
    private dummyData: MeetingMinutes[] = [
        {
            id: 1,
            meetingDate: '2024-12-15',
            chairperson: 'Mr. S.K. Singh (MD)',
            reviewPeriod: 'July 2024 - Dec 2024',
            discussions: [
                {
                    agendaItem: 'Review of Quality Manual',
                    discussion: '<p>The Quality Manual was reviewed and found to be update with recent standards.</p>',
                    decision: '<p>No changes required in the current edition.</p>'
                },
                {
                    agendaItem: 'Internal Audit Results',
                    discussion: '<p>Findings from the audit conducted in Nov 2024 were discussed.</p>',
                    decision: '<p>Quality Manager to ensure all NCs are closed by Jan 2025.</p>'
                }
            ],
            actionItems: [
                {
                    action: 'Closure of NCs from Internal Audit',
                    responsibility: 'Quality Manager',
                    targetDate: '2025-01-31'
                }
            ],
            formatNo: 'F-54',
            docNo: 'DMSPL / Level-04 / Format / F-54',
            issueNo: '03',
            issueDate: '2021-10-01',
            revNo: '00',
            revDate: '--'
        }
    ];

    getAll(): Observable<MeetingMinutes[]> {
        return of(this.dummyData);
    }

    getById(id: number): Observable<MeetingMinutes | undefined> {
        return of(this.dummyData.find(m => m.id === id));
    }

    create(data: MeetingMinutes): Observable<MeetingMinutes> {
        const newItem = { ...data, id: this.dummyData.length + 1 };
        this.dummyData.push(newItem);
        return of(newItem);
    }

    update(id: number, data: MeetingMinutes): Observable<MeetingMinutes> {
        const index = this.dummyData.findIndex(m => m.id === id);
        if (index !== -1) {
            this.dummyData[index] = { ...data, id };
            return of(this.dummyData[index]);
        }
        throw new Error('Record not found');
    }

    delete(id: number): Observable<boolean> {
        this.dummyData = this.dummyData.filter(m => m.id !== id);
        return of(true);
    }
}
