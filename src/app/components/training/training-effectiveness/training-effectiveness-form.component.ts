import { Component, OnInit, signal, HostListener } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TrainingEffectivenessService } from '../../../services/training-effectiveness.service';
import { ToastService } from '../../../services/toast.service';
import { QuillModule } from 'ngx-quill';
import { NablFormsHelper } from '../../../utility/nabl-helpers/nabl-forms.helper';
import { Observable } from 'rxjs';
import { CanComponentDeactivate } from '../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../services/unsaved-changes.service';
import { MyEvaluationsService } from '../../../services/my-evaluations.service';

@Component({
  selector: 'app-training-effectiveness-form',

  imports: [CommonModule, ReactiveFormsModule, RouterModule, QuillModule],
  templateUrl: './training-effectiveness-form.component.html',
  styleUrl: './training-effectiveness-form.component.css',
  providers: [DatePipe]
})
export class TrainingEffectivenessFormComponent implements CanComponentDeactivate, OnInit {
  saved = false;
  effectivenessForm!: FormGroup;
  recordId: number = 0;
  isEditMode = false;
  isViewMode = false;
  formTitle = 'Training Effectiveness Record';
  formNumbers: string[] = NablFormsHelper.getFormNumbers();
  attendanceId: number | null = null;
  trainingPlanId: number | null = null;
  questionSetId: number | null = null;
  participantName: string | null = null;
  participantId: number | null = null;
  status: string | null = null;
  designation: string | null = null;
  openSections: { [key: string]: boolean } = {
    participant: true,
    training: true,
    questions: true,
    result: true,
    header: true,
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
  today = new Date().toISOString().split('T')[0];
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
    private myEvaluationService: MyEvaluationsService,
    private router: Router,
    private route: ActivatedRoute,
    private datePipe: DatePipe,
    private toastService: ToastService,
    private unsavedChangesService: UnsavedChangesService) { }

  ngOnInit(): void {

    this.initForm();

    // -----------------------------------------
    // View / Edit / Create Mode
    // -----------------------------------------

    // -----------------------------------------
    // Route ID
    // -----------------------------------------
    this.route.params.subscribe(params => {

      this.recordId = params['id']
        ? Number(params['id'])
        : 0;

    });
    this.route.url.subscribe(url => {

      const path = url[url.length - 1]?.path;

      if (path === 'details' || path === 'view') {

        this.isViewMode = true;
        this.formTitle = 'Training Effectiveness Record';

        this.effectivenessForm.disable();

      } else if (path === 'edit') {

        this.isEditMode = true;
        this.formTitle = ' Training Effectiveness Record';
      }
    });


    // -----------------------------------------
    // Query Parameters
    // -----------------------------------------
    this.route.queryParams.subscribe(params => {

      this.trainingPlanId = params['trainingPlanId']
        ? Number(params['trainingPlanId'])
        : null;

      this.attendanceId = params['attendanceId']
        ? Number(params['attendanceId'])
        : null;
      this.participantId = params['participantId']
        ? Number(params['participantId'])
        : null;

      this.questionSetId = params['questionSetId']
        ? Number(params['questionSetId'])
        : null;

      this.participantName = params['participantName']
        ? params['participantName']
        : null;

      this.designation = params['designation']
        ? params['designation']
        : null;

      this.status = params['status']
        ? params['status']
        : null;


      // -----------------------------------------
      // Patch Context IDs
      // -----------------------------------------
      this.effectivenessForm.patchValue({

        trainingPlanId: this.trainingPlanId,

        attendanceId: this.attendanceId,

        questionSetId: this.questionSetId,
        participantId: this.participantId,

        participantName: this.participantName,

        designation: this.designation,

        status: this.status

      });


      // -----------------------------------------
      // Load details from Backend
      // -----------------------------------------
      if (this.attendanceId &&
        this.trainingPlanId &&
        this.questionSetId) {

        this.loadEffectivenessContext();

      } else if (this.recordId) {
        this.isViewMode = true;
        this.loadData();

      }

    });



  }

  initForm(): void {
    this.effectivenessForm = this.fb.group({

      id: [0],
      formatNo: ['F-10', Validators.required],
      issueNo: ['01', Validators.required],
      revNo: ['00', Validators.required],
      date: [this.today],

      attendanceId: [null],
      participantId: [null],
      trainingPlanId: [null],
      questionSetId: [null],

      trainingPlan: ['', Validators.required],
      trainingDate: ['', Validators.required],
      planningYear: [''],
      month: [''],
      agency: [''],
      providerName: [''],
      trainingVenue: [''],
      facultyName: [''],
      trainingDatetime: [''],
      questionSet: [''],
      participantName: ['', Validators.required],
      designation: ['', Validators.required],
      status: ['Present'],
      result: [],
      totalQuestions: [],
      correctAnswers: [],
      evaluationDate: [this.today],
      questions: this.fb.array([]),
    });
    this.effectivenessForm.get('date')?.disable();
    this.effectivenessForm.get('evaluationDate')?.disable();
    this.effectivenessForm.get('formatNo')?.disable();
  }

  get questions(): FormArray {
    return this.effectivenessForm.get('questions') as FormArray;
  }

  loadEffectivenessContext(): void {

    if (
      !this.attendanceId ||
      !this.trainingPlanId ||
      !this.questionSetId
    ) {
      return;
    }
    this.trainingEffectivenessService.getEvaluationContext(
      this.attendanceId,
      this.trainingPlanId,
      this.questionSetId
    ).subscribe({

      next: (res: any) => {

        console.log(
          'Training Effectiveness Context:',
          res
        );

        // Training Plan details
        this.effectivenessForm.patchValue({

          trainingPlanId: this.trainingPlanId,

          attendanceId: this.attendanceId,

          questionSetId: this.questionSetId,

          trainingPlan: res?.trainingPlan,

          planningYear: res?.planningYear,

          month: res?.month,

          agency: res.agency,

          providerName: res?.providerName,

          questionSet: res.questionSet,

          trainingVenue: res?.trainingVenue,

          facultyName: res?.facultyName,

          trainingDatetime: res?.trainingDatetime,
          status: "Present",
          trainingDate: NablFormsHelper.formatDateForInput(res?.trainingDate),

        });


        // Questions from QuestionSetJson
        if (res.questions && Array.isArray(res.questions)) {

          this.loadQuestions(res.questions);

        }

      },

      error: (error: any) => {

        console.error(
          'Error loading effectiveness context:',
          error
        );

        this.toastService.show(
          error?.error?.message ||
          'Failed to load training effectiveness details',
          'error'
        );

      }

    });
  }
  loadQuestions(questionList: any[]): void {

    this.questions.clear();

    if (!questionList || questionList.length === 0) {
      return;
    }

    questionList.forEach((question: any) => {

      this.questions.push(
        this.createQuestion(question)
      );

    });
  }
  createQuestion(question: any): FormGroup {

    return this.fb.group({

      questionNo: [question.questionNo],

      question: [question.question],

      optionA: [question.optionA],

      optionB: [question.optionB],

      optionC: [question.optionC],

      optionD: [question.optionD],

      // Participant ka answer
      selectedAnswer: [null, Validators.required]

    });
  }
  loadData(): void {
    this.trainingEffectivenessService.getById(this.recordId).subscribe({
      next: (data: any) => {
        if (data) {
          this.questions.clear();
          data.questions.forEach((question: any) => {
            this.questions.push(this.fb.group({
              question: [question.question, Validators.required],
              optionA: [question.optionA, Validators.required],
              optionB: [question.optionB, Validators.required],
              optionC: [question.optionC, Validators.required],
              optionD: [question.optionD, Validators.required],
              selectedAnswer: [question.selectedAnswer, Validators.required]

            }));
          });
          this.effectivenessForm.disable();

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
        this.toastService.show(err?.error?.message || 'Failed to load training effectiveness record', 'error');
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
      this.myEvaluationService.update(this.recordId, formData).subscribe({
        next: (res: any) => {
          this.saved = true;
          if (res.success) {
            this.router.navigate(['/my-evaluations']);
          }
        },
        error: (err: any) => {
          this.toastService.show(err?.error?.message || 'Failed to update training effectiveness record', 'error');
        }
      });
    } else {
      this.myEvaluationService.create(formData).subscribe({
        next: (response: any) => {
          this.saved = true;
          this.toastService.show('my evaluations created successfully', 'success');
          this.router.navigate(['/my-evaluations']);
        },
        error: (err: any) => {
          this.toastService.show(err?.error?.message || 'Failed to create training effectiveness record', 'error');
        }
      });
    }
  }

  onCancel(): void {
    this.router.navigate(['/my-evaluations']);
  }

  canDeactivate(): Observable<boolean> | boolean {
    if (!this.effectivenessForm.dirty || this.saved) return true;
    return this.unsavedChangesService.confirm();
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent) {
    if (this.effectivenessForm?.dirty && !this.saved) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
