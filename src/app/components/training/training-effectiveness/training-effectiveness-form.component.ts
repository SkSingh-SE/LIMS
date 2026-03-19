import { Component, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TrainingEffectivenessService } from '../../../services/training-effectiveness.service';
import { QuillModule } from 'ngx-quill';
import { NablFormsHelper } from '../../../utility/nabl-helpers/nabl-forms.helper';

@Component({
  selector: 'app-training-effectiveness-form',

  imports: [CommonModule, ReactiveFormsModule, RouterModule, QuillModule],
  templateUrl: './training-effectiveness-form.component.html',
  styleUrl: './training-effectiveness-form.component.css',
  providers: [DatePipe]
})
export class TrainingEffectivenessFormComponent implements OnInit {
  effectivenessForm!: FormGroup;
  recordId: number = 0;
  isEditMode = false;
  isViewMode = false;
  formTitle = 'Create Training Effectiveness Record';
  formNumbers: string[] = NablFormsHelper.getFormNumbers();

  openSections: { [key: string]: boolean } = {
    employee: true,
    pre: true,
    post: true,
    evaluation: true
  };

  quillModules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      ['clean']
    ]
  };

  evaluationModes = ['Observation', 'Questionnaire', 'Practical Test', 'Retesting'];

  assessmentParameters = [
    'Knowledge Acquisition',
    'Practical Skills',
    'Behavioral Change',
    'Job Performance',
    'Confidence Level',
    'Compliance Understanding'
  ];

  constructor(
    private fb: FormBuilder,
    private trainingEffectivenessService: TrainingEffectivenessService,
    private router: Router,
    private route: ActivatedRoute,
    private datePipe: DatePipe
  ) { }

  ngOnInit(): void {
    this.initForm();
    this.route.url.subscribe(url => {
      const path = url[url.length - 2]?.path;
      if (path === 'details') {
        this.isViewMode = true;
        this.formTitle = 'View Training Effectiveness Record';
        this.effectivenessForm.disable();
      } else if (path === 'edit') {
        this.isEditMode = true;
        this.formTitle = 'Edit Training Effectiveness Record';
      }
    });

    this.route.params.subscribe(params => {
      this.recordId = +params['id'];
      if (this.recordId) {
        this.loadData();
      } else {
        this.addDefaultAssessments();
      }
    });
  }

  initForm(): void {
    this.effectivenessForm = this.fb.group({
      id: [0],
      formatNo: ['F-10', Validators.required],
      issueNo: ['01', Validators.required],
      revNo: ['00', Validators.required],
      date: [new Date().toISOString().split('T')[0], Validators.required],
      employeeName: ['', Validators.required],
      courseTitle: ['', Validators.required],
      trainingDate: ['', Validators.required],
      trainerName: ['', Validators.required],
      organization: [''],
      preAssessment: this.fb.array([]),
      postAssessment: this.fb.array([]),
      evaluationDate: [new Date().toISOString().split('T')[0]],
      evaluationMode: ['Observation'],
      evaluatorName: [''],
      isEffective: [true],
      recommendations: ['']
    });
  }

  get preAssessment(): FormArray {
    return this.effectivenessForm.get('preAssessment') as FormArray;
  }

  get postAssessment(): FormArray {
    return this.effectivenessForm.get('postAssessment') as FormArray;
  }

  addDefaultAssessments(): void {
    if (!this.isViewMode) {
      this.assessmentParameters.slice(0, 3).forEach(param => {
        this.preAssessment.push(this.fb.group({
          criterion: [param, Validators.required],
          score: [5, [Validators.required, Validators.min(1), Validators.max(10)]]
        }));
        this.postAssessment.push(this.fb.group({
          criterion: [param, Validators.required],
          score: [5, [Validators.required, Validators.min(1), Validators.max(10)]]
        }));
      });
    }
  }

  loadData(): void {
    this.trainingEffectivenessService.getById(this.recordId).subscribe({
      next: (data: any) => {
        if (data) {
          this.preAssessment.clear();
          this.postAssessment.clear();

          data.preAssessment?.forEach((assessment: any) => {
            this.preAssessment.push(this.fb.group({
              criterion: [assessment.criterion, Validators.required],
              score: [assessment.score, [Validators.required, Validators.min(1), Validators.max(10)]]
            }));
          });

          data.postAssessment?.forEach((assessment: any) => {
            this.postAssessment.push(this.fb.group({
              criterion: [assessment.criterion, Validators.required],
              score: [assessment.score, [Validators.required, Validators.min(1), Validators.max(10)]]
            }));
          });

          const formValues = { ...data };
          if (data.trainingDate) formValues.trainingDate = this.formatDate(data.trainingDate);
          if (data.evaluationDate) formValues.evaluationDate = this.formatDate(data.evaluationDate);
          if (data.date) formValues.date = this.formatDate(data.date);

          // Handle Versioning on Load
          if (this.isEditMode) {
            // Increment Rev No on Edit
            const currentRev = parseInt(data.revNo || '00');
            formValues.revNo = (currentRev + 1).toString().padStart(2, '0');
            // Keep current date for edit
            formValues.date = new Date().toISOString().split('T')[0];
          }

          this.effectivenessForm.patchValue(formValues);
        }
      },
      error: (err: any) => {
        console.error(err);
      }
    });
  }

  formatDate(dateStr: string | Date): string {
    return this.datePipe.transform(dateStr, 'yyyy-MM-dd') || '';
  }

  toggleSection(section: string): void {
    this.openSections[section] = !this.openSections[section];
  }

  onSubmit(): void {
    if (this.effectivenessForm.invalid) {
      this.effectivenessForm.markAllAsTouched();
      return;
    }

    const formData = this.effectivenessForm.getRawValue();

    if (this.isEditMode) {
      this.trainingEffectivenessService.update(this.recordId, formData).subscribe({
        next: (res: any) => {
          if (res.success) {
            this.router.navigate(['/training-effectiveness']);
          }
        },
        error: (err: any) => {
          console.error(err);
        }
      });
    } else {
      this.trainingEffectivenessService.create(formData).subscribe({
        next: (res: any) => {
          if (res.success) {
            this.router.navigate(['/training-effectiveness']);
          }
        },
        error: (err: any) => {
          console.error(err);
        }
      });
    }
  }

  onCancel(): void {
    this.router.navigate(['/training-effectiveness']);
  }
}
