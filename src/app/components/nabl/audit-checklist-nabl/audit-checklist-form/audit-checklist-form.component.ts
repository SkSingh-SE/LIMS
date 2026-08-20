import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray, AbstractControl } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { QuillModule } from 'ngx-quill';
import { AuditChecklistService } from '../../../../services/audit-checklist.service';
import { NablFormsHelper } from '../../../../utility/nabl-helpers/nabl-forms.helper';
import { Observable } from 'rxjs';
import { CanComponentDeactivate } from '../../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../../services/unsaved-changes.service';
import { NablSignatureSectionComponent } from '../../nabl-signature-section/nabl-signature-section.component';
import { NablHeaderService } from '../../../../services/nabl-header.service';
import { ToastService } from '../../../../services/toast.service';

@Component({
    selector: 'app-audit-checklist-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, QuillModule, RouterModule, NablSignatureSectionComponent],
    templateUrl: './audit-checklist-form.component.html',
    styleUrl: './audit-checklist-form.component.css'
})
export class AuditChecklistFormComponent implements CanComponentDeactivate, OnInit {
    saved = false;
    isSubmitting = false;
    checklistForm!: FormGroup;
    isEditMode = false;
    isViewMode = false;
    recordId: number = 0;
    formTitle = 'Audit Checklist & Observation';
    formNumbers = NablFormsHelper.getFormNumbers();
    relatedAuditPlan: any = null;
    availableIsoClauses: any[] = [];
    openSections: { [key: string]: boolean } = {
        header: true,
        auditDetails: true,
        checklistItems: true,
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
    constructor(
        private fb: FormBuilder,
        private route: ActivatedRoute,
        private router: Router,
        private service: AuditChecklistService
        , private unsavedChangesService: UnsavedChangesService,
        private toastService: ToastService,
        private nablHeaderService: NablHeaderService) {
        this.initForm();
        this.nablHeaderService.getFormDefaults('AuditChecklist').subscribe({
            next: (defaults) => {
                this.checklistForm.patchValue({ formatNo: defaults.formCode });
            },
            error: () => { }
        });
    }
    scheduleItemId = 0;
    auditPlanId = 0;

    ngOnInit() {
        this.route.paramMap.subscribe(params => {
            const id = params.get('id');
            const mode = this.route.snapshot.url[1]?.path;
            this.route.queryParams.subscribe(params => {
                this.scheduleItemId = Number(params['scheduleItemId']);
                this.auditPlanId = Number(params['schedulePlanId']);

                if (this.scheduleItemId > 0) {
                    this.loadScheduleSession();
                    this.checklistForm.patchValue({
                        scheduleItemId: this.scheduleItemId,
                        auditPlanId: this.auditPlanId,

                    })
                }
            });
            if (id && id !== 'create') {
                this.recordId = +id;
                this.isEditMode = mode === 'edit';
                this.isViewMode = mode === 'details';
                this.formTitle = this.isViewMode ? 'View Audit Checklist' : 'Edit Audit Checklist';
                this.loadRecord();
            }
            else if (id == null && mode === 'create') {
                this.addItem();
                this.service.getNextChecklistNo().subscribe({
                    next: (data) => {
                        this.checklistForm.patchValue({ checklistNo: data.checklistNo });
                    },
                    error: () => { }
                })
            } else {
                // Add initial empty row
                this.addItem();
            }
        });
    }

    private initForm() {
        this.checklistForm = this.fb.group({
            formatNo: ['F-51'],
            docNo: ['F-51'],
            issueNo: ['03'],
            issueDate: [null],
            date: [this.today, Validators.required],
            revNo: ['00'],
            revDate: [null],
            isoClause: ['', Validators.required],
            checklistNo: ['CHK-2026-001', Validators.required],
            auditPlanNo: ['', Validators.required],
            departmentName: [],
            departmentId: [],
            auditDate: ['', Validators.required],
            auditorName: ['', Validators.required],
            auditorId: [],
            scheduleItemId: ['', Validators.required],
            auditPlanId: [],
            auditeeName: ['', Validators.required],
            items: this.fb.array([]),
            preparedBy: [''],
            reviewedBy: [null],
            approvedBy: [null],
            reviewedDate: [''],
            approvedDate: [''],
            preparedDate: [this.today],
        });

        // System-managed fields — always readonly
        this.checklistForm.get('documentNo')?.disable();
        this.checklistForm.get('docNo')?.disable();
        this.checklistForm.get('issueNo')?.disable();
        this.checklistForm.get('revNo')?.disable();
        this.checklistForm.get('formatNo')?.disable();
        this.checklistForm.get('date')?.disable();
    }

    get items(): FormArray {
        return this.checklistForm.get('items') as FormArray;
    }

    addItem(): void {
        const itemGroup = this.fb.group({
            id: [0],

            isoClauseId: [null, Validators.required],
            isoClauseName: [''],

            auditQuestion: ['', Validators.required],
            objectiveEvidence: ['', Validators.required],

            findingType: ['', Validators.required],
            remarks: [''],

            ncId: [null],
            ncNo: [''],
            ncCurrentStep: [null],
            ncStatus: ['']
        });

        this.items.push(itemGroup);
    }
    onClauseSelected(index: number): void {
        const row = this.items.at(index);

        const selectedId = Number(
            row.get('isoClauseId')?.value
        );

        const selectedClause = this.availableIsoClauses.find(
            x => Number(x.clauseId) === selectedId
        );

        row.patchValue({
            isoClauseName: selectedClause?.clauseName ?? ''
        });
    }

    removeItem(index: number): void {
        if (this.items.length > 1) {
            this.items.removeAt(index);
        }
    }
    private loadScheduleSession(): void {
        this.service
            .getScheduleSession(this.scheduleItemId)
            .subscribe(data => {
                if (!data) {
                    return;
                }

                this.availableIsoClauses =
                    data.isoClauses || [];

                const isoClauseText =
                    this.availableIsoClauses
                        .map((x: any) => x.clauseName)
                        .join(', ');

                this.checklistForm.patchValue({
                    auditPlanId: data.auditPlanId,
                    scheduleItemId: data.scheduleItemId,
                    auditPlanNo: data.auditPlanNo,

                    departmentId: data.departmentId,
                    departmentName: data.departmentName,

                    auditorId: data.auditorId,
                    auditorName: data.auditorName,

                    auditeeId: data.auditeeId,
                    auditeeName: data.auditeeName,
                    isoClause: isoClauseText,

                    auditDate:
                        NablFormsHelper.formatDateForInput(
                            data.scheduleDate
                        )
                });

                this.items.clear();
                this.addItem();
            });
    }
    private loadRecord() {
        this.service.getById(this.recordId).subscribe(data => {
            if (!data) {
                return;
            }

            this.service
                .getScheduleSession(data.scheduleItemId)
                .subscribe(session => {

                    this.availableIsoClauses =
                        session?.isoClauses || [];

                    data.items.forEach((item: any) => {
                        item.isoClauseId =
                            Number(item.isoClauseId);
                    });

                    while (this.items.length) {
                        this.items.removeAt(0);
                    }

                    // FIX: each item ko actual row me patch karo
                    data.items.forEach((item: any) => {
                        this.addItem();

                        const row =
                            this.items.at(
                                this.items.length - 1
                            ) as FormGroup;

                        row.patchValue({
                            ...item,
                            id: item.id ?? item.ID ?? 0
                        });
                    });

                    // Parent fields separately patch
                    const { items, ...parentData } = data;

                    this.checklistForm.patchValue(parentData);

                    this.checklistForm.patchValue({
                        date: NablFormsHelper.formatDateForInput(
                            data.date
                        ),
                        auditDate: NablFormsHelper.formatDateForInput(
                            data.auditDate
                        )
                    });

                    const status = (data as any).status;

                    if (
                        status &&
                        status !== 'Draft' &&
                        status !== 'Rejected'
                    ) {
                        this.checklistForm.disable();
                        this.isViewMode = true;
                    } else if (this.isViewMode) {
                        this.checklistForm.disable();
                    }

                    this.checklistForm.get('documentNo')?.disable();
                    this.checklistForm.get('docNo')?.disable();
                    this.checklistForm.get('issueNo')?.disable();
                    this.checklistForm.get('revNo')?.disable();
                    this.checklistForm.get('formatNo')?.disable();

                    const record = data as any;

                    if (record.auditPlanId) {
                        this.relatedAuditPlan = {
                            id: record.auditPlanId,
                            documentNo:
                                record.auditPlan?.documentNo || 'N/A',
                            status:
                                record.auditPlan?.status || 'Draft'
                        };
                    }
                });
        });
    }
    raiseNcr(item: AbstractControl): void {
        const checklistId =
            this.checklistForm.get('id')?.value ||
            this.recordId;

        const checklistItemId =
            item.get('id')?.value;

        const scheduleItemId =
            this.checklistForm.get('scheduleItemId')?.value;

        this.router.navigate(
            ['/non-conforming-work/create'],
            {
                queryParams: {
                    source: 'InternalAudit',
                    checklistId,
                    checklistItemId,
                    scheduleItemId
                }
            }
        );
    }

    continueNcr(item: AbstractControl): void {
        const ncId = item.get('ncId')?.value;

        if (!ncId) {
            return;
        }

        this.router.navigate([
            '/non-conforming-work/edit',
            ncId
        ]);
    }
    viewNcr(item: AbstractControl): void {
        const ncId = item.get('ncId')?.value;

        // 1. URL Tree create karein Bina path change kiye
        const urlTree = this.router.createUrlTree([
            '/non-conforming-work/details',
            ncId
        ]);

        // 2. URL ko string me convert karein
        const url = this.router.serializeUrl(urlTree);

        // 3. New browser tab me open karein
        window.open(url, '_blank');
    }

    toggleSection(section: string) {
        this.openSections[section] = !this.openSections[section];
    }

    isChecklistItemLocked(item: AbstractControl): boolean {
        return Number(item.get('id')?.value) > 0;
    }
    onSubmit(): void {
        if (this.checklistForm.invalid) {
            this.checklistForm.markAllAsTouched();
            return;
        }

        const formData = this.checklistForm.getRawValue();

        formData.preparedDate = this.today;
        formData.approvedDate =
            formData.approvedBy ? this.today : null;
        formData.reviewedDate =
            formData.reviewedBy ? this.today : null;

        if (this.isEditMode) {
            this.service.update(this.recordId, formData).subscribe({
                next: (response: any) => {

                    this.saved = true;

                    this.toastService.show(
                        'audit checklist updated successfully',
                        'success'
                    );

                    if (response.hasPendingNcr === true) {

                        // Same edit page par fresh data load karo
                        this.loadRecord();

                        return;
                    }

                    this.router.navigate([
                        '/audit-plan/edit',
                        response.auditPlanId
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
        } else {
            this.service.create(formData).subscribe({
                next: (response: any) => {
                    this.saved = true;

                    this.toastService.show(
                        'audit checklist created successfully',
                        'success'
                    );

                    if (response.hasPendingNcr === true) {
                        this.router.navigate([
                            '/audit-checklist/edit',
                            response.checklistId
                        ]);

                        return;
                    }

                    this.router.navigate([
                        '/audit-plan/edit',
                        response.auditPlanId
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
        this.router.navigate(['/audit-checklist']);
    }

    canDeactivate(): Observable<boolean> | boolean {
        if (!this.checklistForm.dirty || this.saved) return true;
        return this.unsavedChangesService.confirm();
    }

    @HostListener('window:beforeunload', ['$event'])
    onBeforeUnload(event: BeforeUnloadEvent) {
        if (this.checklistForm?.dirty && !this.saved) {
            event.preventDefault();
            event.returnValue = '';
        }
    }
}
