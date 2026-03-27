import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, signal, AfterViewInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { UserPermissionComponent } from '../user-permission/user-permission.component';
import { UserService } from '../../../services/user.service';
import { ToastService } from '../../../services/toast.service';
import { RoleService } from '../../../services/role.service';
import { Observable } from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ipRestrictionValidator } from '../../../utility/validators/ip-restriction.validator';


@Component({
  selector: 'app-employee-user-management',

  imports: [CommonModule, ReactiveFormsModule, FormsModule, UserPermissionComponent, MatFormFieldModule, MatInputModule, MatIconModule, MatButtonModule],
  templateUrl: './employee-user-management.component.html',
  styleUrl: './employee-user-management.component.css'
})
export class EmployeeUserManagementComponent implements OnInit, AfterViewInit {
  @Input() employeeId!: number;
  @Input() isViewMode: boolean = false;

  activeTab = signal<number>(1);
  userForm!: FormGroup;

  tabs = [
    { id: 1, label: 'Login Details', icon: 'bi-person-badge' },
    { id: 2, label: 'Access Control', icon: 'bi-shield-lock' },
    { id: 3, label: 'Session & Security', icon: 'bi-hourglass-split' },
    { id: 4, label: 'User Permission', icon: 'bi-vector-pen' }
  ];

  showPassword = false;
  // Role Management
  availableRoles: string[] = [];
  currentRole = '';
  selectedRole = '';
  isRoleChanging = false;

  // 2FA
  is2FAEnabled = signal<boolean>(false);
  otpMethod: 'email' | 'sms' = 'email';
  otpStep: number = 0; // 0: None, 1: Select Method, 2: Verify, 3: Confirm
  otpCode: string = '';
  isOtpVerified = false;
  resendCooldown = 0;
  resendTimer?: any;

  // Real user data loaded from backend
  user: any = null;

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private toastService: ToastService,
    private roleService: RoleService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.initForm();
    if (this.employeeId) {
      this.loadUserDetails();
    }
  }

  initForm() {
    this.userForm = this.fb.group({
      // Login Details
      userName: [{ value: '', disabled: true }], // Read-only
      email: [{ value: '', disabled: true }],
      password: [''], // Only for reset
      isLoginEnabled: [true],
      lastLoginDate: [{ value: '', disabled: true }],
      accountStatus: [{ value: '', disabled: true }],
      failedLoginAttempts: [{ value: 0, disabled: true }],
      isLocked: [false],

      // Access Control
      allowRemoteLogin: [false],
      ipRestriction: ['', ipRestrictionValidator],
      workingHours: [''],
      startTime: [''],
      endTime: [''],

      // Role Management
      newRole: [''],
      roleEffectiveFrom: [''],
      roleChangeReason: [''],

      // Session & Security
      sessionTimeout: [0, [Validators.min(0)]],
      forcePasswordChange: [false]
    });
  }



  loadUserDetails() {
    // Load real user data from backend endpoint
    this.userService.getUserByEmployeeId(this.employeeId).subscribe({
      next: (data) => {
        this.user = data || {};
        this.currentRole = this.user?.currentRole || '';

        // Map response to reactive form controls
        this.userForm.patchValue({
          userName: this.user.userName || '',
          email: this.user.email || '',
          isLoginEnabled: this.user.isLoginEnabled ?? true,
          lastLoginDate: this.user.lastLoginDate ? new Date(this.user.lastLoginDate).toLocaleString() : '',
          accountStatus: this.user.accountStatus || '',
          failedLoginAttempts: this.user.failedLoginAttempts ?? 0,
          isLocked: this.user.isLocked ?? false,
          allowRemoteLogin: this.user.allowRemoteLogin ?? false,
          ipRestriction: this.user.ipRestriction || '',
          workingHours: this.user.workingHours || '',
          sessionTimeout: this.user.sessionTimeout ?? 30,
          forcePasswordChange: this.user.forcePasswordChange ?? false
        });

        // Parse working hours into single start/end
        const parsed = this.parseWorkingHours(this.user.workingHours);
        if (parsed && parsed.length) {
          const first = parsed[0];
          this.userForm.patchValue({ startTime: first.start, endTime: first.end });
        }

        if (this.isViewMode) this.userForm.disable();

      },
      error: (err) => {
        console.error('Error loading user details:', err);
        this.toastService.show('Failed to load user details', 'error');
      }
    });
  }

  setActiveTab(tabId: number) {
    this.activeTab.set(tabId);
  }

  saveUserManagement() {
    if (this.userForm.invalid) {
      this.toastService.show('Please fix the errors in the form.', 'warning');
      return;
    }
    // Build a whitelisted payload (exclude password, role, account status, 2FA fields)
    const payload: any = {
      employeeId: this.employeeId,
      isLoginEnabled: this.userForm.get('isLoginEnabled')?.value, // first tab
      allowRemoteLogin: this.userForm.get('allowRemoteLogin')?.value, // second tab
      ipRestriction: this.userForm.get('ipRestriction')?.value || null, // second tab
      workingHours: this.buildWorkingHours(), // second tab
      sessionTimeout: this.userForm.get('sessionTimeout')?.value, // third tab
      forcePasswordChange: this.userForm.get('forcePasswordChange')?.value // third tab
    };

    this.userService.updateUserByEmployeeId(this.employeeId, payload).subscribe({
      next: () => {
        this.toastService.show('User settings saved successfully.', 'success');
        this.router.navigate(['/employee']);
      },
      error: (err) => {
        console.error('Error saving user settings:', err);
        this.toastService.show('Failed to save user settings.', 'error');
      }
    });
  }


  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }
  // Helper for Reset Password (optional button action)
  resetPassword() {
    // Implement specific logic if there's a dedicated API, or just use the save with new password
    const newPass = this.userForm.get('password')?.value;
    if (!newPass) {
      this.toastService.show('Enter a new password to reset.', 'warning');
      return;
    }
    // Event-based API call (immediate)
    this.userService.resetPassword(this.employeeId, newPass).subscribe({
      next: () => {
        this.toastService.show('Password reset successfully.', 'success');
        this.userForm.get('password')?.reset();
      },
      error: (err) => {
        console.error('Error resetting password:', err);
        this.toastService.show('Failed to reset password.', 'error');
      }
    });
  }

  // Role Management Helpers
  getRoles = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.roleService.getRoleDropdown(term, page, pageSize);
  }
  onRoleSelected(item: any) {
    if (this.currentRole === item.name) {
      this.toastService.show('Selected role is the same as the current role.', 'warning');
      return;
    } else {
      this.userForm.patchValue({ newRole: item.id });
      this.selectedRole = item.name;
    }
  }
  onRequestRoleChange() {
    if (this.isViewMode) return;
    const newRole = this.userForm.get('newRole')?.value;
    const reason = this.userForm.get('roleChangeReason')?.value;

    if (!newRole || !reason) {
      this.toastService.show('Please select a role and provide a reason.', 'warning');
      return;
    }

    // Mock event emit or API call
    console.log('Role change requested:', { newRole, reason, effectiveFrom: this.userForm.get('roleEffectiveFrom')?.value });
    this.toastService.show('Role change request submitted for approval.', 'info');
    this.isRoleChanging = false;
  }

  // 2FA Helpers
  toggle2FA() {
    if (this.isViewMode) return;
    // If turning ON, start flow but do NOT set enabled until OTP verification
    if (!this.is2FAEnabled()) {
      this.otpStep = 1; // method selection
      this.isOtpVerified = false;
      this.is2FAEnabled.set(true);
    } else {
      // Turning OFF (UI only) — do not persist via Save API
      this.is2FAEnabled.set(false);
      this.otpStep = 0;
      this.otpMethod = 'email';
      this.isOtpVerified = false;
      this.toastService.show('Two-factor authentication disabled locally. Backend update not persisted here.', 'info');
    }
  }

  selectOtpMethod(method: 'email' | 'sms') {
    if (this.isViewMode) return;

    this.otpMethod = method;
    // Event-based: send OTP immediately
    this.userService.sendOtp(this.employeeId, method).subscribe({
      next: () => {
        this.toastService.show(`OTP sent to your ${method === 'email' ? 'email' : 'mobile'}`, 'info');
        this.otpStep = 2; // go to verify
        this.startResendCooldown();
      },
      error: () => {
        this.toastService.show('Failed to send OTP', 'error');
      }
    });
  }

  resendOtp() {
    if (!this.otpMethod || this.resendCooldown > 0) return;
    this.userService.sendOtp(this.employeeId, this.otpMethod).subscribe({
      next: () => {
        this.toastService.show('OTP resent successfully', 'info');
        this.startResendCooldown();
      },
      error: (err) => {
        this.toastService.show(err?.error?.message || 'Please wait before resending OTP', 'warning');
      }
    });
  }

  startResendCooldown() {
    this.resendCooldown = 60;

    this.resendTimer = setInterval(() => {
      this.resendCooldown--;
      if (this.resendCooldown <= 0) {
        clearInterval(this.resendTimer);
      }
    }, 1000);
  }


  verifyOtp() {
    if (!this.otpCode || this.otpCode.length < 4) {
      this.toastService.show('Please enter a valid OTP', 'warning');
      return;
    }
    // Event-based verification — only after successful verification set 2FA enabled in UI
    this.userService.verifyOtp(this.employeeId, this.otpCode).subscribe({
      next: () => {
        this.is2FAEnabled.set(true);
        this.isOtpVerified = true;
        this.otpStep = 3; // confirmed
        this.toastService.show('2FA verified and enabled successfully', 'success');
      },
      error: () => {
        this.toastService.show('Invalid or expired OTP', 'error');
      }
    });
  }

  // Helper Methods for UI Display
  getAccountStatusClass(): string {
    const s = this.user?.accountStatus;
    switch (s) {
      case 'Active':
        return 'badge bg-success';
      case 'Locked':
        return 'badge bg-danger';
      case 'Disabled':
        return 'badge bg-warning';
      default:
        return 'badge bg-secondary';
    }
  }

  getFormattedLastLogin(): string {
    if (!this.user?.lastLoginDate) return 'Never';
    return new Date(this.user.lastLoginDate).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getFailedAttemptsClass(): string {
    const attempts = this.user?.failedLoginAttempts ?? 0;
    if (attempts === 0) return 'badge bg-success';
    if (attempts < 3) return 'badge bg-warning';
    return 'badge bg-danger';
  }

  // Single range builder
  private buildWorkingHours(): string | null {
    const start = this.userForm.get('startTime')?.value;
    const end = this.userForm.get('endTime')?.value;
    if (!start || !end) return null;
    return `${start}-${end}`;
  }

  private parseWorkingHours(value: string | undefined | null): Array<{ start: string, end: string }> {
    if (!value) return [];
    // support single or comma-separated; take first as primary
    return value.split(',').map(part => {
      const [s, e] = part.split('-');
      return { start: (s || '').trim(), end: (e || '').trim() };
    }).filter(r => r.start && r.end);
  }

  ngAfterViewInit(): void {
    // Validate single start/end pair
    const startCtrl = this.userForm.get('startTime');
    const endCtrl = this.userForm.get('endTime');
    if (!startCtrl || !endCtrl) return;

    const validate = () => {
      const s = startCtrl.value;
      const e = endCtrl.value;
      if (s && e && e <= s) {
        endCtrl.setErrors({ endBeforeStart: true });
      } else {
        if (endCtrl.hasError('endBeforeStart')) {
          endCtrl.setErrors(null);
        }
      }
    };

    startCtrl.valueChanges.subscribe(() => validate());
    endCtrl.valueChanges.subscribe(() => validate());
    // initial validate
    validate();
  }

}
