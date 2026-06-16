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
    return this.http.post<any>(`${this.apiUrl}/save-organization`, payload);
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

  // File uploads — FormData key must match backend IFormFile parameter name
  uploadOrganizationLogo(file: File): Observable<any> {
    const fd = new FormData();
    fd.append('logo', file);
    return this.http.post<any>(`${this.apiUrl}/upload-organization-logo`, fd);
  }

  uploadNablCertificate(file: File): Observable<any> {
    const fd = new FormData();
    fd.append('logo', file); // backend param is 'logo'
    return this.http.post<any>(`${this.apiUrl}/upload-nabl-certificate`, fd);
  }

  uploadSignature(file: File): Observable<any> {
    const fd = new FormData();
    fd.append('logo', file); // backend param is 'logo'
    return this.http.post<any>(`${this.apiUrl}/upload-signature`, fd);
  }

  saveAll(payload: any): Observable<any> {
    // backend expects { payload: { ... } } wrapped in SaveAllRequest
    return this.http.post<any>(`${this.apiUrl}/save-all`, { payload });
  }

  deleteSignatory(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/signatory/${id}`);
  }

  // Financial Year management
  getFinancialYears(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/financial-years`);
  }

  getFinancialYearsDropdown(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/financial-years/dropdown`);
  }

  setDefaultFinancialYear(id: number): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/financial-years/${id}/set-default`, {});
  }

  deleteFinancialYear(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/financial-years/${id}`);
  }
}
