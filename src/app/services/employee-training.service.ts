import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { EmployeeTrainingRecord, EmployeeTrainingRecordResponse } from '../models/employeeTrainingModel';

@Injectable({
    providedIn: 'root'
})
export class EmployeeTrainingService {
    private records: EmployeeTrainingRecord[] = [
        {
            id: 1,
            employeeId: 1,
            employeeName: 'Mr. Pratik Thorat',
            qualification: 'Dip. Mech.',
            dateOfJoining: '2025-05-03',
            position: 'Mech. Engineer',
            trainingDate: '2025-07-16',
            trainerName: 'Ankit Guraoh',
            sampleName: 'Test piece',
            trainerDesignation: 'Mech. dep. (H.O.D.)',
            sampleRefNo: '25-054602',
            parameter: 'U.T.S.',
            testMethod: 'IS 1608:1',
            evaluationDate: '2025-07-16',
            evaluationMode: 'Re-Testing',
            evalParameter: 'U.T.S.',
            evalTestMethod: 'IS 1608-1',
            evaluationResult: {
                observedValue1: 512.325,
                observedValue2: '-',
                averageValue: '-',
                originalValue: 510.268,
                remarks: 'Satisfactory'
            },
            trainerComments: '',
            evaluationDoneBy: 'Technical Director',
            evaluationDateBottom: '2025-07-16'
        }
    ];

    private nextId = 2;

    constructor() { }

    getAll(filter: any): Observable<EmployeeTrainingRecordResponse> {
        let filtered = [...this.records];
        if (filter.employeeId) {
            filtered = filtered.filter(r => r.employeeId === filter.employeeId);
        }
        const totalRecords = filtered.length;
        return of({
            items: filtered,
            totalRecords,
            pageNumber: 1,
            pageSize: 10
        });
    }

    getById(id: number): Observable<EmployeeTrainingRecord | undefined> {
        return of(this.records.find(r => r.id === id));
    }

    create(record: EmployeeTrainingRecord): Observable<any> {
        const newRecord = { ...record, id: this.nextId++ };
        this.records.push(newRecord);
        return of({ message: 'Training record created successfully', id: newRecord.id });
    }
}
