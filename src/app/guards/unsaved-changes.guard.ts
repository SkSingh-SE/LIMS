import { CanDeactivateFn } from '@angular/router';
import { Observable } from 'rxjs';

/**
 * Interface that form components implement to support unsaved-changes protection.
 * If `canDeactivate()` returns false or an Observable<false>, navigation is blocked.
 */
export interface CanComponentDeactivate {
  canDeactivate: () => Observable<boolean> | Promise<boolean> | boolean;
}

/**
 * Functional CanDeactivate guard — if the component implements CanComponentDeactivate,
 * delegate to it; otherwise allow navigation freely.
 */
export const unsavedChangesGuard: CanDeactivateFn<CanComponentDeactivate> = (component) => {
  if (component?.canDeactivate) {
    return component.canDeactivate();
  }
  return true;
};
