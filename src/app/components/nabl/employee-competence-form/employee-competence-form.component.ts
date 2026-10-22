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
import { SearchableDropdownComponent } from '../../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { QualityControlPlanService } from '../../../services/quality-control-plan.service';
import { DesignationService } from '../../../services/designation.service';
import { EmployeeService } from '../../../services/employee.service';
import { NablFormsHelper } from '../../../utility/nabl-helpers/nabl-forms.helper';
@Component({
    selector: 'app-employee-competence-form',

    imports: [CommonModule, ReactiveFormsModule, RouterModule, NablSignatureSectionComponent, SearchableDropdownComponent],
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
    formNumbers: string[] = NablFormsHelper.getFormNumbers();

    openSections: { [key: string]: boolean } = {
        header: true,
        employeeInfo: true,
        evaluationPeriod: true,
        overallAssessment: true,
        footer: true
    };
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
        private nablHeaderService: NablHeaderService,
        private designationService: DesignationService,
        private employeeService: EmployeeService,
    ) { }

    ngOnInit(): void {

        this.initForm();

        // =========================
        // FORM DEFAULTS
        // =========================
        this.nablHeaderService
            .getFormDefaults('EmployeeCompetence')
            .subscribe({
                next: (defaults) => {
                    this.reportForm.patchValue({
                        formatNo: defaults.formCode
                    });
                },
                error: () => { }
            });

        // =========================
        // ROUTE MODE
        // =========================
        this.route.url.subscribe(url => {

            const path = url[url.length - 2]?.path;

            if (path === 'details') {

                this.isViewMode = true;
                this.isEditMode = false;

                this.formTitle = 'View Employee Competence Report';
                this.reportForm.disable();

            }
            else if (path === 'edit') {

                this.isEditMode = true;
                this.isViewMode = false;

                this.formTitle = 'Edit Employee Competence Report';

            }
            else {

                // Create mode
                this.isEditMode = false;
                this.isViewMode = false;

                this.formTitle = 'Create Employee Competence Report';
            }
        });

        // =========================
        // ROUTE PARAMETER
        // =========================
        this.route.params.subscribe(params => {

            this.reportId = +params['id'];

            // =========================
            // EDIT / VIEW
            // =========================
            if (this.reportId) {

                this.loadData();

                return;
            }

            // =========================
            // CREATE
            // =========================
            const state = history.state as {
                employeeId?: number;
            };

            if (state?.employeeId) {

                // Employee List → Skill Matrix Create flow
                this.loadEmployeeFromList(state.employeeId);
                this.loadDefaultParameters();

            }
            else {

                // Normal Create
                this.loadDefaultParameters();
            }
        });
    }

    initForm(): void {
        this.reportForm = this.fb.group({
            formatNo: ['F-7A'],
            issueNo: ['00'],
            date: [this.today, Validators.required],
            revNo: ['01'],
            employeeId: [null, [Validators.required]],
            employeeName: [null],
            designationName: [null],
            // designationId: ['', [Validators.required]],
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
        this.reportForm.get('issueNo')?.disable();
        this.reportForm.get('revNo')?.disable();
        this.reportForm.get('formatNo')?.disable();
        this.reportForm.get('date')?.disable();
        this.reportForm.get('designationName')?.disable();
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
    toggleSection(section: string): void {
        this.openSections[section] = !this.openSections[section];
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
                    if (data.date) formValues.date = this.formatDate(data.date);
                    if (data.evaluationPeriodTo) formValues.evaluationPeriodTo = this.formatDate(data.evaluationPeriodTo);
                    if (data.evaluationDate) formValues.evaluationDate = this.formatDate(data.evaluationDate);

                    this.reportForm.patchValue(formValues);
                    if (data.employeeId) {
                        this.loadEmployeeFromList(data.employeeId);
                    }
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

    getEmployees = (
        term: string,
        page: number,
        pageSize: number
    ): Observable<any[]> => {

        return this.competenceService
            .getEmployeesForCompetenceReportDropdown(
                term,
                page,
                pageSize,
                this.isEditMode ? this.reportId : null
            );
    }
    onEmployeeSelected(item: any) {
        if (!item) { this.reportForm.patchValue({ employeeId: null }); return; }
        this.reportForm.patchValue({ employeeId: item.id, employeeName: item.name });
        const employeeId = item.id;
        this.competenceService.getEmployeesDesignation(employeeId).subscribe({
            next: (data) => {
                console.log('Designation Response:', data);

                this.reportForm.patchValue({
                    designationName: data
                });
            },

            error: (error) => {
                console.error('Designation API Error:', error);
            },

            complete: () => {
                console.log('Designation API Completed');
            }
        });
    }
    // getDesignations = (term: string, page: number, pageSize: number): Observable<any[]> => {
    //     return this.designationService.getDesignationDropdown(term, page, pageSize);
    // }
    // onDesignationSelected(item: any) {
    //     if (!item) { this.reportForm.patchValue({ requestById: null }); return; }
    //     this.reportForm.patchValue({ designationId: item.id, designationName: item.name });
    // }
    setRating(index: number, rating: string) {
        if (this.isViewMode) return;
        this.parametersAttr.at(index).get('rating')?.setValue(rating);
    }

    private loadEmployeeFromList(employeeId: number): void {

        this.employeeService.getEmployeeById(employeeId).subscribe({
            next: (employee: any) => {

                if (!employee) {
                    return;
                }

                const item = {
                    id: employee.id,
                    name: employee.name
                };

                // Existing employee-change flow
                this.onEmployeeSelected(item);
            },

            error: (error: any) => {

                console.error('Failed to load employee:', error);

                this.toastService.show(
                    error?.error?.message || 'Failed to load employee',
                    'error'
                );
            }
        });
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
    goBack(): void {
        this.router.navigate(['/employee/competence']);
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
