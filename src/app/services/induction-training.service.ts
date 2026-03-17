import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { InductionTrainingRecord, InductionTrainingResponse } from '../models/inductionTrainingModel';

@Injectable({
    providedIn: 'root',
})
export class InductionTrainingService {
    private apiUrl = environment.apiUrl + '/Nabl/InductionTraining';

    constructor(private http: HttpClient) {}

    getAll(filter: any): Observable<InductionTrainingResponse> {
        return this.http.post<InductionTrainingResponse>(this.apiUrl + '/list', filter);
    }

    getById(id: number): Observable<InductionTrainingRecord | undefined> {
        return this.http.get<InductionTrainingRecord>(`${this.apiUrl}/details/${id}`);
    }

    create(record: InductionTrainingRecord): Observable<any> {
        return this.http.post(`${this.apiUrl}/save`, record);
    }

    update(id: number, record: InductionTrainingRecord): Observable<any> {
        record.id = id;
        return this.http.post(`${this.apiUrl}/save`, record);
    }

    delete(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/delete/${id}`);
    }
}
