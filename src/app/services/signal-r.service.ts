import { Injectable, OnDestroy } from '@angular/core';
import { HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel } from '@microsoft/signalr';
import { BehaviorSubject, Subject } from 'rxjs';
import { AuthService } from './auth.service';
import { NotificationDto } from '../utility/models/notification.model';
import { environment } from '../../environments/environment';

export interface DashboardLiveEvent {
  notificationId?: number;
  title?: string;
  at: string;
}

@Injectable({
  providedIn: 'root'
})
export class SignalRService implements OnDestroy {
  private hubConnection: HubConnection | null = null;
  private notificationsSubject = new BehaviorSubject<NotificationDto[]>([]);
  notifications$ = this.notificationsSubject.asObservable();

  private dashboardUpdatedSubject = new Subject<DashboardLiveEvent>();
  dashboardUpdated$ = this.dashboardUpdatedSubject.asObservable();

  private connectionSubject = new BehaviorSubject<boolean>(false);
  connected$ = this.connectionSubject.asObservable();

  private starting = false;

  constructor(private authService: AuthService) {}

  get isConnected(): boolean {
    return this.hubConnection?.state === HubConnectionState.Connected;
  }

  startConnection(): void {
    if (this.hubConnection || this.starting) return;
    this.starting = true;

    const hubUrl = this.resolveHubUrl();

    this.hubConnection = new HubConnectionBuilder()
      .withUrl(hubUrl, {
        // accessTokenFactory is called on EVERY connection attempt (including reconnects).
        // This ensures a fresh token is always used — never a stale cached one.
        accessTokenFactory: () => this.authService.getToken() ?? ''
      })
      .withAutomaticReconnect()
      .configureLogging(environment.production ? LogLevel.Warning : LogLevel.Information)
      .build();

    this.hubConnection.on('ReceiveNotification', (payload: any) => {
      const n: NotificationDto = {
        id: payload.id || payload.ID || payload.notificationId || 0,
        title: payload.title || payload.Title,
        message: payload.message || payload.Message,
        type: payload.type || payload.Type || 'General',
        isRead: payload.isRead || payload.IsRead || false,
        createdOn: payload.createdOn || payload.CreatedOn || new Date().toISOString(),
        data: payload.data || null
      };

      // append to top
      const current = this.notificationsSubject.value;
      this.notificationsSubject.next([n, ...current].slice(0, 50));

      // Any push notification also means dashboard KPIs may have changed.
      this.dashboardUpdatedSubject.next({ notificationId: n.id, title: n.title, at: new Date().toISOString() });
    });

    this.hubConnection.on('DashboardUpdated', (payload: any) => {
      this.dashboardUpdatedSubject.next({
        notificationId: payload?.notificationId,
        title: payload?.title,
        at: payload?.at || new Date().toISOString()
      });
    });

    this.hubConnection.onreconnecting(() => this.connectionSubject.next(false));
    this.hubConnection.onreconnected(() => {
      this.connectionSubject.next(true);
      this.joinDashboard().catch(() => undefined);
    });
    this.hubConnection.onclose(() => this.connectionSubject.next(false));

    this.hubConnection.start()
      .then(() => {
        this.connectionSubject.next(true);
        return this.joinDashboard().catch(() => undefined);
      })
      .catch(err => {
        console.error('SignalR connection error:', err);
        this.connectionSubject.next(false);
      })
      .finally(() => { this.starting = false; });
  }

  private resolveHubUrl(): string {
    // Prefer a relative URL so the Angular dev proxy (/hubs -> https://localhost:7049)
    // handles local runs. Absolute baseUrl values in environment files (e.g.
    // 192.168.x or ntempurl hosts) break local SignalR + cause silent empty dashboards.
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/hubs/notifications`;
    }
    return `${environment.baseUrl}hubs/notifications`;
  }

  private async joinDashboard(): Promise<void> {
    if (this.hubConnection?.state === HubConnectionState.Connected) {
      await this.hubConnection.invoke('JoinDashboard');
    }
  }

  pushLocalNotification(n: NotificationDto): void {
    const current = this.notificationsSubject.value;
    this.notificationsSubject.next([n, ...current].slice(0, 50));
    this.dashboardUpdatedSubject.next({ notificationId: n.id, title: n.title, at: new Date().toISOString() });
  }

  stopConnection(): void {
    this.hubConnection?.stop().catch(() => undefined);
    this.connectionSubject.next(false);
  }

  ngOnDestroy(): void {
    this.stopConnection();
  }
}
