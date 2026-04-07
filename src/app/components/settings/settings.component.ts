import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { SettingsService } from '../../services/settings.service';
import { ToastService } from '../../services/toast.service';
import { environment } from '../../../environments/environment';
import {
  noWhitespaceValidator,
  phoneValidator,
  gstinValidator,
  panValidator,
  financialYearRangeValidator,
} from '../../utility/validators/custom-validators';
import { FormValidationHelper } from '../../utility/helper/form-validation.helper';

@Component({
  selector: 'app-settings',

  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit {
  settingsForm!: FormGroup;
  organizationId: number = 0;
  submitted = false;
  tabSubmitted: { [key: number]: boolean } = { 1: false, 2: false, 3: false, 4: false, 5: false };

  // Tab management
  activeTab: number = 1;
  tabs = [
    { key: 1, label: 'Organization', icon: 'bi-building' },
    { key: 2, label: 'Accreditation', icon: 'bi-award' },
    { key: 3, label: 'Numbering', icon: 'bi-hash' },
    { key: 4, label: 'GST & Finance', icon: 'bi-receipt' },
    { key: 5, label: 'Report Authority', icon: 'bi-pen' }
  ];

  // File upload properties
  organizationLogoFile: File | null = null;
  organizationLogoPreview: string | null = null;
  nablCertificateFile: File | null = null;
  nablCertificateLoadedPath: string | null = null;
  nablLogoFile: File | null = null;
  nablLogoPreview: string | null = null;
  signatureFile: File | null = null;
  signaturePreview: string | null = null;
  signatureUploadedUrl: string | null = null;

  // File validation errors
  fileErrors: { [key: string]: string | null } = {
    organizationLogo: null,
    nablCertificate: null,
    nablLogo: null,
    signature: null
  };

  // Allowed file configs
  private readonly IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];
  private readonly IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg'];
  private readonly PDF_TYPES = ['application/pdf'];
  private readonly PDF_EXTENSIONS = ['.pdf'];
  private readonly MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB
  private readonly MAX_PDF_SIZE = 10 * 1024 * 1024; // 10MB

  // Multiple signatories
  signatories: any[] = [];
  editingSignatoryIndex: number = -1;

  // Financial Year management
  financialYearsList: any[] = [];
  showFYForm = false;
  editingFYId: number | null = null;

  // GST Rate options
  gstRateOptions = [0, 5, 12, 18, 28];

  constructor(private fb: FormBuilder, private settingsService: SettingsService, private toastService: ToastService) {}

  initialSnapshot: any = null;

  ngOnInit(): void {
    this.initializeForm();
    this.setupConditionalValidation();
    this.loadSettingsFromApi();
    this.loadFinancialYears();
    this.initTabDirtyTracking();
  }

  private loadSettingsFromApi(): void {
    this.settingsService.getAll(this.organizationId).subscribe({
      next: (res) => {
        if (res.organizationInfo && res.organizationInfo.id) {
          this.organizationId = res.organizationInfo.id;
        }
        if (res.organizationInfo) {
          this.settingsForm.get('organizationInfo')?.patchValue(res.organizationInfo);
          if (res.organizationInfo.organizationLogo) {
            this.organizationLogoPreview = this.normalizeFileUrl(res.organizationInfo.organizationLogo);
          }
        }
        if (res.nablAccreditation) {
          this.settingsForm.get('nablAccreditation')?.patchValue(res.nablAccreditation);
          if (res.nablAccreditation.nablLogo) {
            this.nablLogoPreview = this.normalizeFileUrl(res.nablAccreditation.nablLogo);
          }
          if (res.nablAccreditation.nablCertificate) {
            this.nablCertificateLoadedPath = this.normalizeFileUrl(res.nablAccreditation.nablCertificate);
          }
        }
        if (res.numbering) {
          this.settingsForm.get('numbering')?.patchValue(res.numbering);
        }
        if (res.gstConfig) {
          this.settingsForm.get('gstConfig')?.patchValue(res.gstConfig);
        }
        if (res.financialYear) {
          this.settingsForm.get('financialYear')?.patchValue(res.financialYear);
        }
        if (res.signatories) {
          this.signatories = res.signatories.map((s: any) => ({
            ...s,
            signatureImage: this.normalizeFileUrl(s.signatureImage),
            preview: this.normalizeFileUrl(s.signatureImage)
          }));
        }
        this.captureInitialSnapshot();
      },
      error: () => {
        this.toastService.show('Failed to load settings', 'error');
      }
    });
  }

  private captureInitialSnapshot(): void {
    this.initialSnapshot = this.settingsForm.getRawValue();
  }

  initializeForm(): void {
    this.settingsForm = this.fb.group({
      // Organization Information
      organizationInfo: this.fb.group({
        labName: ['', [Validators.required, noWhitespaceValidator(), Validators.maxLength(200)]],
        labCode: ['', [Validators.required, noWhitespaceValidator(), Validators.maxLength(50)]],
        labAddress: ['', [Validators.required, noWhitespaceValidator(), Validators.maxLength(500)]],
        contactEmail: ['', [Validators.required, Validators.email, Validators.maxLength(200)]],
        contactPhone: ['', [Validators.required, phoneValidator()]],
        mobileNo: [''],
        website: [''],
        cin: [''],
        ulrPrefix: [''],
        labLocationCode: [''],
        organizationLogo: ['']
      }),

      // NABL Accreditation
      nablAccreditation: this.fb.group({
        nablEnabled: [true],
        nablTcNumber: ['', [Validators.maxLength(100)]],
        nablCertificate: [''],
        nablLogo: ['']
      }),

      // Numbering & Identity
      numbering: this.fb.group({
        tcBaseNumber: ['', [Validators.required, noWhitespaceValidator(), Validators.maxLength(100)]],
        reportNumberPrefix: ['', [Validators.required, noWhitespaceValidator(), Validators.maxLength(100)]],
        yearCode: [{ value: '', disabled: true }],
        runningCounter: [{ value: '', disabled: true }]
      }),

      // GST & Tax Configuration
      gstConfig: this.fb.group({
        gstApplicable: [true],
        gstin: ['', [Validators.maxLength(15)]],
        panNumber: ['', [panValidator(), Validators.maxLength(10)]],
        stateCode: ['', [Validators.maxLength(50)]],
        defaultGstRate: [18, Validators.required],
        cgst: [{ value: 9, disabled: true }],
        sgst: [{ value: 9, disabled: true }],
        igst: [{ value: 18, disabled: true }],
        piGstApplicable: [true]
      }),

      // Financial Year
      financialYear: this.fb.group({
        startDate: ['', Validators.required],
        endDate: ['', Validators.required],
        currency: [{ value: 'INR – ₹', disabled: true }]
      }, { validators: financialYearRangeValidator('startDate', 'endDate') }),

      // Authorized Signatory
      authorizedSignatory: this.fb.group({
        signatoryName: ['', [Validators.required, noWhitespaceValidator(), Validators.maxLength(200)]],
        designation: ['', [Validators.required, noWhitespaceValidator(), Validators.maxLength(200)]],
        applicableFor: [true],
        signatureImage: [''],
        status: [true, Validators.required]
      })
    });
  }

  setupConditionalValidation(): void {
    // NABL conditional validation
    this.settingsForm.get('nablAccreditation.nablEnabled')?.valueChanges.subscribe(enabled => {
      const tcNumberControl = this.settingsForm.get('nablAccreditation.nablTcNumber');
      if (enabled) {
        tcNumberControl?.setValidators([Validators.required, noWhitespaceValidator(), Validators.maxLength(100)]);
      } else {
        tcNumberControl?.setValidators([Validators.maxLength(100)]);
      }
      tcNumberControl?.updateValueAndValidity();
    });

    // GST conditional validation — all GST fields mandatory only when applicable
    this.settingsForm.get('gstConfig.gstApplicable')?.valueChanges.subscribe(applicable => {
      this.applyGstValidators(applicable);
    });

    // GST Rate breakdown calculation
    this.settingsForm.get('gstConfig.defaultGstRate')?.valueChanges.subscribe(rate => {
      const halfRate = rate / 2;
      this.settingsForm.patchValue({
        gstConfig: {
          cgst: halfRate,
          sgst: halfRate,
          igst: rate
        }
      }, { emitEvent: false });
    });

    // Trigger initial conditional validators
    const nablEnabled = this.settingsForm.get('nablAccreditation.nablEnabled')?.value;
    if (nablEnabled) {
      const tcNumberControl = this.settingsForm.get('nablAccreditation.nablTcNumber');
      tcNumberControl?.setValidators([Validators.required, noWhitespaceValidator(), Validators.maxLength(100)]);
      tcNumberControl?.updateValueAndValidity();
    }

    // Apply initial GST validators based on current value
    this.applyGstValidators(this.settingsForm.get('gstConfig.gstApplicable')?.value);
  }

  // ============================================
  // GST conditional validator helper
  // ============================================

  private applyGstValidators(applicable: boolean): void {
    const gstinControl = this.settingsForm.get('gstConfig.gstin');
    const stateCodeControl = this.settingsForm.get('gstConfig.stateCode');
    const panControl = this.settingsForm.get('gstConfig.panNumber');
    const rateControl = this.settingsForm.get('gstConfig.defaultGstRate');

    if (applicable) {
      gstinControl?.setValidators([Validators.required, gstinValidator(), Validators.maxLength(15)]);
      stateCodeControl?.setValidators([Validators.required, noWhitespaceValidator(), Validators.maxLength(50)]);
      panControl?.setValidators([panValidator(), Validators.maxLength(10)]);
      rateControl?.setValidators([Validators.required]);
    } else {
      gstinControl?.clearValidators();
      stateCodeControl?.clearValidators();
      panControl?.clearValidators();
      rateControl?.clearValidators();
    }

    gstinControl?.updateValueAndValidity();
    stateCodeControl?.updateValueAndValidity();
    panControl?.updateValueAndValidity();
    rateControl?.updateValueAndValidity();
  }

  // ============================================
  // File Validation (size + type + extension)
  // ============================================

  private validateFile(file: File, allowedTypes: string[], allowedExtensions: string[], maxSize: number, fieldKey: string): boolean {
    this.fileErrors[fieldKey] = null;

    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      this.fileErrors[fieldKey] = `Invalid file type. Allowed: ${allowedExtensions.join(', ')}`;
      return false;
    }

    if (!allowedTypes.includes(file.type)) {
      this.fileErrors[fieldKey] = `Invalid MIME type. Allowed: ${allowedTypes.join(', ')}`;
      return false;
    }

    if (file.size > maxSize) {
      const maxMB = (maxSize / (1024 * 1024)).toFixed(0);
      this.fileErrors[fieldKey] = `File too large. Maximum size: ${maxMB}MB`;
      return false;
    }

    if (file.size === 0) {
      this.fileErrors[fieldKey] = 'File is empty';
      return false;
    }

    return true;
  }

  validateImageFile(file: File, fieldKey: string = 'organizationLogo'): boolean {
    return this.validateFile(file, this.IMAGE_TYPES, this.IMAGE_EXTENSIONS, this.MAX_IMAGE_SIZE, fieldKey);
  }

  validatePdfFile(file: File, fieldKey: string = 'nablCertificate'): boolean {
    return this.validateFile(file, this.PDF_TYPES, this.PDF_EXTENSIONS, this.MAX_PDF_SIZE, fieldKey);
  }

  // ============================================
  // File upload handlers
  // ============================================

  onOrganizationLogoChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      if (this.validateImageFile(file, 'organizationLogo')) {
        this.organizationLogoFile = file;
        this.previewImage(file, 'organizationLogo');
        this.settingsService.uploadOrganizationLogo(file).subscribe({
          next: (res: any) => {
            if (res && res.url) {
              this.organizationLogoPreview = res.url;
              this.settingsForm.get('organizationInfo.organizationLogo')?.setValue(res.url);
            }
          },
          error: () => {
            this.toastService.show('Logo upload failed', 'error');
          }
        });
      } else {
        input.value = '';
      }
    }
  }

  onNablCertificateChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      if (this.validatePdfFile(file, 'nablCertificate')) {
        this.nablCertificateFile = file;
        this.settingsService.uploadNablCertificate(file).subscribe({
          next: (res: any) => {
            if (res && res.url) {
              this.settingsForm.get('nablAccreditation.nablCertificate')?.setValue(res.url);
            }
          },
          error: () => {
            this.toastService.show('NABL certificate upload failed', 'error');
          }
        });
      } else {
        input.value = '';
      }
    }
  }

  onNablLogoChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      if (!this.validateImageFile(file, 'nablLogo')) {
        input.value = '';
        return;
      }
      // Validate minimum dimensions (300x300px for print quality)
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(img.src);
        if (img.width < 300 || img.height < 300) {
          this.fileErrors['nablLogo'] = `Image must be at least 300x300px (got ${img.width}x${img.height}px)`;
          this.toastService.show(`NABL logo must be at least 300x300px for print quality. Current: ${img.width}x${img.height}px`, 'error');
          input.value = '';
          return;
        }
        this.nablLogoFile = file;
        this.previewImage(file, 'nablLogo');
        this.settingsService.uploadNablCertificate(file).subscribe({
          next: (res: any) => {
            if (res && res.url) {
              this.settingsForm.get('nablAccreditation.nablLogo')?.setValue(res.url);
              this.toastService.show('NABL logo uploaded', 'success');
            }
          },
          error: () => {
            this.toastService.show('NABL logo upload failed', 'error');
          }
        });
      };
      img.src = URL.createObjectURL(file);
    }
  }

  onSignatureChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      if (this.validateImageFile(file, 'signature')) {
        this.signatureFile = file;
        this.previewImage(file, 'signature');
        this.settingsService.uploadSignature(file).subscribe({
          next: (res: any) => {
            if (res && res.url) {
              this.signatureUploadedUrl = this.normalizeFileUrl(res.url);
              this.settingsForm.get('authorizedSignatory.signatureImage')?.setValue(this.signatureUploadedUrl);
            }
          },
          error: () => {
            this.toastService.show('Signature upload failed', 'error');
          }
        });
      } else {
        input.value = '';
      }
    }
  }

  previewImage(file: File, type: string): void {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      switch (type) {
        case 'organizationLogo':
          this.organizationLogoPreview = e.target.result;
          break;
        case 'nablLogo':
          this.nablLogoPreview = e.target.result;
          break;
        case 'signature':
          this.signaturePreview = e.target.result;
          break;
      }
    };
    reader.readAsDataURL(file);
  }

  // Normalize a relative file path from the server into a full URL for display/storage
  normalizeFileUrl(path: string | null | undefined): string {
    if (!path) return '';
    // Already a full URL (http/https) or data URI — return as-is
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    // Replace Windows backslashes and ensure single leading slash
    const normalized = '/' + path.replace(/\\/g, '/').replace(/^\/+/, '');
    const base = environment.baseUrl.replace(/\/$/, ''); // strip trailing slash
    return base + normalized;
  }

  // Clear file upload methods
  clearOrganizationLogo(): void {
    this.organizationLogoFile = null;
    this.organizationLogoPreview = null;
    this.fileErrors['organizationLogo'] = null;
    const fileInput = document.getElementById('orgLogoInput') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }

  clearNablLogo(): void {
    this.nablLogoFile = null;
    this.nablLogoPreview = null;
    this.fileErrors['nablLogo'] = null;
  }

  clearSignature(): void {
    this.signatureFile = null;
    this.signaturePreview = null;
    this.fileErrors['signature'] = null;
    const fileInput = document.getElementById('signatureInput') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }

  clearNablCertificate(): void {
    this.nablCertificateFile = null;
    this.fileErrors['nablCertificate'] = null;
  }

  // ============================================
  // Getters for form groups
  // ============================================

  get organizationInfo(): FormGroup {
    return this.settingsForm.get('organizationInfo') as FormGroup;
  }

  get nablAccreditation(): FormGroup {
    return this.settingsForm.get('nablAccreditation') as FormGroup;
  }

  get numbering(): FormGroup {
    return this.settingsForm.get('numbering') as FormGroup;
  }

  get gstConfig(): FormGroup {
    return this.settingsForm.get('gstConfig') as FormGroup;
  }

  get financialYear(): FormGroup {
    return this.settingsForm.get('financialYear') as FormGroup;
  }

  get authorizedSignatory(): FormGroup {
    return this.settingsForm.get('authorizedSignatory') as FormGroup;
  }

  // =====================
  // Financial Year Management
  // =====================

  loadFinancialYears(): void {
    this.settingsService.getFinancialYears().subscribe({
      next: (list) => this.financialYearsList = list,
      error: (err) => this.toastService.show(err?.error?.message || 'Failed to load financial years', 'error')
    });
  }

  openAddFY(): void {
    this.editingFYId = null;
    this.financialYear.reset();
    this.showFYForm = true;
  }

  editFY(fy: any): void {
    this.editingFYId = fy.id;
    this.financialYear.patchValue({
      startDate: fy.startDate?.split('T')[0],
      endDate: fy.endDate?.split('T')[0]
    });
    this.showFYForm = true;
  }

  cancelFYForm(): void {
    this.showFYForm = false;
    this.editingFYId = null;
    this.financialYear.reset();
  }

  saveFY(): void {
    if (this.financialYear.invalid) {
      this.markFormGroupTouched(this.financialYear);
      return;
    }
    const payload = {
      id: this.editingFYId,
      startDate: this.financialYear.value.startDate,
      endDate: this.financialYear.value.endDate,
      isCurrent: false
    };
    this.settingsService.saveFinancialYear(payload).subscribe({
      next: () => {
        this.toastService.show(this.editingFYId ? 'Financial Year updated' : 'Financial Year added', 'success');
        this.cancelFYForm();
        this.loadFinancialYears();
      },
      error: (err) => this.toastService.show(err?.error?.message || 'Failed to save financial year', 'error')
    });
  }

  setDefaultFY(fy: any): void {
    this.settingsService.setDefaultFinancialYear(fy.id).subscribe({
      next: () => {
        this.toastService.show(`${fy.year} set as default`, 'success');
        this.loadFinancialYears();
      },
      error: (err) => this.toastService.show(err?.error?.message || 'Failed to set default', 'error')
    });
  }

  deleteFY(fy: any): void {
    if (!confirm(`Delete Financial Year ${fy.year}?`)) return;
    this.settingsService.deleteFinancialYear(fy.id).subscribe({
      next: () => {
        this.toastService.show('Financial Year deleted', 'success');
        this.loadFinancialYears();
      },
      error: (err) => this.toastService.show(err?.error?.message || 'Failed to delete', 'error')
    });
  }

  // Computed properties
  get isNablEnabled(): boolean {
    return this.nablAccreditation.get('nablEnabled')?.value === true;
  }

  get isGstApplicable(): boolean {
    return this.gstConfig.get('gstApplicable')?.value === true;
  }

  get reportNumberExample(): string {
    const prefix = this.numbering.get('reportNumberPrefix')?.value || 'DMSPL';
    const year = this.numbering.get('yearCode')?.value || '24';
    return `${prefix}-${year}-000123`;
  }

  get ulrExample(): string {
    const tcBase = this.numbering.get('tcBaseNumber')?.value || 'TC5098';
    const year = this.numbering.get('yearCode')?.value || '24';
    return `${tcBase}${year}00000123F`;
  }

  // ============================================
  // Field error helper — returns first error message for a field
  // ============================================

  getFieldError(formGroupName: string, fieldName: string): string | null {
    const control = this.settingsForm.get(`${formGroupName}.${fieldName}`);
    if (!control || (!control.touched && !this.tabSubmitted[this.activeTab])) return null;
    return FormValidationHelper.getFieldError(control);
  }

  getGroupError(formGroupName: string): string | null {
    const group = this.settingsForm.get(formGroupName);
    if (!group || !group.errors) return null;
    const anyTouched = Object.keys((group as FormGroup).controls).some(
      k => (group as FormGroup).get(k)?.touched,
    );
    if (!anyTouched && !this.tabSubmitted[this.activeTab]) return null;
    return FormValidationHelper.getGroupError(group);
  }

  isFieldInvalid(formGroupName: string, fieldName: string): boolean {
    const control = this.settingsForm.get(`${formGroupName}.${fieldName}`);
    return !!(control && control.invalid && (control.touched || this.tabSubmitted[this.activeTab]));
  }

  // ============================================
  // Tab dirty tracking
  // ============================================

  tabDirty: { [key: number]: boolean } = { 1: false, 2: false, 3: false, 4: false, 5: false };

  initTabDirtyTracking(): void {
    const groups: Array<{ key: number; control: FormGroup }> = [
      { key: 1, control: this.organizationInfo },
      { key: 2, control: this.nablAccreditation },
      { key: 3, control: this.numbering },
      { key: 4, control: this.gstConfig },
      { key: 5, control: this.authorizedSignatory }
    ];

    groups.forEach(g => {
      g.control.valueChanges.subscribe(() => {
        this.tabDirty[g.key] = g.control.dirty;
      });
    });
  }

  resetTab(tabKey: number): void {
    if (!this.initialSnapshot) return;
    this.tabSubmitted[tabKey] = false;
    switch (tabKey) {
      case 1:
        this.organizationInfo.patchValue(this.initialSnapshot.organizationInfo || {});
        this.organizationInfo.markAsPristine();
        this.organizationInfo.markAsUntouched();
        this.tabDirty[1] = false;
        this.fileErrors['organizationLogo'] = null;
        break;
      case 2:
        this.nablAccreditation.patchValue(this.initialSnapshot.nablAccreditation || {});
        this.nablAccreditation.markAsPristine();
        this.nablAccreditation.markAsUntouched();
        this.tabDirty[2] = false;
        this.fileErrors['nablCertificate'] = null;
        this.fileErrors['nablLogo'] = null;
        break;
      case 3:
        this.numbering.patchValue(this.initialSnapshot.numbering || {});
        this.numbering.markAsPristine();
        this.numbering.markAsUntouched();
        this.tabDirty[3] = false;
        break;
      case 4:
        this.gstConfig.patchValue(this.initialSnapshot.gstConfig || {});
        this.financialYear.patchValue(this.initialSnapshot.financialYear || {});
        this.gstConfig.markAsPristine();
        this.gstConfig.markAsUntouched();
        this.financialYear.markAsPristine();
        this.financialYear.markAsUntouched();
        this.tabDirty[4] = false;
        break;
      case 5:
        this.signatories = (this.initialSnapshot.signatories || []).slice();
        this.authorizedSignatory.markAsPristine();
        this.authorizedSignatory.markAsUntouched();
        this.tabDirty[5] = false;
        this.fileErrors['signature'] = null;
        break;
    }
  }

  // ============================================
  // Tab-level save with full validation
  // ============================================

  saveTab(tabKey: number): void {
    this.tabSubmitted[tabKey] = true;

    if (tabKey === 1) {
      if (this.organizationInfo.invalid) {
        this.markFormGroupTouched(this.organizationInfo);
        this.toastService.show('Please fix organization details before saving.', 'warning');
        return;
      }
      const data = { ...this.organizationInfo.value, id: this.organizationId };

      const proceedSave = () => {
        this.settingsService.saveOrganization(data).subscribe({
          next: (res) => {
            if (res && res.id) {
              this.organizationId = res.id;
            }
            this.organizationInfo.markAsPristine();
            this.tabDirty[1] = false;
            this.tabSubmitted[1] = false;
            this.toastService.show('Organization saved', 'success');
          },
          error: (err) => {
            this.toastService.show(err?.error?.message || err?.message || 'Failed to save organization', 'error');
          }
        });
      };
      const upload$ = this.organizationLogoFile ? this.settingsService.uploadOrganizationLogo(this.organizationLogoFile) : null;
      if (upload$) {
        upload$.subscribe({
          next: (res: any) => {
            if (res && res.url) {
              this.organizationLogoPreview = res.url;
              this.organizationInfo.patchValue({ organizationLogo: res.url });
            }
            proceedSave();
          },
          error: () => proceedSave()
        });
      } else {
        proceedSave();
      }
    }

    if (tabKey === 2) {
      if (this.isNablEnabled && this.nablAccreditation.invalid) {
        this.markFormGroupTouched(this.nablAccreditation);
        this.toastService.show('Please fix NABL details before saving.', 'warning');
        return;
      }
      const data = { ...this.nablAccreditation.value, organizationId: this.organizationId };
      const uploads: any[] = [];
      if (this.nablCertificateFile) {
        uploads.push(this.settingsService.uploadNablCertificate(this.nablCertificateFile));
      }
      if (this.nablLogoFile) {
        uploads.push(this.settingsService.uploadNablCertificate(this.nablLogoFile));
      }
      const doSave = () => {
        this.settingsService.saveNabl(data).subscribe({
          next: () => {
            this.nablAccreditation.markAsPristine();
            this.tabDirty[2] = false;
            this.tabSubmitted[2] = false;
            this.toastService.show('NABL settings saved', 'success');
          },
          error: (err) => {
            this.toastService.show(err?.error?.message || err?.message || 'Failed to save NABL settings', 'error');
          }
        });
      };
      if (uploads.length > 0) {
        forkJoin(uploads).subscribe({ next: () => doSave(), error: () => doSave() });
      } else {
        doSave();
      }
    }

    if (tabKey === 3) {
      if (this.numbering.invalid) {
        this.markFormGroupTouched(this.numbering);
        this.toastService.show('Please fix numbering details.', 'warning');
        return;
      }
      const data = { ...this.numbering.value, organizationId: this.organizationId };
      this.settingsService.saveNumbering(data).subscribe({
        next: () => {
          this.numbering.markAsPristine();
          this.tabDirty[3] = false;
          this.tabSubmitted[3] = false;
          this.toastService.show('Numbering saved', 'success');
        },
        error: (err) => {
          this.toastService.show(err?.error?.message || err?.message || 'Failed to save numbering', 'error');
        }
      });
    }

    if (tabKey === 4) {
      if (this.gstConfig.invalid) {
        this.markFormGroupTouched(this.gstConfig);
        const fields = Object.keys(this.gstConfig.controls)
          .filter(k => this.gstConfig.get(k)?.invalid)
          .map(k => k.replace(/([A-Z])/g, ' $1').trim());
        this.toastService.show(`GST: Please fill ${fields.join(', ')}`, 'warning');
        return;
      }
      const gst = { ...this.gstConfig.value, organizationId: this.organizationId };
      const fy = { ...this.financialYear.value, organizationId: this.organizationId };

      forkJoin([this.settingsService.saveGst(gst), this.settingsService.saveFinancialYear(fy)]).subscribe({
        next: () => {
          this.gstConfig.markAsPristine();
          this.financialYear.markAsPristine();
          this.tabDirty[4] = false;
          this.tabSubmitted[4] = false;
          this.toastService.show('GST & financial settings saved', 'success');
        },
        error: (err) => {
          this.toastService.show(err?.error?.message || err?.message || 'Failed to save GST/FY', 'error');
        }
      });
    }

    if (tabKey === 5) {
      if (!this.signatories || this.signatories.length === 0) {
        this.toastService.show('Please add at least one signatory.', 'warning');
        return;
      }
      const signatoryPayload = this.signatories.map(s => ({ ...s, organizationId: this.organizationId }));

      const uploadMap: Array<{ idx: number; obs: any }> = [];
      this.signatories.forEach((s, idx) => {
        if (s.file instanceof File) {
          uploadMap.push({ idx, obs: this.settingsService.uploadSignature(s.file) });
        }
      });

      const doSave = () => {
        this.settingsService.saveSignatories(signatoryPayload).subscribe({
          next: () => {
            this.authorizedSignatory.markAsPristine();
            this.tabDirty[5] = false;
            this.tabSubmitted[5] = false;
            this.toastService.show('Signatories saved', 'success');
          },
          error: (err) => {
            this.toastService.show(err?.error?.message || err?.message || 'Failed to save signatories', 'error');
          }
        });
      };

      if (uploadMap.length > 0) {
        const obsArr = uploadMap.map(m => m.obs);
        forkJoin(obsArr).subscribe({
          next: (results: any[]) => {
            results.forEach((res, i) => {
              const mapItem = uploadMap[i];
              if (res && res.url) {
                const fullUrl = this.normalizeFileUrl(res.url);
                this.signatories[mapItem.idx].signatureImage = fullUrl;
                this.signatories[mapItem.idx].preview = fullUrl;
                this.signatories[mapItem.idx].file = null; // clear File object after upload
              }
            });
            doSave();
          },
          error: () => doSave()
        });
      } else {
        doSave();
      }
    }
  }

  // ============================================
  // Save All with full validation
  // ============================================

  saveAll(): void {
    this.submitted = true;
    Object.keys(this.tabSubmitted).forEach(k => (this.tabSubmitted[Number(k)] = true));

    // Validate tabs 1-4 (authorizedSignatory is excluded — it's an add/edit helper, not saved data)
    const coreGroups: Array<{ key: number; group: FormGroup }> = [
      { key: 1, group: this.organizationInfo },
      { key: 2, group: this.nablAccreditation },
      { key: 3, group: this.numbering },
      { key: 4, group: this.gstConfig }
    ];
    const hasCoreErrors = coreGroups.some(g => g.group.invalid);
    const noSignatories = !this.signatories || this.signatories.length === 0;

    if (hasCoreErrors || noSignatories) {
      if (hasCoreErrors) {
        coreGroups.forEach(g => this.markFormGroupTouched(g.group));
        for (const tg of coreGroups) {
          if (tg.group.invalid) {
            this.activeTab = tg.key;
            break;
          }
        }
      }
      if (noSignatories && !hasCoreErrors) {
        this.activeTab = 5;
      }

      // Build specific error message
      const errorSections: string[] = [];
      const tabNames: Record<number, string> = { 1: 'Organization', 2: 'Accreditation', 3: 'Numbering', 4: 'GST' };
      for (const tg of coreGroups) {
        if (tg.group.invalid) {
          const invalidFields = Object.keys(tg.group.controls)
            .filter(k => tg.group.get(k)?.invalid)
            .map(k => k.replace(/([A-Z])/g, ' $1').trim());
          errorSections.push(`${tabNames[tg.key]}: ${invalidFields.join(', ')}`);
        }
      }
      if (noSignatories) errorSections.push('At least one Authorized Signatory required');

      this.toastService.show(
        errorSections.length > 0
          ? `Please fix: ${errorSections.join(' | ')}`
          : 'Please fix all validation errors before saving.',
        'warning'
      );
      return;
    }

    const payload = {
      organizationInfo: { ...this.organizationInfo.value, id: this.organizationId },
      nablAccreditation: { ...this.nablAccreditation.value, organizationId: this.organizationId },
      numbering: { ...this.numbering.value, organizationId: this.organizationId },
      gstConfig: { ...this.gstConfig.value, organizationId: this.organizationId },
      financialYear: { ...this.financialYear.value, organizationId: this.organizationId },
      signatories: this.signatories.map(s => ({ ...s, organizationId: this.organizationId }))
    };

    this.settingsService.saveAll(payload).subscribe({
      next: (res) => {
        if (res && res.organizationInfo && res.organizationInfo.id) {
          this.organizationId = res.organizationInfo.id;
        }
        this.organizationInfo.markAsPristine();
        this.nablAccreditation.markAsPristine();
        this.numbering.markAsPristine();
        this.gstConfig.markAsPristine();
        this.financialYear.markAsPristine();
        this.authorizedSignatory.markAsPristine();
        Object.keys(this.tabDirty).forEach(k => (this.tabDirty[Number(k)] = false));
        Object.keys(this.tabSubmitted).forEach(k => (this.tabSubmitted[Number(k)] = false));
        this.submitted = false;
        this.toastService.show('All settings saved', 'success');
      },
      error: (err) => {
        this.toastService.show(err?.error?.message || err?.message || 'Failed to save settings', 'error');
      }
    });
  }

  onSave(): void {
    this.saveAll();
  }

  onCancel(): void {
    if (confirm('Are you sure you want to discard changes?')) {
      this.submitted = false;
      Object.keys(this.tabSubmitted).forEach(k => (this.tabSubmitted[Number(k)] = false));
      this.loadSettingsFromApi();
      this.organizationLogoFile = null;
      this.organizationLogoPreview = null;
      this.nablCertificateFile = null;
      this.nablLogoFile = null;
      this.nablLogoPreview = null;
      this.signatureFile = null;
      this.signaturePreview = null;
      Object.keys(this.fileErrors).forEach(k => (this.fileErrors[k] = null));
    }
  }

  // ============================================
  // Signatory Management
  // ============================================

  addSignatory(): void {
    this.tabSubmitted[5] = true;

    if (this.authorizedSignatory.invalid) {
      this.markFormGroupTouched(this.authorizedSignatory);
      this.toastService.show('Please fill all required signatory fields.', 'warning');
      return;
    }

    if (!this.signaturePreview && !(this.signatureFile instanceof File)) {
      this.toastService.show('Please upload a signature image before adding signatory.', 'warning');
      return;
    }

    // Duplicate name check
    const newName = (this.authorizedSignatory.get('signatoryName')?.value || '').trim().toLowerCase();
    const duplicateIdx = this.signatories.findIndex(
      (s, idx) => (s.signatoryName || '').trim().toLowerCase() === newName && idx !== this.editingSignatoryIndex
    );
    if (duplicateIdx >= 0) {
      this.toastService.show('A signatory with this name already exists.', 'warning');
      return;
    }

    // Use uploaded URL for signatureImage (NOT base64 preview)
    const uploadedUrl = this.signatureUploadedUrl || this.authorizedSignatory.get('signatureImage')?.value || '';
    this.authorizedSignatory.patchValue({ signatureImage: uploadedUrl });

    const signData = {
      ...this.authorizedSignatory.value,
      signatureImage: uploadedUrl,
      preview: this.signaturePreview || uploadedUrl || null,
      file: this.signatureFile || null
    };

    if (this.editingSignatoryIndex >= 0) {
      signData.id = this.signatories[this.editingSignatoryIndex].id;
      this.signatories[this.editingSignatoryIndex] = signData;
      this.editingSignatoryIndex = -1;
    } else {
      this.signatories.push(signData);
    }

    this.tabDirty[5] = true;
    this.tabSubmitted[5] = false;
    this.resetSignatureForm();
  }

  editSignatory(index: number): void {
    const sig = this.signatories[index];
    this.signatureUploadedUrl = sig.signatureImage || null;
    this.authorizedSignatory.patchValue({
      signatoryName: sig.signatoryName,
      designation: sig.designation,
      applicableFor: sig.applicableFor,
      status: sig.status,
      signatureImage: sig.signatureImage || ''
    });
    this.signaturePreview = sig.preview || sig.signatureImage || null;
    this.signatureFile = sig.file instanceof File ? sig.file : sig.file || null;
    this.editingSignatoryIndex = index;
  }

  cancelEditSignatory(): void {
    this.resetSignatureForm();
  }

  deleteSignatory(index: number): void {
    const sig = this.signatories[index];
    if (!confirm('Are you sure you want to delete this signatory?')) return;

    if (sig && sig.id) {
      this.settingsService.deleteSignatory(sig.id).subscribe({
        next: () => {
          this.toastService.show('Signatory deleted', 'success');
          this.loadSettingsFromApi();
          if (this.editingSignatoryIndex === index) {
            this.resetSignatureForm();
          }
          this.tabDirty[5] = true;
        },
        error: (err) => {
          this.toastService.show(err?.error?.message || err?.message || 'Failed to delete signatory', 'error');
        }
      });
    } else {
      this.signatories.splice(index, 1);
      if (this.editingSignatoryIndex === index) {
        this.resetSignatureForm();
      }
      this.tabDirty[5] = true;
    }
  }

  private resetSignatureForm(): void {
    this.authorizedSignatory.reset({ status: true, applicableFor: true });
    this.authorizedSignatory.markAsUntouched();
    this.signatureFile = null;
    this.signaturePreview = null;
    this.signatureUploadedUrl = null;
    this.editingSignatoryIndex = -1;
    this.fileErrors['signature'] = null;
    this.tabSubmitted[5] = false;
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  // Tab navigation
  setActiveTab(tabKey: number): void {
    this.activeTab = tabKey;
  }

  // Check if a tab has validation errors
  hasTabErrors(tabKey: number): boolean {
    switch (tabKey) {
      case 1:
        return this.organizationInfo.invalid;
      case 2:
        return this.isNablEnabled && this.nablAccreditation.invalid;
      case 3:
        return this.numbering.invalid;
      case 4:
        return this.gstConfig.invalid;
      case 5:
        return this.signatories.length === 0; // error only when no signatories added
      default:
        return false;
    }
  }
}
