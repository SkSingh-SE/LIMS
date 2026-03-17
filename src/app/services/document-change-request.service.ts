import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { DocumentChangeRequest } from '../models/document-change-request';

@Injectable({
    providedIn: 'root',
})
export class DocumentChangeRequestService {
    private apiUrl = environment.apiUrl + '/Nabl/DocumentChangeRequest';

    constructor(private http: HttpClient) {}

    getAll(): Observable<DocumentChangeRequest[]> {
        return this.http.post<DocumentChangeRequest[]>(this.apiUrl + '/list', {});
    }

    getById(id: number): Observable<DocumentChangeRequest | undefined> {
        return this.http.get<DocumentChangeRequest>(`${this.apiUrl}/details/${id}`);
    }

    create(data: DocumentChangeRequest): Observable<DocumentChangeRequest> {
        return this.http.post<DocumentChangeRequest>(`${this.apiUrl}/save`, data);
    }

    update(id: number, data: DocumentChangeRequest): Observable<DocumentChangeRequest> {
        data.id = id;
        return this.http.post<DocumentChangeRequest>(`${this.apiUrl}/save`, data);
    }

    delete(id: number): Observable<boolean> {
        return this.http.delete<boolean>(`${this.apiUrl}/delete/${id}`);
    }
}
