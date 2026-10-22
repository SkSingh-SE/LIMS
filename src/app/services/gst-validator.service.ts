import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class GstValidatorService {
  private apiUrl = environment.apiUrl + '/GstValidator';

  constructor(private http: HttpClient) {}

  validate(gstin: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/validate`, { gstin });
  }
}
