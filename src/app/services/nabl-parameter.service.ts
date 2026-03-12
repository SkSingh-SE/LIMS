import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class NablParameterService {

    private apiUrl = environment.apiUrl + '/NablParameter';

    constructor(private http: HttpClient) { }

    getAllNablParameters(filter: any): Observable<any> {
        return this.http.post<any>(this.apiUrl + '/list', filter);
    }

    updateNablParameter(payload: any): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/save`, payload);
    }

    getNablParameterById(id: number): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/details/${id}`);
    }

    deleteNablParameter(id: number): Observable<any> {
        return this.http.delete<any>(`${this.apiUrl}/delete/${id}`);
    }
}
