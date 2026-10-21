import { CommonModule } from '@angular/common';
import { Component, signal, AfterViewInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { SignalRService } from '../../services/signal-r.service';
import { NotificationStoreService } from '../../services/notification-store.service';
import { PushServiceService } from '../../services/push-service.service';
import { emailPatternValidator } from '../../utility/validators/custom-validators';
import { FormValidationHelper } from '../../utility/helper/form-validation.helper';
import { FormFieldErrorComponent } from '../../utility/components/form-field-error/form-field-error.component';

@Component({
  selector: 'app-login',
  imports: [FormsModule, CommonModule, ReactiveFormsModule, FormFieldErrorComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements AfterViewInit, OnDestroy {
  loginForm: FormGroup;
  showPassword = signal(false);
  isLoading = signal(false);
  errorMessage = signal('');
  submitted = false;
  private autofillTimers: any[] = [];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private signalR: SignalRService,
    private notificationStore: NotificationStoreService,
    private pushService: PushServiceService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, emailPatternValidator()]],
      password: ['', [Validators.required]]
    });
  }

  ngAfterViewInit(): void {
    // Detect and sync any values injected by browser autofill or password managers
    this.syncAutofillValues();
    const intervals = [80, 250, 600, 1200];
    intervals.forEach(ms => {
      const timer = setTimeout(() => this.syncAutofillValues(), ms);
      this.autofillTimers.push(timer);
    });
  }

  ngOnDestroy(): void {
    this.autofillTimers.forEach(t => clearTimeout(t));
  }

  /**
   * Synchronizes values from DOM inputs to the Reactive Form controls.
   * Browsers / password managers often populate input elements directly without
   * triggering standard Angular input events.
   */
  syncAutofillValues(): void {
    const emailEl = document.getElementById('email') as HTMLInputElement | null;
    const passwordEl = document.getElementById('password') as HTMLInputElement | null;

    if (emailEl && emailEl.value) {
      const trimmed = emailEl.value.trim();
      if (this.loginForm.get('email')?.value !== trimmed) {
        this.loginForm.get('email')?.setValue(trimmed, { emitEvent: true });
        this.loginForm.get('email')?.updateValueAndValidity();
      }
    }

    if (passwordEl && passwordEl.value) {
      if (this.loginForm.get('password')?.value !== passwordEl.value) {
        this.loginForm.get('password')?.setValue(passwordEl.value, { emitEvent: true });
        this.loginForm.get('password')?.updateValueAndValidity();
      }
    }
  }

  onInputActivity(): void {
    this.syncAutofillValues();
    if (this.errorMessage()) {
      this.errorMessage.set('');
    }
  }

  togglePassword() {
    this.showPassword.set(!this.showPassword());
  }

  isFieldInvalid(path: string): boolean {
    return FormValidationHelper.isFieldInvalid(this.loginForm, path, this.submitted);
  }

  onLogin() {
    // Critical: Synchronize DOM inputs with Angular Reactive Form before evaluating validity
    this.syncAutofillValues();

    this.submitted = true;
    FormValidationHelper.markAllTouched(this.loginForm);

    if (this.loginForm.valid) {
      this.isLoading.set(true);
      this.errorMessage.set('');

      const credentials = {
        email: (this.loginForm.get('email')?.value || '').trim(),
        password: this.loginForm.get('password')?.value || ''
      };

      this.authService.login(credentials).subscribe({
        next: (data) => {
          this.authService.saveUserData(data);
          this.isLoading.set(false);
          this.errorMessage.set('');

          // after user logs in
          this.signalR.startConnection();
          this.notificationStore.loadUnread();
          if ('serviceWorker' in navigator) {
            this.pushService.subscribeToPush();
          }

          const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
          this.router.navigateByUrl(returnUrl);
        },
        error: (err) => {
          this.errorMessage.set(err?.errorMessage || err?.message || 'Login failed. Please check your credentials.');
          console.error('Login failed', err);
          this.isLoading.set(false);
        }
      });
    }
  }
}

