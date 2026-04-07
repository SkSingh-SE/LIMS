import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { MeetingMinutes } from '../models/meeting-minutes';

@Injectable({
    providedIn: 'root',
})
export class MeetingMinutesService {
    private apiUrl = environment.apiUrl + '/Nabl/MeetingMinutes';

    constructor(private http: HttpClient) {}

    getAll(params: any = {}): Observable<any> {
        return this.http.post<any>(this.apiUrl + '/list', params || {});
    }

    getById(id: number): Observable<MeetingMinutes | undefined> {
        return this.http.get<MeetingMinutes>(`${this.apiUrl}/details/${id}`);
    }

    create(data: MeetingMinutes): Observable<MeetingMinutes> {
        return this.http.post<MeetingMinutes>(`${this.apiUrl}/save`, data);
    }

    update(id: number, data: MeetingMinutes): Observable<MeetingMinutes> {
        data.id = id;
        return this.http.post<MeetingMinutes>(`${this.apiUrl}/save`, data);
    }

    delete(id: number): Observable<boolean> {
        return this.http.delete<boolean>(`${this.apiUrl}/delete/${id}`);
    }
}
