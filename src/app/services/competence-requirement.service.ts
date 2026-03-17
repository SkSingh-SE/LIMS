import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CompetenceRequirement, CompetenceRequirementResponse } from '../models/competenceRequirementModel';

@Injectable({
    providedIn: 'root',
})
export class CompetenceRequirementService {
    private apiUrl = environment.apiUrl + '/Nabl/CompetenceRequirement';

    constructor(private http: HttpClient) {}

    getAll(filter: any): Observable<CompetenceRequirementResponse> {
        return this.http.post<CompetenceRequirementResponse>(this.apiUrl + '/list', filter);
    }

    getById(id: number): Observable<CompetenceRequirement | undefined> {
        return this.http.get<CompetenceRequirement>(`${this.apiUrl}/details/${id}`);
    }

    create(data: CompetenceRequirement): Observable<any> {
        return this.http.post(`${this.apiUrl}/save`, data);
    }

    update(data: CompetenceRequirement): Observable<any> {
        return this.http.post(`${this.apiUrl}/save`, data);
    }

    delete(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/delete/${id}`);
    }
}
