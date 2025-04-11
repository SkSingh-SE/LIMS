import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [FormsModule,CommonModule,ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  loginForm: FormGroup;
  showPassword = signal(false);
  isLoading = signal(false);

  constructor(private fb: FormBuilder, private authService: AuthService, private router: Router) {
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
          this.router.navigate(['/designation']);
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error('Error while login:', err);
          this.isLoading.set(false);
        }
      });
    }
  }
}
