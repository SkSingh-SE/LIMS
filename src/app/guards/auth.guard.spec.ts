import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

describe('authGuard', () => {
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let mockRoute: ActivatedRouteSnapshot;
  let mockState: RouterStateSnapshot;

  beforeEach(() => {
    authServiceSpy = jasmine.createSpyObj('AuthService', [
      'isTokenExpiringSoon',
      'getUserData',
      'refreshToken',
      'saveUserData',
      'logout',
    ]);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
      ],
    });

    mockRoute = {} as ActivatedRouteSnapshot;
    mockState = {} as RouterStateSnapshot;
  });

  it('should return true when token is valid and not expiring', (done) => {
    authServiceSpy.getUserData.and.returnValue({ token: 'validToken' });
    authServiceSpy.isTokenExpiringSoon.and.returnValue(false);

    TestBed.runInInjectionContext(() => {
      const result = authGuard(mockRoute, mockState);
      if (result && typeof (result as any).subscribe === 'function') {
        (result as any).subscribe((value: boolean) => {
          expect(value).toBeTrue();
          done();
        });
      }
    });
  });

  it('should redirect to login when no user data', (done) => {
    authServiceSpy.getUserData.and.returnValue(null);
    authServiceSpy.isTokenExpiringSoon.and.returnValue(false);

    TestBed.runInInjectionContext(() => {
      const result = authGuard(mockRoute, mockState);
      if (result && typeof (result as any).subscribe === 'function') {
        (result as any).subscribe((value: boolean) => {
          expect(value).toBeFalse();
          expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
          done();
        });
      }
    });
  });

  it('should refresh token when expiring and allow if successful', (done) => {
    authServiceSpy.getUserData.and.returnValue({ token: 'expiringToken' });
    authServiceSpy.isTokenExpiringSoon.and.returnValue(true);
    authServiceSpy.refreshToken.and.returnValue(of({ token: 'newToken' }));

    TestBed.runInInjectionContext(() => {
      const result = authGuard(mockRoute, mockState);
      if (result && typeof (result as any).subscribe === 'function') {
        (result as any).subscribe((value: boolean) => {
          expect(value).toBeTrue();
          expect(authServiceSpy.saveUserData).toHaveBeenCalledWith({ token: 'newToken' });
          done();
        });
      }
    });
  });

  it('should logout and redirect when refresh returns no token', (done) => {
    authServiceSpy.getUserData.and.returnValue({ token: 'expiringToken' });
    authServiceSpy.isTokenExpiringSoon.and.returnValue(true);
    authServiceSpy.refreshToken.and.returnValue(of({}));

    TestBed.runInInjectionContext(() => {
      const result = authGuard(mockRoute, mockState);
      if (result && typeof (result as any).subscribe === 'function') {
        (result as any).subscribe((value: boolean) => {
          expect(value).toBeFalse();
          expect(authServiceSpy.logout).toHaveBeenCalled();
          expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
          done();
        });
      }
    });
  });

  it('should logout and redirect when refresh fails', (done) => {
    authServiceSpy.getUserData.and.returnValue({ token: 'expiringToken' });
    authServiceSpy.isTokenExpiringSoon.and.returnValue(true);
    authServiceSpy.refreshToken.and.returnValue(throwError(() => new Error('Refresh failed')));

    TestBed.runInInjectionContext(() => {
      const result = authGuard(mockRoute, mockState);
      if (result && typeof (result as any).subscribe === 'function') {
        (result as any).subscribe((value: boolean) => {
          expect(value).toBeFalse();
          expect(authServiceSpy.logout).toHaveBeenCalled();
          expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
          done();
        });
      }
    });
  });
});
