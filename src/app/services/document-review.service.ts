import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { DocumentReview } from '../models/document-review';

@Injectable({
    providedIn: 'root',
})
export class DocumentReviewService {
    private apiUrl = environment.apiUrl + '/Nabl/DocumentReview';

    constructor(private http: HttpClient) { }

    getAll(params: any = {}): Observable<any> {
        return this.http.post<any>(this.apiUrl + '/list', params || {});
    }

    getById(id: number): Observable<DocumentReview | undefined> {
        return this.http.get<DocumentReview>(`${this.apiUrl}/details/${id}`);
    }

    create(data: DocumentReview): Observable<DocumentReview> {
        return this.http.post<DocumentReview>(`${this.apiUrl}/save`, data);
    }

    update(id: number, data: DocumentReview): Observable<DocumentReview> {
        data.id = id;
        return this.http.post<DocumentReview>(`${this.apiUrl}/save`, data);
    }

    delete(id: number): Observable<boolean> {
        return this.http.delete<boolean>(`${this.apiUrl}/delete/${id}`);
    }
    getNextReviewNo() {
        return this.http.get<any>(`${this.apiUrl}/next-review-no`);
    }
    getDocumentsAvailableForReview(searchTerm: string = '', pageNo: number = 0, pageSize: number = 20) {
        return this.http.get<any[]>(`${this.apiUrl}/available-documentlist`, {
            params: {
                searchTerm: searchTerm,
                pageNo: pageNo,
                pageSize: pageSize
            }
        });
    }
}
