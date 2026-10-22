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

    constructor(private http: HttpClient) { }

    getAll(filter: any): Observable<EmployeeCompetenceReportResponse> {
        return this.http.post<EmployeeCompetenceReportResponse>(this.apiUrl + '/list', filter);
    }


    getByEmployeeId(employeeId: number): Observable<any | undefined> {
        return this.http.get<any>(`${this.apiUrl}/employee-competence/${employeeId}`
        );
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
    getEmployeesDropdown(searchTerm: string, pageNumber: number, pageSize: number): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/employeesdropdown?searchTerm=${searchTerm}&pageNo=${pageNumber}&pageSize=${pageSize}`);
    }
    getEmployeesForCompetenceReportDropdown(searchTerm: string, pageNumber: number, pageSize: number, recordId?: number | null): Observable<any[]> {

        let url = `${this.apiUrl}/competence-report` + `?searchTerm=${(searchTerm || '')}` + `&pageNo=${pageNumber}` + `&pageSize=${pageSize}`;

        if (recordId != null) {
            url += `&recordId=${recordId}`;
        }
        return this.http.get<any[]>(url);
    }
    getEmployeesDesignation(employeeId: number): Observable<string> {
        return this.http.get(
            `${this.apiUrl}/employee-designation/${employeeId}`,
            { responseType: 'text' }
        );
    }
}
