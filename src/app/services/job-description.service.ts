import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { JobDescription, JobDescriptionResponse } from '../models/jobDescriptionModel';

@Injectable({
    providedIn: 'root',
})
export class JobDescriptionService {
    private apiUrl = environment.apiUrl + '/Nabl/JobDescription';

    private readonly DEFAULT_CONFIDENTIALITY_CLAUSE =
        'The incumbent is responsible for maintaining the confidentiality of all customer information and ensuring impartiality in all testing activities. ' +
        'Any breach of confidentiality or conflict of interest must be reported immediately to the Quality Manager.';

    constructor(private http: HttpClient) {}

    getDefaultConfidentialityClause(): string {
        return this.DEFAULT_CONFIDENTIALITY_CLAUSE;
    }

    getAll(filter: any): Observable<JobDescriptionResponse> {
        return this.http.post<JobDescriptionResponse>(this.apiUrl + '/list', filter);
    }

    getById(id: number): Observable<JobDescription | undefined> {
        return this.http.get<JobDescription>(`${this.apiUrl}/details/${id}`);
    }

    getByDesignationId(designationId: number): Observable<JobDescription | undefined> {
        return this.http.get<JobDescription>(`${this.apiUrl}/details-by-designation/${designationId}`);
    }

    create(data: JobDescription): Observable<any> {
        return this.http.post(`${this.apiUrl}/save`, data);
    }

    update(data: JobDescription): Observable<any> {
        return this.http.post(`${this.apiUrl}/save`, data);
    }

    delete(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/delete/${id}`);
    }
}
