import { CommonModule } from '@angular/common';
import { Component, OnInit , HostListener } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TpiInspectionService } from '../../../../services/tpi-inspection.service';
import { TPIService } from '../../../../services/tpi.service';
import { SampleInwardService } from '../../../../services/sample-inward.service';
import { ToastService } from '../../../../services/toast.service';
import { SearchableDropdownComponent } from '../../../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { Observable } from 'rxjs';
import { CanComponentDeactivate } from '../../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../../services/unsaved-changes.service';

@Component({
  selector: 'app-tpi-inspection-form',
  imports: [CommonModule, ReactiveFormsModule, RouterModule, SearchableDropdownComponent],
  templateUrl: './tpi-inspection-form.component.html',
  styleUrl: './tpi-inspection-form.component.css',
})
export class TpiInspectionFormComponent implements CanComponentDeactivate, OnInit {
  saved = false;
  inspectionForm!: FormGroup;
  isSubmitting = false;
  isViewMode = false;
  inspectionId: number | null = null;
  inspectionData: any = null;

  stages = [
    { value: 'BeforePreparation', label: 'Before Preparation' },
    { value: 'BeforeTesting', label: 'Before Testing' },
  ];

  getSampleInwardDrop = (searchTerm: string, page: number, pageSize: number) =>
    this.sampleInwardService.getSampleInwardDropdown(searchTerm, page, pageSize);

  getTpiAgencyDrop = (searchTerm: string, page: number, pageSize: number) =>
    this.tpiService.getTPIDropdown(searchTerm, page, pageSize);

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private tpiInspectionService: TpiInspectionService,
    private tpiService: TPIService,
    private sampleInwardService: SampleInwardService,
    private toastService: ToastService
  , private unsavedChangesService: UnsavedChangesService) {}

  ngOnInit(): void {
    this.inspectionForm = this.fb.group({
      sampleInwardID: [null, Validators.required],
      sampleDetailID: [null],
      tpiMasterID: [null, Validators.required],
      stage: ['BeforePreparation', Validators.required],
      scheduledDate: [null],
      remarks: [''],
    });

    this.inspectionId = this.route.snapshot.params['id'] ? +this.route.snapshot.params['id'] : null;

    if (this.inspectionId) {
      this.isViewMode = true;
      this.loadInspection(this.inspectionId);
    }
  }

  loadInspection(id: number): void {
    this.tpiInspectionService.getById(id).subscribe({
      next: (data) => {
        this.inspectionData = data;
        this.inspectionForm.patchValue({
          sampleInwardID: data.sampleInwardId,
          sampleDetailID: data.sampleDetailId,
          tpiMasterID: data.tpiMasterId,
          stage: data.stage,
          scheduledDate: data.scheduledDate ? data.scheduledDate.split('T')[0] : null,
          remarks: data.remarks,
        });
      },
      error: (err) => {
        this.toastService.show('Failed to load inspection details.', 'error');
        console.error(err);
      },
    });
  }

  onSampleInwardSelected(item: any): void {
    this.inspectionForm.patchValue({ sampleInwardID: item?.id ?? null });
  }

  onTpiAgencySelected(item: any): void {
    this.inspectionForm.patchValue({ tpiMasterID: item?.id ?? null });
  }

  onSubmit(): void {
    if (this.inspectionForm.invalid) {
      this.inspectionForm.markAllAsTouched();
      this.toastService.show('Please fill all required fields.', 'warning');
      return;
    }

    this.isSubmitting = true;
    const payload = this.inspectionForm.getRawValue();

    this.tpiInspectionService.create(payload).subscribe({
      next: (response) => {
  this.saved = true;
        this.isSubmitting = false;
        this.toastService.show(response.message || 'TPI Inspection created successfully.', 'success');
        this.router.navigate(['/tpi-inspection']);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.toastService.show(err.error?.message || 'Failed to create inspection.', 'error');
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/tpi-inspection']);
  }

  canDeactivate(): Observable<boolean> | boolean {
    if (!this.inspectionForm.dirty || this.saved) return true;
    return this.unsavedChangesService.confirm();
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent) {
    if (this.inspectionForm?.dirty && !this.saved) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
