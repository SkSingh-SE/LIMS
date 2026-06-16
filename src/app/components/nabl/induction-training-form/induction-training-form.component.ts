import { Component, OnInit, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { InductionTrainingService } from '../../../services/induction-training.service';
import { ToastService } from '../../../services/toast.service';
import { DatePipe } from '@angular/common';
import { QuillModule } from 'ngx-quill';
import { NablFormsHelper } from '../../../utility/nabl-helpers/nabl-forms.helper';
import { Observable } from 'rxjs';
import { CanComponentDeactivate } from '../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../services/unsaved-changes.service';
import { NablSignatureSectionComponent } from '../nabl-signature-section/nabl-signature-section.component';
import { NablHeaderService } from '../../../services/nabl-header.service';

@Component({
    selector: 'app-induction-training-form',

    imports: [CommonModule, ReactiveFormsModule, RouterModule, QuillModule, NablSignatureSectionComponent],
    templateUrl: './induction-training-form.component.html',
    styleUrl: './induction-training-form.component.css',
    providers: [DatePipe]
})
export class InductionTrainingFormComponent implements CanComponentDeactivate, OnInit {
    saved = false;
    isSubmitting = false;
    trainingForm!: FormGroup;
    recordId: number = 0;
    isEditMode: boolean = false;
    isViewMode: boolean = false;
    formTitle = 'Create Induction Training Record';
    formNumbers: string[] = NablFormsHelper.getFormNumbers();

    openSections: { [key: string]: boolean } = {
        employee: true,
        training: true,
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
    today = new Date().toISOString().split('T')[0];
    constructor(
        private fb: FormBuilder,
        private trainingService: InductionTrainingService,
        private router: Router,
        private route: ActivatedRoute,
        private toastService: ToastService,
        private datePipe: DatePipe
        , private unsavedChangesService: UnsavedChangesService,
        private nablHeaderService: NablHeaderService) { }

    ngOnInit(): void {
        this.initForm();
        this.nablHeaderService.getFormDefaults('InductionTraining').subscribe({
            next: (defaults) => {
                this.trainingForm.patchValue({ formatNo: defaults.formCode });
            },
            error: () => { }
        });

        // this.route.url.subscribe(url => {
        //     const path = url[0]?.path;
        //     if (path === 'details') {
        //         this.isViewMode = true;
        //         this.formTitle = 'View Induction Training Record';
        //         this.trainingForm.disable();
        //     } else if (path === 'edit') {
        //         this.isEditMode = true;
        //         this.formTitle = 'Edit Induction Training Record';
        //     }
        // });

        const state = history.state as { mode?: string };
        if(state && state.mode === 'view') {
            this.isViewMode = true;
            this.formTitle = 'View Induction Training Record';
            this.trainingForm.disable();
        } else if(state && state.mode === 'edit') {
            this.isEditMode = true;
            this.formTitle = 'Edit Induction Training Record';
            this.isViewMode = false;
        }
        else{
            this.isEditMode = false;
            this.isViewMode = false;
        }

        this.route.params.subscribe(params => {
            this.recordId = +params['id'];
            if (this.recordId) {
                this.loadData();
            }
        });
    }

    initForm(): void {
        this.trainingForm = this.fb.group({
            id: [0],
            formatNo: ['F-6'],
            issueNo: ['01'],
            revNo: ['00'],
            date: [new Date().toISOString().split('T')[0], [Validators.required]],
            employeeName: ['', [Validators.required]],
            qualification: ['', [Validators.required]],
            dateOfJoining: ['', [Validators.required]],
            position: ['', [Validators.required]],

            trainingDate: ['', [Validators.required]],
            trainerName: ['', [Validators.required]],
            trainerDesignation: ['', [Validators.required]],
            sampleName: ['', [Validators.required]],
            sampleRefNo: ['', [Validators.required]],
            parameter: ['', [Validators.required]],
            testMethodSop: ['', [Validators.required]],

            evaluationDate: ['', [Validators.required]],
            evaluationMode: ['Retesting', [Validators.required]],
            evalParameter: ['', [Validators.required]],
            evalTestMethodSop: ['', [Validators.required]],

            observedValue1: [''],
            observedValue2: [''],
            observedValueAverage: [''],
            originalValue: [''],
            remarks: [''],
            performanceLevel: [''],

            trainerComments: [''],
            preparedBy: [''],
            reviewedBy: [null],
            approvedBy: [null],
            preparedDate: [this.today],
            reviewedDate: [''],
            approvedDate: ['']
        });

        // System-managed fields — always readonly
        this.trainingForm.get('issueNo')?.disable();
        this.trainingForm.get('revNo')?.disable();
        this.trainingForm.get('formatNo')?.disable();
    }

    loadData(): void {
        this.trainingService.getById(this.recordId).subscribe({
            next: (data) => {
                if (data) {
                    const formValues = { ...data };
                    if (data.dateOfJoining) formValues.dateOfJoining = this.formatDate(data.dateOfJoining);
                    if (data.trainingDate) formValues.trainingDate = this.formatDate(data.trainingDate);
                    if (data.evaluationDate) formValues.evaluationDate = this.formatDate(data.evaluationDate);
                    if (data.date) formValues.date = this.formatDate(data.date);


                    this.trainingForm.patchValue(formValues);
                    // Lock form if not in editable status
                    const status = (data as any).status;
                    if (status && status !== 'Draft' && status !== 'Rejected') {
                        this.trainingForm.disable();
                        this.isViewMode = true;
                    }
                    // Re-disable system fields (in case form was enabled for Draft/Rejected)
                    this.trainingForm.get('issueNo')?.disable();
                    this.trainingForm.get('revNo')?.disable();
                    this.trainingForm.get('formatNo')?.disable();
                } else {
                    this.toastService.show('Record not found', 'error');
                    this.router.navigate(['/induction-training']);
                }
            },
            error: (err) => {
                console.error(err);
                this.toastService.show('Error loading record', 'error');
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
        if (this.trainingForm.invalid) {
            this.trainingForm.markAllAsTouched();
            this.toastService.show('Please fill all required fields.', 'warning');
            return;
        }

        const formData = this.trainingForm.getRawValue();
        this.isSubmitting = true;
        formData.preparedDate = this.today; // Set prepared date on submit
        if (formData.reviewedDate == "" || !formData.reviewedDate) {
            formData.reviewedDate = null;
        }
        if (formData.approvedDate == "" || !formData.approvedDate) {
            formData.approvedDate = null;
        }
        if (this.isEditMode) {
            this.trainingService.update(this.recordId, formData).subscribe({
                next: (res) => {
                    this.isSubmitting = false;
                    this.saved = true;
                    this.toastService.show('Induction Training record updated successfully', 'success');
                    this.router.navigate(['/induction-training']);
                },
                error: (err) => {
                    this.isSubmitting = false;
                    console.error(err);
                    this.toastService.show('Error updating record', 'error');
                }
            });
        } else {
            this.trainingService.create(formData).subscribe({
                next: (res) => {
                    this.isSubmitting = false;
                    this.saved = true;
                    this.toastService.show('Induction Training record created successfully', 'success');
                    this.router.navigate(['/induction-training']);
                },
                error: (err) => {
                    this.isSubmitting = false;
                    console.error(err);
                    this.toastService.show('Error creating record', 'error');
                }
            });
        }
    }

    canDeactivate(): Observable<boolean> | boolean {
        if (!this.trainingForm.dirty || this.saved) return true;
        return this.unsavedChangesService.confirm();
    }

    @HostListener('window:beforeunload', ['$event'])
    onBeforeUnload(event: BeforeUnloadEvent) {
        if (this.trainingForm?.dirty && !this.saved) {
            event.preventDefault();
            event.returnValue = '';
        }
    }
}
