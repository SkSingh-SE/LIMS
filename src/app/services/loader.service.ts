import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoaderService {
  private activeRequests = new Set<string>();
  private loading = new BehaviorSubject<boolean>(false);
  public loading$ = this.loading.asObservable();
  private watchdogTimer: any = null;
  private readonly MAX_LOADER_TIMEOUT_MS = 6000; // 6 seconds safety watchdog

  show(reqId?: string): string {
    const id = reqId || this.generateId();
    this.activeRequests.add(id);

    if (this.activeRequests.size > 0 && !this.loading.value) {
      this.loading.next(true);
    }

    this.resetWatchdog();
    return id;
  }

  hide(reqId?: string): void {
    if (reqId) {
      this.activeRequests.delete(reqId);
    } else if (this.activeRequests.size > 0) {
      const first = this.activeRequests.values().next().value;
      if (first) this.activeRequests.delete(first);
    }

    if (this.activeRequests.size === 0) {
      this.clearWatchdog();
      if (this.loading.value) {
        this.loading.next(false);
      }
    } else {
      this.resetWatchdog();
    }
  }

  forceHide(): void {
    this.activeRequests.clear();
    this.clearWatchdog();
    if (this.loading.value) {
      this.loading.next(false);
    }
  }

  private resetWatchdog(): void {
    this.clearWatchdog();
    this.watchdogTimer = setTimeout(() => {
      if (this.activeRequests.size > 0 || this.loading.value) {
        console.warn('[LoaderService] Safety watchdog triggered: Clearing stuck loader after timeout.');
        this.forceHide();
      }
    }, this.MAX_LOADER_TIMEOUT_MS);
  }

  private clearWatchdog(): void {
    if (this.watchdogTimer) {
      clearTimeout(this.watchdogTimer);
      this.watchdogTimer = null;
    }
  }

  private generateId(): string {
    return 'req_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
  }
}

