import { Component, OnInit, signal, HostListener } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { EnvironmentMonitoringService } from '../../services/environment-monitoring.service';
import { QuillModule } from 'ngx-quill';
import { NablFormsHelper } from '../../utility/nabl-helpers/nabl-forms.helper';
import { YearHelper } from '../../utility/helper/year.helper';
import { Observable } from 'rxjs';
import { CanComponentDeactivate } from '../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../services/unsaved-changes.service';
import { SearchableDropdownComponent } from '../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { NablSignatureSectionComponent } from '../nabl/nabl-signature-section/nabl-signature-section.component';
import { NablHeaderService } from '../../services/nabl-header.service';

@Component({
  selector: 'app-environment-monitoring-form',

  imports: [CommonModule, ReactiveFormsModule, RouterModule, QuillModule, SearchableDropdownComponent, NablSignatureSectionComponent],
  templateUrl: './environment-monitoring-form.component.html',
  styleUrl: './environment-monitoring-form.component.css',
  providers: [DatePipe]
})
export class EnvironmentMonitoringFormComponent implements CanComponentDeactivate, OnInit {
  saved = false;
  monitorForm!: FormGroup;
  recordId: number = 0;
  isEditMode = false;
  isViewMode = false;
  formTitle = 'Create Environment Monitoring Record';
  formNumbers: string[] = NablFormsHelper.getFormNumbers();
  yearOptions: number[] = YearHelper.planYears();

  openSections: { [key: string]: boolean } = {
    header: true,
    records: true,
    remarks: true
  };

  quillModules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      ['clean']
    ]
  };

  months = [
    { label: 'January', value: 1 },
    { label: 'February', value: 2 },
    { label: 'March', value: 3 },
    { label: 'April', value: 4 },
    { label: 'May', value: 5 },
    { label: 'June', value: 6 },
    { label: 'July', value: 7 },
    { label: 'August', value: 8 },
    { label: 'September', value: 9 },
    { label: 'October', value: 10 },
    { label: 'November', value: 11 },
    { label: 'December', value: 12 }
  ];

  constructor(
    private fb: FormBuilder,
    private environmentService: EnvironmentMonitoringService,
    private router: Router,
    private route: ActivatedRoute,
    private datePipe: DatePipe,
    private unsavedChangesService: UnsavedChangesService,
    private nablHeaderService: NablHeaderService) { }

  ngOnInit(): void {
    this.initForm();
    this.nablHeaderService.getFormDefaults('EnvironmentMonitoring').subscribe({
      next: (defaults) => {
        this.monitorForm.patchValue({ FormCode: defaults.formCode });
      },
      error: () => { }
    });
    this.route.url.subscribe(url => {
      const path = url[url.length - 2]?.path;
      if (path === 'details') {
        this.isViewMode = true;
        this.formTitle = 'View Environment Monitoring Record';
        this.monitorForm.disable();
      } else if (path === 'edit') {
        this.isEditMode = true;
        this.formTitle = 'Edit Environment Monitoring Record';
      }
    });

    this.route.params.subscribe(params => {
      this.recordId = +params['id'];
      if (this.recordId) {
        this.loadData();
      } else {
        this.generateDailyRecords();
      }
    });

    this.monitorForm.get('monitoringMonth')?.valueChanges.subscribe(() => this.generateDailyRecords());
    this.monitorForm.get('monitoringYear')?.valueChanges.subscribe(() => this.generateDailyRecords());
  }

  initForm(): void {
    const today = new Date().toISOString().split('T')[0];
    this.monitorForm = this.fb.group({
      id: [0],
      FormCode: ['F-12', Validators.required],
      issueNo: ['01', Validators.required],
      revNo: ['00', Validators.required],
      date: [today, Validators.required],
      roomName: ['', Validators.required],
      monitoringMonth: [new Date().getMonth() + 1, Validators.required],
      monitoringYear: [new Date().getFullYear(), Validators.required],
      temperature: ['', Validators.required],
      humidity: ['', Validators.required],
      dailyRecords: this.fb.array([]),
      generalRemarks: [''],
      preparedBy: [''],
      preparedDate: [today],
      reviewedBy: [''],
      reviewedDate: [''],
      approvedBy: [''],
      approvedDate: ['']
    });
  }

  getroomOptions = (term: string, page: number, pageSize: number): Observable<any[]> => {
    // Mock implementation - replace with actual service call
    return this.environmentService.getRoomOptions(term, page, pageSize);
  };

  get dailyRecords(): FormArray {
    return this.monitorForm.get('dailyRecords') as FormArray;
  }

  onRoomSelect(item: any): void {
    this.monitorForm.patchValue({ Id: item?.id || 0 });
    this.monitorForm.patchValue({ roomName: item?.name || '' });
    this.monitorForm.get('labRoomId')?.setValue(item?.id || 0);
    this.monitorForm.get('roomName')?.setValue(item?.name || '');
  }
  generateDailyRecords(): void {
    const month = this.monitorForm.get('monitoringMonth')?.value;
    const year = this.monitorForm.get('monitoringYear')?.value;
    if (!month || !year) return;

    const daysInMonth = new Date(year, month, 0).getDate();
    const currentRecords = this.dailyRecords.length;

    if (daysInMonth > currentRecords) {
      for (let i = currentRecords; i < daysInMonth; i++) {
        this.dailyRecords.push(this.fb.group({
          day: [i + 1],
          temperature: [null],
          humidity: [null],
          observedTime: ['09:00'],
          observedBy: [''],
          remarks: ['']
        }));
      }
    } else if (daysInMonth < currentRecords) {
      for (let i = currentRecords - 1; i >= daysInMonth; i--) {
        this.dailyRecords.removeAt(i);
      }
    }
  }

  loadData(): void {
    this.environmentService.getById(this.recordId).subscribe({
      next: (data: any) => {
        if (data) {
          const formValues = { ...data };

          // Set current date for standardization
          formValues.date = new Date().toISOString().split('T')[0];

          // Versioning Logic
          if (this.isEditMode) {
            const currentRev = parseInt(data.revNo || '0');
            formValues.revNo = (currentRev + 1).toString().padStart(2, '0');
          }

          this.dailyRecords.clear();
          data.dailyRecords?.forEach((record: any) => {
            this.dailyRecords.push(this.fb.group({
              day: [record.day],
              temperature: [record.temperature],
              humidity: [record.humidity],
              observedTime: [record.observedTime],
              observedBy: [record.observedBy],
              remarks: [record.remarks]
            }));
          });
          this.monitorForm.patchValue(formValues);
        }
      },
      error: (err: any) => {
        console.error(err);
      }
    });
  }

  toggleSection(section: string): void {
    this.openSections[section] = !this.openSections[section];
  }

  onSubmit(): void {
    if (this.monitorForm.invalid) {
      this.monitorForm.markAllAsTouched();
      return;
    }

    const formData = this.monitorForm.getRawValue();
    formData.monitoringMonth = Number(formData.monitoringMonth);
    formData.monitoringYear = Number(formData.monitoringYear);
    formData.temperature = Number(formData.temperature);
    formData.humidity = Number(formData.humidity);
    if (this.isEditMode) {
      this.environmentService.update(this.recordId, formData).subscribe({
        next: (res: any) => {
          this.saved = true;
          if (res.success) this.router.navigate(['/environment-monitoring']);
        },
        error: (err: any) => {
          console.error(err);
        }
      });
    } else {
      this.environmentService.create(formData).subscribe({
        next: (res: any) => {
          this.saved = true;
          if (res.success) this.router.navigate(['/environment-monitoring']);
        },
        error: (err: any) => {
          console.error(err);
        }
      });
    }
  }

  canDeactivate(): Observable<boolean> | boolean {
    if (!this.monitorForm.dirty || this.saved) return true;
    return this.unsavedChangesService.confirm();
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent) {
    if (this.monitorForm?.dirty && !this.saved) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
