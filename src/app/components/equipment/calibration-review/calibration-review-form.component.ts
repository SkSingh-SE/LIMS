import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { CalibrationReviewService } from '../../../services/calibration-review.service';
import { QuillModule } from 'ngx-quill';
import { NablFormsHelper } from '../../../utility/nabl-helpers/nabl-forms.helper';

@Component({
  selector: 'app-calibration-review-form',

  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, QuillModule],
  templateUrl: './calibration-review-form.component.html',
  styleUrl: './calibration-review-form.component.css'
})
export class CalibrationReviewFormComponent implements OnInit {
  reviewForm!: FormGroup;
  isEditMode = false;
  recordId: number | null = null;
  isLoading = false;
  submitted = false;
  formNumbers: string[] = NablFormsHelper.getFormNumbers();

  openSections: { [key: string]: boolean } = {
    document: true,
    certificate: true,
    equipment: true,
    points: true,
    review: true
  };

  quillModules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      ['clean']
    ]
  };

  reviewStatusOptions = [
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'conditional-approval', label: 'Conditional Approval' },
    { value: 'requires-clarification', label: 'Requires Clarification' }
  ];

  constructor(
    private fb: FormBuilder,
    private calibrationReviewService: CalibrationReviewService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.initializeForm();
    this.checkEditMode();
  }

  private initializeForm(): void {
    const today = new Date().toISOString().split('T')[0];
    this.reviewForm = this.fb.group({
      id: [0],
      formatNo: ['F-15', Validators.required],
      issueNo: ['01', Validators.required],
      revNo: ['00', Validators.required],
      date: [today, Validators.required],
      documentNo: ['', Validators.required],
      issueDate: [today, Validators.required],

      certificateNo: ['', Validators.required],
      calibrationDate: [today, Validators.required],
      nextCalibrationDate: ['', Validators.required],
      calibratingAgency: ['', Validators.required],
      agencyAccreditationNo: [''],
      certificateValidFrom: [today, Validators.required],
      certificateValidTo: [today, Validators.required],

      equipmentId: [null, Validators.required],
      equipmentName: ['', Validators.required],
      equipmentNo: ['', Validators.required],
      equipmentIdentification: ['', Validators.required],
      manufacturer: ['', Validators.required],
      model: ['', Validators.required],
      serialNo: ['', Validators.required],

      calibrationProcedure: ['', Validators.required],
      environmentalConditions: ['', Validators.required],
      referenceStandards: this.fb.array([]),
      calibrationPoints: this.fb.array([]),
      uncertainty: [''],
      remarks: [''],

      reviewDate: [today, Validators.required],
      reviewedBy: ['', Validators.required],
      reviewStatus: ['approved', Validators.required],
      reviewComments: [''],
      approvedBy: [''],
      approvalDate: ['']
    });
  }

  private checkEditMode(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'create') {
      this.isEditMode = true;
      this.recordId = Number(id);
      this.loadRecord(this.recordId);
    }

    // Update form title based on mode
    const mode = this.route.snapshot.routeConfig?.path?.split('/')[0];
    if (mode === 'details') {
      this.reviewForm.disable();
    }
  }

  private loadRecord(id: number): void {
    this.isLoading = true;
    this.calibrationReviewService.getById(id).subscribe({
      next: (record) => {
        if (record) {
          const formValues = {
            ...record,
            calibrationDate: this.formatDate(record.calibrationDate),
            nextCalibrationDate: record.nextCalibrationDate ? this.formatDate(record.nextCalibrationDate) : null,
            certificateValidFrom: this.formatDate(record.certificateValidFrom),
            certificateValidTo: this.formatDate(record.certificateValidTo),
            issueDate: this.formatDate(record.issueDate),
            reviewDate: this.formatDate(record.reviewDate),
            approvalDate: record.approvalDate ? this.formatDate(record.approvalDate) : null
          };

          // Set current date for standardization
          formValues.date = new Date().toISOString().split('T')[0];

          // Versioning Logic
          if (this.isEditMode) {
            const currentRev = parseInt(record.revNo || '0');
            formValues.revNo = (currentRev + 1).toString().padStart(2, '0');
          }

          // Clear and reload arrays
          const calibrationPointsArray = this.reviewForm.get('calibrationPoints') as FormArray;
          calibrationPointsArray.clear();
          record.calibrationPoints?.forEach((point: any) => {
            calibrationPointsArray.push(this.createCalibrationPoint(point));
          });

          const referenceStandardsArray = this.reviewForm.get('referenceStandards') as FormArray;
          referenceStandardsArray.clear();
          record.referenceStandards?.forEach((standard: string) => {
            referenceStandardsArray.push(this.fb.control(standard));
          });

          this.reviewForm.patchValue(formValues);
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading record:', error);
        this.isLoading = false;
      }
    });
  }

  private formatDate(date: any): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  }

  createCalibrationPoint(point?: any): FormGroup {
    return this.fb.group({
      parameter: [point?.parameter || '', Validators.required],
      nominalValue: [point?.nominalValue || null, Validators.required],
      measuredValue: [point?.measuredValue || null, Validators.required],
      deviation: [point?.deviation || null, Validators.required],
      tolerance: [point?.tolerance || null, Validators.required],
      passFail: [point?.passFail || 'pass', Validators.required],
      uncertainty: [point?.uncertainty || '']
    });
  }

  addCalibrationPoint(): void {
    const calibrationPointsArray = this.reviewForm.get('calibrationPoints') as FormArray;
    calibrationPointsArray.push(this.createCalibrationPoint());
  }

  removeCalibrationPoint(index: number): void {
    const calibrationPointsArray = this.reviewForm.get('calibrationPoints') as FormArray;
    calibrationPointsArray.removeAt(index);
  }

  get calibrationPointsArray(): FormArray {
    return this.reviewForm.get('calibrationPoints') as FormArray;
  }

  addReferenceStandard(): void {
    const referenceStandardsArray = this.reviewForm.get('referenceStandards') as FormArray;
    referenceStandardsArray.push(this.fb.control('', Validators.required));
  }

  removeReferenceStandard(index: number): void {
    const referenceStandardsArray = this.reviewForm.get('referenceStandards') as FormArray;
    referenceStandardsArray.removeAt(index);
  }

  get referenceStandardsArray(): FormArray {
    return this.reviewForm.get('referenceStandards') as FormArray;
  }

  onSubmit(): void {
    this.submitted = true;

    if (this.reviewForm.invalid) {
      return;
    }

    this.isLoading = true;
    const formData = this.reviewForm.value;

    if (this.isEditMode && this.recordId) {
      this.calibrationReviewService.update(this.recordId, formData).subscribe({
        next: (response) => {
          if (response.success) {
            this.router.navigate(['/calibration-review']);
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error updating record:', error);
          this.isLoading = false;
        }
      });
    } else {
      this.calibrationReviewService.create(formData).subscribe({
        next: (response) => {
          if (response.success) {
            this.router.navigate(['/calibration-review']);
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error creating record:', error);
          this.isLoading = false;
        }
      });
    }
  }

  onCancel(): void {
    this.router.navigate(['/calibration-review']);
  }

  toggleSection(section: string): void {
    this.openSections[section] = !this.openSections[section];
  }

  // Form field getters for validation
  get f() {
    return this.reviewForm.controls;
  }

  getTitle(): string {
    const mode = this.route.snapshot.routeConfig?.path?.split('/')[0];
    switch (mode) {
      case 'create': return 'Create Calibration Review';
      case 'edit': return 'Edit Calibration Review';
      case 'details': return 'Calibration Review Details';
      default: return 'Calibration Review';
    }
  }
}
