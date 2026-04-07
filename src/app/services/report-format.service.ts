import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ReportFormatService {
  private apiUrl = environment.apiUrl + '/ReportFormats';

  constructor(private http: HttpClient) {}

  getList(filter: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/list`, filter);
  }

  getById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/details/${id}`);
  }

  create(dto: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/create`, dto);
  }

  update(dto: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/update`, dto);
  }

  delete(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/delete/${id}`);
  }

  clone(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/clone/${id}`, {});
  }

  getSectionTypes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/section-types`);
  }

  getDropdown(searchTerm?: string, pageNo: number = 0, pageSize: number = 20): Observable<any[]> {
    let url = `${this.apiUrl}/dropdown?pageNo=${pageNo}&pageSize=${pageSize}`;
    if (searchTerm) url += `&searchTerm=${encodeURIComponent(searchTerm)}`;
    return this.http.get<any[]>(url);
  }

  getMappings(id: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${id}/mappings`);
  }

  saveMappings(id: number, mappings: any[]): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}/mappings`, mappings);
  }

  resolveFormat(sampleId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/resolve/${sampleId}`);
  }

  previewPdf(sampleId: number, formatId?: number): Observable<Blob> {
    let url = `${this.apiUrl}/preview/${sampleId}`;
    if (formatId) url += `?formatId=${formatId}`;
    return this.http.post(url, {}, { responseType: 'blob' });
  }

  generateReport(sampleId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/generate/${sampleId}`, {});
  }

  getVerifiedSamples(searchTerm: string, pageNo: number, pageSize: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/verified-samples?searchTerm=${encodeURIComponent(searchTerm || '')}&pageNo=${pageNo}&pageSize=${pageSize}`);
  }
}
