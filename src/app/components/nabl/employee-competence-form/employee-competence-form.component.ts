import { Component, OnInit, signal, HostListener } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { EmployeeCompetenceService } from '../../../services/employee-competence.service';
import { ToastService } from '../../../services/toast.service';
import { CompetenceEvaluationParameter } from '../../../models/employeeCompetenceModel';
import { Observable } from 'rxjs';
import { CanComponentDeactivate } from '../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../services/unsaved-changes.service';
import { NablSignatureSectionComponent } from '../nabl-signature-section/nabl-signature-section.component';
import { NablHeaderService } from '../../../services/nabl-header.service';

@Component({
    selector: 'app-employee-competence-form',

    imports: [CommonModule, ReactiveFormsModule, RouterModule, NablSignatureSectionComponent],
    templateUrl: './employee-competence-form.component.html',
    styleUrl: './employee-competence-form.component.css',
    providers: [DatePipe]
})
export class EmployeeCompetenceFormComponent implements CanComponentDeactivate, OnInit {
    saved = false;
    isSubmitting = false;
    reportForm!: FormGroup;
    reportId: number = 0;
    isEditMode: boolean = false;
    isViewMode: boolean = false;
    formTitle = 'Create Employee Competence Report';

    ratingOptions = ['Excellent', 'Very Good', 'Good', 'Average', 'Poor'];
    overallRatingOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    today = new Date().toISOString().split('T')[0];
    constructor(
        private fb: FormBuilder,
        private competenceService: EmployeeCompetenceService,
        private router: Router,
        private route: ActivatedRoute,
        private toastService: ToastService,
        private datePipe: DatePipe
        , private unsavedChangesService: UnsavedChangesService,
        private nablHeaderService: NablHeaderService) { }

    ngOnInit(): void {
        this.initForm();
        this.nablHeaderService.getFormDefaults('EmployeeCompetence').subscribe({
            next: (defaults) => {
                this.reportForm.patchValue({ formatNo: defaults.formCode });
            },
            error: () => { }
        });
        this.route.url.subscribe(url => {
            const path = url[url.length - 2]?.path; // check edit/details
            if (path === 'details') {
                this.isViewMode = true;
                this.formTitle = 'View Employee Competence Report';
                this.reportForm.disable();
            } else if (path === 'edit') {
                this.isEditMode = true;
                this.formTitle = 'Edit Employee Competence Report';
            }
        });

        this.route.params.subscribe(params => {
            this.reportId = +params['id'];
            if (this.reportId) {
                this.loadData();
            } else {
                // New form - load default parameters
                this.loadDefaultParameters();
            }
        });
    }

    initForm(): void {
        this.reportForm = this.fb.group({
            employeeId: [1, [Validators.required]],
            employeeName: ['', [Validators.required]],
            designationName: ['', [Validators.required]],
            evaluationPeriodFrom: ['', [Validators.required]],
            evaluationPeriodTo: ['', [Validators.required]],
            parameters: this.fb.array([]),
            overallRating: [null, [Validators.required, Validators.min(1), Validators.max(10)]],
            specificTrainingRequired: [''],
            evaluationDoneBy: ['', [Validators.required]],
            evaluationDate: ['', [Validators.required]],
            preparedBy: [''],
            reviewedBy: [null],
            approvedBy: [null],
            preparedDate: [this.today],
            reviewedDate: [''],
            approvedDate: ['']
        });
    }

    get parametersAttr(): FormArray {
        return this.reportForm.get('parameters') as FormArray;
    }

    loadDefaultParameters() {
        const defaultParams = this.competenceService.getDefaultParameters();
        defaultParams.forEach(p => {
            this.parametersAttr.push(this.fb.group({
                name: [p.name, Validators.required],
                rating: [p.rating, Validators.required]
            }));
        });
    }

    loadData(): void {
        this.competenceService.getById(this.reportId).subscribe({
            next: (data) => {
                if (data) {
                    // Setup parameter array based on data
                    this.parametersAttr.clear();
                    data.parameters.forEach((param: CompetenceEvaluationParameter) => {
                        this.parametersAttr.push(this.fb.group({
                            name: [param.name, Validators.required],
                            rating: [param.rating, Validators.required]
                        }));
                    });

                    const formValues = { ...data };
                    if (data.evaluationPeriodFrom) formValues.evaluationPeriodFrom = this.formatDate(data.evaluationPeriodFrom);
                    if (data.evaluationPeriodTo) formValues.evaluationPeriodTo = this.formatDate(data.evaluationPeriodTo);
                    if (data.evaluationDate) formValues.evaluationDate = this.formatDate(data.evaluationDate);

                    this.reportForm.patchValue(formValues);
                    // Lock form if not in editable status
                    const status = (data as any).status;
                    if (status && status !== 'Draft' && status !== 'Rejected') {
                        this.reportForm.disable();
                        this.isViewMode = true;
                    }
                } else {
                    this.toastService.show('Report not found', 'error');
                    this.router.navigate(['/employee/competence']);
                }
            },
            error: (err) => {
                console.error(err);
                this.toastService.show('Error loading report', 'error');
            }
        });
    }

    formatDate(dateStr: string | Date): string {
        return this.datePipe.transform(dateStr, 'yyyy-MM-dd') || '';
    }

    setRating(index: number, rating: string) {
        if (this.isViewMode) return;
        this.parametersAttr.at(index).get('rating')?.setValue(rating);
    }

    onSubmit(): void {
        if (this.reportForm.invalid) {
            this.reportForm.markAllAsTouched();
            this.toastService.show('Please fill all required fields.', 'warning');
            return;
        }

        const formData = this.reportForm.getRawValue();
        this.isSubmitting = true;
        formData.preparedDate = this.today;
        if (formData.approvedDate == "" || !formData.approvedDate) {
            formData.approvedDate = null;
        }
        if (formData.reviewedDate == "" || !formData.reviewedDate) {
            formData.reviewedDate = null;
        }
        if (this.isEditMode) {
            this.competenceService.update(this.reportId, formData).subscribe({
                next: (res) => {
                    this.isSubmitting = false;
                    this.saved = true;
                    this.toastService.show('EmployeeCompetence  Report updated successfully', 'success');
                    this.router.navigate(['/employee/competence']);
                },
                error: (err) => {
                    this.isSubmitting = false;
                    console.error(err);
                    this.toastService.show('Error updating report', 'error');
                }
            });
        } else {
            this.competenceService.create(formData).subscribe({
                next: (res) => {
                    this.isSubmitting = false;
                    this.saved = true;

                    this.toastService.show('EmployeeCompetence Report created successfully', 'success');
                    this.router.navigate(['/employee/competence']);

                },
                error: (err) => {
                    this.isSubmitting = false;
                    console.error(err);
                    this.toastService.show('Error creating report', 'error');
                }
            });
        }
    }

    canDeactivate(): Observable<boolean> | boolean {
        if (!this.reportForm.dirty || this.saved) return true;
        return this.unsavedChangesService.confirm();
    }

    @HostListener('window:beforeunload', ['$event'])
    onBeforeUnload(event: BeforeUnloadEvent) {
        if (this.reportForm?.dirty && !this.saved) {
            event.preventDefault();
            event.returnValue = '';
        }
    }
}
