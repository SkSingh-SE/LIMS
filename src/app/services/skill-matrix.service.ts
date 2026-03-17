import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
    SkillMatrix,
    SkillMatrixResponse,
    SkillMatrixDecision,
    SkillMatrixDecisionResponse,
} from '../models/skillMatrixModel';

@Injectable({
    providedIn: 'root',
})
export class SkillMatrixService {
    private apiUrl = environment.apiUrl + '/Nabl/SkillMatrix';
    private decisionApiUrl = environment.apiUrl + '/Nabl/SkillMatrixDecision';

    constructor(private http: HttpClient) {}

    // ============ Skill Matrix Methods ============

    getAll(): Observable<SkillMatrixResponse> {
        return this.http.post<SkillMatrixResponse>(this.apiUrl + '/list', {});
    }

    getById(id: number): Observable<SkillMatrix | undefined> {
        return this.http.get<SkillMatrix>(`${this.apiUrl}/details/${id}`);
    }

    getByDesignation(designationName: string): Observable<SkillMatrix | undefined> {
        return this.http.get<SkillMatrix>(`${this.apiUrl}/details-by-designation/${designationName}`);
    }

    create(matrix: SkillMatrix): Observable<any> {
        return this.http.post(`${this.apiUrl}/save`, matrix);
    }

    update(matrix: SkillMatrix): Observable<any> {
        return this.http.post(`${this.apiUrl}/save`, matrix);
    }

    delete(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/delete/${id}`);
    }

    // ============ Skill Matrix Decision Methods (F-6A) ============

    getDecisions(): Observable<SkillMatrixDecisionResponse> {
        return this.http.post<SkillMatrixDecisionResponse>(this.decisionApiUrl + '/list', {});
    }

    getDecisionById(id: number): Observable<SkillMatrixDecision | undefined> {
        return this.http.get<SkillMatrixDecision>(`${this.decisionApiUrl}/details/${id}`);
    }

    getDecisionByDesignation(designationName: string): Observable<SkillMatrixDecision | undefined> {
        return this.http.get<SkillMatrixDecision>(`${this.decisionApiUrl}/details-by-designation/${designationName}`);
    }

    getDecisionByDesignationId(designationId: number): Observable<SkillMatrixDecision | undefined> {
        return this.http.get<SkillMatrixDecision>(`${this.decisionApiUrl}/details-by-designation/${designationId}`);
    }

    createDecision(decision: SkillMatrixDecision): Observable<any> {
        return this.http.post(`${this.decisionApiUrl}/save`, decision);
    }

    updateDecision(decision: SkillMatrixDecision): Observable<any> {
        return this.http.post(`${this.decisionApiUrl}/save`, decision);
    }

    deleteDecision(id: number): Observable<any> {
        return this.http.delete(`${this.decisionApiUrl}/delete/${id}`);
    }
}
