import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ToastService {

  toasts: any[] = [];
  duration = 5000;
  private lastToastTime = 0;
  show(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') {
    // Prevent duplicate toasts with the same message (regardless of type)
    const isDuplicate = this.toasts.some(t => t.message === message && t.show);
    if (isDuplicate) return;

    // Suppress rapid-fire toasts (e.g., interceptor warning + component error for the same API call)
    const now = Date.now();
    if (now - this.lastToastTime < 100 && (type === 'error' || type === 'warning') && this.toasts.some(t => t.show)) {
      return;
    }
    this.lastToastTime = now;

    const toast = { message, type, show: true, progress: 100 };
    this.toasts.push(toast);

    // Calculate decrement per interval (100ms updates)
    const intervalTime = 200; // Update every 100ms
    const decrementValue = 100 / (this.duration / intervalTime);

    const interval = setInterval(() => {
      
      if (toast.progress > 0) {
        toast.progress = Math.max(0, toast.progress - decrementValue);
      } else {
        clearInterval(interval);
        this.fadeOutToast(toast);
      }
    }, intervalTime);

    setTimeout(() => {
      clearInterval(interval);
      this.fadeOutToast(toast);
    }, this.duration);
  }

  fadeOutToast(toast: any) {
    toast.show = false;
    setTimeout(() => this.remove(toast), 500);
  }

  remove(toast: any) {
    this.toasts = this.toasts.filter(t => t !== toast);
  }
}
