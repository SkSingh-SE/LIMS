import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {

  private apiUrl = environment.apiUrl + "/Notifications";

  constructor(private http: HttpClient) {

   }

  getVapidPublicKey(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/vapid-public-key`);
  }
  getUnread(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/unread`);
  }
  getAll(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/all`);
  }
  markAsRead(id: number): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/mark-as-read/${id}`,{});
  }
  markAllRead(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/mark-all-read`);
  }

  subscribe(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/subscribe`, payload);
  }
  unsubscribe(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/unsubscribe`, payload);
  }


}
