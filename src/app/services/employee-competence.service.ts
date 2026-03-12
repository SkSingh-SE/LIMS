import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { EmployeeCompetenceReport, EmployeeCompetenceReportResponse } from '../models/employeeCompetenceModel';

@Injectable({
    providedIn: 'root'
})
export class EmployeeCompetenceService {
    private reports: EmployeeCompetenceReport[] = [
        {
            id: 1,
            employeeId: 1,
            employeeName: 'Bunty Khattik',
            designationName: 'Chemist',
            evaluationPeriodFrom: '2024-09-26',
            evaluationPeriodTo: '2025-09-26',
            parameters: [
                { name: 'Behavior of the person', rating: 'Excellent' },
                { name: 'Willingness to take responsibility', rating: 'Excellent' },
                { name: 'Speed & Quality of work', rating: 'Excellent' },
                { name: 'Maintaining Integrity and confidentiality', rating: 'Very Good' },
                { name: 'Accuracy of work done', rating: 'Excellent' },
                { name: 'Implementation of QMS as per ISO 17025', rating: 'Very Good' },
                { name: 'NABL Compliance management', rating: 'Excellent' },
                { name: 'Technical Competency for testing activities as per skill Requirement matrix', rating: 'Excellent' },
                { name: 'Working with equipment\'s & maintenance', rating: 'Excellent' }
            ],
            overallRating: 9,
            specificTrainingRequired: 'Internal Lab training.',
            evaluationDoneBy: 'Technical Director',
            evaluationDate: '2025-09-26'
        }
    ];

    private nextId = 2;

    constructor() { }

    getAll(filter: any): Observable<EmployeeCompetenceReportResponse> {
        let filtered = [...this.reports];
        if (filter.employeeId) {
            filtered = filtered.filter(r => r.employeeId === filter.employeeId);
        }
        if (filter.searchTerm) {
            filtered = filtered.filter(r => r.employeeName.toLowerCase().includes(filter.searchTerm.toLowerCase()));
        }
        const totalRecords = filtered.length;
        return of({
            items: filtered,
            totalRecords,
            pageNumber: filter.PageNumber || 1,
            pageSize: filter.PageSize || 10
        });
    }

    getById(id: number): Observable<EmployeeCompetenceReport | undefined> {
        return of(this.reports.find(r => r.id === id));
    }

    create(report: EmployeeCompetenceReport): Observable<any> {
        const newReport = { ...report, id: this.nextId++ };
        this.reports.push(newReport);
        return of({ success: true, message: 'Competence report created successfully', id: newReport.id });
    }

    update(id: number, report: EmployeeCompetenceReport): Observable<any> {
        const index = this.reports.findIndex(r => r.id === id);
        if (index !== -1) {
            this.reports[index] = { ...report, id };
            return of({ success: true, message: 'Competence report updated successfully' });
        }
        return of({ success: false, message: 'Report not found' });
    }

    delete(id: number): Observable<any> {
        const index = this.reports.findIndex(r => r.id === id);
        if (index !== -1) {
            this.reports.splice(index, 1);
            return of({ success: true, message: 'Competence report deleted successfully' });
        }
        return of({ success: false, message: 'Report not found' });
    }

    getDefaultParameters(): any[] {
        return [
            { name: 'Behavior of the person', rating: '' },
            { name: 'Willingness to take responsibility', rating: '' },
            { name: 'Speed & Quality of work', rating: '' },
            { name: 'Maintaining Integrity and confidentiality', rating: '' },
            { name: 'Accuracy of work done', rating: '' },
            { name: 'Implementation of QMS as per ISO 17025', rating: '' },
            { name: 'NABL Compliance management', rating: '' },
            { name: 'Technical Competency for testing activities as per skill Requirement matrix', rating: '' },
            { name: 'Working with equipment\'s & maintenance', rating: '' }
        ];
    }
}
