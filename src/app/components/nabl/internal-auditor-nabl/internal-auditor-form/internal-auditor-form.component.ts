import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { InternalAuditorService } from '../../../../services/internal-auditor.service';
import { ToastService } from '../../../../services/toast.service';
import { NablFormsHelper } from '../../../../utility/nabl-helpers/nabl-forms.helper';
import { Observable, of } from 'rxjs';
import { CanComponentDeactivate } from '../../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../../services/unsaved-changes.service';
import { NablSignatureSectionComponent } from '../../nabl-signature-section/nabl-signature-section.component';
import { NablHeaderService } from '../../../../services/nabl-header.service';
import { SearchableDropdownComponent } from '../../../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { DepartmentService } from '../../../../services/department.service';
import { QualityControlPlanService } from "../../../../services/quality-control-plan.service";
import { MultiSelectDropdownComponent } from "../../../../utility/components/multi-select-dropdown/multi-select-dropdown.component";
@Component({
    selector: 'app-internal-auditor-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterModule, NablSignatureSectionComponent, SearchableDropdownComponent, MultiSelectDropdownComponent],
    templateUrl: './internal-auditor-form.component.html',
    styleUrl: './internal-auditor-form.component.css'
})
export class InternalAuditorFormComponent implements CanComponentDeactivate, OnInit {
    saved = false;
    auditorForm!: FormGroup;
    isEditMode = false;
    isViewMode = false;
    recordId: number = 0;
    formTitle = 'Add Trained Auditor';
    formNumbers = NablFormsHelper.getFormNumbers();

    openSections: { [key: string]: boolean } = {
        header: true,
        auditorDetails: true,
        auditorCompentency: true,
        authorizationDetails: true,
        auditorTraining: true,
    };
    isoClauseOptions = [
        { id: 1, name: '4.1' },
        { id: 2, name: '4.2' },
        { id: 3, name: '5' },
        { id: 4, name: '6.1' },
        { id: 5, name: '6.2' },
        { id: 6, name: '6.3' },
        { id: 7, name: '6.4' },
        { id: 8, name: '6.5' },
        { id: 9, name: '6.6' },
        { id: 10, name: '7.1' },
        { id: 11, name: '7.2' },
        { id: 12, name: '7.3' },
        { id: 13, name: '7.4' },
        { id: 14, name: '7.5' },
        { id: 15, name: '7.6' },
        { id: 16, name: '7.7' },
        { id: 17, name: '7.8' },
        { id: 18, name: '7.9' },
        { id: 19, name: '7.10' },
        { id: 20, name: '7.11' },
        { id: 21, name: '8.1' },
        { id: 22, name: '8.2' },
        { id: 23, name: '8.3' },
        { id: 24, name: '8.4' },
        { id: 25, name: '8.5' },
        { id: 26, name: '8.6' },
        { id: 27, name: '8.7' },
        { id: 28, name: '8.8' },
        { id: 29, name: '8.9' }
    ];

    constructor(
        private fb: FormBuilder,
        private route: ActivatedRoute,
        private router: Router,
        private service: InternalAuditorService,
        private toastService: ToastService,
        private unsavedChangesService: UnsavedChangesService,
        private nablHeaderService: NablHeaderService,
        private departmentService: DepartmentService,
        private qcControlPlanservice: QualityControlPlanService,
    ) {
        this.initForm();
        this.nablHeaderService.getFormDefaults('InternalAuditor').subscribe({
            next: (defaults) => {
                this.auditorForm.patchValue({ formatNo: defaults.formCode });
            },
            error: () => { }
        });
    }
    today = new Date().toISOString().split('T')[0];

    ngOnInit() {
        this.route.paramMap.subscribe(params => {
            const id = params.get('id');
            const mode = this.route.snapshot.url[1]?.path;

            if (id && id !== 'create') {
                this.recordId = +id;
                this.isEditMode = mode === 'edit';
                this.isViewMode = mode === 'details';
                this.formTitle = this.isViewMode ? 'View Auditor' : 'Edit Auditor';
                this.loadRecord();
            }
        });
    }

    private initForm() {
        this.auditorForm = this.fb.group({
            formatNo: ['F-49'],
            docNo: ['F-49'],
            issueNo: ['03'],
            issueDate: [null],
            revNo: ['00'],
            revDate: [null],
            date: [this.today, Validators.required],
            authorizationDate: [null, Validators.required],
            authorizationValidUpto: [null, Validators.required],
            departmentName: [''],
            departmentId: ['', Validators.required],
            employeeId: ['', Validators.required],
            employeeName: [null],
            designation: ['', Validators.required],
            isoClauses: this.fb.array([], Validators.required),
            departmentList: this.fb.array([], Validators.required),
            auditExperience: ['', Validators.required],
            // III. Auditor Training & Certification
            leadAuditorCourse: [true],
            internalAuditorCourse: [true],
            certificateNo: ['', Validators.required],
            trainingOrganization: ['', Validators.required],
            certificateIssueDate: [null, Validators.required],
            certificateExpiryDate: [null, Validators.required],
            // V. Authorization Details
            authorizedById: [null, Validators.required],
            authorizedByName: [''],
            auditorStatus: ['Active', Validators.required],
            remarks: [''],
            preparedBy: [''],
            reviewedBy: [null],
            approvedBy: [null],
            reviewedDate: [''],
            approvedDate: [''],
            preparedDate: [this.today],

        });

        // System-managed fields — always readonly
        this.auditorForm.get('docNo')?.disable();
        this.auditorForm.get('issueNo')?.disable();
        this.auditorForm.get('revNo')?.disable();
        this.auditorForm.get('formatNo')?.disable();
        this.auditorForm.get('date')?.disable();
    }

    private loadRecord() {
        this.service.getById(this.recordId).subscribe({
            next: (data) => {
                if (data) {
                    this.auditorForm.patchValue(data);
                    this.auditorForm.patchValue({
                        date: NablFormsHelper.formatDateForInput(data.date),
                        authorizationDate: NablFormsHelper.formatDateForInput(data.authorizationDate),
                        authorizationValidUpto: NablFormsHelper.formatDateForInput(data.authorizationValidUpto),
                        certificateIssueDate: NablFormsHelper.formatDateForInput(data.certificateIssueDate),
                        certificateExpiryDate: NablFormsHelper.formatDateForInput(data.certificateExpiryDate),

                    });
                    this.departmentList.clear();

                    if (data.departmentList?.length) {

                        data.departmentList.forEach((item: any) => {

                            this.departmentList.push(
                                this.fb.group({
                                    DepartmentId: [
                                        item.departmentId ??
                                        item.DepartmentId
                                    ],
                                    departmentName: [
                                        item.departmentName ??
                                        item.DepartmentName ??
                                        ''
                                    ]
                                })
                            );

                        });
                    }


                    // ISO Clauses
                    this.isoClauses.clear();

                    if (data.isoClauses?.length) {
                        data.isoClauses.forEach((item: any) => {
                            this.isoClauses.push(
                                this.fb.group({
                                    clauseId: [item.clauseId || item.ClauseId],
                                    clauseName: [item.clauseName || item.ClauseName]
                                })
                            );
                        });
                    }
                    // Lock form if not in editable status
                    const status = (data as any).status;
                    if (status && status !== 'Draft' && status !== 'Rejected') {
                        this.auditorForm.disable();
                        this.isViewMode = true;
                    } else if (this.isViewMode) {
                        this.auditorForm.disable();
                    }
                    // Re-disable system fields (in case form was enabled for Draft/Rejected)
                    this.auditorForm.get('docNo')?.disable();
                    this.auditorForm.get('issueNo')?.disable();
                    this.auditorForm.get('revNo')?.disable();
                    this.auditorForm.get('formatNo')?.disable();
                }
            },
            error: (error: any) => { this.toastService.show(error?.error?.message || 'Failed to load record', 'error'); }
        });
    }

    toggleSection(section: string) {
        this.openSections[section] = !this.openSections[section];
    }
    get selectedISOClauseIds(): number[] {
        return this.isoClauses.controls
            .map(x => Number(x.get('clauseId')?.value))
            .filter(x => x > 0);
    }

    getEmployees = (term: string, page: number, pageSize: number): Observable<any[]> => {
        return this.qcControlPlanservice.getEmployeesDropdown(term, page, pageSize);
    }
    onEmployeeSelected(item: any) {
        if (!item) { this.auditorForm.patchValue({ employeeId: null }); return; }
        this.auditorForm.patchValue({ employeeId: item.id, employeeName: item.name });
    }
    onAuthorizedBySelected(item: any) {
        if (!item) {
            this.auditorForm.patchValue({
                authorizedById: null,
                authorizedByName: ''
            });
            return;
        }

        this.auditorForm.patchValue({
            authorizedById: item.id,
            authorizedByName: item.name
        });
    }
    onISOClausesSelected(selectedItems: any[]): void {

        this.isoClauses.clear();

        selectedItems.forEach((item: any) => {

            this.isoClauses.push(
                this.fb.group({
                    clauseId: [item.id || null],
                    clauseName: [item.name || '']
                })
            );

        });
        this.isoClauses.markAsTouched();
        this.isoClauses.updateValueAndValidity();
    }

    getISOClauses = (
        term: string,
        page: number,
        pageSize: number
    ): Observable<any[]> => {

        let data = this.isoClauseOptions;

        if (term) {
            const searchTerm = term.toLowerCase();

            data = data.filter(x =>
                x.name.toLowerCase().includes(searchTerm)
            );
        }

        const start = page * pageSize;
        const end = start + pageSize;

        return of(data.slice(start, end));
    };
    getDepartments = (
        term: string,
        page: number,
        pageSize: number
    ): Observable<any[]> => {
        return this.departmentService.getDepartmentDropdown(
            term,
            page,
            pageSize
        );
    };
    getAuthorizedDepartments = (
        term: string,
        page: number,
        pageSize: number
    ): Observable<any[]> => {

        // Edit/View load ke time shared dropdown selected ID ko fetch karta hai.
        // Example term = "3"
        const id = Number(term);

        if (term && !isNaN(id)) {

            const selectedDepartment = this.departmentList.controls
                .map(control => ({
                    id: Number(
                        control.get('DepartmentId')?.value ??
                        control.get('departmentId')?.value
                    ),
                    name:
                        control.get('departmentName')?.value ?? ''
                }))
                .find(x => x.id === id);

            if (selectedDepartment) {
                return of([selectedDepartment]);
            }
        }

        // Normal dropdown search/load
        return this.departmentService.getDepartmentDropdown(
            term,
            page,
            pageSize
        );
    };

    onDepartmentSelected(item: any) {
        if (!item) { this.auditorForm.patchValue({ departmentId: null }); return; }
        this.auditorForm.patchValue({ departmentId: item.id, departmentName: item.name });
    }

    get departmentList(): FormArray {
        return this.auditorForm.get('departmentList') as FormArray;
    }
    get isoClauses(): FormArray {
        return this.auditorForm.get('isoClauses') as FormArray;
    }
    onAuthrizedDept(selectedItems: any[]): void {

        this.departmentList.clear();

        const uniqueItems = selectedItems.filter(
            (item, index, self) =>
                index === self.findIndex(x => Number(x.id) === Number(item.id))
        );

        uniqueItems.forEach((x: any) => {

            this.departmentList.push(
                this.fb.group({
                    DepartmentId: [x.id || null],
                    departmentName: [x.name || '']
                })
            );

        });
        this.departmentList.markAsTouched();
        this.departmentList.updateValueAndValidity();
    }
    get selectedDepartmentIds(): number[] {

        return [
            ...new Set(
                this.departmentList.controls
                    .map(x =>
                        Number(
                            x.get('DepartmentId')?.value ??
                            x.get('departmentId')?.value
                        )
                    )
                    .filter(x => x > 0)
            )
        ];
    }

    onSubmit(): void {
        if (this.auditorForm.invalid) {
            this.auditorForm.markAllAsTouched();
            return;
        }

        const formData = this.auditorForm.getRawValue();

        formData.preparedDate = this.today;
        formData.approvedDate = formData.approvedBy ? this.today : null;
        formData.reviewedDate = formData.reviewedBy ? this.today : null;


        if (this.isEditMode) {
            this.service.update(this.recordId, formData).subscribe({
                next: (response: any) => {
                    this.saved = true;

                    this.toastService.show('auditor updated successfully', 'success');
                    this.router.navigate(['/internal-auditor']);
                },
                error: (error: any) => {
                    this.toastService.show(error?.error?.message || 'Failed to update record', 'error');
                }
            });

        } else {
            this.service.create(formData).subscribe({
                next: (response: any) => {
                    this.saved = true;

                    this.toastService.show('auditor created successfully', 'success');
                    this.router.navigate(['/internal-auditor']);
                },
                error: (error: any) => {
                    this.toastService.show(
                        error?.error?.message || 'Failed to create record', 'error');
                }
            });
        }
    }

    onCancel() {
        this.router.navigate(['/internal-auditor']);
    }

    canDeactivate(): Observable<boolean> | boolean {
        if (!this.auditorForm.dirty || this.saved) return true;
        return this.unsavedChangesService.confirm();
    }

    @HostListener('window:beforeunload', ['$event'])
    onBeforeUnload(event: BeforeUnloadEvent) {
        if (this.auditorForm?.dirty && !this.saved) {
            event.preventDefault();
            event.returnValue = '';
        }
    }
}
