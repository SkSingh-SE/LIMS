import { Injectable } from '@angular/core';
import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from './auth.service';
import { NotificationDto } from '../utility/models/notification.model';
import { environment } from '../../environments/environment';


@Injectable({
  providedIn: 'root'
})
export class SignalRService {
  private hubConnection!: HubConnection;
  private notificationsSubject = new BehaviorSubject<NotificationDto[]>([]);
  notifications$ = this.notificationsSubject.asObservable();

  constructor(private authService: AuthService) {}

  startConnection() {
    if (this.hubConnection) return;

    this.hubConnection = new HubConnectionBuilder()
      .withUrl(environment.baseUrl + 'hubs/notifications', {
        // accessTokenFactory is called on EVERY connection attempt (including reconnects).
        // This ensures a fresh token is always used — never a stale cached one.
        accessTokenFactory: () => this.authService.getToken() ?? ''
      })
      .withAutomaticReconnect()
      .configureLogging(environment.production ? LogLevel.Warning : LogLevel.Information)
      .build();

    this.hubConnection.start()
      .then(() => console.log('SignalR connected'))
      .catch(err => console.error('SignalR connection error:', err));

    this.hubConnection.on('ReceiveNotification', (payload: any) => {
      const n: NotificationDto = {
        id: payload.id || payload.ID || 0,
        title: payload.title || payload.Title,
        message: payload.message || payload.Message,
        type: payload.type || payload.Type || 'General',
        isRead: payload.isRead || payload.IsRead || false,
        createdOn: payload.createdOn || payload.CreatedOn || new Date().toISOString(),
        data: payload.data || null
      };

      // append to top
      const current = this.notificationsSubject.value;
      this.notificationsSubject.next([n, ...current]);
    });
  }

  stopConnection() {
    this.hubConnection?.stop().catch(() => { });
  }
}
