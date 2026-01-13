import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { DashboardNotificationDto } from '../../models/dashboardModels';
import { SignalRService } from '../../services/signal-r.service';
import { DashboardErrorHandlerService } from '../../services/dashboard-error-handler.service';
import { NotificationDto } from '../../utility/models/notification.model';

@Component({
  selector: 'app-dashboard-notification-panel',
  imports: [CommonModule],
  templateUrl: './dashboard-notification-panel.component.html',
  styleUrl: './dashboard-notification-panel.component.css'
})
export class DashboardNotificationPanelComponent implements OnInit, OnDestroy {
  @Input() notifications: DashboardNotificationDto[] = [];
  @Input() isLoading: boolean = false;
  @Input() maxDisplayCount: number = 5;
  @Output() notificationClick = new EventEmitter<DashboardNotificationDto>();
  @Output() viewAllClick = new EventEmitter<void>();

  private signalRSubscription?: Subscription;
  realtimeNotifications: NotificationDto[] = [];
  hasError = false;
  errorMessage = '';

  constructor(
    private router: Router,
    private signalRService: SignalRService,
    private errorHandler: DashboardErrorHandlerService
  ) { }

  ngOnInit(): void {
    try {
      this.validateInputs();
      this.subscribeToSignalR();
    } catch (error) {
      this.handleNotificationError(error, 'Failed to initialize notifications panel');
    }
  }

  ngOnDestroy(): void {
    try {
      if (this.signalRSubscription) {
        this.signalRSubscription.unsubscribe();
      }
    } catch (error) {
      console.error('Error during notification panel cleanup:', error);
    }
  }

  /**
   * Validate component inputs
   */
  private validateInputs(): void {
    if (this.maxDisplayCount < 1) {
      this.maxDisplayCount = 5; // Default fallback
      console.warn('Invalid maxDisplayCount, using default value of 5');
    }
  }

  /**
   * Subscribe to SignalR notifications with error handling
   */
  private subscribeToSignalR(): void {
    try {
      // Subscribe to real-time notifications from SignalR
      this.signalRSubscription = this.signalRService.notifications$.subscribe({
        next: (realtimeNotifications) => {
          try {
            this.realtimeNotifications = realtimeNotifications.slice(0, this.maxDisplayCount);
            this.hasError = false;
            this.errorMessage = '';
          } catch (error) {
            this.handleNotificationError(error, 'Failed to process real-time notifications');
          }
        },
        error: (error) => {
          this.handleNotificationError(error, 'Real-time notification connection failed');
        }
      });
    } catch (error) {
      this.handleNotificationError(error, 'Failed to connect to real-time notifications');
    }
  }

  /**
   * Get notifications sorted chronologically (most recent first) with error handling
   */
  getSortedNotifications(): DashboardNotificationDto[] {
    try {
      if (!this.notifications || this.notifications.length === 0) {
        return [];
      }

      return [...this.notifications]
        .sort((a, b) => {
          try {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          } catch (error) {
            console.warn('Error sorting notifications by timestamp:', error);
            return 0;
          }
        })
        .slice(0, this.maxDisplayCount);
    } catch (error) {
      this.handleNotificationError(error, 'Failed to sort notifications');
      return [];
    }
  }

  /**
   * Handle notification click event with error handling
   */
  onNotificationClick(notification: DashboardNotificationDto): void {
    try {
      if (!notification) {
        console.warn('Invalid notification clicked');
        return;
      }

      this.notificationClick.emit(notification);

      // Navigate to related page if actionUrl is provided
      if (notification.actionUrl) {
        this.router.navigate([notification.actionUrl]).catch(error => {
          this.handleNotificationError(error, 'Failed to navigate to notification page');
        });
      }
    } catch (error) {
      this.handleNotificationError(error, 'Failed to handle notification click');
    }
  }

  /**
   * Handle view all notifications click with error handling
   */
  onViewAllClick(): void {
    try {
      this.viewAllClick.emit();
      // Navigate to notifications page (assuming it exists)
      this.router.navigate(['/notifications']).catch(error => {
        this.handleNotificationError(error, 'Failed to navigate to notifications page');
      });
    } catch (error) {
      this.handleNotificationError(error, 'Failed to handle view all click');
    }
  }

  /**
   * Get priority-based CSS class for styling
   */
  getPriorityClass(priority: string): string {
    switch (priority) {
      case 'Info':
        return 'notification-priority-info';
      case 'Warning':
        return 'notification-priority-warning';
      case 'Critical':
        return 'notification-priority-critical';
      default:
        return 'notification-priority-info';
    }
  }

  /**
   * Get priority icon based on notification priority
   */
  getPriorityIcon(priority: string): string {
    switch (priority) {
      case 'Info':
        return 'ri-information-line';
      case 'Warning':
        return 'ri-alert-line';
      case 'Critical':
        return 'ri-error-warning-line';
      default:
        return 'ri-information-line';
    }
  }

  /**
   * Format timestamp for display
   */
  formatTimestamp(timestamp: Date | string): string {
    const now = new Date();
    const notificationTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - notificationTime.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) { // 24 hours
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return `${days}d ago`;
    }
  }

  /**
   * Check if there are more notifications than displayed
   */
  hasMoreNotifications(): boolean {
    return this.notifications && this.notifications.length > this.maxDisplayCount;
  }

  /**
   * Get count of additional notifications
   */
  getAdditionalCount(): number {
    if (!this.notifications) return 0;
    return Math.max(0, this.notifications.length - this.maxDisplayCount);
  }

  /**
   * Check if notifications panel is empty
   */
  isEmpty(): boolean {
    return !this.isLoading && (!this.notifications || this.notifications.length === 0);
  }

  /**
   * Truncate message for display
   */
  truncateMessage(message: string, maxLength: number = 100): string {
    if (!message) return '';
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + '...';
  }

  /**
   * TrackBy function for notifications list performance
   */
  trackByNotificationId(index: number, notification: DashboardNotificationDto): string {
    try {
      return notification?.id ? notification.id.toString() : index.toString();
    } catch (error) {
      return index.toString();
    }
  }

  /**
   * Handle notification-specific errors
   */
  private handleNotificationError(error: any, message: string): void {
    this.hasError = true;
    this.errorMessage = message;

    this.errorHandler.handleComponentError(error, {
      component: 'DashboardNotificationPanelComponent',
      operation: 'Notification Operation',
      userMessage: message,
      technicalDetails: {
        notificationCount: this.notifications?.length || 0,
        maxDisplayCount: this.maxDisplayCount,
        hasSignalRConnection: !!this.signalRSubscription
      }
    });
  }

  /**
   * Get safe notification title
   */
  getSafeTitle(notification: DashboardNotificationDto): string {
    try {
      return notification?.title || 'Notification';
    } catch (error) {
      return 'Notification';
    }
  }

  /**
   * Get safe notification message
   */
  getSafeMessage(notification: DashboardNotificationDto): string {
    try {
      return notification?.message || '';
    } catch (error) {
      return '';
    }
  }

  /**
   * Get safe notification priority
   */
  getSafePriority(notification: DashboardNotificationDto): string {
    try {
      return notification?.priority || 'Info';
    } catch (error) {
      return 'Info';
    }
  }

  /**
   * Get safe notification timestamp
   */
  getSafeTimestamp(notification: DashboardNotificationDto): Date {
    try {
      return notification?.createdAt ? new Date(notification.createdAt) : new Date();
    } catch (error) {
      return new Date();
    }
  }

  /**
   * Retry loading notifications
   */
  retryNotifications(): void {
    try {
      this.hasError = false;
      this.errorMessage = '';

      // Reconnect to SignalR if needed
      if (this.signalRSubscription) {
        this.signalRSubscription.unsubscribe();
      }

      this.subscribeToSignalR();
    } catch (error) {
      this.handleNotificationError(error, 'Failed to retry notifications');
    }
  }
}
