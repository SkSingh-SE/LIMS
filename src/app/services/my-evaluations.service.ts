import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { environment } from "../../environments/environment";
import { Observable } from "rxjs";
@Injectable({
    providedIn: 'root'
})
export class MyEvaluationsService {
    private apiUrl = environment.apiUrl + "/Nabl/MyEvaluations";
    constructor(private http: HttpClient) { }
    getAll(filter: any): Observable<any> {
        return this.http.post<any>(this.apiUrl + "/list", filter);
    }
    create(data: any): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/save`, data);
    }
    update(id: number, data: any): Observable<any> {
        data.id = id;
        return this.http.post<any>(`${this.apiUrl}/save`, data);
    }
    getNextQuestionNo() {
        return this.http.get<any>(`${this.apiUrl}/next-question-no`);
    }
    getQuestionSetMasterById(id: number): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/details/${id}`);
    }

    deleteQuestionSetMaster(id: number): Observable<boolean> {
        return this.http.delete<boolean>(`${this.apiUrl}/delete/${id}`);
    }
    getQuestionSetsDropdown(searchTerm: string, pageNumber: number, pageSize: number): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/questionsetsdropdown?searchTerm=${searchTerm}&pageNo=${pageNumber}&pageSize=${pageSize}`);
    }
}