import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Complaint } from '../models/complaint';

@Injectable({
    providedIn: 'root',
})
export class ComplaintService {
    private apiUrl = environment.apiUrl + '/Nabl/Complaint';

    constructor(private http: HttpClient) {}

    getAll(): Observable<Complaint[]> {
        return this.http.post<Complaint[]>(this.apiUrl + '/list', {});
    }

    getById(id: number): Observable<Complaint | undefined> {
        return this.http.get<Complaint>(`${this.apiUrl}/details/${id}`);
    }

    create(data: Complaint): Observable<Complaint> {
        return this.http.post<Complaint>(`${this.apiUrl}/save`, data);
    }

    update(id: number, data: Complaint): Observable<Complaint> {
        data.id = id;
        return this.http.post<Complaint>(`${this.apiUrl}/save`, data);
    }

    delete(id: number): Observable<boolean> {
        return this.http.delete<boolean>(`${this.apiUrl}/delete/${id}`);
    }
}
