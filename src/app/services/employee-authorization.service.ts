import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { EmployeeAuthorization, EmployeeAuthorizationResponse } from '../models/employeeAuthorizationModel';

@Injectable({
    providedIn: 'root',
})
export class EmployeeAuthorizationService {
    private apiUrl = environment.apiUrl + '/Nabl/EmployeeAuthorization';

    constructor(private http: HttpClient) {}

    getAll(filter: any): Observable<EmployeeAuthorizationResponse> {
        return this.http.post<EmployeeAuthorizationResponse>(this.apiUrl + '/list', filter);
    }

    getById(id: number): Observable<EmployeeAuthorization | undefined> {
        return this.http.get<EmployeeAuthorization>(`${this.apiUrl}/details/${id}`);
    }

    create(record: EmployeeAuthorization): Observable<any> {
        return this.http.post(`${this.apiUrl}/save`, record);
    }

    update(id: number, record: EmployeeAuthorization): Observable<any> {
        record.id = id;
        return this.http.post(`${this.apiUrl}/save`, record);
    }

    delete(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/delete/${id}`);
    }
}
