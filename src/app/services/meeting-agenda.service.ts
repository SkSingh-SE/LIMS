import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { MeetingAgenda } from '../models/meeting-agenda';

@Injectable({
    providedIn: 'root',
})
export class MeetingAgendaService {
    private apiUrl = environment.apiUrl + '/Nabl/MeetingAgenda';

    constructor(private http: HttpClient) { }

    getAll(params: any = {}): Observable<any> {
        return this.http.post<any>(this.apiUrl + '/list', params || {});
    }

    getById(id: number): Observable<MeetingAgenda | undefined> {
        return this.http.get<MeetingAgenda>(`${this.apiUrl}/details/${id}`);
    }

    create(data: MeetingAgenda): Observable<MeetingAgenda> {
        return this.http.post<MeetingAgenda>(`${this.apiUrl}/save`, data);
    }

    update(id: number, data: MeetingAgenda): Observable<MeetingAgenda> {
        data.id = id;
        return this.http.post<MeetingAgenda>(`${this.apiUrl}/save`, data);
    }

    delete(id: number): Observable<boolean> {
        return this.http.delete<boolean>(`${this.apiUrl}/delete/${id}`);
    }
    getNextMeetingNo() {
        return this.http.get<any>(`${this.apiUrl}/next-meeting-no`);
    }
}
