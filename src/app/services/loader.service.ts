import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoaderService {
  private requestCount = 0;
  private loading = new BehaviorSubject<boolean>(false);
  public loading$ = this.loading.asObservable();

  show(): void {
    this.requestCount++;
    this.loading.next(true);
  }

  hide(): void {
    if (this.requestCount > 0) {
      this.requestCount--;
    }
    if (this.requestCount === 0) {
      this.loading.next(false);
    }
  }
  forceHide(): void {
    this.requestCount = 0;
    this.loading.next(false);
  }
}
