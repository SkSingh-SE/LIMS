import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ReportingService } from '../../../services/reporting.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-report-amend',
  templateUrl: './report-amend.component.html',
  styleUrls: ['./report-amend.component.css'],
  imports: [CommonModule,ReactiveFormsModule,RouterModule]
})
export class ReportAmendComponent implements OnInit {
  amendForm!: FormGroup;
  reportHeaderId!: number;
  selectedFile: File | null = null;
  isSubmitting = false;
  amendmentType: 'INTERNAL' | 'CUSTOMER' | null = null;
  isTypeDeterminedByBackend = false;
  amendmentTypeOptions = [
    { value: 'INTERNAL', label: 'Internal Amendment (Free, No re-pricing)' },
    { value: 'CUSTOMER', label: 'Customer Amendment (Chargeable, Re-approval required)' }
  ];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private reportingService: ReportingService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.reportHeaderId = +this.route.snapshot.paramMap.get('id')!;

    // Load amendment type from backend if available
    this.loadAmendmentInfo();

    this.amendForm = this.fb.group({
      id: [0],
      reportHeaderId: [this.reportHeaderId],
      amendmentType: [{ value: this.amendmentType || 'CUSTOMER', disabled: this.isTypeDeterminedByBackend }], // Default to CUSTOMER if not determined
      reason: ['', [Validators.required, Validators.minLength(10)]],
      file: [null, Validators.required]
    });
  }

  loadAmendmentInfo(): void {
    // TODO: Load amendment info from backend to determine type
    // For now, defaulting to allowing selection
    // If backend determines type, set isTypeDeterminedByBackend = true
  }

  get f() {
    return this.amendForm.controls;
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      this.amendForm.patchValue({ file: this.selectedFile });
      this.amendForm.get('file')?.updateValueAndValidity();
    }
  }

  submit(): void {
    if (this.amendForm.invalid || !this.selectedFile) {
      this.amendForm.markAllAsTouched();
      return;
    }

    const formData = new FormData();
    formData.append('reportHeaderId', this.reportHeaderId.toString());
    formData.append('amendmentType', this.amendForm.get('amendmentType')?.value || 'CUSTOMER');
    formData.append('reason', this.f['reason'].value);
    formData.append('file', this.selectedFile);

    this.isSubmitting = true;

    this.reportingService.submitAmendment(formData).subscribe({
      next: () => {
        const type = this.amendForm.get('amendmentType')?.value;
        const typeLabel = type === 'INTERNAL' ? 'Internal' : 'Customer';
        alert(`${typeLabel} amendment submitted successfully and sent for review.`);
        this.router.navigate(['/reporting/dashboard']);
      },
      error: (err) => {
        console.error(err);
        this.isSubmitting = false;
      }
    });
  }

  getAmendmentTypeLabel(): string {
    const type = this.amendForm.get('amendmentType')?.value;
    if (type === 'INTERNAL') {
      return 'Internal Amendment (Free, No re-pricing, No re-approval)';
    }
    return 'Customer Amendment (Chargeable, Re-approval required, Re-pricing after approval)';
  }

  cancel(): void {
    this.router.navigate(['/reporting/dashboard']);
  }
}
