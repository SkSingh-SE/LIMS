import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { NonConformingWork } from '../models/non-conforming-work';

@Injectable({
    providedIn: 'root',
})
export class NonConformingWorkService {
    private apiUrl = environment.apiUrl + '/Nabl/NonConformingWork';

    constructor(private http: HttpClient) {}

    getAll(): Observable<NonConformingWork[]> {
        return this.http.post<NonConformingWork[]>(this.apiUrl + '/list', {});
    }

    getById(id: number): Observable<NonConformingWork | undefined> {
        return this.http.get<NonConformingWork>(`${this.apiUrl}/details/${id}`);
    }

    create(data: NonConformingWork): Observable<NonConformingWork> {
        return this.http.post<NonConformingWork>(`${this.apiUrl}/save`, data);
    }

    update(id: number, data: NonConformingWork): Observable<NonConformingWork> {
        data.id = id;
        return this.http.post<NonConformingWork>(`${this.apiUrl}/save`, data);
    }

    delete(id: number): Observable<boolean> {
        return this.http.delete<boolean>(`${this.apiUrl}/delete/${id}`);
    }
}
