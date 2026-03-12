import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { InternalAuditor } from '../models/internal-auditor';

@Injectable({
    providedIn: 'root'
})
export class InternalAuditorService {
    private dummyData: InternalAuditor[] = [
        {
            id: 1,
            auditorName: 'Mr. Arvind Sharma',
            qualification: 'B.E. (Mechanical), Trained on ISO/IEC 17025:2017',
            trainingDate: '2021-08-15',
            examScore: '85%',
            remarks: 'Qualified as Internal Auditor for Mechanical Testing',
            formatNo: 'F-49',
            docNo: 'DMSPL / Level-04 / Format / F-49',
            issueNo: '03',
            issueDate: '2021-10-01',
            revNo: '00',
            revDate: '--'
        }
    ];

    getAll(): Observable<InternalAuditor[]> {
        return of(this.dummyData);
    }

    getById(id: number): Observable<InternalAuditor | undefined> {
        return of(this.dummyData.find(a => a.id === id));
    }

    create(data: InternalAuditor): Observable<InternalAuditor> {
        const newItem = { ...data, id: this.dummyData.length + 1 };
        this.dummyData.push(newItem);
        return of(newItem);
    }

    update(id: number, data: InternalAuditor): Observable<InternalAuditor> {
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
