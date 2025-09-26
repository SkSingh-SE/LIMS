import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { NotificationService } from './notification.service';
import { SignalRService } from './signal-r.service';
import { NotificationDto } from '../utility/models/notification.model';

@Injectable({
  providedIn: 'root'
})
export class NotificationStoreService {
  private notifications$ = new BehaviorSubject<NotificationDto[]>([]);
  readonly notifications = this.notifications$.asObservable();

  constructor(
    private api: NotificationService,
    private signalR: SignalRService
  ) {
    // subscribe to SignalR updates
    this.signalR.notifications$.subscribe(n => {
      // merge but avoid duplicates by id
      // const current = this.notifications$.value;
      // const merged = [ ...n, ...current.filter(c => !n.some(x => x.id === c.id)) ];
      // this.notifications$.next(merged);
      this.prependNotification(n);
    });
  }

  async loadUnread() {
    const list = await this.api.getUnread().toPromise();
    this.notifications$.next(list);
  }

  markAsRead(id: number) {
    this.api.markAsRead(id).subscribe(() => {
      const updated = this.notifications$.value.filter(n => n.id !== id);
      this.notifications$.next(updated);
    });
  }

  markAllRead() {
    this.api.markAllRead().subscribe(() => {
      const updated = this.notifications$.value.map(n => ({ ...n, isRead: true }));
      this.notifications$.next(updated);
    });
  }

  getUnreadCount(): number {
    return this.notifications$.value.filter(n => !n.isRead).length;
  }
  prependNotification(notification: NotificationDto | NotificationDto[]) {
    const current = this.notifications$.value;

    if (Array.isArray(notification)) {
      // Handle array
      const merged = [
        ...notification,
        ...current.filter(c => !notification.some(x => x.id === c.id))
      ];
      this.notifications$.next(merged);
    } else {
      // Handle single
      if (!current.some(n => n.id === notification.id)) {
        this.notifications$.next([notification, ...current]);
      }
    }
  }

}