import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ReportTemplateService {
  private base = '/api/report-template';
  constructor(private http: HttpClient) {}

  saveTemplate(body: any): Observable<any> {
    return this.http.post(this.base, body);
  }

  loadTemplate(id: number): Observable<any> {
    return this.http.get(`${this.base}/${id}`);
  }
}
