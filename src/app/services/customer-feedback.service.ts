import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { CustomerFeedback } from '../models/customer-feedback';

@Injectable({
    providedIn: 'root'
})
export class CustomerFeedbackService {
    private dummyData: CustomerFeedback[] = [
        {
            id: 1,
            customerName: 'Global Metals Corp',
            contactPerson: 'John Doe',
            date: '2025-02-15',
            ratings: [
                { parameter: 'Quality of Test Results', rating: 5 },
                { parameter: 'Timely Delivery of Reports', rating: 4 },
                { parameter: 'Technical Competence of Staff', rating: 5 },
                { parameter: 'Response to Queries', rating: 4 },
                { parameter: 'Behavior of Lab Personnel', rating: 5 }
            ],
            comments: '<p>Very satisfied with the accuracy of the mechanical test reports.</p>',
            suggestions: '<p>Placing reports on a cloud drive for faster access would be great.</p>',
            formatNo: 'F-47',
            docNo: 'DMSPL / Level-04 / Format / F-47',
            issueNo: '03',
            issueDate: '2021-10-01',
            revNo: '00',
            revDate: '--'
        }
    ];

    getAll(): Observable<CustomerFeedback[]> {
        return of(this.dummyData);
    }

    getById(id: number): Observable<CustomerFeedback | undefined> {
        return of(this.dummyData.find(f => f.id === id));
    }

    create(data: CustomerFeedback): Observable<CustomerFeedback> {
        const newItem = { ...data, id: this.dummyData.length + 1 };
        this.dummyData.push(newItem);
        return of(newItem);
    }

    update(id: number, data: CustomerFeedback): Observable<CustomerFeedback> {
        const index = this.dummyData.findIndex(f => f.id === id);
        if (index !== -1) {
            this.dummyData[index] = { ...data, id };
            return of(this.dummyData[index]);
        }
        throw new Error('Record not found');
    }

    delete(id: number): Observable<boolean> {
        this.dummyData = this.dummyData.filter(f => f.id !== id);
        return of(true);
    }
}
