import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { MasterDocument } from '../models/master-document';

@Injectable({
    providedIn: 'root',
})
export class MasterDocumentService {
    private apiUrl = environment.apiUrl + '/Nabl/MasterDocument';

    constructor(private http: HttpClient) {}

    getAll(params: any = {}): Observable<any> {
        return this.http.post<any>(this.apiUrl + '/list', params || {});
    }

    getById(id: number): Observable<MasterDocument | undefined> {
        return this.http.get<MasterDocument>(`${this.apiUrl}/details/${id}`);
    }

    create(data: MasterDocument): Observable<MasterDocument> {
        return this.http.post<MasterDocument>(`${this.apiUrl}/save`, data);
    }

    update(id: number, data: MasterDocument): Observable<MasterDocument> {
        data.id = id;
        return this.http.post<MasterDocument>(`${this.apiUrl}/save`, data);
    }

    delete(id: number): Observable<boolean> {
        return this.http.delete<boolean>(`${this.apiUrl}/delete/${id}`);
    }
}
