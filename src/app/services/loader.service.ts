import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoaderService {
  private activeRequests = new Map<string, number>();
  private loading = new BehaviorSubject<boolean>(false);
  public loading$ = this.loading.asObservable();
  private watchdogTimer: any = null;

  // Default safety watchdog: 10 minutes (600,000 ms) so normal APIs/reports/calculations complete
  public static readonly DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;
  // Upload safety watchdog: 30 minutes (1,800,000 ms) for large files (up to 250 MB)
  public static readonly UPLOAD_TIMEOUT_MS = 30 * 60 * 1000;

  show(reqId?: string, timeoutMs: number = LoaderService.DEFAULT_TIMEOUT_MS): string {
    const id = reqId || this.generateId();
    this.activeRequests.set(id, timeoutMs);

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
      const first = this.activeRequests.keys().next().value;
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
    if (this.activeRequests.size === 0) return;

    // Use maximum timeout among active requests
    const timeouts = Array.from(this.activeRequests.values());
    const maxTimeout = timeouts.length > 0 ? Math.max(...timeouts) : LoaderService.DEFAULT_TIMEOUT_MS;

    this.watchdogTimer = setTimeout(() => {
      if (this.activeRequests.size > 0 || this.loading.value) {
        console.warn(`[LoaderService] Safety watchdog triggered: Clearing stuck loader after ${maxTimeout / 1000}s.`);
        this.forceHide();
      }
    }, maxTimeout);
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

