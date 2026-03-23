import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors, HttpErrorResponse } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';
import { LoaderService } from '../services/loader.service';
import { of } from 'rxjs';

describe('authInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let loaderService: LoaderService;

  beforeEach(() => {
    authServiceSpy = jasmine.createSpyObj('AuthService', [
      'getUserData',
      'isTokenExpiringSoon',
      'refreshToken',
      'saveUserData',
      'logout',
    ]);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
        LoaderService,
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    loaderService = TestBed.inject(LoaderService);

    // Default: no token
    authServiceSpy.getUserData.and.returnValue(null);
    authServiceSpy.isTokenExpiringSoon.and.returnValue(false);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should pass through requests without token for excluded URLs', () => {
    httpClient.post('/api/Auth/login', {}).subscribe();

    const req = httpMock.expectOne('/api/Auth/login');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  it('should attach Bearer token to non-excluded requests', () => {
    authServiceSpy.getUserData.and.returnValue({ token: 'myToken123' });

    httpClient.get('/api/SampleInward/list').subscribe();

    const req = httpMock.expectOne('/api/SampleInward/list');
    expect(req.request.headers.get('Authorization')).toBe('Bearer myToken123');
    req.flush({});
  });

  it('should pass request without auth header when no token exists', () => {
    authServiceSpy.getUserData.and.returnValue(null);

    httpClient.get('/api/SomeEndpoint').subscribe();

    const req = httpMock.expectOne('/api/SomeEndpoint');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  it('should enhance error with errorMessage on 500', () => {
    authServiceSpy.getUserData.and.returnValue(null);

    httpClient.get('/api/test').subscribe({
      error: (err) => {
        expect(err.errorMessage).toBeDefined();
      },
    });

    const req = httpMock.expectOne('/api/test');
    req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });
  });

  it('should enhance error with errorMessage on 404', () => {
    authServiceSpy.getUserData.and.returnValue(null);

    httpClient.get('/api/notfound').subscribe({
      error: (err) => {
        expect(err.errorMessage).toBeDefined();
      },
    });

    const req = httpMock.expectOne('/api/notfound');
    req.flush('Not Found', { status: 404, statusText: 'Not Found' });
  });

  it('should show loader for non-excluded URLs', () => {
    authServiceSpy.getUserData.and.returnValue({ token: 'tok' });
    spyOn(loaderService, 'show');

    httpClient.get('/api/Customer/list').subscribe();

    const req = httpMock.expectOne('/api/Customer/list');
    expect(loaderService.show).toHaveBeenCalled();
    req.flush({});
  });

  it('should hide loader after response', () => {
    authServiceSpy.getUserData.and.returnValue({ token: 'tok' });
    spyOn(loaderService, 'hide');

    httpClient.get('/api/Customer/list').subscribe();

    const req = httpMock.expectOne('/api/Customer/list');
    req.flush({});
    expect(loaderService.hide).toHaveBeenCalled();
  });

  it('should hide loader on error', () => {
    authServiceSpy.getUserData.and.returnValue({ token: 'tok' });
    spyOn(loaderService, 'hide');

    httpClient.get('/api/test').subscribe({ error: () => {} });

    const req = httpMock.expectOne('/api/test');
    req.flush('Error', { status: 500, statusText: 'Error' });
    expect(loaderService.hide).toHaveBeenCalled();
  });

  it('should refresh token when expiring soon', () => {
    authServiceSpy.getUserData.and.returnValue({ token: 'oldToken' });
    authServiceSpy.isTokenExpiringSoon.and.returnValue(true);
    authServiceSpy.refreshToken.and.returnValue(of({ token: 'newToken' }));

    httpClient.get('/api/test').subscribe();

    const req = httpMock.expectOne('/api/test');
    expect(authServiceSpy.refreshToken).toHaveBeenCalledWith('oldToken');
    expect(authServiceSpy.saveUserData).toHaveBeenCalledWith({ token: 'newToken' });
    req.flush({});
  });

  it('should use custom error message from error.error string', () => {
    authServiceSpy.getUserData.and.returnValue(null);

    httpClient.get('/api/test').subscribe({
      error: (err) => {
        expect(err.errorMessage).toBe('Custom error message');
      },
    });

    const req = httpMock.expectOne('/api/test');
    req.flush('Custom error message', { status: 400, statusText: 'Bad Request' });
  });
});
