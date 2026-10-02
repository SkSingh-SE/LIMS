import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';
@Injectable({
    providedIn: 'root'
})
export class RoleWiseSkillsMasterService {
    private apiUrl = environment.apiUrl + "/Nabl/RoleWiseSkillsMaster";
    constructor(private http: HttpClient) { }
    getAllRoleWiseSkillsMasters(filter: any): Observable<any> {
        return this.http.post<any>(this.apiUrl + "/list", filter);
    }

    create(data: any): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/save`, data);
    }
    update(id: number, data: any): Observable<any> {
        data.id = id;
        return this.http.post<any>(`${this.apiUrl}/save`, data);
    }

    getRoleWiseSkillsMasterById(id: number): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/details/${id}`);
    }

    deleteRoleWiseSkillsMaster(id: number): Observable<boolean> {
        return this.http.delete<boolean>(`${this.apiUrl}/delete/${id}`);
    }
    getNextRoleWiseSkillNo() {
        return this.http.get<any>(`${this.apiUrl}/next-role-wise-skill-no`);
    }
}