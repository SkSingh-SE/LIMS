import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { OrganizationAdminService } from '../../../services/organization-admin.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-branch-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './branch-form.component.html',
  styleUrls: ['./branch-form.component.css']
})
export class BranchFormComponent implements OnInit, OnChanges {
  @Input() visible: boolean = false;
  @Input() organizationId!: number;
  @Input() branchId: number | null = null;
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
    if (this.visible && this.branchId) {
      this.loadBranch(this.branchId);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible) {
      this.initForm();
      if (this.branchId) {
        this.loadBranch(this.branchId);
      }
    }
  }

  private initForm(): void {
    this.isEditMode = !!this.branchId;
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(200)]],
      code: ['', [Validators.required, Validators.maxLength(50)]],
      isHeadOffice: [false],
      address: ['', [Validators.maxLength(500)]],
      contactEmail: ['', [Validators.email, Validators.maxLength(200)]],
      contactPhone: ['', [Validators.maxLength(50)]]
    });
  }

  private loadBranch(id: number): void {
    this.orgAdminService.getBranchDetails(id).subscribe({
      next: (res) => {
        this.form.patchValue({
          name: res.name,
          code: res.code,
          isHeadOffice: res.isHeadOffice,
          address: res.address,
          contactEmail: res.contactEmail,
          contactPhone: res.contactPhone
        });
      },
      error: (err) => {
        this.toastService.show(err.error?.message || 'Failed to load branch details.', 'error');
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

    if (this.isEditMode && this.branchId) {
      this.orgAdminService.updateBranch({
        id: this.branchId,
        organizationID: this.organizationId,
        isActive: true,
        ...formVal
      }).subscribe({
        next: (res) => {
          this.isSubmitting = false;
          this.toastService.show(res.message || 'Branch updated successfully.', 'success');
          this.saved.emit();
          this.onClose();
        },
        error: (err) => {
          this.isSubmitting = false;
          this.toastService.show(err.error?.message || 'Failed to update branch.', 'error');
        }
      });
    } else {
      this.orgAdminService.createBranch({
        organizationID: this.organizationId,
        ...formVal
      }).subscribe({
        next: (res) => {
          this.isSubmitting = false;
          this.toastService.show(res.message || 'Branch created successfully.', 'success');
          this.saved.emit();
          this.onClose();
        },
        error: (err) => {
          this.isSubmitting = false;
          this.toastService.show(err.error?.message || 'Failed to create branch.', 'error');
        }
      });
    }
  }

  onClose(): void {
    this.close.emit();
  }
}
