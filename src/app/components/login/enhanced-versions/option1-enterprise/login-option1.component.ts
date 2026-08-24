import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../../services/auth.service';
import { Router } from '@angular/router';
import { SignalRService } from '../../../../services/signal-r.service';
import { NotificationStoreService } from '../../../../services/notification-store.service';
import { PushServiceService } from '../../../../services/push-service.service';
import { emailPatternValidator } from '../../../../utility/validators/custom-validators';
import { FormValidationHelper } from '../../../../utility/helper/form-validation.helper';
import { FormFieldErrorComponent } from '../../../../utility/components/form-field-error/form-field-error.component';

@Component({
  selector: 'app-login',
  imports: [FormsModule, CommonModule, ReactiveFormsModule, FormFieldErrorComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  showPassword = signal(false);
  isLoading = signal(false);
  errorMessage = signal('');
  capsLockOn = signal(false);
  submitted = false;
  currentYear = new Date().getFullYear();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private signalR: SignalRService,
    private notificationStore: NotificationStoreService,
    private pushService: PushServiceService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, emailPatternValidator()]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      rememberMe: [false]
    });
  }

  ngOnInit(): void {
    const savedEmail = localStorage.getItem('lims_remembered_email');
    if (savedEmail) {
      this.loginForm.patchValue({
        email: savedEmail,
        rememberMe: true
      });
    }
  }

  togglePassword() {
    this.showPassword.set(!this.showPassword());
  }

  checkCapsLock(event: KeyboardEvent) {
    if (event.getModifierState) {
      this.capsLockOn.set(event.getModifierState('CapsLock'));
    }
  }

  isFieldInvalid(path: string): boolean {
    return FormValidationHelper.isFieldInvalid(this.loginForm, path, this.submitted);
  }

  onLogin() {
    this.submitted = true;
    FormValidationHelper.markAllTouched(this.loginForm);
    if (this.loginForm.valid) {
      this.isLoading.set(true);
      const { email, password, rememberMe } = this.loginForm.value;

      if (rememberMe) {
        localStorage.setItem('lims_remembered_email', email);
      } else {
        localStorage.removeItem('lims_remembered_email');
      }

      this.authService.login({ email, password }).subscribe({
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

          this.router.navigate(['/']); // Redirect to main dashboard
        },
        error: (err) => {
          this.errorMessage.set(err?.errorMessage || err?.message || 'Login failed. Please verify your credentials.');
          console.error('Login failed', err);
          this.isLoading.set(false);
        }
      });
    }
  }
}
