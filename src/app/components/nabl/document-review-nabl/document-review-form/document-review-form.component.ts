import { Component, OnInit, HostListener, numberAttribute } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DocumentReviewService } from '../../../../services/document-review.service';
import { NablFormsHelper } from '../../../../utility/nabl-helpers/nabl-forms.helper';
import { Observable } from 'rxjs';
import { CanComponentDeactivate } from '../../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../../services/unsaved-changes.service';
import { NablSignatureSectionComponent } from '../../nabl-signature-section/nabl-signature-section.component';
import { NablHeaderService } from '../../../../services/nabl-header.service';
import { SearchableDropdownComponent } from '../../../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { DepartmentService } from '../../../../services/department.service';
import { ToastService } from '../../../../services/toast.service';
import { DocumentChangeRequestService } from '../../../../services/document-change-request.service';

@Component({
    selector: 'app-document-review-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterModule, NablSignatureSectionComponent, SearchableDropdownComponent],
    templateUrl: './document-review-form.component.html',
    styleUrl: './document-review-form.component.css'
})
export class DocumentReviewFormComponent implements CanComponentDeactivate, OnInit {
    saved = false;
    reviewForm!: FormGroup;
    isEditMode = false;
    isViewMode = false;
    recordId: number = 0;
    formTitle = 'Add New Document Review Entry';
    formNumbers = NablFormsHelper.getFormNumbers();
    documentList: any[] = [];
    openSections: { [key: string]: boolean } = {
        header: true,
        docInfo: true,
        reviewDetails: true,
        reviewInfo: true,
        changeDetails: true,
        relatedDcr: true,
        reviewConclusion: true

    };

    today = new Date().toISOString().split('T')[0];
    canEditReview: boolean = true;
    reviewTypes = [
        'Periodic Review',
        'Post Audit Review',
        'Post Incident Review',
        'Ad-hoc Review'
    ];
    reviewConclusionOptions = [
        'Satisfactory',
        'Needs Improvement',
        'Change Required',
        'Obsolete / Withdrawal Required',
    ];

    changeRequireds = [
        'Yes',
        'No'
    ];

    constructor(
        private fb: FormBuilder,
        private route: ActivatedRoute,
        private router: Router,
        private service: DocumentReviewService,
        private unsavedChangesService: UnsavedChangesService,
        private documentChangeRequestService: DocumentChangeRequestService,
        private nablHeaderService: NablHeaderService,
        private departmentService: DepartmentService,
        private toastService: ToastService
    ) {
        this.initForm();
        this.nablHeaderService.getFormDefaults('DocumentReview').subscribe({
            next: (defaults) => {
                this.reviewForm.patchValue({ formatNo: defaults.formCode, preparedBy: defaults.preparedBy });
            },
            error: () => { }
        });
    }
    isFromMasterDocument: boolean = false;
    documentId = 0;

    ngOnInit(): void {

        const mode = this.route.snapshot.url[1]?.path;

        // IMPORTANT:
        // Mode pehle set karo so loadDocumentList()
        // ko pata ho Create / Edit / View kya hai
        this.isEditMode = mode === 'edit';
        this.isViewMode = mode === 'details';


        // Query Param - Master Document se create review
        this.route.queryParamMap.subscribe(queryParams => {

            this.documentId =
                Number(queryParams.get('documentId')) || 0;

            if (this.documentId > 0) {

                this.isFromMasterDocument = true;

                this.reviewForm
                    .get('documentId')
                    ?.disable();
            }

            // Sirf CREATE mode me yaha list load karo
            if (mode === 'create') {
                this.loadDocumentList();
            }
        });


        // Route Param - Edit / View
        this.route.paramMap.subscribe(params => {

            const id = params.get('id');

            if (id && id !== 'create') {

                this.recordId = Number(id);

                this.formTitle =
                    this.isViewMode
                        ? 'View Document Review'
                        : 'Edit Document Review';

                this.loadRecord();

                return;
            }


            // Create
            if (mode === 'create') {

                this.service
                    .getNextReviewNo()
                    .subscribe({
                        next: (res) => {

                            this.reviewForm.patchValue({
                                reviewNo: res.reviewNo
                            });
                        },

                        error: () => { }
                    });
            }
        });
    }
    private initForm() {
        this.reviewForm = this.fb.group({
            formatNo: ['F-45'],
            docNo: ['F-45'],
            issueNo: ['03'],
            issueDate: [null],
            date: [this.today, Validators.required],
            effectiveDate: [null],
            documentOwner: [null],
            revNo: ['00'],
            revDate: [null],
            reviewType: ['Periodic Review', Validators.required],
            documentName: [''],
            documentType: [''],
            departmentId: [null, Validators.required],
            departmentName: [''],
            departmentDoc: [''],
            currentIssue: [null],
            currentRevision: [null],
            documentId: [null, Validators.required],
            reviewNo: [null, Validators.required],
            nextReviewDate: [''],
            reviewFindings: ['', Validators.required],
            changeRequired: [false, Validators.required],
            // Conditional fields
            reasonForChange: [''],
            impactOfChange: [''],
            noChangeConclusion: ['', Validators.required],
            // Review Conclusion
            reviewConclusion: ['', Validators.required],
            additionalRemarks: [''],
            // system field - UI me show nahi karna
            // Related DCR
            generatedDcrId: [null],
            generatedDcrNo: [''],
            // generatedDcrStatus: [''],
            generatedDcrChangeType: [''],
            preparedBy: [''],
            reviewedBy: [null],
            approvedBy: [null],
            reviewedDate: [''],
            approvedDate: [''],
            preparedDate: [this.today],
            status: ['Draft'],
        });

        // System-managed fields — always readonly
        this.reviewForm.get('docNo')?.disable();
        this.reviewForm.get('issueNo')?.disable();
        this.reviewForm.get('revNo')?.disable();
        this.reviewForm.get('formatNo')?.disable();
        this.reviewForm.get('date')?.disable();
        this.reviewForm.get('reviewNo')?.disable();
    }
    private loadRecord(): void {

        this.service.getById(this.recordId).subscribe({

            next: (data: any) => {

                if (!data) {
                    return;
                }

                // ---------------------------------------
                // 1. Patch API data
                // ---------------------------------------
                this.reviewForm.patchValue(data);


                // Saved Document ID
                this.documentId =
                    Number(data.documentId) || 0;


                // ---------------------------------------
                // 2. Approval permission
                // ---------------------------------------
                this.canEditReview =
                    data.canEditReview === true;


                // ---------------------------------------
                // 3. Format date fields
                // ---------------------------------------
                this.reviewForm.patchValue({
                    date:
                        NablFormsHelper.formatDateForInput(
                            data.date
                        ),

                    effectiveDate:
                        NablFormsHelper.formatDateForInput(
                            data.effectiveDate
                        ),

                    nextReviewDate:
                        NablFormsHelper.formatDateForInput(
                            data.nextReviewDate
                        )
                });


                // ---------------------------------------
                // 4. EDIT / VIEW document list load
                // Saved documentId milne ke baad
                // ---------------------------------------
                this.loadDocumentList();


                // ---------------------------------------
                // 5. Change Required related condition
                // ---------------------------------------
                this.onChangeRequiredChange();


                // ---------------------------------------
                // 6. Completed / View readonly
                // ---------------------------------------
                const status = data.status;

                if (status === 'Completed') {

                    this.reviewForm.disable();
                    this.isViewMode = true;

                }
                else if (this.isViewMode) {

                    this.reviewForm.disable();
                }


                // ---------------------------------------
                // 7. System generated fields readonly
                // ---------------------------------------
                this.reviewForm.get('docNo')?.disable();
                this.reviewForm.get('issueNo')?.disable();
                this.reviewForm.get('revNo')?.disable();
                this.reviewForm.get('formatNo')?.disable();
                this.reviewForm.get('reviewNo')?.disable();
                this.reviewForm.get('date')?.disable();

                // Review create hone ke baad
                // Document change nahi hona chahiye
                this.reviewForm
                    .get('documentId')
                    ?.disable();
            },

            error: (error: any) => {

                this.toastService.show(
                    error?.error?.message ||
                    'Failed to load document review',
                    'error'
                );
            }
        });
    }
    loadDocumentList(): void {

        // ==========================================
        // CREATE MODE
        // ==========================================
        if (!this.isEditMode && !this.isViewMode) {

            this.service
                .getDocumentsAvailableForReview()
                .subscribe({

                    next: (res: any) => {

                        this.documentList =
                            res || [];

                        // Master Document se direct Review Create
                        if (this.documentId > 0) {

                            this.reviewForm.patchValue({
                                documentId:
                                    this.documentId
                            });

                            this.onDocumentChange();

                            // Master Document se aaya hai
                            // Document change nahi kar sakta
                            this.reviewForm
                                .get('documentId')
                                ?.disable();
                        }
                    },

                    error: () => {
                        this.documentList = [];
                    }
                });

            return;
        }


        // ==========================================
        // EDIT / VIEW MODE
        // ==========================================
        // All documents load honge so saved option
        // dropdown me available rahe
        this.documentChangeRequestService
            .getAllDocuments()
            .subscribe({

                next: (res: any) => {

                    this.documentList =
                        res || [];


                    // Saved Document ko list load hone
                    // ke BAAD select karo
                    if (this.documentId > 0) {

                        this.reviewForm.patchValue({
                            documentId:
                                this.documentId
                        });

                        this.onDocumentChange();

                        // Edit/View me document fixed rahe
                        this.reviewForm
                            .get('documentId')
                            ?.disable();
                    }
                },

                error: () => {
                    this.documentList = [];
                }
            });
    }
    onDocumentChange(): void {

        const documentid = Number(
            this.reviewForm.get('documentId')?.value
        );

        const selectDocument = this.documentList.find(
            c => (c.id ?? c.Id) === documentid
        );

        if (!selectDocument) {
            this.reviewForm.patchValue({
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

        this.reviewForm.patchValue({
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

    getDepartments = (term: string, page: number, pageSize: number): Observable<any[]> => {
        return this.departmentService.getDepartmentDropdown(term, page, pageSize);
    };

    onDepartmentSelected(item: any) {
        if (!item) { this.reviewForm.patchValue({ departmentId: null }); return; }
        this.reviewForm.patchValue({ departmentId: item.id, departmentName: item.name });
    }
    toggleSection(section: string) {
        this.openSections[section] = !this.openSections[section];
    }

    onChangeRequiredChange(): void {

        const changeRequired =
            this.reviewForm.get('changeRequired')?.value;

        const reasonForChange =
            this.reviewForm.get('reasonForChange');

        const impactOfChange =
            this.reviewForm.get('impactOfChange');

        const noChangeConclusion =
            this.reviewForm.get('noChangeConclusion');


        if (changeRequired === true) {

            // YES → these are mandatory
            reasonForChange?.setValidators([
                Validators.required
            ]);

            impactOfChange?.setValidators([
                Validators.required
            ]);

            // hidden field → not mandatory
            noChangeConclusion?.clearValidators();

            noChangeConclusion?.setValue('');

        }
        else if (changeRequired === false) {

            // NO → this is mandatory
            noChangeConclusion?.setValidators([
                Validators.required
            ]);

            // hidden fields → not mandatory
            reasonForChange?.clearValidators();
            impactOfChange?.clearValidators();

            reasonForChange?.setValue('');
            impactOfChange?.setValue('');

        }
        else {

            // nothing selected
            reasonForChange?.clearValidators();
            impactOfChange?.clearValidators();
            noChangeConclusion?.clearValidators();

        }


        reasonForChange?.updateValueAndValidity();
        impactOfChange?.updateValueAndValidity();
        noChangeConclusion?.updateValueAndValidity();
    }

    viewChangeRequest() {
        const generatedDcrId = Number(this.reviewForm.get('generatedDcrId')?.value || 0);
        const urlTree = this.router.createUrlTree(['/document-change-request/details', generatedDcrId]);
        const url = this.router.serializeUrl(urlTree);
        window.open(url, '_blank');
    }

    onSubmit(isApprove: boolean = false): void {

        if (this.reviewForm.invalid) {
            this.reviewForm.markAllAsTouched();
            return;
        }

        const formData = this.reviewForm.getRawValue();

        formData.preparedDate = this.today;

        formData.approvedDate =
            formData.approvedBy
                ? this.today
                : null;

        formData.reviewedDate =
            formData.reviewedBy
                ? this.today
                : null;

        // Update & Approve button clicked
        if (isApprove) {
            formData.status = 'Completed';
        }

        if (this.isEditMode) {

            this.service.update(
                this.recordId,
                formData
            ).subscribe({

                next: (response: any) => {

                    this.saved = true;

                    // ==============================
                    // Update & Approve
                    // ==============================
                    if (isApprove) {

                        this.toastService.show(
                            'document review approved successfully',
                            'success'
                        );

                        this.router.navigate([
                            '/document-review'
                        ]);

                        return;
                    }


                    // ==============================
                    // Normal Update
                    // ==============================

                    this.toastService.show(
                        'document review updated successfully',
                        'success'
                    );

                    const changeRequired =
                        formData.changeRequired === true;

                    const generatedDcrId =
                        formData.generatedDcrId;


                    // Change Required = YES
                    // and DCR abhi create nahi hua
                    if (
                        changeRequired &&
                        !generatedDcrId
                    ) {

                        this.router.navigate(
                            ['/document-change-request/create'],
                            {
                                queryParams: {
                                    reviewId:
                                        response.reviewId ||
                                        this.recordId,

                                    documentId:
                                        response.documentId ||
                                        formData.documentId
                                }
                            }
                        );

                        return;
                    }


                    // Normal update
                    this.router.navigate([
                        '/document-review'
                    ]);
                },

                error: (error: any) => {

                    this.toastService.show(
                        error?.error?.message ||
                        'Failed to update record',
                        'error'
                    );
                }
            });

        }
        else {

            // ==============================
            // CREATE
            // ==============================

            this.service.create(
                formData
            ).subscribe({

                next: () => {

                    this.saved = true;

                    this.toastService.show(
                        'document review created successfully',
                        'success'
                    );

                    this.router.navigate([
                        '/document-review'
                    ]);
                },

                error: (error: any) => {

                    this.toastService.show(
                        error?.error?.message ||
                        'Failed to create record',
                        'error'
                    );
                }
            });
        }
    }

    onCancel() {
        this.router.navigate(['/document-review']);
    }

    canDeactivate(): Observable<boolean> | boolean {
        if (!this.reviewForm.dirty || this.saved) return true;
        return this.unsavedChangesService.confirm();
    }

    @HostListener('window:beforeunload', ['$event'])
    onBeforeUnload(event: BeforeUnloadEvent) {
        if (this.reviewForm?.dirty && !this.saved) {
            event.preventDefault();
            event.returnValue = '';
        }
    }
}
