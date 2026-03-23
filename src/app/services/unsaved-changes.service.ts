import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

/**
 * Service that manages the unsaved-changes confirmation dialog.
 * Form components call `confirm()` and subscribe to the result.
 * The UnsavedChangesModalComponent listens and renders the dialog.
 */
@Injectable({ providedIn: 'root' })
export class UnsavedChangesService {
  private confirmSubject = new Subject<boolean>();
  private showSubject = new Subject<void>();

  /** Observable that the modal component subscribes to — triggers modal open */
  show$ = this.showSubject.asObservable();

  /** Observable that resolves the user's choice (true = leave, false = stay) */
  result$ = this.confirmSubject.asObservable();

  /**
   * Opens the confirmation dialog and returns an Observable<boolean>.
   * Resolves true if user clicks "Leave Anyway", false if "Stay on Page".
   */
  confirm(): Observable<boolean> {
    this.showSubject.next();
    return new Observable<boolean>((observer) => {
      const sub = this.confirmSubject.subscribe((result) => {
        observer.next(result);
        observer.complete();
        sub.unsubscribe();
      });
    });
  }

  /** Called by the modal component when the user makes a choice */
  resolve(leave: boolean): void {
    this.confirmSubject.next(leave);
  }
}
