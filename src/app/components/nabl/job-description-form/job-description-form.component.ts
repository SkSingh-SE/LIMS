import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { JobDescriptionService } from '../../../services/job-description.service';
import { DesignationService } from '../../../services/designation.service';
import { DepartmentService } from '../../../services/department.service';
import { ToastService } from '../../../services/toast.service';
import { SearchableDropdownComponent } from '../../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { Observable } from 'rxjs';
import { QuillModule } from 'ngx-quill';
import { NablFormsHelper } from '../../../utility/nabl-helpers/nabl-forms.helper';
import { CanComponentDeactivate } from '../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../services/unsaved-changes.service';
import { NablSignatureSectionComponent } from '../nabl-signature-section/nabl-signature-section.component';
import { NablHeaderService } from '../../../services/nabl-header.service';
import { FormFieldErrorComponent } from '../../../utility/components/form-field-error/form-field-error.component';
import { FormValidationHelper } from '../../../utility/helper/form-validation.helper';

@Component({
    selector: 'app-job-description-form',

    imports: [CommonModule, ReactiveFormsModule, RouterModule, SearchableDropdownComponent, QuillModule, NablSignatureSectionComponent, FormFieldErrorComponent],
    templateUrl: './job-description-form.component.html',
    styleUrl: './job-description-form.component.css'
})

export class JobDescriptionFormComponent implements CanComponentDeactivate, OnInit {
    saved = false;
    isSubmitting = false;
    jobDescForm!: FormGroup;
    isEditMode: boolean = false;
    isViewMode: boolean = false;
    jobDescId: number = 0;
    formTitle = 'Create Job Description';
    formNumbers: string[] = NablFormsHelper.getFormNumbers();

    // Accordion section states
    openSections: { [key: string]: boolean } = {
        header: true,
        education: true,
        duties: true,
        authorities: true,
        qms: true,
        confidentiality: true,
        approval: true
    };

    quillModules = {
        toolbar: [
            ['bold', 'italic', 'underline', 'strike'],        // toggled buttons
            ['blockquote', 'code-block'],
            [{ 'header': 1 }, { 'header': 2 }],               // custom button values
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            [{ 'script': 'sub' }, { 'script': 'super' }],      // superscript/subscript
            [{ 'indent': '-1' }, { 'indent': '+1' }],          // outdent/indent
            [{ 'direction': 'rtl' }],                         // text direction
            [{ 'size': ['small', false, 'large', 'huge'] }],  // custom dropdown
            [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
            [{ 'color': [] }, { 'background': [] }],          // dropdown with defaults from theme
            [{ 'font': [] }],
            [{ 'align': [] }],
            ['clean']                                         // remove formatting button
        ]
    };

    today = new Date().toISOString().split('T')[0];

    constructor(
        private fb: FormBuilder,
        private router: Router,
        private route: ActivatedRoute,
        private jobDescriptionService: JobDescriptionService,
        private designationService: DesignationService,
        private departmentService: DepartmentService,
        private toastService: ToastService
        , private unsavedChangesService: UnsavedChangesService,
        private nablHeaderService: NablHeaderService) { }

    ngOnInit(): void {
        this.initForm();
        this.nablHeaderService.getFormDefaults('JobDescription').subscribe({
            next: (defaults) => {
                this.jobDescForm.patchValue({ formatNo: defaults.formCode });
            },
            error: () => { }
        });

        this.route.paramMap.subscribe(params => {
            this.jobDescId = Number(params.get('id'));
            if (this.jobDescId > 0) {
                this.loadData();
            }
        });

        const state = history.state as { mode?: string };
        if (state && state.mode === 'view') {
            this.formTitle = 'Job Description Details';
            this.isViewMode = true;
            this.jobDescForm.disable();
        } else if (state && state.mode === 'edit') {
            this.formTitle = 'Edit Job Description';
            this.isEditMode = true;
            this.isViewMode = false;
        } else {
            this.isEditMode = false;
            this.isViewMode = false;
        }
    }

    initForm(): void {

        this.jobDescForm = this.fb.group({
            id: [0],
            formatNo: ['F-3'],
            issueNo: ['01'],
            revNo: ['00'],
            date: [this.today, Validators.required],
            documentNo: ['F-3'],
            designationId: [null, Validators.required],
            designationName: [''],
            departmentId: [null, Validators.required],
            departmentName: [''],
            reportingTo: ['', Validators.required],

            // Section II
            minimumQualification: ['', Validators.required],
            technicalTraining: [''],
            experience: [''],

            // Section III
            principalAccountabilities: ['', Validators.required],

            // Section IV
            authorityStopTesting: [false],
            authorityIssueReports: [false],
            authorityAccessConfidential: [false],
            authorityEquipmentCalibration: [false],

            // Section V
            qmsResponsibilities: [''],

            // Section VI
            confidentialityClause: [this.jobDescriptionService.getDefaultConfidentialityClause()],

            // Section VII
            preparedBy: [''],
            approvedBy: [null],
            reviewedBy: [null],
            approvedDate: [''],
            preparedDate: [this.today],
            reviewedDate: [''],
            employeeAccepted: [false]
        });

        // System-managed fields — always readonly
        this.jobDescForm.get('documentNo')?.disable();
        this.jobDescForm.get('issueNo')?.disable();
        this.jobDescForm.get('revNo')?.disable();
        this.jobDescForm.get('formatNo')?.disable();
    }

    loadData(): void {
        this.jobDescriptionService.getById(this.jobDescId).subscribe({
            next: (data) => {
                if (data) {
                    const formValues = { ...data };

                    // Set current date for standardization
                    formValues.date = NablFormsHelper.formatDateForInput((data as any)?.date || '');


                    this.jobDescForm.patchValue(formValues);
                    // Lock form if not in editable status
                    const status = (data as any).status;
                    if (status && status !== 'Draft' && status !== 'Rejected') {
                        this.jobDescForm.disable();
                        this.isViewMode = true;
                    }
                    // Re-disable system fields (in case form was enabled for Draft/Rejected)
                    this.jobDescForm.get('documentNo')?.disable();
                    this.jobDescForm.get('issueNo')?.disable();
                    this.jobDescForm.get('revNo')?.disable();
                    this.jobDescForm.get('formatNo')?.disable();
                }
            },
            error: (error) => {
                console.error('Error fetching job description:', error);
                this.toastService.show('Error loading job description', 'error');
                this.router.navigate(['/job-description']);
            }
        });
    }

    // Searchable dropdown callbacks
    getDesignations = (term: string, page: number, pageSize: number): Observable<any[]> => {
        return this.designationService.getDesignationDropdown(term, page, pageSize);
    };

    getDepartments = (term: string, page: number, pageSize: number): Observable<any[]> => {
        return this.departmentService.getDepartmentDropdown(term, page, pageSize);
    };

    isFieldInvalid(path: string): boolean {
        return FormValidationHelper.isFieldInvalid(this.jobDescForm, path, this.isSubmitting);
    }
    onDesignationSelected(item: any): void {
        if (!item) {
            this.jobDescForm.patchValue({ designationId: null, designationName: '' });
            return;
        }
        this.jobDescForm.patchValue({
            designationId: item.id,
            designationName: item.name
        });
    }

    onDepartmentSelected(item: any): void {
        if (!item) {
            this.jobDescForm.patchValue({ departmentId: null, departmentName: '' });
            return;
        }
        this.jobDescForm.patchValue({
            departmentId: item.id,
            departmentName: item.name
        });
    }

    toggleSection(section: string): void {
        this.openSections[section] = !this.openSections[section];
    }

    onSubmit(): void {
        if (this.jobDescForm.valid) {
            const formData = this.jobDescForm.getRawValue();
            this.isSubmitting = true;
            formData.preparedDate = this.today;
            if (formData.approvedDate == "" || !formData.approvedDate) {
                formData.approvedDate = null;
            }
            if (formData.reviewedDate == "" || !formData.reviewedDate) {
                formData.reviewedDate = null;
            }
            if (this.isEditMode) {
                formData.id = this.jobDescId;
                this.jobDescriptionService.update(formData).subscribe({
                    next: (response) => {
                        this.isSubmitting = false;
                        this.saved = true;
                        this.toastService.show('Job Description updated successfully', 'success');
                        this.router.navigate(['/job-description']);
                    },
                    error: (error) => {
                        this.isSubmitting = false;
                        console.error('Error updating job description:', error);
                        this.toastService.show('Error updating job description', 'error');
                    }
                });
            } else {
                this.jobDescriptionService.create(formData).subscribe({
                    next: (response) => {
                        this.isSubmitting = false;
                        this.saved = true;
                        this.toastService.show('Job Description created successfully', 'success');
                        this.router.navigate(['/job-description']);
                    },
                    error: (error) => {
                        this.isSubmitting = false;
                        console.error('Error creating job description:', error);
                        this.toastService.show('Error creating job description', 'error');
                    }
                });
            }
        } else {
            this.jobDescForm.markAllAsTouched();
            this.toastService.show('Please fill all required fields', 'warning');
        }
    }

    goBack(): void {
        this.router.navigate(['/job-description']);
    }

    canDeactivate(): Observable<boolean> | boolean {
        if (!this.jobDescForm.dirty || this.saved) return true;
        return this.unsavedChangesService.confirm();
    }

    @HostListener('window:beforeunload', ['$event'])
    onBeforeUnload(event: BeforeUnloadEvent) {
        if (this.jobDescForm?.dirty && !this.saved) {
            event.preventDefault();
            event.returnValue = '';
        }
    }
}
