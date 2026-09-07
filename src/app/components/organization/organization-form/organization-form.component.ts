import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { OrganizationAdminService } from '../../../services/organization-admin.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-organization-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './organization-form.component.html',
  styleUrls: ['./organization-form.component.css']
})
export class OrganizationFormComponent implements OnInit, OnChanges {
  @Input() visible: boolean = false;
  @Input() organizationId: number | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private orgAdminService = inject(OrganizationAdminService);
  private toastService = inject(ToastService);

  form!: FormGroup;
  isEditMode: boolean = false;
  isSubmitting: boolean = false;

  ngOnInit(): void {
    this.initForm();
    if (this.visible && this.organizationId) {
      this.loadOrganization(this.organizationId);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible) {
      this.initForm();
      if (this.organizationId) {
        this.loadOrganization(this.organizationId);
      }
    }
  }

  private initForm(): void {
    this.isEditMode = !!this.organizationId;
    this.form = this.fb.group({
      labName: ['', [Validators.required, Validators.maxLength(200)]],
      labCode: ['', [Validators.required, Validators.maxLength(50)]],
      labAddress: ['', [Validators.required, Validators.maxLength(500)]],
      contactEmail: ['', [Validators.required, Validators.email, Validators.maxLength(200)]],
      contactPhone: ['', [Validators.required, Validators.maxLength(50)]],
      cin: ['', [Validators.maxLength(100)]],
      website: ['', [Validators.maxLength(100)]],
      mobileNo: ['', [Validators.maxLength(50)]],
      ulrPrefix: ['', [Validators.maxLength(50)]],
      labLocationCode: ['', [Validators.maxLength(20)]],
      isMultiBranch: [false]
    });
  }

  private loadOrganization(id: number): void {
    this.orgAdminService.getOrganizationDetails(id).subscribe({
      next: (res) => {
        this.form.patchValue({
          labName: res.labName,
          labCode: res.labCode,
          labAddress: res.labAddress,
          contactEmail: res.contactEmail,
          contactPhone: res.contactPhone,
          cin: res.cin,
          website: res.website,
          mobileNo: res.mobileNo,
          ulrPrefix: res.ulrPrefix,
          labLocationCode: res.labLocationCode,
          isMultiBranch: res.isMultiBranch
        });
      },
      error: (err) => {
        this.toastService.show(err.error?.message || 'Failed to load organization details.', 'error');
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toastService.show('Please fill in all required fields properly.', 'error');
      return;
    }

    this.isSubmitting = true;
    const formVal = this.form.value;

    if (this.isEditMode && this.organizationId) {
      this.orgAdminService.updateOrganization({
        id: this.organizationId,
        ...formVal
      }).subscribe({
        next: (res) => {
          this.isSubmitting = false;
          this.toastService.show(res.message || 'Organization updated successfully.', 'success');
          this.saved.emit();
          this.onClose();
        },
        error: (err) => {
          this.isSubmitting = false;
          this.toastService.show(err.error?.message || 'Failed to update organization.', 'error');
        }
      });
    } else {
      this.orgAdminService.createOrganization(formVal).subscribe({
        next: (res) => {
          this.isSubmitting = false;
          this.toastService.show(res.message || 'Organization created successfully.', 'success');
          this.saved.emit();
          this.onClose();
        },
        error: (err) => {
          this.isSubmitting = false;
          this.toastService.show(err.error?.message || 'Failed to create organization.', 'error');
        }
      });
    }
  }

  onClose(): void {
    this.close.emit();
  }
}
