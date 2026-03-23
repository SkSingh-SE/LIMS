import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let routerSpy: jasmine.SpyObj<Router>;

  const apiUrl = environment.apiUrl + '/Auth';

  beforeEach(() => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: routerSpy },
      ],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ========== login ==========

  describe('login', () => {
    it('should POST credentials and save user data on success', () => {
      const mockResponse = { token: 'abc123', expiresInSeconds: 3600, roles: ['Admin'] };

      service.login({ email: 'test@test.com', password: 'pass123' }).subscribe((data) => {
        expect(data).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(apiUrl + '/login');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ email: 'test@test.com', password: 'pass123' });
      req.flush(mockResponse);
    });

    it('should propagate error on failed login', () => {
      service.login({ email: 'test@test.com', password: 'wrong' }).subscribe({
        error: (err) => {
          expect(err.status).toBe(401);
        },
      });

      const req = httpMock.expectOne(apiUrl + '/login');
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    });
  });

  // ========== refreshToken ==========

  describe('refreshToken', () => {
    it('should send GET with Bearer token header', () => {
      service.refreshToken('myToken').subscribe();

      const req = httpMock.expectOne(apiUrl + '/refresh-token');
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Authorization')).toBe('Bearer myToken');
      req.flush({ token: 'newToken' });
    });
  });

  // ========== saveUserData ==========

  describe('saveUserData', () => {
    it('should save user data to localStorage', () => {
      service.saveUserData({ token: 'abc', expiresInSeconds: 3600 });
      const stored = JSON.parse(localStorage.getItem('userData')!);
      expect(stored.token).toBe('abc');
    });

    it('should calculate expiration time from expiresInSeconds', () => {
      const before = Date.now();
      service.saveUserData({ token: 'abc', expiresInSeconds: 3600 });
      const expiration = Number(localStorage.getItem('tokenExpiration'));
      expect(expiration).toBeGreaterThanOrEqual(before + 3600 * 1000 - 100);
    });

    it('should use fallback 8 hours when expiresInSeconds is 0', () => {
      const before = Date.now();
      service.saveUserData({ token: 'abc', expiresInSeconds: 0 });
      const expiration = Number(localStorage.getItem('tokenExpiration'));
      const eightHours = 8 * 60 * 60 * 1000;
      expect(expiration).toBeGreaterThanOrEqual(before + eightHours - 100);
    });

    it('should use expiresInSecond (alternative key) if expiresInSeconds is missing', () => {
      const before = Date.now();
      service.saveUserData({ token: 'abc', expiresInSecond: 1800 });
      const expiration = Number(localStorage.getItem('tokenExpiration'));
      expect(expiration).toBeGreaterThanOrEqual(before + 1800 * 1000 - 100);
    });

    it('should fallback to 8 hours when no expiry fields present', () => {
      const before = Date.now();
      service.saveUserData({ token: 'abc' });
      const expiration = Number(localStorage.getItem('tokenExpiration'));
      const eightHours = 8 * 60 * 60 * 1000;
      expect(expiration).toBeGreaterThanOrEqual(before + eightHours - 100);
    });
  });

  // ========== getUserData ==========

  describe('getUserData', () => {
    it('should return parsed user data', () => {
      localStorage.setItem('userData', JSON.stringify({ token: 'test' }));
      expect(service.getUserData().token).toBe('test');
    });

    it('should return null when no data stored', () => {
      expect(service.getUserData()).toBeNull();
    });
  });

  // ========== isLoggedIn ==========

  describe('isLoggedIn', () => {
    it('should return true when token is valid and not expired', () => {
      localStorage.setItem('userData', JSON.stringify({ token: 'test' }));
      localStorage.setItem('tokenExpiration', (Date.now() + 3600000).toString());
      expect(service.isLoggedIn()).toBeTrue();
    });

    it('should return false when token is expired', () => {
      localStorage.setItem('userData', JSON.stringify({ token: 'test' }));
      localStorage.setItem('tokenExpiration', (Date.now() - 1000).toString());
      expect(service.isLoggedIn()).toBeFalse();
    });

    it('should return false when no user data', () => {
      expect(service.isLoggedIn()).toBeFalse();
    });

    it('should return false when no expiration', () => {
      localStorage.setItem('userData', JSON.stringify({ token: 'test' }));
      expect(service.isLoggedIn()).toBeFalse();
    });
  });

  // ========== logout ==========

  describe('logout', () => {
    it('should clear localStorage and navigate to login', () => {
      localStorage.setItem('userData', 'data');
      localStorage.setItem('tokenExpiration', '12345');

      service.logout();

      expect(localStorage.getItem('userData')).toBeNull();
      expect(localStorage.getItem('tokenExpiration')).toBeNull();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
    });
  });

  // ========== isTokenExpiringSoon ==========

  describe('isTokenExpiringSoon', () => {
    it('should return true when token expires in less than 60 seconds', () => {
      localStorage.setItem('tokenExpiration', (Date.now() + 30000).toString()); // 30s from now
      expect(service.isTokenExpiringSoon()).toBeTrue();
    });

    it('should return false when token expires in more than 60 seconds', () => {
      localStorage.setItem('tokenExpiration', (Date.now() + 120000).toString()); // 2 min from now
      expect(service.isTokenExpiringSoon()).toBeFalse();
    });

    it('should return false when no expiration stored', () => {
      expect(service.isTokenExpiringSoon()).toBeFalse();
    });

    it('should return true when token is already expired', () => {
      localStorage.setItem('tokenExpiration', (Date.now() - 1000).toString());
      expect(service.isTokenExpiringSoon()).toBeTrue();
    });
  });

  // ========== getToken ==========

  describe('getToken', () => {
    it('should return token from stored user data', () => {
      localStorage.setItem('userData', JSON.stringify({ token: 'mytoken' }));
      expect(service.getToken()).toBe('mytoken');
    });

    it('should return null when no user data', () => {
      expect(service.getToken()).toBeNull();
    });
  });

  // ========== getUserRoles ==========

  describe('getUserRoles', () => {
    it('should return roles array', () => {
      localStorage.setItem('userData', JSON.stringify({ roles: ['Admin', 'LabManager'] }));
      expect(service.getUserRoles()).toEqual(['Admin', 'LabManager']);
    });

    it('should wrap single role string in array', () => {
      localStorage.setItem('userData', JSON.stringify({ roles: 'Admin' }));
      expect(service.getUserRoles()).toEqual(['Admin']);
    });

    it('should return empty array when no roles', () => {
      localStorage.setItem('userData', JSON.stringify({ token: 'test' }));
      expect(service.getUserRoles()).toEqual([]);
    });

    it('should return empty array when no user data', () => {
      expect(service.getUserRoles()).toEqual([]);
    });
  });

  // ========== hasRole ==========

  describe('hasRole', () => {
    beforeEach(() => {
      localStorage.setItem('userData', JSON.stringify({ roles: ['Admin', 'LabManager'] }));
    });

    it('should return true for existing role', () => {
      expect(service.hasRole('Admin')).toBeTrue();
    });

    it('should return false for non-existing role', () => {
      expect(service.hasRole('SuperAdmin')).toBeFalse();
    });
  });

  // ========== hasAnyRole ==========

  describe('hasAnyRole', () => {
    beforeEach(() => {
      localStorage.setItem('userData', JSON.stringify({ roles: ['Admin'] }));
    });

    it('should return true if user has any of the roles', () => {
      expect(service.hasAnyRole(['Admin', 'LabTechnician'])).toBeTrue();
    });

    it('should return false if user has none', () => {
      expect(service.hasAnyRole(['LabTechnician', 'Reviewer'])).toBeFalse();
    });
  });

  // ========== hasAllRoles ==========

  describe('hasAllRoles', () => {
    beforeEach(() => {
      localStorage.setItem('userData', JSON.stringify({ roles: ['Admin', 'LabManager'] }));
    });

    it('should return true if user has all roles', () => {
      expect(service.hasAllRoles(['Admin', 'LabManager'])).toBeTrue();
    });

    it('should return false if user is missing a role', () => {
      expect(service.hasAllRoles(['Admin', 'SuperAdmin'])).toBeFalse();
    });
  });

  // ========== getPrimaryRole ==========

  describe('getPrimaryRole', () => {
    it('should return first role', () => {
      localStorage.setItem('userData', JSON.stringify({ roles: ['Admin', 'LabManager'] }));
      expect(service.getPrimaryRole()).toBe('Admin');
    });

    it('should return null when no roles', () => {
      localStorage.setItem('userData', JSON.stringify({ token: 'test' }));
      expect(service.getPrimaryRole()).toBeNull();
    });

    it('should return null when no user data', () => {
      expect(service.getPrimaryRole()).toBeNull();
    });
  });
});
