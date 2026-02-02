import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private apiUrl = environment.apiUrl + '/Settings';

  constructor(private http: HttpClient) {}

  getAll(organizationId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/get-all?organizationId=${organizationId}`);
  }

  saveOrganization(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/save-organization`, payload).pipe(
      // errors handled at component via error handler if desired
    );
  }

  saveNabl(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/save-nabl`, payload);
  }

  saveNumbering(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/save-numbering`, payload);
  }

  saveGst(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/save-gst`, payload);
  }

  saveFinancialYear(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/save-financial-year`, payload);
  }

  saveSignatories(signatories: any[]): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/save-signatories`, { signatories });
  }

  // File uploads
  uploadOrganizationLogo(file: File): Observable<any> {
    const fd = new FormData();
    fd.append('logo', file);
    return this.http.post<any>(`${this.apiUrl}/upload-organization-logo`, fd);
  }

  uploadNablCertificate(file: File): Observable<any> {
    const fd = new FormData();
    fd.append('certificate', file);
    return this.http.post<any>(`${this.apiUrl}/upload-nabl-certificate`, fd);
  }

  uploadSignature(file: File): Observable<any> {
    const fd = new FormData();
    fd.append('signature', file);
    return this.http.post<any>(`${this.apiUrl}/upload-signature`, fd);
  }

  saveAll(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/save-all`, payload);
  }

  // sample delete signatory endpoint
  deleteSignatory(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/signatory/${id}`);
  }
}
