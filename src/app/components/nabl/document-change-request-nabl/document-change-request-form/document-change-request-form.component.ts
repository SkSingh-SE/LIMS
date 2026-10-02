import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { QuillModule } from 'ngx-quill';
import { DocumentChangeRequestService } from '../../../../services/document-change-request.service';
import { NablFormsHelper } from '../../../../utility/nabl-helpers/nabl-forms.helper';
import { Observable } from 'rxjs';
import { CanComponentDeactivate } from '../../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../../services/unsaved-changes.service';
import { NablSignatureSectionComponent } from '../../nabl-signature-section/nabl-signature-section.component';
import { NablHeaderService } from '../../../../services/nabl-header.service';
import { SearchableDropdownComponent } from '../../../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { QualityControlPlanService } from '../../../../services/quality-control-plan.service';
import { DepartmentService } from '../../../../services/department.service';
import { ToastService } from '../../../../services/toast.service';
import { DesignationService } from '../../../../services/designation.service';
@Component({
    selector: 'app-document-change-request-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, QuillModule, RouterModule, NablSignatureSectionComponent, SearchableDropdownComponent],
    templateUrl: './document-change-request-form.component.html',
    styleUrl: './document-change-request-form.component.css'
})
export class DocumentChangeRequestFormComponent implements CanComponentDeactivate, OnInit {
    saved = false;
    changeForm!: FormGroup;
    isEditMode = false;
    isViewMode = false;
    recordId: number = 0;
    formTitle = 'Add New Document Change Request';
    formNumbers = NablFormsHelper.getFormNumbers();
    documentList: any[] = [];
    reviewId: number | null = null;
    documentId: number | null = null;
    openSections: { [key: string]: boolean } = {
        header: true,
        docInfo: true,
        changes: true,
        requestDetails: true,
        changeRequestDetails: true,
        requestBy: true,
        approval: true
    };

    quillModules = {
        toolbar: [
            ['bold', 'italic', 'underline'],
            [{ list: 'ordered' }, { list: 'bullet' }],
            ['clean']
        ]
    };

    priorities = [
        'Low',
        'Normal',
        'High',
    ];

    changeTypes = [
        'Revision',
        'New Requirement',
        'Removeal of Requirement',
        'Typeographical / Editorial',
        'Format change',
        'Other'
    ];

    today = new Date().toISOString().split('T')[0];
    constructor(
        private fb: FormBuilder,
        private route: ActivatedRoute,
        private router: Router,
        private service: DocumentChangeRequestService
        , private unsavedChangesService: UnsavedChangesService,
        private nablHeaderService: NablHeaderService,
        private qcControlPlanservice: QualityControlPlanService,
        private departmentService: DepartmentService,
        private designationService: DesignationService,
        private toastService: ToastService
    ) {
        this.initForm();
        this.nablHeaderService.getFormDefaults('DocumentChangeRequest').subscribe({
            next: (defaults) => {
                this.changeForm.patchValue({ formatNo: defaults.formCode, preparedBy: defaults.preparedBy });
            },
            error: () => { }
        });
    }

    ngOnInit() {
        this.route.paramMap.subscribe(params => {
            const id = params.get('id');
            const mode = this.route.snapshot.url[1]?.path;
            this.route.queryParams.subscribe(params => {

                this.reviewId = params['reviewId']
                    ? Number(params['reviewId'])
                    : null;

                this.documentId = params['documentId']
                    ? Number(params['documentId'])
                    : null;
                this.changeForm.patchValue({
                    sourceReviewId: this.reviewId,
                    documentId: this.documentId
                });
                if (this.reviewId) {
                    this.changeForm.get('documentId')?.disable();
                }
                this.loadDocumentList();
            });
            if (id && id !== 'create') {
                this.recordId = +id;
                this.isEditMode = mode === 'edit';
                this.isViewMode = mode === 'details';
                this.formTitle = this.isViewMode ? 'View Change Request' : 'Edit Change Request';
                this.loadRecord();
            }
            else if (id == null && mode == 'create') {
                this.service.getNextRequestNo().subscribe({
                    next: (res) => {
                        this.changeForm.patchValue({
                            requestNo: res.requestNo,
                        })
                    },
                    error: () => { }
                });
            }
        });
    }

    private initForm() {
        this.changeForm = this.fb.group({
            formatNo: ['F-44'],
            docNo: ['F-44'],
            currentIssue: [null, Validators.required],
            headerIssueDate: [null],
            currentRevision: [null, Validators.required],
            revDate: [null],
            sourceReviewId: [null],
            date: [this.today, Validators.required],
            requestDate: [null, Validators.required],
            // requestById: ['', Validators.required],
            reviewedByName: [null],
            documentNo: [''],
            requestNo: ['', Validators.required],
            issueNo: ['03'],
            revNo: ['00'],
            documentType: [''],
            changeType: ['Revision'],
            reasonForChange: ['', Validators.required],
            descriptionOfChange: ['', Validators.required],
            impactOfChange: ['', Validators.required],
            reference: [''],
            departmentName: [''],
            departmentDoc: [''],
            departmentId: ['', Validators.required],
            effectiveDate: [''],
            designation: [null],
            designationId: ['', Validators.required],
            nextReviewDate: [''],
            documentOwner: [''],
            priority: ['Low', Validators.required],
            documentId: [null, Validators.required],
            documentName: [null],
            actionTaken: [''],
            preparedBy: [''],
            reviewedById: [null],
            approvedBy: [null],
            reviewedDate: [''],
            approvedDate: [''],
            preparedDate: [this.today],
        });

        // System-managed fields — always readonly
        this.changeForm.get('documentNo')?.disable();
        this.changeForm.get('docNo')?.disable();
        this.changeForm.get('issueNo')?.disable();
        this.changeForm.get('revNo')?.disable();
        this.changeForm.get('formatNo')?.disable();
        this.changeForm.get('currentIssue')?.disable();
        this.changeForm.get('currentRevision')?.disable();
        this.changeForm.get('date')?.disable();
        this.changeForm.get('requestNo')?.disable();
    }

    loadDocumentList(): void {
        this.service.getAllDocuments().subscribe({
            next: (res) => {
                this.documentList = res;

                if (this.documentId) {

                    this.changeForm.patchValue({
                        documentId: this.documentId
                    });

                    this.onDocumentChange();
                }
                error: () => {
                    this.documentList = [];
                }
            }
        });
    }


    private loadRecord() {
        this.service.getById(this.recordId).subscribe(data => {
            if (data) {
                this.changeForm.patchValue(data);
                this.changeForm.patchValue({
                    date: NablFormsHelper.formatDateForInput(data.date),
                    effectiveDate: NablFormsHelper.formatDateForInput(data.effectiveDate),
                    nextReviewDate: NablFormsHelper.formatDateForInput(data.nextReviewDate),
                    requestDate: NablFormsHelper.formatDateForInput(data.requestDate),
                })
                // Lock form if not in editable status
                const status = (data as any).status;
                if (status && status !== 'Draft' && status !== 'Rejected') {
                    this.changeForm.disable();
                    this.isViewMode = true;
                } else if (this.isViewMode) {
                    this.changeForm.disable();
                }
                // Re-disable system fields (in case form was enabled for Draft/Rejected)
                this.changeForm.get('documentNo')?.disable();
                this.changeForm.get('docNo')?.disable();
                this.changeForm.get('issueNo')?.disable();
                this.changeForm.get('revNo')?.disable();
                this.changeForm.get('formatNo')?.disable();
                this.changeForm.get('currentIssue')?.disable();
                this.changeForm.get('currentRevision')?.disable();
            }
        });
    }

    toggleSection(section: string) {
        this.openSections[section] = !this.openSections[section];
    }

    getEmployees = (term: string, page: number, pageSize: number): Observable<any[]> => {
        return this.qcControlPlanservice.getEmployeesDropdown(term, page, pageSize);
    }
    onEmployeeSelected(item: any) {
        if (!item) { this.changeForm.patchValue({ reviewedById: null }); return; }
        this.changeForm.patchValue({ reviewedById: item.id, reviewedByName: item.name });
    }
    getDesignations = (term: string, page: number, pageSize: number): Observable<any[]> => {
        return this.designationService.getDesignationDropdown(term, page, pageSize);
    }
    onDesignationSelected(item: any) {
        if (!item) { this.changeForm.patchValue({ requestById: null }); return; }
        this.changeForm.patchValue({ designationId: item.id, designation: item.name });
    }

    getDepartments = (term: string, page: number, pageSize: number): Observable<any[]> => {
        return this.departmentService.getDepartmentDropdown(term, page, pageSize);
    };

    onDepartmentSelected(item: any) {
        if (!item) { this.changeForm.patchValue({ departmentId: null }); return; }
        this.changeForm.patchValue({ departmentId: item.id, departmentName: item.name });
    }

    onDocumentChange(): void {

        const documentid = Number(
            this.changeForm.get('documentId')?.value
        );

        const selectDocument = this.documentList.find(
            c => (c.id ?? c.Id) === documentid
        );

        if (!selectDocument) {
            this.changeForm.patchValue({
                documentType: '',
                departmentDoc: '',
                currentIssue: '',
                currentRevision: '',
                effectiveDate: '',
                nextReviewDate: '',
                documentOwner: '',
                documentName: ''
            });
            return;
        }

        const additional =
            selectDocument.additionalValues ||
            selectDocument.AdditionalValues ||
            {};

        this.changeForm.patchValue({
            documentType: additional.DocumentType || '',
            departmentDoc: additional.DepartmentName || '',
            currentIssue: additional.CurrentIssue || '',
            currentRevision: additional.CurrentRevision || '',
            effectiveDate: NablFormsHelper.formatDateForInput(
                additional.EffectiveDate
            ) || '',
            nextReviewDate: NablFormsHelper.formatDateForInput(
                additional.NextReviewDate
            ) || '',
            documentOwner: additional.DocumentOwner || '',
            documentName:
                selectDocument.documentName ||
                selectDocument.DocumentName ||
                selectDocument.name ||
                selectDocument.Name ||
                ''
        });
    }

    onSubmit(): void {
        if (this.changeForm.invalid) {
            this.changeForm.markAllAsTouched();
            return;
        }

        const formData = this.changeForm.getRawValue();

        formData.preparedDate = this.today;
        formData.approvedDate = formData.approvedBy ? this.today : null;
        formData.reviewedDate = formData.reviewedBy ? this.today : null;


        if (this.isEditMode) {
            this.service.update(this.recordId, formData).subscribe({
                next: (response: any) => {
                    this.saved = true;

                    this.toastService.show('document change request updated successfully', 'success');

                    // if (response.reviewId) {
                    //     this.router.navigate(['/document-review/edit', response.reviewId]);
                    //     return;
                    // }

                    this.router.navigate(['/document-change-request']);
                },
                error: (error: any) => {
                    this.toastService.show(error?.error?.message || 'Failed to update record', 'error');
                }
            });

        } else {
            this.service.create(formData).subscribe({
                next: (response: any) => {
                    this.saved = true;

                    this.toastService.show('document change request created successfully', 'success');

                    // DCR came from Document Review
                    if (response.reviewId) {
                        this.router.navigate(['/document-review/edit', response.reviewId]);
                        return;
                    }

                    // Normal/direct DCR
                    this.router.navigate(['/document-change-request']);
                },
                error: (error: any) => {
                    this.toastService.show(
                        error?.error?.message || 'Failed to create record', 'error');
                }
            });
        }
    }

    onCancel() {
        this.router.navigate(['/document-change-request']);
    }

    canDeactivate(): Observable<boolean> | boolean {
        if (!this.changeForm.dirty || this.saved) return true;
        return this.unsavedChangesService.confirm();
    }

    @HostListener('window:beforeunload', ['$event'])
    onBeforeUnload(event: BeforeUnloadEvent) {
        if (this.changeForm?.dirty && !this.saved) {
            event.preventDefault();
            event.returnValue = '';
        }
    }
}
