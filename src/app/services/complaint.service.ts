import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Complaint } from '../models/complaint';

@Injectable({
    providedIn: 'root'
})
export class ComplaintService {
    private dummyData: Complaint[] = [
        {
            id: 1,
            monthYear: 'July-25',
            complaintNo: '03',
            dateOfComplaint: '2025-07-24',
            complainantName: 'Technospin',
            detailsOfComplaint: '<p>Price of testing</p>',
            validationOfComplaint: '<p>Standardized pricing dissatisfaction</p>',
            outcomeOfInvestigation: '<p>Customer explained current pricing is approved</p>',
            correctiveActionsTaken: '<p>Explained to customer</p>',
            referenceNoDate: '24.07.25',
            formatNo: 'F-40',
            docNo: 'DMSPL / Level-04 / Format / F-40',
            issueNo: '03',
            issueDate: '2021-10-01',
            revNo: '00',
            revDate: '--'
        }
    ];

    getAll(): Observable<Complaint[]> {
        return of(this.dummyData);
    }

    getById(id: number): Observable<Complaint | undefined> {
        return of(this.dummyData.find(d => d.id === id));
    }

    create(data: Complaint): Observable<Complaint> {
        const newItem = { ...data, id: this.dummyData.length + 1 };
        this.dummyData.push(newItem);
        return of(newItem);
    }

    update(id: number, data: Complaint): Observable<Complaint> {
        const index = this.dummyData.findIndex(d => d.id === id);
        if (index !== -1) {
            this.dummyData[index] = { ...data, id };
            return of(this.dummyData[index]);
        }
        throw new Error('Complaint not found');
    }

    delete(id: number): Observable<boolean> {
        this.dummyData = this.dummyData.filter(d => d.id !== id);
        return of(true);
    }
}
