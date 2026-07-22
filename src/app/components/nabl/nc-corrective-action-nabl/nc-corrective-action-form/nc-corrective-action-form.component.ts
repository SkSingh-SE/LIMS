import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { QuillModule } from 'ngx-quill';
import { NcCorrectiveActionService } from '../../../../services/nc-corrective-action.service';
import { NablFormsHelper } from '../../../../utility/nabl-helpers/nabl-forms.helper';
import { Observable } from 'rxjs';
import { CanComponentDeactivate } from '../../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../../services/unsaved-changes.service';
import { NablSignatureSectionComponent } from '../../nabl-signature-section/nabl-signature-section.component';
import { NablHeaderService } from '../../../../services/nabl-header.service';
import { DepartmentService } from '../../../../services/department.service';
import { SearchableDropdownComponent } from '../../../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { QualityControlPlanService } from '../../../../services/quality-control-plan.service';
import { ToastService } from '../../../../services/toast.service';

@Component({
    selector: 'app-nc-corrective-action-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, QuillModule, RouterModule, NablSignatureSectionComponent, SearchableDropdownComponent],
    templateUrl: './nc-corrective-action-form.component.html',
    styleUrl: './nc-corrective-action-form.component.css'
})
export class NcCorrectiveActionFormComponent implements CanComponentDeactivate, OnInit {
    saved = false;
    ncForm!: FormGroup;
    isEditMode = false;
    isViewMode = false;
    recordId: number = 0;
    formTitle = 'Add New NC & Corrective Action Report';
    formNumbers = NablFormsHelper.getFormNumbers();
    relatedNcWork: any = null;

    openSections: { [key: string]: boolean } = {
        header: true,
        basicInfo: true,
        observation: true,
        proposed: true,
        taken: true,
        preventive: true,
        effectiveness: true,
        relatedForms: true
    };

    quillModules = {
        toolbar: [
            ['bold', 'italic', 'underline'],
            [{ list: 'ordered' }, { list: 'bullet' }],
            ['clean']
        ]
    };
    today = new Date().toISOString().split('T')[0];
    timeRequirements = [
        'Immediate',
        'Within 7 Days',
        'Within 15 Days',
        'Within 30 Days'];


    constructor(
        private fb: FormBuilder,
        private route: ActivatedRoute,
        private router: Router,
        private service: NcCorrectiveActionService
        , private unsavedChangesService: UnsavedChangesService,
        private departmentService: DepartmentService,
        private qcControlPlanservice: QualityControlPlanService,
        private toastService: ToastService,
        private nablHeaderService: NablHeaderService) {
        this.initForm();
        this.nablHeaderService.getFormDefaults('NcCorrectiveAction').subscribe({
            next: (defaults) => {
                this.ncForm.patchValue({ formatNo: defaults.formCode });
            },
            error: () => { }
        });
    }

    ngOnInit() {
        this.route.paramMap.subscribe(params => {
            const id = params.get('id');
            const mode = this.route.snapshot.url[1]?.path;

            if (id && id !== 'create') {
                this.recordId = +id;
                this.isEditMode = mode === 'edit';
                this.isViewMode = mode === 'details';
                this.formTitle = this.isViewMode ? 'View NC Report' : 'Edit NC Report';
                this.loadRecord();
            }
            if (id == null && mode == 'create') {
                this.service.getNextNCNo().subscribe({
                    next: (res) => {
                        this.ncForm.patchValue({
                            ncNo: res.ncNo
                        })
                    },
                    error: () => { }
                });
            }
        });
    }

    private initForm() {
        this.ncForm = this.fb.group({
            formatNo: ['F-42'],
            docNo: ['F-42'],
            issueNo: ['03'],
            issueDate: [],
            revNo: ['00'],
            revDate: [],

            date: [this.today, Validators.required],
            ncNo: ['', Validators.required],
            clauseNo: ['7.4.2', Validators.required],
            auditNo: ['', Validators.required],
            auditor: ['', Validators.required],
            auditee: ['', Validators.required],
            departmentName: [''],
            timeRequirement: ['Immediate'],
            departmentID: ['', Validators.required],
            verifiedDate: [null],
            correctiveActionDate: [null],
            implementedDate: [null],
            signOfAuditorID: [null],
            signOfAuditorName: [null],
            observedByID: [null],
            observedByName: [null],
            signatureOfQMID: [null],
            signatureOfQMName: [null],
            proposedById: [null],
            proposedByName: [null],
            implementedById: [null],
            implementedBy: [null],
            verifiedById: [null],
            verifiedBy: [null],
            activityAssessed: [null, Validators.required],
            ncObserved: [''],
            correctiveActionProposed: [''],
            timeRequired: [''],
            preparedBy: [''],
            reviewedBy: [null],
            approvedBy: [null],
            reviewedDate: [''],
            approvedDate: [''],
            preparedDate: [this.today],
            correctiveActionTaken: [''],
            preventiveAction: [''],
            effectivenessOfAction: ['']
        });

        // System-managed fields — always readonly
        this.ncForm.get('documentNo')?.disable();
        this.ncForm.get('docNo')?.disable();
        this.ncForm.get('issueNo')?.disable();
        this.ncForm.get('revNo')?.disable();
        this.ncForm.get('formatNo')?.disable();
        this.ncForm.get('date')?.disable();
        this.ncForm.get('ncNo')?.disable();
    }

    private loadRecord() {
        this.service.getById(this.recordId).subscribe(data => {
            if (data) {
                this.ncForm.patchValue(data);
                this.ncForm.patchValue({
                    date: NablFormsHelper.formatDateForInput(data.date),
                    verifiedDate: NablFormsHelper.formatDateForInput(data.verifiedDate),
                    correctiveActionDate: NablFormsHelper.formatDateForInput(data.correctiveActionDate),
                    implementedDate: NablFormsHelper.formatDateForInput(data.implementedDate),

                })
                // Lock form if not in editable status
                const status = (data as any).status;
                if (status && status !== 'Draft' && status !== 'Rejected') {
                    this.ncForm.disable();
                    this.isViewMode = true;
                } else if (this.isViewMode) {
                    this.ncForm.disable();
                }
                // Re-disable system fields (in case form was enabled for Draft/Rejected)
                this.ncForm.get('documentNo')?.disable();
                this.ncForm.get('docNo')?.disable();
                this.ncForm.get('issueNo')?.disable();
                this.ncForm.get('revNo')?.disable();
                this.ncForm.get('formatNo')?.disable();
                // Load related Non-Conforming Work if linked
                const record = data as any;
                if (record.ncId || record.nCId) {
                    this.relatedNcWork = {
                        id: record.ncId || record.nCId,
                        documentNo: record.nc?.documentNo || record.ncRef || 'N/A',
                        status: record.nc?.status || 'Draft'
                    };
                }
            }
        });
    }

    getDepartments = (term: string, page: number, pageSize: number): Observable<any[]> => {
        return this.departmentService.getDepartmentDropdown(term, page, pageSize);
    };

    onDepartmentSelected(item: any) {
        if (!item) { this.ncForm.patchValue({ departmentID: null }); return; }
        this.ncForm.patchValue({ departmentID: item.id, departmentName: item.name });
    }

    getEmployees = (term: string, page: number, pageSize: number): Observable<any[]> => {
        return this.qcControlPlanservice.getEmployeesDropdown(term, page, pageSize);
    }

    onEmployeeSelected(
        item: any,
        idControl: string,
        nameControl: string
    ): void {

        this.ncForm.patchValue({
            [idControl]: item ? item.id : null,
            [nameControl]: item ? item.name : null
        });
    }
    toggleSection(section: string) {
        this.openSections[section] = !this.openSections[section];
    }


    onSubmit(): void {
        if (this.ncForm.invalid) {
            this.ncForm.markAllAsTouched();
            return;
        }

        const formData = this.ncForm.getRawValue();
        formData.preparedDate = this.today;
        formData.approvedDate = formData.approvedBy ? this.today : null;
        formData.reviewedDate = formData.reviewedBy ? this.today : null;
        formData.implementedDate = formData.implementedDate ? formData.implementedDate : null;
        formData.correctiveActionDate = formData.correctiveActionDate ? formData.correctiveActionDate : null;
        formData.verifiedDate = formData.verifiedDate ? formData.verifiedDate : null;
        if (this.isEditMode) {
            this.service.update(this.recordId, formData).subscribe({
                next: () => {
                    this.saved = true;
                    this.router.navigate(['/nc-corrective-action']);
                    this.toastService.show('nc-corrective action updated successfully', 'success')
                },
                error: (error: any) => { this.toastService.show(error?.error?.message || 'Failed to update record', 'error'); }
            });
        } else {
            this.service.create(formData).subscribe({
                next: () => {
                    this.saved = true;
                    this.router.navigate(['/nc-corrective-action']);
                    this.toastService.show('nc-corrective action created successfully', 'success')
                },
                error: (error: any) => { this.toastService.show(error?.error?.message || 'Failed to create record', 'error'); }
            });
        }
    }
    onCancel() {
        this.router.navigate(['/nc-corrective-action']);
    }

    canDeactivate(): Observable<boolean> | boolean {
        if (!this.ncForm.dirty || this.saved) return true;
        return this.unsavedChangesService.confirm();
    }

    @HostListener('window:beforeunload', ['$event'])
    onBeforeUnload(event: BeforeUnloadEvent) {
        if (this.ncForm?.dirty && !this.saved) {
            event.preventDefault();
            event.returnValue = '';
        }
    }
}
