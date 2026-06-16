import { Component, OnInit, signal, HostListener } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TrainingPlanService } from '../../../services/training-plan.service';
import { ToastService } from '../../../services/toast.service';
import { NablFormsHelper } from '../../../utility/nabl-helpers/nabl-forms.helper';
import { Observable } from 'rxjs';
import { CanComponentDeactivate } from '../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../services/unsaved-changes.service';
import { noWhitespaceValidator } from '../../../utility/validators/custom-validators';
import { FormValidationHelper } from '../../../utility/helper/form-validation.helper';
import { YearHelper } from '../../../utility/helper/year.helper';
import { FormFieldErrorComponent } from '../../../utility/components/form-field-error/form-field-error.component';
import { NablSignatureSectionComponent } from '../../nabl/nabl-signature-section/nabl-signature-section.component';
import { NablHeaderService } from '../../../services/nabl-header.service';

@Component({
  selector: 'app-training-plan-form',

  imports: [CommonModule, ReactiveFormsModule, RouterModule, FormFieldErrorComponent, NablSignatureSectionComponent],
  templateUrl: './training-plan-form.component.html',
  styleUrl: './training-plan-form.component.css',
  providers: [DatePipe]
})
export class TrainingPlanFormComponent implements CanComponentDeactivate, OnInit {
  saved = false;
  submitted = false;
  planForm!: FormGroup;
  planId: number = 0;
  isEditMode = false;
  isViewMode = false;
  formTitle = 'Create Training Plan';
  formNumbers: string[] = NablFormsHelper.getFormNumbers();
  yearOptions: number[] = YearHelper.planYears();

  openSections: { [key: string]: boolean } = {
    header: true,
    courses: true
  };

  approvalStatuses = ['Draft', 'Pending', 'Approved', 'Rejected'];
  months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  agencies = ['Internal', 'External'];

  today = new Date().toISOString().split('T')[0];
  constructor(
    private fb: FormBuilder,
    private trainingPlanService: TrainingPlanService,
    private router: Router,
    private route: ActivatedRoute,
    private datePipe: DatePipe,
    private toastService: ToastService,
    private unsavedChangesService: UnsavedChangesService,
    private nablHeaderService: NablHeaderService) { }

  ngOnInit(): void {
    this.initForm();
    this.nablHeaderService.getFormDefaults('TrainingPlan').subscribe({
      next: (defaults) => {
        this.planForm.patchValue({ formatNo: defaults.formCode });
      },
      error: () => { }
    });
    this.route.url.subscribe(url => {
      const path = url[url.length - 2]?.path;
      if (path === 'details') {
        this.isViewMode = true;
        this.formTitle = 'View Training Plan';
        this.planForm.disable();
      } else if (path === 'edit') {
        this.isEditMode = true;
        this.formTitle = 'Edit Training Plan';
      }
    });

    this.route.params.subscribe(params => {
      this.planId = +params['id'];
      if (this.planId) {
        this.loadData();
      }
    });
  }

  initForm(): void {

    this.planForm = this.fb.group({
      id: [0],
      formatNo: ['F-8'],
      documentNo: ['F-8'],
      issueNo: ['01', Validators.required],
      revNo: ['00', Validators.required],
      date: [this.today, Validators.required],
      issueDate: [this.today, Validators.required],
      revDate: [''],
      planningYear: [new Date().getFullYear(), Validators.required],
      planDate: [this.today, Validators.required],
      totalBudget: [0],
      approvalStatus: ['Draft', Validators.required],
      // courses: this.fb.array([]),
      preparedDate: [this.today],
      preparedBy: [''],
      approvedBy: [null],
      approvedDate: [''],
      reviewedBy: [null],
      reviewedDate: [''],
      trainingTopic: ['', Validators.required],
      provider: [''],
      duration: ['1', Validators.required],
      targetAudience: [''],
      planMonth: [],
      agency: ['Internal'],
      completionRemarks: ['']


    });
  }

  // get courses(): FormArray {
  //   return this.planForm.get('courses') as FormArray;
  // }

  loadData(): void {
    this.trainingPlanService.getById(this.planId).subscribe({
      next: (data) => {
        if (data) {
        
          // data.courses?.forEach(course => {
          //   this.courses.push(this.fb.group({
          //     courseCode: [course.courseCode, Validators.required],
          //     courseName: [course.courseName, Validators.required],
          //     provider: [course.provider],
          //     duration: [course.duration, Validators.required],
          //     targetAudience: [course.targetAudience],
          //     tentativeMonth: [course.tentativeMonth],
          //     agency: [course.agency || 'Internal'],
          //     remarks: [course.remarks]
          //   }));
          // });

          const formValues = { ...data };
          if (data.issueDate) formValues.issueDate = this.formatDate(data.issueDate);
          if (data.revDate) formValues.revDate = this.formatDate(data.revDate);

          // Set current date for standardization
          formValues.date = NablFormsHelper.formatDateForInput(formValues.date);
          formValues.PlannedDate = NablFormsHelper.formatDateForInput(formValues.PlannedDate);
          // Versioning Logic
          if (this.isEditMode) {
            const currentRev = parseInt(data.revNo || '0');
            formValues.revNo = (currentRev + 1).toString().padStart(2, '0');
          }

          this.planForm.patchValue(formValues);
        }
      },
      error: (err: any) => {
        this.toastService.show(err?.error?.message || 'Failed to load training plan', 'error');
      }
    });
  }

  formatDate(dateStr: string | Date): string {
    return this.datePipe.transform(dateStr, 'yyyy-MM-dd') || '';
  }

  // addCourse(): void {
  //   if (!this.isViewMode) {
  //     this.courses.push(this.fb.group({
  //       courseCode: ['', [Validators.required, noWhitespaceValidator()]],
  //       courseName: ['', [Validators.required, noWhitespaceValidator()]],
  //       provider: [''],
  //       duration: [1, Validators.required],
  //       targetAudience: [''],
  //       tentativeMonth: [''],
  //       agency: ['Internal'],
  //       remarks: ['']
  //     }));
  //   }
  // }

  // removeCourse(index: number): void {
  //   if (!this.isViewMode) {
  //     this.courses.removeAt(index);
  //   }
  // }

  isFieldInvalid(path: string): boolean {
    return FormValidationHelper.isFieldInvalid(this.planForm, path, this.submitted);
  }

  onSubmit(): void {
    this.submitted = true;
    FormValidationHelper.markAllTouched(this.planForm);
    if (this.planForm.invalid) {
      this.toastService.show('Please fill all required fields correctly.', 'warning');
      return;
    }
    const formData = this.planForm.getRawValue();
    formData.duration = this.planForm.value.duration.toString(); // Ensure duration is a string for consistency with the model
    formData.preparedDate = this.today; // Set prepared date to today
    formData.PlannedDate = this.today; // Set planned date to today for standardization
    if (formData.approvedDate === '' || !formData.approvedDate) {
      formData.approvedDate = null;
    }
    if (formData.reviewedDate === '' || !formData.reviewedDate) {
      formData.reviewedDate = null;
    }
    if (this.isEditMode) {
      this.trainingPlanService.update(this.planId, formData).subscribe({
        next: (res) => {
          this.saved = true;
          this.toastService.show('Training plan updated successfully', 'success');
          this.router.navigate(['/training-plan']);
        },
        error: (err: any) => {
          this.toastService.show(err?.error?.message || 'Failed to update training plan', 'error');
        }
      });
    } else {
      this.trainingPlanService.create(formData).subscribe({
        next: (res) => {
          this.saved = true;
          this.toastService.show('Training plan created successfully', 'success');
          this.router.navigate(['/training-plan']);
        },
        error: (err: any) => {
          this.toastService.show(err?.error?.message || 'Failed to create training plan', 'error');
        }
      });
    }
  }

  onCancel(): void {
    this.submitted = false;
    this.router.navigate(['/training-plan']);
  }

  toggleSection(section: string): void {
    this.openSections[section] = !this.openSections[section];
  }

  canDeactivate(): Observable<boolean> | boolean {
    if (!this.planForm.dirty || this.saved) return true;
    return this.unsavedChangesService.confirm();
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent) {
    if (this.planForm?.dirty && !this.saved) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
