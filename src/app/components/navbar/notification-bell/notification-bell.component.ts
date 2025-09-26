import { Component, OnInit, ElementRef, HostListener, ViewChild } from '@angular/core';
import { NotificationDto } from '../../../utility/models/notification.model';
import { NotificationStoreService } from '../../../services/notification-store.service';
import { PushServiceService } from '../../../services/push-service.service';
import { SignalRService } from '../../../services/signal-r.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-notification-bell',
  imports: [CommonModule],
  templateUrl: './notification-bell.component.html',
  styleUrl: './notification-bell.component.css'
})
export class NotificationBellComponent implements OnInit {
  notifications: NotificationDto[] = [];

  @ViewChild('bellWrapper', { static: true }) bellWrapper!: ElementRef;

  dropdownOpen = false;

  constructor(
    public store: NotificationStoreService,
    private pushService: PushServiceService,
    private signalR: SignalRService
  ) { }

  async ngOnInit() {
    // start SignalR & load unread
    this.signalR.startConnection();
    await this.store.loadUnread();
    this.store.notifications.subscribe(list => this.notifications = list);
  }

  async enablePush() {
    await this.pushService.registerServiceWorker();
    await this.pushService.subscribeToPush();
  }

  toggleDropdown(event: MouseEvent) {
    event.stopPropagation();
    this.dropdownOpen = !this.dropdownOpen;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.bellWrapper.nativeElement.contains(event.target)) {
      this.dropdownOpen = false;
    }
  }

  async markAsRead(n: NotificationDto) {
    if (!n.isRead) {
      this.store.markAsRead(n.id);
      await this.store.loadUnread();
    }
    // optionally navigate to an entity link in n.data
  }
  async markAllRead() {
    this.store.markAllRead();
  }
}