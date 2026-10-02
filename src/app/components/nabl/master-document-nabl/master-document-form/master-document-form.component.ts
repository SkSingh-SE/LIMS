import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MasterDocumentService } from '../../../../services/master-document.service';
import { NablFormsHelper } from '../../../../utility/nabl-helpers/nabl-forms.helper';
import { Observable } from 'rxjs';
import { CanComponentDeactivate } from '../../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../../services/unsaved-changes.service';
import { NablSignatureSectionComponent } from '../../nabl-signature-section/nabl-signature-section.component';
import { NablHeaderService } from '../../../../services/nabl-header.service';
import { SearchableDropdownComponent } from '../../../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { DepartmentService } from '../../../../services/department.service';
import { QualityControlPlanService } from '../../../../services/quality-control-plan.service';
import { environment } from '../../../../../environments/environment';
import { ToastService } from '../../../../services/toast.service';
@Component({
    selector: 'app-master-document-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterModule, NablSignatureSectionComponent, SearchableDropdownComponent],
    templateUrl: './master-document-form.component.html',
    styleUrl: './master-document-form.component.css'
})
export class MasterDocumentFormComponent implements CanComponentDeactivate, OnInit {
    saved = false;
    docForm!: FormGroup;
    isEditMode = false;
    isViewMode = false;
    recordId: number = 0;
    formTitle = 'Add New Master Document Entry';
    formNumbers = NablFormsHelper.getFormNumbers();

    openSections: { [key: string]: boolean } = {
        header: true,
        docDetails: true,
        versionReview: true,
        controlledCopies: true,
        attachment: true,
    };

    documentTypes = [
        'Quality Manual',
        'Procedure',
        'Work Instruction (WI)',
        'Form',
        'SOP',
        'Policy',
        'Guideline',
        'Specification',
        'Record',
        'Report',
        'External Document / External Standard'
    ];
    reviewFrequencies = [
        '6 Monthly',
        'Annual (1 Year)',
        'Biennial (2 Years)'
    ];
    hasReview: boolean = false;
    reviewId: number = 0;
    reviewStatus: string = '';
    today = new Date().toISOString().split('T')[0];
    constructor(
        private fb: FormBuilder,
        private route: ActivatedRoute,
        private router: Router,
        private service: MasterDocumentService
        , private unsavedChangesService: UnsavedChangesService,
        private nablHeaderService: NablHeaderService,
        private departmentService: DepartmentService,
        private qcControlPlanservice: QualityControlPlanService,
        private toastService: ToastService
    ) {
        this.initForm();
        this.nablHeaderService.getFormDefaults('MasterDocument').subscribe({
            next: (defaults) => {
                this.docForm.patchValue({ formatNo: defaults.formCode });
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
                this.formTitle = this.isViewMode ? 'View Master Document Entry' : 'Edit Master Document Entry';
                this.loadRecord();
            }
            else {
                this.addcontrolledCopies();
            }
        });
    }

    private initForm() {
        this.docForm = this.fb.group({
            formatNo: ['F-43'],
            docNo: ['F-43'],
            issueNo: ['03'],
            issueDate: [null],
            date: [this.today, Validators.required],
            revNo: ['00'],
            revDate: [null],
            documentCode: [null, Validators.required],
            departmentId: [null, Validators.required],
            departmentName: [null],
            documentTitle: [null, Validators.required],
            documentType: ['Quality Manual'],
            documentOwnerId: [null, Validators.required],
            documentOwner: [null],
            controlledCopies: this.fb.array([]),
            currentIssue: ['01', Validators.required],
            currentRevision: ['00', Validators.required],
            effectiveDate: ['', Validators.required],
            reviewFrequency: [null, Validators.required],
            nextReviewDate: ['', Validators.required],
            file: [null],
            fileName: ['', Validators.required],
            filePath: [''],
            storageLocation: [''],
            preparedBy: [''],
            reviewedBy: [null],
            approvedBy: [null],
            reviewedDate: [''],
            approvedDate: [''],
            preparedDate: [this.today],
            status: ['Draft']
        });

        // System-managed fields — always readonly
        this.docForm.get('docNo')?.disable();
        this.docForm.get('issueNo')?.disable();
        this.docForm.get('revNo')?.disable();
        this.docForm.get('formatNo')?.disable();
        this.docForm.get('date')?.disable();
        this.docForm.get('preparedBy')?.disable();
        this.docForm.get('reviewedBy')?.disable();
        this.docForm.get('approvedBy')?.disable();
    }

    get controlledCopies(): FormArray {
        return this.docForm.get('controlledCopies') as FormArray;
    }

    addcontrolledCopies() {
        const controlledCopiesGroup = this.fb.group({
            holderName: [null, Validators.required],
            departmentId: [null, Validators.required],
            departmentName: [''],
            location: [null, Validators.required],
            dateIssued: [this.today, Validators.required],
        });
        this.controlledCopies.push(controlledCopiesGroup);
    }

    removecontrolledCopies(index: number) {
        if (this.controlledCopies.length > 1) {
            this.controlledCopies.removeAt(index);
        }
    }

    getEmployees = (term: string, page: number, pageSize: number): Observable<any[]> => {
        return this.qcControlPlanservice.getEmployeesDropdown(term, page, pageSize);
    }
    getDepartments = (term: string, page: number, pageSize: number): Observable<any[]> => {
        return this.departmentService.getDepartmentDropdown(term, page, pageSize);
    };

    onDepartmentSelected(item: any) {
        if (!item) { this.docForm.patchValue({ departmentId: null }); return; }
        this.docForm.patchValue({ departmentId: item.id, departmentName: item.name });
    }

    onEmployeeSelected(item: any) {
        if (!item) { this.docForm.patchValue({ documentOwnerId: null }); return; }
        this.docForm.patchValue({ documentOwnerId: item.id, documentOwner: item.name });
    }

    onControlledCopyDepartmentSelected(item: any, index: number): void {
        const row = this.controlledCopies.at(index);

        if (!item) {
            row.patchValue({ departmentId: null, departmentName: '' });
            return;
        }

        row.patchValue({ departmentId: item.id, departmentName: item.name });
    }
    calculateNextReviewDate(): void {
        const effectiveDate = this.docForm.get('effectiveDate')?.value;
        const frequency = this.docForm.get('reviewFrequency')?.value;

        if (!effectiveDate || !frequency) {
            this.docForm.patchValue({ nextReviewDate: '' });
            return;
        }

        const date = new Date(effectiveDate);

        if (frequency === '6 Monthly') {
            date.setMonth(date.getMonth() + 6);
        } else if (frequency === 'Annual (1 Year)') {
            date.setFullYear(date.getFullYear() + 1);
        } else if (frequency === 'Biennial (2 Years)') {
            date.setFullYear(date.getFullYear() + 2);
        }

        this.docForm.patchValue({
            nextReviewDate: date.toISOString().split('T')[0]
        });
    }

    private loadRecord() {
        this.service.getById(this.recordId).subscribe(data => {
            if (data) {
                this.docForm.patchValue(data);

                this.docForm.patchValue({
                    date: NablFormsHelper.formatDateForInput(data.date),
                    effectiveDate: NablFormsHelper.formatDateForInput(data.effectiveDate),
                    nextReviewDate: NablFormsHelper.formatDateForInput(data.nextReviewDate),
                });

                while (this.controlledCopies.length) {
                    this.controlledCopies.removeAt(0);
                }
                this.hasReview = data.hasReview === true;
                this.reviewId = Number(data.reviewId) || 0;
                this.reviewStatus = data.reviewStatus || '';

                if (this.hasReview) {
                    this.docForm.disable();
                }
                data.controlledCopies?.forEach((item: any) => {
                    const controlledCopyGroup = this.fb.group({
                        holderName: [
                            item.holderName ?? null,
                            Validators.required
                        ],
                        departmentId: [
                            item.departmentId ?? null,
                            Validators.required
                        ],
                        departmentName: [
                            item.departmentName ?? ''
                        ],
                        location: [
                            item.location ?? null,
                            Validators.required
                        ],
                        dateIssued: [
                            item.dateIssued
                                ? NablFormsHelper.formatDateForInput(item.dateIssued)
                                : this.today,
                            Validators.required
                        ],
                    });

                    this.controlledCopies.push(controlledCopyGroup);
                });

                const status = (data as any).status;

                if (status && status !== 'Draft' && status !== 'Rejected') {
                    this.docForm.disable();
                    this.isViewMode = true;
                } else if (this.isViewMode) {
                    this.docForm.disable();
                }

                this.docForm.get('docNo')?.disable();
                this.docForm.get('issueNo')?.disable();
                this.docForm.get('revNo')?.disable();
                this.docForm.get('formatNo')?.disable();
            }
        });
    }
    toggleSection(section: string) {
        this.openSections[section] = !this.openSections[section];
    }


    onAttachmentChange(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];

        if (!file) {
            return;
        }

        const maxSizeMB = 5;
        const maxSize = maxSizeMB * 1024 * 1024;

        if (file.size > maxSize) {
            this.toastService.show(
                `Attachment size should be less than ${maxSizeMB} MB.`,
                'warning'
            );

            input.value = '';

            this.docForm.patchValue({
                file: null,
                fileName: '',
                filePath: ''
            });

            this.docForm.get('fileName')?.markAsTouched();
            return;
        }

        this.docForm.patchValue({
            file: file,
            fileName: file.name,
            filePath: ''
        });

        this.docForm.get('fileName')?.markAsTouched();
        this.docForm.get('fileName')?.updateValueAndValidity();
    }
    openAttachment(): void {
        const filePath = this.docForm.get('filePath')?.value;

        if (filePath) {
            this.openFileInNewTab(filePath);
        }
    }

    openFileInNewTab(filePath: string): void {
        if (filePath) {
            const fullUrl = environment.baseUrl + filePath;
            window.open(fullUrl, '_blank');
        }
    }
    removeAttachment(): void {
        this.docForm.patchValue({
            file: null,
            fileName: '',
            filePath: ''
        });

        const fileInput = document.getElementById(
            'documentAttachment'
        ) as HTMLInputElement;

        if (fileInput) {
            fileInput.value = '';
        }

        this.docForm.get('fileName')?.markAsTouched();
        this.docForm.get('fileName')?.updateValueAndValidity();
    }



    onSubmit(): void {
        if (this.docForm.invalid) {
            this.docForm.markAllAsTouched();
            return;
        }

        const formValue = this.docForm.getRawValue();

        formValue.preparedDate = this.today;
        formValue.approvedDate = formValue.approvedBy
            ? this.today
            : null;

        formValue.reviewedDate = formValue.reviewedBy
            ? this.today
            : null;

        const selectedFile = formValue.file;

        const payload = {
            ...formValue,
            file: null
        };

        const requestData = new FormData();

        requestData.append(
            'body',
            JSON.stringify(payload)
        );

        if (selectedFile instanceof File) {
            requestData.append(
                'file',
                selectedFile,
                selectedFile.name
            );
        }

        const request$ = this.isEditMode
            ? this.service.updateMasterDocument(
                this.recordId,
                requestData
            )
            : this.service.createMasterDocument(
                requestData
            );

        request$.subscribe({
            next: (res: any) => {
                this.saved = true;

                this.toastService.show(
                    this.isEditMode
                        ? 'Master document updated successfully'
                        : 'Master document created successfully',
                    'success'
                );

                this.router.navigate([
                    '/master-document/edit', res.id
                ]);
            },
            error: (error: any) => {
                this.toastService.show(
                    error?.error?.message ||
                    'Failed to save master document',
                    'error'
                );
            }
        });
    }

    onCreateDocumentReview(): void {
        const documentId = this.recordId;

        this.router.navigate(
            ['/document-review/create'],
            {
                queryParams: {
                    documentId: documentId
                }
            }
        );
    }

    onCancel() {
        this.router.navigate(['/master-document']);
    }

    canDeactivate(): Observable<boolean> | boolean {
        if (!this.docForm.dirty || this.saved) return true;
        return this.unsavedChangesService.confirm();
    }

    @HostListener('window:beforeunload', ['$event'])
    onBeforeUnload(event: BeforeUnloadEvent) {
        if (this.docForm?.dirty && !this.saved) {
            event.preventDefault();
            event.returnValue = '';
        }
    }
}
