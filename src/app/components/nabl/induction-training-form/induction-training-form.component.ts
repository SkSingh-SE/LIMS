import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { InductionTrainingService } from '../../../services/induction-training.service';
import { ToastService } from '../../../services/toast.service';
import { DatePipe } from '@angular/common';
import { QuillModule } from 'ngx-quill';
import { NablFormsHelper } from '../../../utility/nabl-helpers/nabl-forms.helper';

@Component({
    selector: 'app-induction-training-form',

    imports: [CommonModule, ReactiveFormsModule, RouterModule, QuillModule],
    templateUrl: './induction-training-form.component.html',
    styleUrl: './induction-training-form.component.css',
    providers: [DatePipe]
})
export class InductionTrainingFormComponent implements OnInit {
    trainingForm!: FormGroup;
    recordId: number = 0;
    isEditMode: boolean = false;
    isViewMode: boolean = false;
    formTitle = 'Create Induction Training Record';
    formNumbers: string[] = NablFormsHelper.getFormNumbers();

    openSections: { [key: string]: boolean } = {
        employee: true,
        training: true,
        evaluation: true
    };

    quillModules = {
        toolbar: [
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            ['clean']
        ]
    };

    constructor(
        private fb: FormBuilder,
        private trainingService: InductionTrainingService,
        private router: Router,
        private route: ActivatedRoute,
        private toastService: ToastService,
        private datePipe: DatePipe
    ) { }

    ngOnInit(): void {
        this.initForm();
        this.route.url.subscribe(url => {
            const path = url[0]?.path;
            if (path === 'details') {
                this.isViewMode = true;
                this.formTitle = 'View Induction Training Record';
                this.trainingForm.disable();
            } else if (path === 'edit') {
                this.isEditMode = true;
                this.formTitle = 'Edit Induction Training Record';
            }
        });

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
            formatNo: ['F-6', [Validators.required]],
            issueNo: ['01', [Validators.required]],
            revNo: ['00', [Validators.required]],
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

            trainerComments: ['']
        });
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

                    // Handle Versioning on Load
                    if (this.isEditMode) {
                        // Increment Rev No on Edit
                        const currentRev = parseInt(data.revNo || '00');
                        formValues.revNo = (currentRev + 1).toString().padStart(2, '0');
                        // Keep current date for edit
                        formValues.date = new Date().toISOString().split('T')[0];
                    }

                    this.trainingForm.patchValue(formValues);
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

        if (this.isEditMode) {
            this.trainingService.update(this.recordId, formData).subscribe({
                next: (res) => {
                    if (res.success) {
                        this.toastService.show(res.message, 'success');
                        this.router.navigate(['/induction-training']);
                    } else {
                        this.toastService.show(res.message, 'error');
                    }
                },
                error: (err) => {
                    console.error(err);
                    this.toastService.show('Error updating record', 'error');
                }
            });
        } else {
            this.trainingService.create(formData).subscribe({
                next: (res) => {
                    if (res.success) {
                        this.toastService.show(res.message, 'success');
                        this.router.navigate(['/induction-training']);
                    } else {
                        this.toastService.show(res.message, 'error');
                    }
                },
                error: (err) => {
                    console.error(err);
                    this.toastService.show('Error creating record', 'error');
                }
            });
        }
    }
}
