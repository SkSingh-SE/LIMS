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

    getById(id: number): Observable<EmployeeTrainingRecord | undefined> {
        return this.http.get<EmployeeTrainingRecord>(`${this.apiUrl}/details/${id}`);
    }

    create(record: EmployeeTrainingRecord): Observable<any> {
        return this.http.post(`${this.apiUrl}/save`, record);
    }
}
