import { TestBed } from '@angular/core/testing';
import { unsavedChangesGuard, CanComponentDeactivate } from './unsaved-changes.guard';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { of } from 'rxjs';

describe('unsavedChangesGuard', () => {
  let mockCurrentRoute: ActivatedRouteSnapshot;
  let mockCurrentState: RouterStateSnapshot;
  let mockNextState: RouterStateSnapshot;

  beforeEach(() => {
    mockCurrentRoute = {} as ActivatedRouteSnapshot;
    mockCurrentState = {} as RouterStateSnapshot;
    mockNextState = {} as RouterStateSnapshot;
  });

  it('should return true when component does not implement canDeactivate', () => {
    const component = {} as any;
    const result = unsavedChangesGuard(component, mockCurrentRoute, mockCurrentState, mockNextState);
    expect(result).toBeTrue();
  });

  it('should return true when component is null', () => {
    const result = unsavedChangesGuard(null as any, mockCurrentRoute, mockCurrentState, mockNextState);
    expect(result).toBeTrue();
  });

  it('should delegate to component.canDeactivate when it returns true', () => {
    const component: CanComponentDeactivate = {
      canDeactivate: () => true,
    };
    const result = unsavedChangesGuard(component, mockCurrentRoute, mockCurrentState, mockNextState);
    expect(result).toBeTrue();
  });

  it('should delegate to component.canDeactivate when it returns false', () => {
    const component: CanComponentDeactivate = {
      canDeactivate: () => false,
    };
    const result = unsavedChangesGuard(component, mockCurrentRoute, mockCurrentState, mockNextState);
    expect(result).toBeFalse();
  });

  it('should handle Observable return from canDeactivate', (done) => {
    const component: CanComponentDeactivate = {
      canDeactivate: () => of(true),
    };
    const result = unsavedChangesGuard(component, mockCurrentRoute, mockCurrentState, mockNextState);
    if (result && typeof (result as any).subscribe === 'function') {
      (result as any).subscribe((value: boolean) => {
        expect(value).toBeTrue();
        done();
      });
    }
  });

  it('should handle Promise return from canDeactivate', async () => {
    const component: CanComponentDeactivate = {
      canDeactivate: () => Promise.resolve(false),
    };
    const result = unsavedChangesGuard(component, mockCurrentRoute, mockCurrentState, mockNextState);
    const value = await (result as Promise<boolean>);
    expect(value).toBeFalse();
  });
});
