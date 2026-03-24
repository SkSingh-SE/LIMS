import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { EmployeeCompetenceReport, EmployeeCompetenceReportResponse, CompetenceEvaluationParameter } from '../models/employeeCompetenceModel';

@Injectable({
    providedIn: 'root',
})
export class EmployeeCompetenceService {
    private apiUrl = environment.apiUrl + '/Nabl/EmployeeCompetence';

    constructor(private http: HttpClient) {}

    getAll(filter: any): Observable<EmployeeCompetenceReportResponse> {
        return this.http.post<EmployeeCompetenceReportResponse>(this.apiUrl + '/list', filter);
    }

    getByEmployeeId(employeeId: number): Observable<EmployeeCompetenceReportResponse> {
        return this.http.post<EmployeeCompetenceReportResponse>(this.apiUrl + '/list', {
            PageNumber: 1, PageSize: 100, sortByColumn: 'ID', sortOrder: 'desc',
            filter: [{ column: 'employeeId', type: 'Equal', value: String(employeeId), value2: null }]
        });
    }

    getById(id: number): Observable<EmployeeCompetenceReport | undefined> {
        return this.http.get<EmployeeCompetenceReport>(`${this.apiUrl}/details/${id}`);
    }

    create(report: EmployeeCompetenceReport): Observable<any> {
        return this.http.post(`${this.apiUrl}/save`, report);
    }

    update(id: number, report: EmployeeCompetenceReport): Observable<any> {
        report.id = id;
        return this.http.post(`${this.apiUrl}/save`, report);
    }

    delete(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/delete/${id}`);
    }

    getDefaultParameters(): CompetenceEvaluationParameter[] {
        return [
            { name: 'Behavior of the person', rating: '' },
            { name: 'Willingness to take responsibility', rating: '' },
            { name: 'Speed & Quality of work', rating: '' },
            { name: 'Maintaining Integrity and confidentiality', rating: '' },
            { name: 'Accuracy of work done', rating: '' },
            { name: 'Implementation of QMS as per ISO 17025', rating: '' },
            { name: 'NABL Compliance management', rating: '' },
            { name: 'Technical Competency for testing activities as per skill Requirement matrix', rating: '' },
            { name: "Working with equipment's & maintenance", rating: '' },
        ];
    }
}
