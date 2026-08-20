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

    constructor(private http: HttpClient) { }

    getAll(params: any = {}): Observable<any> {
        return this.http.post<any>(this.apiUrl + '/list', params || {});
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
    getNextRequestNo() {
        return this.http.get<any>(`${this.apiUrl}/next-request-no`);
    }
    getAllDocuments(searchTerm: string = '', pageNo: number = 0, pageSize: number = 20) {
        return this.http.get<any[]>(`${this.apiUrl}/documentlist`, {
            params: {
                searchTerm: searchTerm,
                pageNo: pageNo,
                pageSize: pageSize
            }
        });
    }
}
