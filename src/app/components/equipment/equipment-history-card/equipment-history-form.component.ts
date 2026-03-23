import { Component, OnInit , HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EquipmentHistoryService } from '../../../services/equipment-history.service';
import { ToastService } from '../../../services/toast.service';
import { QuillModule } from 'ngx-quill';
import { NablFormsHelper } from '../../../utility/nabl-helpers/nabl-forms.helper';
import { Observable } from 'rxjs';
import { CanComponentDeactivate } from '../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../services/unsaved-changes.service';

@Component({
  selector: 'app-equipment-history-form',

  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, QuillModule],
  templateUrl: './equipment-history-form.component.html',
  styleUrl: './equipment-history-form.component.css'
})
export class EquipmentHistoryFormComponent implements CanComponentDeactivate, OnInit {
  saved = false;
  historyForm!: FormGroup;
  isEditMode = false;
  recordId: number | null = null;
  submitted = false;
  formNumbers: string[] = NablFormsHelper.getFormNumbers();

  openSections: { [key: string]: boolean } = {
    equipment: true,
    record: true,
    details: true
  };

  quillModules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      ['clean']
    ]
  };

  recordTypes = [
    { value: 'calibration', label: 'Calibration' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'repair', label: 'Repair' },
    { value: 'modification', label: 'Modification' },
    { value: 'verification', label: 'Verification' }
  ];

  statusOptions = [
    { value: 'completed', label: 'Completed' },
    { value: 'pending', label: 'Pending' },
    { value: 'in-progress', label: 'In Progress' }
  ];

  constructor(
    private fb: FormBuilder,
    private equipmentHistoryService: EquipmentHistoryService,
    private route: ActivatedRoute,
    private router: Router,
    private toastService: ToastService,
    private unsavedChangesService: UnsavedChangesService) { }

  ngOnInit(): void {
    this.initializeForm();
    this.checkEditMode();
  }

  private initializeForm(): void {
    const today = new Date().toISOString().split('T')[0];
    this.historyForm = this.fb.group({
      id: [0],
      formatNo: ['F-14', Validators.required],
      issueNo: ['01', Validators.required],
      revNo: ['00', Validators.required],
      date: [today, Validators.required],
      equipmentId: [null, Validators.required],
      equipmentName: ['', Validators.required],
      equipmentNo: ['', Validators.required],
      recordType: ['calibration', Validators.required],
      recordDate: [today, Validators.required],
      performedBy: ['', Validators.required],
      agency: [''],
      certificateNo: [''],
      nextDueDate: [''],
      description: ['', Validators.required],
      observations: [''],
      actionsTaken: [''],
      cost: [null, [Validators.min(0)]],
      status: ['completed', Validators.required],
      documents: [[]]
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
      this.historyForm.disable();
    }
  }

  private loadRecord(id: number): void {
    this.equipmentHistoryService.getById(id).subscribe({
      next: (record) => {
        if (record) {
          const formValues = {
            ...record,
            recordDate: this.formatDate(record.recordDate),
            nextDueDate: record.nextDueDate ? this.formatDate(record.nextDueDate) : null
          };

          // Set current date for standardization
          formValues.date = new Date().toISOString().split('T')[0];

          // Versioning Logic
          if (this.isEditMode) {
            const currentRev = parseInt(record.revNo || '0');
            formValues.revNo = (currentRev + 1).toString().padStart(2, '0');
          }

          this.historyForm.patchValue(formValues);
        }
      },
      error: (error) => {
        console.error('Error loading record:', error);
      }
    });
  }

  private formatDate(date: any): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  }

  onSubmit(): void {
    this.submitted = true;

    if (this.historyForm.invalid) {
      return;
    }

    const formData = this.historyForm.value;

    if (this.isEditMode && this.recordId) {
      this.equipmentHistoryService.update(this.recordId, formData).subscribe({
        next: (response) => {
          this.saved = true;
          if (response.success) {
            this.router.navigate(['/equipment-history-card']);
          }
        },
        error: (error) => {
          console.error('Error updating record:', error);
          this.toastService.show(error.error?.message || 'Error updating record', 'error');
        }
      });
    } else {
      this.equipmentHistoryService.create(formData).subscribe({
        next: (response) => {
          this.saved = true;
          if (response.success) {
            this.router.navigate(['/equipment-history-card']);
          }
        },
        error: (error) => {
          console.error('Error creating record:', error);
          this.toastService.show(error.error?.message || 'Error creating record', 'error');
        }
      });
    }
  }

  onCancel(): void {
    this.router.navigate(['/equipment-history-card']);
  }

  toggleSection(section: string): void {
    this.openSections[section] = !this.openSections[section];
  }

  // Form field getters for validation
  get f() {
    return this.historyForm.controls;
  }

  getTitle(): string {
    const mode = this.route.snapshot.routeConfig?.path?.split('/')[0];
    switch (mode) {
      case 'create': return 'Create Equipment History Record';
      case 'edit': return 'Edit Equipment History Record';
      case 'details': return 'Equipment History Record Details';
      default: return 'Equipment History Record';
    }
  }

  onRecordTypeChange(): void {
    const recordType = this.historyForm.get('recordType')?.value;
    const agencyControl = this.historyForm.get('agency');
    const certificateControl = this.historyForm.get('certificateNo');
    const nextDueControl = this.historyForm.get('nextDueDate');

    if (recordType === 'calibration') {
      agencyControl?.setValidators(Validators.required);
      certificateControl?.setValidators(Validators.required);
      nextDueControl?.setValidators(Validators.required);
    } else {
      agencyControl?.clearValidators();
      certificateControl?.clearValidators();
      nextDueControl?.clearValidators();
    }

    agencyControl?.updateValueAndValidity();
    certificateControl?.updateValueAndValidity();
    nextDueControl?.updateValueAndValidity();
  }

  canDeactivate(): Observable<boolean> | boolean {
    if (!this.historyForm.dirty || this.saved) return true;
    return this.unsavedChangesService.confirm();
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent) {
    if (this.historyForm?.dirty && !this.saved) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
