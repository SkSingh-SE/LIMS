import { CommonModule } from "@angular/common";
import { Component, OnInit, HostListener } from "@angular/core";
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, FormArray, Validators } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { ToastService } from "../../../../services/toast.service";
import { QuestionSetMasterService } from "../../../../services/question-set-master.service";
import { environment } from "../../../../../environments/environment";
import { Observable } from "rxjs";
import { CanComponentDeactivate } from "../../../../guards/unsaved-changes.guard";
import { UnsavedChangesService } from "../../../../services/unsaved-changes.service";
import { NablFormsHelper } from "../../../../utility/nabl-helpers/nabl-forms.helper";
import { SearchableDropdownComponent } from "../../../../utility/components/searchable-dropdown/searchable-dropdown.component";
@Component({
    selector: 'app-question-set-master-form',
    imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, SearchableDropdownComponent],
    templateUrl: './question-set-master-form.component.html',
    styleUrl: './question-set-master-form.component.css'
})
export class QuestionSetMasterFormComponent implements CanComponentDeactivate, OnInit {
    saved = false;
    isSubmitting = false;
    questionSetMasterForm!: FormGroup;
    isViewMode: boolean = false;
    isEditMode: boolean = false;
    recordId: number = 0;
    today: string = new Date().toISOString().split('T')[0];
    constructor(private fb: FormBuilder, private toastService: ToastService, private questionSetMasterService: QuestionSetMasterService, private route: ActivatedRoute, private router: Router,
        private unsavedChangesService: UnsavedChangesService,) { }

    ngOnInit(): void {
        this.route.paramMap.subscribe(params => { this.recordId = Number(params.get('id')); });
        this.initForm();
        const state = history.state as { mode?: string };

        if (state) {
            if (state.mode === 'view') {
                this.isViewMode = true;
            }
            if (state.mode === 'edit') {
                this.isEditMode = true;
            }
        }
        if (this.recordId == 0) {
            this.addQuestion();
            this.questionSetMasterService.getNextQuestionNo().subscribe({
                next: (data) => {
                    this.questionSetMasterForm.patchValue({ questionNo: data.questionNo });
                }
            });
        }
        if (this.recordId > 0) {
            this.loadQuestionSetMaster(this.recordId);
        }


    }
    initForm(): void {
        this.questionSetMasterForm = this.fb.group({
            id: [0],
            questionNo: ["", Validators.required],
            title: [null, Validators.required],
            description: [null],
            date: [this.today, Validators.required],
            questions: this.fb.array([]),
            resultConfigurations: this.fb.array([]),
            remarks: [null]
        });
        this.questionSetMasterForm.get('questionNo')?.disable();
        this.questionSetMasterForm.get('date')?.disable();
        this.addResultConfigurations();
    }
    get questions(): FormArray {
        return this.questionSetMasterForm.get('questions') as FormArray;
    }

    get resultConfigurations(): FormArray {
        return this.questionSetMasterForm.get('resultConfigurations') as FormArray;
    }
    loadQuestionSetMaster(id: number) {
        this.questionSetMasterService.getQuestionSetMasterById(id).subscribe(
            (data) => {

                if (data) {
                    this.questionSetMasterForm.patchValue(data);
                    this.questionSetMasterForm.patchValue({
                        date: NablFormsHelper.formatDateForInput(data.date)
                    });
                    this.questions.clear();

                    data.questions.forEach((question: any) => {
                        this.questions.push(this.fb.group({
                            question: [question.question, Validators.required],
                            optionA: [question.optionA, Validators.required],
                            optionB: [question.optionB, Validators.required],
                            optionC: [question.optionC, Validators.required],
                            optionD: [question.optionD, Validators.required],
                            correctAnswer: [question.correctAnswer, Validators.required]

                        }));
                    });
                    if (this.isViewMode) {
                        this.questionSetMasterForm.disable();
                    }
                }
            }

        );
    }
    addQuestion(): void {

        const questionGroup = this.fb.group({

            question: ['', Validators.required],

            optionA: ['', Validators.required],

            optionB: ['', Validators.required],

            optionC: ['', Validators.required],

            optionD: ['', Validators.required],

            correctAnswer: ['', Validators.required]

        });

        this.questions.push(questionGroup);
        this.updateResultConfiguration();
    }

    setCorrectAnswer(questionIndex: number, answer: string): void {

        const questionGroup = this.questions.at(questionIndex) as FormGroup;

        questionGroup.patchValue({
            correctAnswer: answer
        });

    }
    removeQuestion(index: number): void {

        if (this.questions.length > 1) {
            this.questions.removeAt(index);
            this.updateResultConfiguration();
        }

    }
    addResultConfigurations(): void {

        this.resultConfigurations.clear();

        const configurations = [
            {
                percentage: '90 - 100%',
                interpretation: ''
            },
            {
                percentage: '70 - 89%',
                interpretation: ''
            },
            {
                percentage: '50 - 69%',
                interpretation: ''
            },
            {
                percentage: 'Below 50%',
                interpretation: ''
            }
        ];

        configurations.forEach(config => {

            this.resultConfigurations.push(
                this.fb.group({

                    percentage: [
                        {
                            value: config.percentage,
                            disabled: true
                        }
                    ],

                    marksObtained: [
                        {
                            value: '',
                            disabled: true
                        }
                    ],

                    interpretation: [
                        config.interpretation,
                        Validators.required
                    ]

                })
            );

        });

        this.updateResultConfiguration();
    }

    updateResultConfiguration(): void {

        const totalQuestions = this.questions.length;

        if (totalQuestions <= 0) {

            this.resultConfigurations.controls.forEach(control => {

                control.get('marksObtained')?.setValue('');

            });

            return;
        }


        /*
         * 90% - 100%
         */
        const excellentMin = Math.ceil(totalQuestions * 0.90);

        /*
         * 70% - 89%
         */
        const veryGoodMin = Math.ceil(totalQuestions * 0.70);

        /*
         * 50% - 69%
         */
        const satisfactoryMin = Math.ceil(totalQuestions * 0.50);


        /*
         * Row 1
         * 90 - 100%
         */
        this.resultConfigurations
            .at(0)
            .get('marksObtained')
            ?.setValue(
                `${excellentMin} - ${totalQuestions}`,
                { emitEvent: false }
            );


        /*
         * Row 2
         * 70 - 89%
         */
        this.resultConfigurations
            .at(1)
            .get('marksObtained')
            ?.setValue(
                `${veryGoodMin} - ${excellentMin - 1}`,
                { emitEvent: false }
            );


        /*
         * Row 3
         * 50 - 69%
         */
        this.resultConfigurations
            .at(2)
            .get('marksObtained')
            ?.setValue(
                `${satisfactoryMin} - ${veryGoodMin - 1}`,
                { emitEvent: false }
            );


        /*
         * Row 4
         * Below 50%
         */
        this.resultConfigurations
            .at(3)
            .get('marksObtained')
            ?.setValue(
                `0 - ${satisfactoryMin - 1}`,
                { emitEvent: false }
            );
    }
    onSubmit(): void {

        if (this.questionSetMasterForm.invalid) {
            this.questionSetMasterForm.markAllAsTouched();
            return;
        }

        const rawData = this.questionSetMasterForm.getRawValue();

        const formData = {
            ...rawData,

            questions: (rawData.questions || []).map(
                (question: any, index: number) => ({
                    questionNo: index + 1,
                    question: question.question,
                    optionA: question.optionA,
                    optionB: question.optionB,
                    optionC: question.optionC,
                    optionD: question.optionD,
                    correctAnswer: question.correctAnswer
                })
            )
        };

        console.log('Question Set Master Payload:', formData);


        // ================= UPDATE =================

        if (this.isEditMode) {

            this.questionSetMasterService
                .update(this.recordId, formData)
                .subscribe({

                    next: () => {

                        this.saved = true;

                        this.toastService.show(
                            'Question Set Master updated successfully',
                            'success'
                        );

                        this.router.navigate(['/question-set-master']);
                    },

                    error: (error: any) => {

                        console.error(
                            'Error updating Question Set Master:',
                            error
                        );

                        this.toastService.show(
                            error?.error?.message ||
                            'Failed to update Question Set Master',
                            'error'
                        );
                    }
                });

        }

        // ================= CREATE =================

        else {

            this.questionSetMasterService
                .create(formData)
                .subscribe({

                    next: () => {

                        this.saved = true;

                        this.toastService.show(
                            'Question Set Master created successfully',
                            'success'
                        );

                        this.router.navigate(['/question-set-master']);
                    },

                    error: (error: any) => {

                        console.error(
                            'Error creating Question Set Master:',
                            error
                        );

                        this.toastService.show(
                            error?.error?.message ||
                            'Failed to create Question Set Master',
                            'error'
                        );
                    }
                });
        }
    }
    onCancel() {
        this.router.navigate(['/question-set-master']);
    }
    canDeactivate(): Observable<boolean> | boolean {
        if (!this.questionSetMasterForm.dirty || this.saved) return true;
        return this.unsavedChangesService.confirm();
    }

    @HostListener('window:beforeunload', ['$event'])
    onBeforeUnload(event: BeforeUnloadEvent) {
        if (this.questionSetMasterForm?.dirty && !this.saved) {
            event.preventDefault();
            event.returnValue = '';
        }
    }
}