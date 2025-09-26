import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { SignalRService } from '../../services/signal-r.service';
import { NotificationStoreService } from '../../services/notification-store.service';
import { PushServiceService } from '../../services/push-service.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule, CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  loginForm: FormGroup;
  showPassword = signal(false);
  isLoading = signal(false);
  errorMessage = signal('');
  constructor(private fb: FormBuilder, private authService: AuthService, private router: Router, private signalR: SignalRService, private notificationStore: NotificationStoreService, private pushService: PushServiceService) {
    this.loginForm = this.fb.group({
      email: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  togglePassword() {
    this.showPassword.set(!this.showPassword());
  }

  onLogin() {
    if (this.loginForm.valid) {
      this.isLoading.set(true);
      console.log('Login successful', this.loginForm.value);
      // Implement authentication logic

      this.authService.login(this.loginForm.value).subscribe({
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

          this.router.navigate(['/designation']);
        },
        error: (err) => {
          this.errorMessage.set(err?.errorMessage);
          console.error('Login failed', err.message);
          this.isLoading.set(false);
        }
      });
    }
  }
}
