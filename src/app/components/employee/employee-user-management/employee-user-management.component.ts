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
  submitted = false;

  tabs = [
    { id: 1, label: 'Login Details', icon: 'bi-person-badge' },
    { id: 2, label: 'Access Control', icon: 'bi-shield-lock' },
    { id: 3, label: 'Session & Security', icon: 'bi-hourglass-split' },
    { id: 4, label: 'User Permission', icon: 'bi-vector-pen' },
    { id: 5, label: 'Branch Access & Permissions', icon: 'bi-buildings' }
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

  // Branch Access & Permissions (Tab 5)
  branchAccess: any = null;
  assignedBranches: any[] = [];
  availableBranches: any[] = [];
  filteredAvailableBranches: any[] = [];
  selectedBranchToAdd: any = null;
  canViewAllBranches: boolean = false;
  defaultBranchId: number | null = null;
  organizationName: string = 'Devine Laboratory';
  isBranchAccessLoading: boolean = false;
  isBranchAccessSaving: boolean = false;

  // Dirty tracking for Tab 5
  private originalBranchSnapshot: string = '';

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
    const passwordValidators = this.employeeId > 0
      ? [Validators.minLength(8)]
      : [Validators.required, Validators.minLength(8)];

    this.userForm = this.fb.group({
      // Login Details
      userName: [{ value: '', disabled: true }], // Read-only
      email: [{ value: '', disabled: true }],
      password: ['', passwordValidators], // Required only in create mode
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
    this.userService.getUserByEmployeeId(this.employeeId).subscribe({
      next: (data) => {
        this.user = data || {};
        this.currentRole = this.user?.currentRole || '';

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

        const parsed = this.parseWorkingHours(this.user.workingHours);
        if (parsed && parsed.length) {
          const first = parsed[0];
          this.userForm.patchValue({ startTime: first.start, endTime: first.end });
        }

        if (this.isViewMode) this.userForm.disable();

        // Also load branch access data
        this.loadBranchAccess();
      },
      error: (err) => {
        console.error('Error loading user details:', err);
        this.toastService.show('Failed to load user details', 'error');
      }
    });
  }

  setActiveTab(tabId: number) {
    this.activeTab.set(tabId);
    if (tabId === 5 && !this.branchAccess) {
      this.loadBranchAccess();
    }
  }

  loadBranchAccess() {
    if (!this.employeeId) return;
    this.isBranchAccessLoading = true;
    this.userService.getBranchAccess(this.employeeId).subscribe({
      next: (data) => {
        this.branchAccess = data || {};
        this.organizationName = data.organizationName || 'Devine Laboratory';
        this.defaultBranchId = data.defaultBranchId || null;
        this.canViewAllBranches = data.canViewAllBranches ?? false;
        this.assignedBranches = (data.assignedBranches || []).map((b: any) => ({ ...b }));
        this.availableBranches = data.availableBranches || [];
        this.updateAvailableBranchesDropdown();
        this.takeBranchSnapshot();
        this.isBranchAccessLoading = false;
      },
      error: (err) => {
        console.error('Error loading branch access:', err);
        this.isBranchAccessLoading = false;
      }
    });
  }

  private takeBranchSnapshot() {
    this.originalBranchSnapshot = JSON.stringify({
      defaultBranchId: this.defaultBranchId,
      canViewAllBranches: this.canViewAllBranches,
      assignedBranches: this.assignedBranches.map(b => ({
        branchId: b.branchId,
        isDefault: b.isDefault || (b.branchId === this.defaultBranchId),
        canView: b.canView,
        canCreate: b.canCreate,
        canEdit: b.canEdit,
        canExecute: b.canExecute,
        canApprove: b.canApprove,
        canDelete: b.canDelete
      }))
    });
  }

  isTab5Dirty(): boolean {
    if (!this.originalBranchSnapshot) return false;
    const currentSnapshot = JSON.stringify({
      defaultBranchId: this.defaultBranchId,
      canViewAllBranches: this.canViewAllBranches,
      assignedBranches: this.assignedBranches.map(b => ({
        branchId: b.branchId,
        isDefault: b.isDefault || (b.branchId === this.defaultBranchId),
        canView: b.canView,
        canCreate: b.canCreate,
        canEdit: b.canEdit,
        canExecute: b.canExecute,
        canApprove: b.canApprove,
        canDelete: b.canDelete
      }))
    });
    return currentSnapshot !== this.originalBranchSnapshot;
  }

  resetBranchAccess() {
    if (!this.originalBranchSnapshot) return;
    try {
      const original = JSON.parse(this.originalBranchSnapshot);
      this.defaultBranchId = original.defaultBranchId;
      this.canViewAllBranches = original.canViewAllBranches;
      this.assignedBranches = (this.branchAccess?.assignedBranches || []).map((b: any) => ({ ...b }));
      this.updateAvailableBranchesDropdown();
      this.toastService.show('Branch changes reset to last saved state.', 'info');
    } catch (e) {
      this.loadBranchAccess();
    }
  }

  get defaultBranchName(): string {
    const found = this.assignedBranches.find(b => b.branchId === this.defaultBranchId);
    if (!found) return 'None Selected';
    return `${found.branchName}${found.isHeadOffice ? ' (Head Office)' : ''}`;
  }

  updateAvailableBranchesDropdown() {
    const assignedIds = new Set(this.assignedBranches.map(b => b.branchId));
    this.filteredAvailableBranches = (this.availableBranches || []).filter(b => !assignedIds.has(b.id));
    this.selectedBranchToAdd = null;
  }

  onDefaultBranchSelect(branchId: number) {
    this.defaultBranchId = Number(branchId);
    this.assignedBranches.forEach(b => {
      b.isDefault = (b.branchId === this.defaultBranchId);
    });
  }

  onAddBranch() {
    if (!this.selectedBranchToAdd) {
      this.toastService.show('Please select a branch to add.', 'warning');
      return;
    }
    const branchIdNum = Number(this.selectedBranchToAdd);
    const branchMeta = this.availableBranches.find(b => b.id === branchIdNum);
    if (!branchMeta) return;

    const isFirst = this.assignedBranches.length === 0;
    const newBranch = {
      id: 0,
      branchId: branchMeta.id,
      branchCode: branchMeta.code || '',
      branchName: branchMeta.name,
      isHeadOffice: branchMeta.isHeadOffice ?? false,
      isDefault: isFirst,
      canView: true,
      canCreate: true,
      canEdit: true,
      canExecute: true,
      canApprove: false,
      canDelete: false,
      isActive: true
    };

    if (isFirst) {
      this.defaultBranchId = branchMeta.id;
    }

    this.assignedBranches.push(newBranch);
    this.updateAvailableBranchesDropdown();
    this.toastService.show(`Added ${branchMeta.name} to assigned branches.`, 'info');
  }

  onRemoveBranch(index: number) {
    const removed = this.assignedBranches[index];
    const isRemovingDefault = removed.isDefault || (removed.branchId === this.defaultBranchId);

    this.assignedBranches.splice(index, 1);

    if (isRemovingDefault && this.assignedBranches.length > 0) {
      this.assignedBranches[0].isDefault = true;
      this.defaultBranchId = this.assignedBranches[0].branchId;
      this.toastService.show(`Default branch reassigned to ${this.assignedBranches[0].branchName}.`, 'warning');
    } else if (this.assignedBranches.length === 0) {
      this.defaultBranchId = null;
    }

    this.updateAvailableBranchesDropdown();
  }

  saveBranchAccess() {
    if (!this.employeeId) return;
    if (this.assignedBranches.length > 0 && !this.defaultBranchId) {
      this.assignedBranches[0].isDefault = true;
      this.defaultBranchId = this.assignedBranches[0].branchId;
    }

    const payload = {
      organizationId: this.branchAccess?.organizationId,
      canViewAllBranches: this.canViewAllBranches,
      defaultBranchId: this.defaultBranchId,
      branches: this.assignedBranches.map(b => ({
        branchId: b.branchId,
        isDefault: b.isDefault || (b.branchId === this.defaultBranchId),
        canView: b.canView,
        canCreate: b.canCreate,
        canEdit: b.canEdit,
        canExecute: b.canExecute,
        canApprove: b.canApprove,
        canDelete: b.canDelete
      }))
    };

    this.isBranchAccessSaving = true;
    this.userService.updateBranchAccess(this.employeeId, payload).subscribe({
      next: (res) => {
        this.toastService.show(res?.message || 'Branch access and permissions updated successfully.', 'success');
        this.isBranchAccessSaving = false;
        this.loadBranchAccess();
      },
      error: (err) => {
        console.error('Error saving branch access:', err);
        const errMsg = err?.error?.message || err?.error || 'Failed to update branch access.';
        this.toastService.show(errMsg, 'error');
        this.isBranchAccessSaving = false;
      }
    });
  }

  saveUserManagement() {
    this.submitted = true;
    const tabId = this.activeTab();
    if (!this.isTabValid(tabId)) {
      const missing = this.getInvalidFieldNames(tabId);
      this.toastService.show(`Please fix: ${missing.join(', ')}`, 'warning');
      return;
    }
    const rawValues = this.userForm.getRawValue();
    const payload: any = {
      employeeId: this.employeeId,
      isLoginEnabled: !!rawValues.isLoginEnabled,
      allowRemoteLogin: !!rawValues.allowRemoteLogin,
      ipRestriction: rawValues.ipRestriction || null,
      workingHours: this.buildWorkingHours(),
      sessionTimeout: rawValues.sessionTimeout,
      forcePasswordChange: !!rawValues.forcePasswordChange
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

  resetPassword() {
    const newPass = this.userForm.get('password')?.value;
    if (!newPass) {
      this.toastService.show('Enter a new password to reset.', 'warning');
      return;
    }
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

    console.log('Role change requested:', { newRole, reason, effectiveFrom: this.userForm.get('roleEffectiveFrom')?.value });
    this.toastService.show('Role change request submitted for approval.', 'info');
    this.isRoleChanging = false;
  }

  // 2FA Helpers
  toggle2FA() {
    if (this.isViewMode) return;
    if (!this.is2FAEnabled()) {
      this.otpStep = 1;
      this.isOtpVerified = false;
      this.is2FAEnabled.set(true);
    } else {
      this.is2FAEnabled.set(false);
      this.otpStep = 0;
      this.otpMethod = 'email';
      this.isOtpVerified = false;
      this.toastService.show('Two-factor authentication disabled locally.', 'info');
    }
  }

  selectOtpMethod(method: 'email' | 'sms') {
    if (this.isViewMode) return;
    this.otpMethod = method;
    this.userService.sendOtp(this.employeeId, method).subscribe({
      next: () => {
        this.toastService.show(`OTP sent to your ${method === 'email' ? 'email' : 'mobile'}`, 'info');
        this.otpStep = 2;
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
    this.userService.verifyOtp(this.employeeId, this.otpCode).subscribe({
      next: () => {
        this.is2FAEnabled.set(true);
        this.isOtpVerified = true;
        this.otpStep = 3;
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

  private labelMap: Record<string, string> = {
    userName: 'Username',
    email: 'Email',
    password: 'Password',
    isLoginEnabled: 'Login Access',
    allowRemoteLogin: 'Remote Login',
    ipRestriction: 'IP Restriction',
    startTime: 'Start Time',
    endTime: 'End Time',
    sessionTimeout: 'Session Timeout',
    forcePasswordChange: 'Force Password Change',
  };

  private isTabValid(tabId: number): boolean {
    const skipPassword = this.employeeId > 0 && tabId === 1;
    const controls = this.userForm.controls;
    for (const key of Object.keys(controls)) {
      if (key === 'password' && skipPassword) continue;
      if (key === 'newRole' || key === 'roleEffectiveFrom' || key === 'roleChangeReason') continue;
      const ctrl = controls[key];
      if (ctrl && ctrl.invalid && !ctrl.disabled) return false;
    }
    if (tabId === 1) {
      const start = controls['startTime']?.value;
      const end = controls['endTime']?.value;
      if (start && end && end <= start) return false;
    }
    return true;
  }

  getInvalidFieldNames(tabId: number): string[] {
    const labels: string[] = [];
    const skipPassword = this.employeeId > 0 && tabId === 1;
    const controls = this.userForm.controls;

    for (const key of Object.keys(controls)) {
      if (key === 'password' && skipPassword) continue;
      if (key === 'newRole' || key === 'roleEffectiveFrom' || key === 'roleChangeReason') continue;
      const ctrl = controls[key];
      if (ctrl && ctrl.invalid && !ctrl.disabled) {
        labels.push(this.labelMap[key] || key);
      }
    }

    if (tabId === 1) {
      const start = controls['startTime']?.value;
      const end = controls['endTime']?.value;
      if (start && end && end <= start) {
        labels.push('End Time');
      }
    }

    return labels;
  }

  isFieldInvalid(path: string, touched = true): boolean {
    const ctrl = this.userForm.get(path);
    if (!ctrl) return false;
    return touched ? ctrl.touched && ctrl.invalid : ctrl.invalid;
  }

  private buildWorkingHours(): string | null {
    const start = this.userForm.get('startTime')?.value;
    const end = this.userForm.get('endTime')?.value;
    if (!start || !end) return null;
    return `${start}-${end}`;
  }

  private parseWorkingHours(value: string | undefined | null): Array<{ start: string, end: string }> {
    if (!value) return [];
    return value.split(',').map(part => {
      const [s, e] = part.split('-');
      return { start: (s || '').trim(), end: (e || '').trim() };
    }).filter(r => r.start && r.end);
  }

  ngAfterViewInit(): void {
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
    validate();
  }
}
