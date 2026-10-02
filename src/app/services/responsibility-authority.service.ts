import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ResponsibilityAuthorityMatrix, ResponsibilityAuthorityMatrixResponse } from '../models/responsibilityAuthorityMatrixModel';

@Injectable({
    providedIn: 'root',
})
export class ResponsibilityAuthorityService {
    private apiUrl = environment.apiUrl + '/Nabl/ResponsibilityAuthority';

    constructor(private http: HttpClient) { }

    getAll(filter: any): Observable<ResponsibilityAuthorityMatrixResponse> {
        return this.http.post<ResponsibilityAuthorityMatrixResponse>(this.apiUrl + '/list', filter);
    }

    getById(id: number): Observable<ResponsibilityAuthorityMatrix | undefined> {
        return this.http.get<ResponsibilityAuthorityMatrix>(`${this.apiUrl}/details/${id}`);
    }

    getByDesignationId(designationId: number): Observable<ResponsibilityAuthorityMatrix | undefined> {
        return this.http.get<ResponsibilityAuthorityMatrix>(`${this.apiUrl}/details-by-designation/${designationId}`);
    }

    create(data: ResponsibilityAuthorityMatrix): Observable<any> {
        return this.http.post(`${this.apiUrl}/save`, data);
    }

    update(data: ResponsibilityAuthorityMatrix): Observable<any> {
        return this.http.post(`${this.apiUrl}/save`, data);
    }

    delete(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/delete/${id}`);
    }
    getDesignationEmployees(searchTerm: string, pageNumber: number, pageSize: number, matrixId?: number | null): Observable<any[]> {

        let url =
            `${this.apiUrl}/designation-dropdown` +
            `?searchTerm=${(searchTerm || '')}` +
            `&pageNo=${pageNumber}` +
            `&pageSize=${pageSize}`;
        if (matrixId) {
            url += `&recordId=${matrixId}`;
        }
        return this.http.get<any[]>(url);

    }
}
