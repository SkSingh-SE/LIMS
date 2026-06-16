import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { EmployeeTrainingRecord, EmployeeTrainingRecordResponse } from '../models/employeeTrainingModel';

@Injectable({
    providedIn: 'root',
})
export class EmployeeTrainingService {
    private apiUrl = environment.apiUrl + '/Nabl/TrainingPlan';

    constructor(private http: HttpClient) {}

    getAll(filter: any): Observable<EmployeeTrainingRecordResponse> {
        return this.http.post<EmployeeTrainingRecordResponse>(this.apiUrl + '/list', filter);
    }

    getByEmployeeId(employeeId: number): Observable<EmployeeTrainingRecordResponse> {
        return this.http.post<EmployeeTrainingRecordResponse>(this.apiUrl + '/list', {
            PageNumber: 1, PageSize: 100, sortByColumn: 'ID', sortOrder: 'desc',
            filter: [{ column: 'employeeId', type: 'Equal', value: String(employeeId), value2: null }]
        });
    }

    getById(id: number): Observable<EmployeeTrainingRecord | undefined> {
        return this.http.get<EmployeeTrainingRecord>(`${this.apiUrl}/details/${id}`);
    }

    create(record: EmployeeTrainingRecord): Observable<any> {
        return this.http.post(`${this.apiUrl}/save`, record);
    }
}
