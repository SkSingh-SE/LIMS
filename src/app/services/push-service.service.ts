import { Injectable } from '@angular/core';
import { NotificationService } from './notification.service';
import { urlBase64ToUint8Array } from '../utility/helper/hleper';

@Injectable({
  providedIn: 'root'
})
export class PushServiceService {
 private registration: ServiceWorkerRegistration | null = null;

  constructor(private api: NotificationService) {}

  async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) return null;
    this.registration = await navigator.serviceWorker.register('/sw-custom.js'); // see sw file below
    return this.registration;
  }

  async subscribeToPush(): Promise<void> {
    if (!this.registration) await this.registerServiceWorker();
    if (!this.registration) return;

    const perm = await Notification.requestPermission();
    if (perm !== 'granted') {
      console.warn('Push permission not granted');
      return;
    }

    const { publicKey } = await this.api.getVapidPublicKey().toPromise();
    const sub = await this.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey?.result??publicKey)
    });

    // Build DTO to send to backend
    const dto = {
      endpoint: sub.endpoint,
      p256dh: (sub.getKey ? btoa(String.fromCharCode(...new Uint8Array(sub.getKey('p256dh')!))) : ''),
      auth: (sub.getKey ? btoa(String.fromCharCode(...new Uint8Array(sub.getKey('auth')!))) : '')
    };

    // send to backend
    await this.api.subscribe(dto).toPromise();
  }

  async unsubscribeFromPush(): Promise<void> {
    if (!this.registration) return;
    const sub = await this.registration.pushManager.getSubscription();
    if (!sub) return;
    const endpoint = sub.endpoint;
    await sub.unsubscribe();
    await this.api.unsubscribe(endpoint).toPromise();
  }
}