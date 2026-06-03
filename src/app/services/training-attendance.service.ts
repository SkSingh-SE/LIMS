import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { TrainingAttendance, TrainingAttendanceListResponse, TrainingAttendanceResponse } from '../models/trainingAttendanceModel';

@Injectable({
    providedIn: 'root',
})
export class TrainingAttendanceService {
    private apiUrl = environment.apiUrl + '/Nabl/TrainingAttendance';

    constructor(private http: HttpClient) { }

    getAll(params?: any): Observable<TrainingAttendanceListResponse> {
        return this.http.post<TrainingAttendanceListResponse>(this.apiUrl + '/list', params || {});
    }

    getById(id: number): Observable<TrainingAttendance | null> {
        return this.http.get<TrainingAttendance>(`${this.apiUrl}/details/${id}`);
    }

    create(data: TrainingAttendance): Observable<TrainingAttendanceResponse> {
        return this.http.post<TrainingAttendanceResponse>(`${this.apiUrl}/save`, data);
    }

    update(id: number, data: TrainingAttendance): Observable<TrainingAttendanceResponse> {
        data.id = id;
        return this.http.post<TrainingAttendanceResponse>(`${this.apiUrl}/save`, data);
    }
    uploadNABLFile(file: File): Observable<any> {
        const fd = new FormData();
        fd.append('logo', file); // backend param is 'logo'
        return this.http.post<any>(`${this.apiUrl}/upload-signature`, fd);
    }
    
    delete(id: number): Observable<TrainingAttendanceResponse> {
        return this.http.delete<TrainingAttendanceResponse>(`${this.apiUrl}/delete/${id}`);
    }
    getTrainingPlanDropdown(searchTerm: string, pageNo: number, pageSize: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/training-plan-dropdown?searchTerm=${searchTerm}&pageNo=${pageNo}&pageSize=${pageSize}`);
    }
}
