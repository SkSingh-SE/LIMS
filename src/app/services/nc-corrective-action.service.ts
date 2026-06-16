import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { NcCorrectiveAction } from '../models/nc-corrective-action';

@Injectable({
    providedIn: 'root',
})
export class NcCorrectiveActionService {
    private apiUrl = environment.apiUrl + '/Nabl/NcCorrectiveAction';

    constructor(private http: HttpClient) {}

    getAll(params: any = {}): Observable<any> {
        return this.http.post<any>(this.apiUrl + '/list', params || {});
    }

    getById(id: number): Observable<NcCorrectiveAction | undefined> {
        return this.http.get<NcCorrectiveAction>(`${this.apiUrl}/details/${id}`);
    }

    create(data: NcCorrectiveAction): Observable<NcCorrectiveAction> {
        return this.http.post<NcCorrectiveAction>(`${this.apiUrl}/save`, data);
    }

    update(id: number, data: NcCorrectiveAction): Observable<NcCorrectiveAction> {
        data.id = id;
        return this.http.post<NcCorrectiveAction>(`${this.apiUrl}/save`, data);
    }

    delete(id: number): Observable<boolean> {
        return this.http.delete<boolean>(`${this.apiUrl}/delete/${id}`);
    }
}
