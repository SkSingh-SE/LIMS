import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NotificationStoreService } from './services/notification-store.service';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'LIMS';

  constructor(
    private notificationStore: NotificationStoreService,
    private themeService: ThemeService
  ) { }
  ngOnInit(): void {
    navigator.serviceWorker?.addEventListener('message', (event) => {
      debugger;
      if (!event.data) return;

      if (event.data.type === 'PUSH_RECEIVED') {
        const payload = event.data.payload;

        const n = {
          id: payload.id || Date.now(), // fallback id
          title: payload.title,
          message: payload.message || payload.body,
          type: payload.type || 'General',
          isRead: false,
          createdOn: (payload.timestamp || new Date()).toString(),
          data: payload.data || null
        };

        // ✅ feed into store
        this.notificationStore.prependNotification(n);
      }
    });
  }
}
