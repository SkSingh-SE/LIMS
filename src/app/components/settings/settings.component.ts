import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SettingsService } from '../../services/settings.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit {
  settingsForm!: FormGroup;
  organizationId: number = 0;

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
  nablLogoFile: File | null = null;
  nablLogoPreview: string | null = null;
  signatureFile: File | null = null;
  signaturePreview: string | null = null;

  // Multiple signatories
  signatories: any[] = [];
  editingSignatoryIndex: number = -1;

  // GST Rate options
  gstRateOptions = [0, 5, 12, 18, 28];

  constructor(private fb: FormBuilder, private settingsService: SettingsService, private toastService: ToastService) { }

  initialSnapshot: any = null;

  ngOnInit(): void {
    this.initializeForm();
    this.setupConditionalValidation();
    this.loadSettingsFromApi();
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
        }
        if (res.nablAccreditation) {
          this.settingsForm.get('nablAccreditation')?.patchValue(res.nablAccreditation);
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
          this.signatories = res.signatories;
        }
        this.captureInitialSnapshot();
      },
      error: (err) => {
        this.toastService.show('Failed to load settings', 'error');
      }
    });
  }

  // called after loadMockData completes to capture baseline
  private captureInitialSnapshot(): void {
    this.initialSnapshot = this.settingsForm.getRawValue();
  }

  initializeForm(): void {
    this.settingsForm = this.fb.group({
      // Organization Information
      organizationInfo: this.fb.group({
        labName: ['', Validators.required],
        labCode: ['', Validators.required],
        labAddress: ['', Validators.required],
        contactEmail: ['', [Validators.required, Validators.email]],
        contactPhone: ['', Validators.required],
        organizationLogo: ['']
      }),

      // NABL Accreditation
      nablAccreditation: this.fb.group({
        nablEnabled: [true, Validators.required],
        nablTcNumber: [''],
        nablCertificate: [''],
        nablLogo: ['']
      }),

      // Numbering & Identity
      numbering: this.fb.group({
        tcBaseNumber: ['', Validators.required],
        reportNumberPrefix: ['', Validators.required],
        yearCode: [{ value: '', disabled: true }],
        runningCounter: [{ value: '', disabled: true }]
      }),

      // GST & Tax Configuration
      gstConfig: this.fb.group({
        gstApplicable: [true, Validators.required],
        gstin: [''],
        panNumber: [''],
        stateCode: [''],
        defaultGstRate: [18, Validators.required],
        cgst: [{ value: 9, disabled: true }],
        sgst: [{ value: 9, disabled: true }],
        igst: [{ value: 18, disabled: true }]
      }),

      // Financial Year
      financialYear: this.fb.group({
        startDate: ['', Validators.required],
        endDate: ['', Validators.required],
        currency: [{ value: 'INR – ₹', disabled: true }]
      }),

      // Authorized Signatory
      authorizedSignatory: this.fb.group({
        signatoryName: ['', Validators.required],
        designation: ['', Validators.required],
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
        tcNumberControl?.setValidators([Validators.required]);
      } else {
        tcNumberControl?.clearValidators();
      }
      tcNumberControl?.updateValueAndValidity();
    });

    // GST conditional validation
    this.settingsForm.get('gstConfig.gstApplicable')?.valueChanges.subscribe(applicable => {
      const gstinControl = this.settingsForm.get('gstConfig.gstin');
      if (applicable) {
        gstinControl?.setValidators([Validators.required]);
      } else {
        gstinControl?.clearValidators();
      }
      gstinControl?.updateValueAndValidity();
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
  }

  // loadMockData removed: replaced by API integration

  // File upload handlers
  onOrganizationLogoChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      if (this.validateImageFile(file)) {
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
      }
    }
  }

  onNablCertificateChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      if (file.type === 'application/pdf') {
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
        alert('Please upload a PDF file');
      }
    }
  }

  onNablLogoChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      if (this.validateImageFile(file)) {
        this.nablLogoFile = file;
        this.previewImage(file, 'nablLogo');
        this.settingsService.uploadNablCertificate(file).subscribe({
          next: (res: any) => {
            if (res && res.url) {
              this.settingsForm.get('nablAccreditation.nablLogo')?.setValue(res.url);
            }
          },
          error: () => {
            this.toastService.show('NABL logo upload failed', 'error');
          }
        });
      }
    }
  }

  onSignatureChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      if (this.validateImageFile(file)) {
        this.signatureFile = file;
        this.previewImage(file, 'signature');
        this.settingsService.uploadSignature(file).subscribe({
          next: (res: any) => {
            if (res && res.url) {
              this.settingsForm.get('authorizedSignatory.signatureImage')?.setValue(res.url);
            }
          },
          error: () => {
            this.toastService.show('Signature upload failed', 'error');
          }
        });
      }
    }
  }

  validateImageFile(file: File): boolean {
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    const maxSize = 2 * 1024 * 1024; // 2MB

    if (!validTypes.includes(file.type)) {
      alert('Please upload a PNG or JPG file');
      return false;
    }

    if (file.size > maxSize) {
      alert('File size must be less than 2MB');
      return false;
    }

    return true;
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

  // Clear file upload methods
  clearOrganizationLogo(): void {
    this.organizationLogoFile = null;
    this.organizationLogoPreview = null;
    const fileInput = document.getElementById('orgLogoInput') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }

  clearNablLogo(): void {
    this.nablLogoFile = null;
    this.nablLogoPreview = null;
  }

  clearSignature(): void {
    this.signatureFile = null;
    this.signaturePreview = null;
    const fileInput = document.getElementById('signatureInput') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }

  // Getters for form groups
  get organizationInfo(): FormGroup {
    return this.settingsForm.get('organizationInfo') as FormGroup;
  }

  // Tab dirty tracking
  tabDirty: { [key: number]: boolean } = {
    1: false,
    2: false,
    3: false,
    4: false,
    5: false
  };

  initTabDirtyTracking(): void {
    // Subscribe to changes on each sub form and set dirty flag
    const groups: Array<{ key: number, control: FormGroup }> = [
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

  // Reset a specific tab to initial snapshot
  resetTab(tabKey: number): void {
    if (!this.initialSnapshot) return;
    switch (tabKey) {
      case 1:
        this.organizationInfo.patchValue(this.initialSnapshot.organizationInfo || {});
        this.organizationInfo.markAsPristine();
        this.tabDirty[1] = false;
        break;
      case 2:
        this.nablAccreditation.patchValue(this.initialSnapshot.nablAccreditation || {});
        this.nablAccreditation.markAsPristine();
        this.tabDirty[2] = false;
        break;
      case 3:
        this.numbering.patchValue(this.initialSnapshot.numbering || {});
        this.numbering.markAsPristine();
        this.tabDirty[3] = false;
        break;
      case 4:
        this.gstConfig.patchValue(this.initialSnapshot.gstConfig || {});
        this.financialYear.patchValue(this.initialSnapshot.financialYear || {});
        this.gstConfig.markAsPristine();
        this.financialYear.markAsPristine();
        this.tabDirty[4] = false;
        break;
      case 5:
        this.signatories = (this.initialSnapshot.signatories || []).slice();
        this.authorizedSignatory.markAsPristine();
        this.tabDirty[5] = false;
        break;
    }
  }

  // Save a specific tab (section)
  saveTab(tabKey: number): void {
    if (tabKey === 1) {
      const data = { ...this.organizationInfo.value, id: this.organizationId };
      if (this.organizationInfo.invalid) {
        this.markFormGroupTouched(this.organizationInfo);
        this.toastService.show('Please fix organization details before saving.', 'warning');
        return;
      }

      const proceedSave = () => {
        this.settingsService.saveOrganization(data).subscribe({
          next: (res) => {
            if (res && res.id) {
              this.organizationId = res.id;
            }
            this.organizationInfo.markAsPristine();
            this.tabDirty[1] = false;
            this.toastService.show('Organization saved', 'success');
          },
          error: (err) => {
            this.toastService.show(err?.message, 'error');
          }
        });
      };
      const upload$ = this.organizationLogoFile
        ? this.settingsService.uploadOrganizationLogo(this.organizationLogoFile)
        : null;
      if (upload$) {
        upload$.subscribe({
          next: (res: any) => {
            if (res && res.url) {
              this.organizationLogoPreview = res.url;
              this.organizationInfo.patchValue({ organizationLogo: res.url });
            }
            proceedSave();
          }, error: () => proceedSave()
        });
      } else {
        proceedSave();
      }
    }

    if (tabKey === 2) {
      const data = { ...this.nablAccreditation.value, organizationId: this.organizationId };
      if (this.isNablEnabled && this.nablAccreditation.invalid) {
        this.markFormGroupTouched(this.nablAccreditation);
        this.toastService.show('Please fix NABL details before saving.', 'warning');
        return;
      }
      const uploads: Array<any> = [];
      if (this.nablCertificateFile) {
        uploads.push(this.settingsService.uploadNablCertificate(this.nablCertificateFile));
      }
      if (this.nablLogoFile) {
        uploads.push(this.settingsService.uploadNablCertificate(this.nablLogoFile));
      }
      if (uploads.length > 0) {
        uploads[0].subscribe({
          next: (res: any) => {
            this.settingsService.saveNabl(data).subscribe(
              {
                next: () => {
                  this.nablAccreditation.markAsPristine();
                  this.tabDirty[2] = false;
                  this.toastService.show('NABL settings saved', 'success');
                }, error: (err) => {
                  this.toastService.show(err?.message, 'error');
                }
              });
          }, error: () => {
            this.settingsService.saveNabl(data).subscribe(() => {
              this.nablAccreditation.markAsPristine();
              this.tabDirty[2] = false;
              this.toastService.show('NABL settings saved', 'success');
            });
          }
        });
      } else {
        this.settingsService.saveNabl(data).subscribe({
          next: () => {
            this.nablAccreditation.markAsPristine();
            this.tabDirty[2] = false;
            this.toastService.show('NABL settings saved', 'success');
          }, error: (err) => {
            this.toastService.show(err?.message, 'error');
          }
        });
      }
    }

    if (tabKey === 3) {
      const data = { ...this.numbering.value, organizationId: this.organizationId };
      if (this.numbering.invalid) {
        this.markFormGroupTouched(this.numbering);
        this.toastService.show('Please fix numbering details.', 'warning');
        return;
      }
      this.settingsService.saveNumbering(data).subscribe({
        next: () => {
          this.numbering.markAsPristine();
          this.tabDirty[3] = false;
          this.toastService.show('Numbering saved', 'success');
        }, error: (err) => {
          this.toastService.show(err?.message, 'error');
        }
      });
    }

    if (tabKey === 4) {
      const gst = { ...this.gstConfig.value, organizationId: this.organizationId };
      const fy = { ...this.financialYear.value, organizationId: this.organizationId };
      if (this.gstConfig.invalid || this.financialYear.invalid) {
        this.markFormGroupTouched(this.gstConfig);
        this.markFormGroupTouched(this.financialYear);
        this.toastService.show('Please fix GST/financial details.', 'warning');
        return;
      }
      this.settingsService.saveGst(gst).subscribe({
        next: () => {
          this.gstConfig.markAsPristine();
          this.financialYear.markAsPristine();
          this.tabDirty[4] = false;
          this.toastService.show('GST & financial settings saved', 'success');
        }, error: (err) => {
          this.toastService.show(err?.message, 'error');
        }
      });
      // Optionally, save financial year if required by backend
      this.settingsService.saveFinancialYear(fy).subscribe();
    }

    if (tabKey === 5) {
      if (!this.signatories || this.signatories.length === 0) {
        this.toastService.show('Please add at least one signatory with signature.', 'warning');
        return;
      }
      const invalidSig = this.signatories.some(s => !s.preview && !(s.file instanceof File) && !(typeof s.file === 'string' && s.file));
      if (invalidSig) {
        this.toastService.show('Each signatory must have a signature image before saving.', 'warning');
        return;
      }
      const uploads: any[] = [];
      const uploadMap: Array<{ idx: number, obs: any }> = [];
      this.signatories.forEach((s, idx) => {
        if (s.file instanceof File) {
          uploadMap.push({ idx, obs: this.settingsService.uploadSignature(s.file) });
        }
      });
      const signatoryPayload = this.signatories.map(s => ({ ...s, organizationId: this.organizationId }));
      if (uploadMap.length > 0) {
        const obsArr = uploadMap.map(m => m.obs);
        forkJoin(obsArr).subscribe({
          next: (results: any[]) => {
            results.forEach((res, i) => {
              const mapItem = uploadMap[i];
              if (res && res.url) {
                this.signatories[mapItem.idx].preview = res.url;
                this.signatories[mapItem.idx].file = res.url;
              }
            });
            this.settingsService.saveSignatories(signatoryPayload).subscribe({
              next: () => {
                this.authorizedSignatory.markAsPristine();
                this.tabDirty[5] = false;
                this.toastService.show('Signatories saved', 'success');
              }, error: (err) => {
                this.toastService.show(err?.message, 'error');
              }
            });
          }, error: () => {
            this.settingsService.saveSignatories(signatoryPayload).subscribe(() => {
              this.authorizedSignatory.markAsPristine();
              this.tabDirty[5] = false;
              this.toastService.show('Signatories saved', 'success');
            });
          }
        });
      } else {
        this.settingsService.saveSignatories(signatoryPayload).subscribe({
          next: () => {
            this.authorizedSignatory.markAsPristine();
            this.tabDirty[5] = false;
            this.toastService.show('Signatories saved', 'success');
          }, error: (err) => {
            this.toastService.show(err?.message, 'error');
          }
        });
      }
    }
  }

  // Save entire settings
  saveAll(): void {
    if (this.settingsForm.invalid) {
      this.markFormGroupTouched(this.settingsForm);
      this.toastService.show('Please fix errors before saving all settings.', 'warning');
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
        // Mark all groups pristine
        this.organizationInfo.markAsPristine();
        this.nablAccreditation.markAsPristine();
        this.numbering.markAsPristine();
        this.gstConfig.markAsPristine();
        this.financialYear.markAsPristine();
        this.authorizedSignatory.markAsPristine();

        Object.keys(this.tabDirty).forEach(k => this.tabDirty[Number(k)] = false);

        this.toastService.show('All settings saved', 'success');
      }, error: (err) => {
        this.toastService.show(err?.message, 'error');
      }
    });
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

  // Form actions
  onSave(): void {
    // Use saveAll to persist all sections
    this.saveAll();
  }

  onCancel(): void {
    if (confirm('Are you sure you want to discard changes?')) {
      this.loadSettingsFromApi();
      this.organizationLogoFile = null;
      this.organizationLogoPreview = null;
      this.nablCertificateFile = null;
      this.nablLogoFile = null;
      this.nablLogoPreview = null;
      this.signatureFile = null;
      this.signaturePreview = null;
    }
  }

  // Signature Management Methods
  addSignatory(): void {
    // require a signature image (file selected or existing preview)
    if (!this.signaturePreview && !(this.signatureFile instanceof File)) {
      this.toastService.show('Please upload a signature image before adding signatory.', 'warning');
      return;
    }

    if (this.authorizedSignatory.valid) {
      // ensure signatureImage field is set for validator consistency
      const signatureName = this.signaturePreview || (this.signatureFile ? (this.signatureFile.name || '') : '');
      this.authorizedSignatory.patchValue({ signatureImage: signatureName });

      const signData = {
        ...this.authorizedSignatory.value,
        preview: this.signaturePreview || null,
        file: this.signatureFile || null
      };

      if (this.editingSignatoryIndex >= 0) {
        this.signatories[this.editingSignatoryIndex] = signData;
        this.editingSignatoryIndex = -1;
      } else {
        this.signatories.push(signData);
      }

      this.tabDirty[5] = true;
      this.resetSignatureForm();
    } else {
      this.markFormGroupTouched(this.authorizedSignatory);
      this.toastService.show('Please fill required signatory fields.', 'warning');
    }
  }

  editSignatory(index: number): void {
    const sig = this.signatories[index];
    this.authorizedSignatory.patchValue({
      signatoryName: sig.signatoryName,
      designation: sig.designation,
      applicableFor: sig.applicableFor,
      status: sig.status,
      signatureImage: sig.preview || (sig.file && (sig.file as any).name) || ''
    });
    this.signaturePreview = sig.preview;
    this.signatureFile = sig.file instanceof File ? sig.file : (sig.file || null);
    this.editingSignatoryIndex = index;
  }

  cancelEditSignatory(): void {
    this.resetSignatureForm();
  }

  // Delete a signatory
  deleteSignatory(index: number): void {
    const sig = this.signatories[index];
    if (!confirm('Are you sure you want to delete this signatory?')) return;

    // if signatory has an id, call backend to delete
    if (sig && sig.id) {
      this.settingsService.deleteSignatory(sig.id).subscribe({
        next: () => {
          this.toastService.show('Signatory deleted', 'success');
          this.loadSettingsFromApi();
          if (this.editingSignatoryIndex === index) {
            this.resetSignatureForm();
          }
          this.tabDirty[5] = true;
        }, error: (err) => {
          this.toastService.show(err?.message, 'error');
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
    this.authorizedSignatory.reset({
      status: true,
      applicableFor: true
    });
    this.signatureFile = null;
    this.signaturePreview = null;
    this.editingSignatoryIndex = -1;
  }

  clearNablCertificate(): void {
    this.nablCertificateFile = null;
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

  // Helper method to check if field is invalid and touched
  isFieldInvalid(formGroupName: string, fieldName: string): boolean {
    const field = this.settingsForm.get(`${formGroupName}.${fieldName}`);
    return !!(field && field.invalid && field.touched);
  }

  // Tab navigation
  setActiveTab(tabKey: number): void {
    this.activeTab = tabKey;
  }
}
