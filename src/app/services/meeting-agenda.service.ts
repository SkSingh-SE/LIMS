import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { MeetingAgenda } from '../models/meeting-agenda';

@Injectable({
    providedIn: 'root'
})
export class MeetingAgendaService {
    private dummyData: MeetingAgenda[] = [
        {
            id: 1,
            meetingDate: '2024-12-15',
            meetingTime: '11:00 AM',
            venue: 'Conference Room',
            chairperson: 'Mr. S.K. Singh (MD)',
            attendees: [
                { name: 'Mr. S.K. Singh', designation: 'Managing Director' },
                { name: 'Mr. Arvind Sharma', designation: 'Quality Manager' },
                { name: 'Mr. R.K. Gupta', designation: 'Technical Manager' }
            ],
            agendaItems: [
                { item: 'Review of Quality Manual and procedures' },
                { item: 'Internal audit results and status of NCs' },
                { item: 'Feedback from customers' },
                { item: 'Performance of external providers' }
            ],
            formatNo: 'F-53',
            docNo: 'DMSPL / Level-04 / Format / F-53',
            issueNo: '03',
            issueDate: '2021-10-01',
            revNo: '00',
            revDate: '--'
        }
    ];

    getAll(): Observable<MeetingAgenda[]> {
        return of(this.dummyData);
    }

    getById(id: number): Observable<MeetingAgenda | undefined> {
        return of(this.dummyData.find(a => a.id === id));
    }

    create(data: MeetingAgenda): Observable<MeetingAgenda> {
        const newItem = { ...data, id: this.dummyData.length + 1 };
        this.dummyData.push(newItem);
        return of(newItem);
    }

    update(id: number, data: MeetingAgenda): Observable<MeetingAgenda> {
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
