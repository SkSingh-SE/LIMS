import { Component, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { EmployeeCompetenceService } from '../../../services/employee-competence.service';
import { ToastService } from '../../../services/toast.service';
import { CompetenceEvaluationParameter } from '../../../models/employeeCompetenceModel';

@Component({
    selector: 'app-employee-competence-form',

    imports: [CommonModule, ReactiveFormsModule, RouterModule],
    templateUrl: './employee-competence-form.component.html',
    styleUrl: './employee-competence-form.component.css',
    providers: [DatePipe]
})
export class EmployeeCompetenceFormComponent implements OnInit {
    reportForm!: FormGroup;
    reportId: number = 0;
    isEditMode: boolean = false;
    isViewMode: boolean = false;
    isLoading = signal(false);
    formTitle = 'Create Employee Competence Report';

    ratingOptions = ['Excellent', 'Very Good', 'Good', 'Average', 'Poor'];
    overallRatingOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    constructor(
        private fb: FormBuilder,
        private competenceService: EmployeeCompetenceService,
        private router: Router,
        private route: ActivatedRoute,
        private toastService: ToastService,
        private datePipe: DatePipe
    ) { }

    ngOnInit(): void {
        this.initForm();
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
            evaluationDate: ['', [Validators.required]]
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
        this.isLoading.set(true);
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
                } else {
                    this.toastService.show('Report not found', 'error');
                    this.router.navigate(['/employee/competence']);
                }
                this.isLoading.set(false);
            },
            error: (err) => {
                console.error(err);
                this.toastService.show('Error loading report', 'error');
                this.isLoading.set(false);
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

        this.isLoading.set(true);
        const formData = this.reportForm.getRawValue();

        if (this.isEditMode) {
            this.competenceService.update(this.reportId, formData).subscribe({
                next: (res) => {
                    if (res.success) {
                        this.toastService.show(res.message, 'success');
                        this.router.navigate(['/employee/competence']);
                    } else {
                        this.toastService.show(res.message, 'error');
                    }
                    this.isLoading.set(false);
                },
                error: (err) => {
                    console.error(err);
                    this.toastService.show('Error updating report', 'error');
                    this.isLoading.set(false);
                }
            });
        } else {
            this.competenceService.create(formData).subscribe({
                next: (res) => {
                    if (res.success) {
                        this.toastService.show(res.message, 'success');
                        this.router.navigate(['/employee/competence']);
                    } else {
                        this.toastService.show(res.message, 'error');
                    }
                    this.isLoading.set(false);
                },
                error: (err) => {
                    console.error(err);
                    this.toastService.show('Error creating report', 'error');
                    this.isLoading.set(false);
                }
            });
        }
    }
}
