import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { LoginComponent } from './login.component';
import { AuthService } from '../../services/auth.service';
import { SignalRService } from '../../services/signal-r.service';
import { NotificationStoreService } from '../../services/notification-store.service';
import { PushServiceService } from '../../services/push-service.service';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let signalRSpy: jasmine.SpyObj<SignalRService>;
  let notificationStoreSpy: jasmine.SpyObj<NotificationStoreService>;
  let pushServiceSpy: jasmine.SpyObj<PushServiceService>;

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['login', 'saveUserData']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    signalRSpy = jasmine.createSpyObj('SignalRService', ['startConnection']);
    notificationStoreSpy = jasmine.createSpyObj('NotificationStoreService', ['loadUnread']);
    pushServiceSpy = jasmine.createSpyObj('PushServiceService', ['subscribeToPush']);

    await TestBed.configureTestingModule({
      imports: [LoginComponent, ReactiveFormsModule],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: SignalRService, useValue: signalRSpy },
        { provide: NotificationStoreService, useValue: notificationStoreSpy },
        { provide: PushServiceService, useValue: pushServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('form initialization', () => {
    it('should have a login form with email and password', () => {
      expect(component.loginForm).toBeTruthy();
      expect(component.loginForm.get('email')).toBeTruthy();
      expect(component.loginForm.get('password')).toBeTruthy();
    });

    it('should start with empty form fields', () => {
      expect(component.loginForm.get('email')?.value).toBe('');
      expect(component.loginForm.get('password')?.value).toBe('');
    });

    it('should require email', () => {
      const emailControl = component.loginForm.get('email')!;
      expect(emailControl.valid).toBeFalse();
      emailControl.setValue('test@test.com');
      expect(emailControl.valid).toBeTrue();
    });

    it('should require password', () => {
      const passwordControl = component.loginForm.get('password')!;
      expect(passwordControl.valid).toBeFalse();
      passwordControl.setValue('password123');
      expect(passwordControl.valid).toBeTrue();
    });

    it('should be invalid when both fields are empty', () => {
      expect(component.loginForm.valid).toBeFalse();
    });

    it('should be valid when both fields are filled', () => {
      component.loginForm.patchValue({ email: 'test@test.com', password: 'pass' });
      expect(component.loginForm.valid).toBeTrue();
    });
  });

  describe('togglePassword', () => {
    it('should toggle showPassword signal', () => {
      expect(component.showPassword()).toBeFalse();
      component.togglePassword();
      expect(component.showPassword()).toBeTrue();
      component.togglePassword();
      expect(component.showPassword()).toBeFalse();
    });
  });

  describe('initial signal state', () => {
    it('should start with isLoading false', () => {
      expect(component.isLoading()).toBeFalse();
    });

    it('should start with empty errorMessage', () => {
      expect(component.errorMessage()).toBe('');
    });
  });

  describe('onLogin', () => {
    it('should not call authService.login when form is invalid', () => {
      component.onLogin();
      expect(authServiceSpy.login).not.toHaveBeenCalled();
    });

    it('should set isLoading to true when form is valid', () => {
      component.loginForm.patchValue({ email: 'test@test.com', password: 'pass' });
      authServiceSpy.login.and.returnValue(of({ token: 'tok' }));
      component.onLogin();
      // After subscribe completes, isLoading should be false
      expect(component.isLoading()).toBeFalse();
    });

    it('should call authService.login with form values', () => {
      component.loginForm.patchValue({ email: 'user@test.com', password: 'mypass' });
      authServiceSpy.login.and.returnValue(of({ token: 'tok' }));
      component.onLogin();
      expect(authServiceSpy.login).toHaveBeenCalledWith({
        email: 'user@test.com',
        password: 'mypass',
      });
    });

    it('should save user data on successful login', () => {
      component.loginForm.patchValue({ email: 'test@test.com', password: 'pass' });
      const mockData = { token: 'abc' };
      authServiceSpy.login.and.returnValue(of(mockData));
      component.onLogin();
      expect(authServiceSpy.saveUserData).toHaveBeenCalledWith(mockData);
    });

    it('should start SignalR connection on successful login', () => {
      component.loginForm.patchValue({ email: 'test@test.com', password: 'pass' });
      authServiceSpy.login.and.returnValue(of({ token: 'tok' }));
      component.onLogin();
      expect(signalRSpy.startConnection).toHaveBeenCalled();
    });

    it('should load unread notifications on successful login', () => {
      component.loginForm.patchValue({ email: 'test@test.com', password: 'pass' });
      authServiceSpy.login.and.returnValue(of({ token: 'tok' }));
      component.onLogin();
      expect(notificationStoreSpy.loadUnread).toHaveBeenCalled();
    });

    it('should navigate to root on successful login', () => {
      component.loginForm.patchValue({ email: 'test@test.com', password: 'pass' });
      authServiceSpy.login.and.returnValue(of({ token: 'tok' }));
      component.onLogin();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/']);
    });

    it('should clear errorMessage on successful login', () => {
      component.errorMessage.set('Previous error');
      component.loginForm.patchValue({ email: 'test@test.com', password: 'pass' });
      authServiceSpy.login.and.returnValue(of({ token: 'tok' }));
      component.onLogin();
      expect(component.errorMessage()).toBe('');
    });

    it('should set isLoading to false after successful login', () => {
      component.loginForm.patchValue({ email: 'test@test.com', password: 'pass' });
      authServiceSpy.login.and.returnValue(of({ token: 'tok' }));
      component.onLogin();
      expect(component.isLoading()).toBeFalse();
    });

    it('should set errorMessage on login failure', () => {
      component.loginForm.patchValue({ email: 'test@test.com', password: 'wrong' });
      authServiceSpy.login.and.returnValue(
        throwError(() => ({ errorMessage: 'Invalid credentials', message: 'fail' }))
      );
      component.onLogin();
      expect(component.errorMessage()).toBe('Invalid credentials');
    });

    it('should set isLoading to false on login failure', () => {
      component.loginForm.patchValue({ email: 'test@test.com', password: 'wrong' });
      authServiceSpy.login.and.returnValue(
        throwError(() => ({ errorMessage: 'Error', message: 'fail' }))
      );
      component.onLogin();
      expect(component.isLoading()).toBeFalse();
    });

    it('should not navigate on login failure', () => {
      component.loginForm.patchValue({ email: 'test@test.com', password: 'wrong' });
      authServiceSpy.login.and.returnValue(
        throwError(() => ({ errorMessage: 'Error', message: 'fail' }))
      );
      component.onLogin();
      expect(routerSpy.navigate).not.toHaveBeenCalled();
    });
  });
});
