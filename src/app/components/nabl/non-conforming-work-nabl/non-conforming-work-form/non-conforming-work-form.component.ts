import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { QuillModule } from 'ngx-quill';
import { NonConformingWorkService } from '../../../../services/non-conforming-work.service';
import { NablFormsHelper } from '../../../../utility/nabl-helpers/nabl-forms.helper';
import { Observable } from 'rxjs';
import { CanComponentDeactivate } from '../../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../../services/unsaved-changes.service';
import { NablSignatureSectionComponent } from '../../nabl-signature-section/nabl-signature-section.component';
import { NablHeaderService } from '../../../../services/nabl-header.service';
import { ToastService } from '../../../../services/toast.service';
import { DepartmentService } from '../../../../services/department.service';
import { SearchableDropdownComponent } from '../../../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { QualityControlPlanService } from '../../../../services/quality-control-plan.service';
import { NcCorrectiveActionService } from '../../../../services/nc-corrective-action.service';
@Component({
    selector: 'app-non-conforming-work-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, QuillModule, RouterModule, SearchableDropdownComponent],
    templateUrl: './non-conforming-work-form.component.html',
    styleUrl: './non-conforming-work-form.component.css'
})
export class NonConformingWorkFormComponent implements CanComponentDeactivate, OnInit {
    saved = false;
    ncForm!: FormGroup;
    closureForm!: FormGroup;
    verificationForm!: FormGroup;
    correctiveActionForm!: FormGroup;
    investigationForm!: FormGroup;
    isEditMode = false;
    isViewMode = false;
    recordId: number = 0;
    formTitle = 'Add New Non-Conforming Work Record';
    formNumbers = NablFormsHelper.getFormNumbers();
    checklistId = 0;
    checklistItemId = 0;
    scheduleItemId = 0;
    isChecklistNcr = false;

    openSections: { [key: string]: boolean } = {
        header: true,
        basicInfo: true,
        analysis: true,
        action: true
    };

    quillModules = {
        toolbar: [
            ['bold', 'italic', 'underline'],
            [{ list: 'ordered' }, { list: 'bullet' }],
            ['clean']
        ]
    };

    activeFormKey = 1;
    tabStatus = {
        general: false,
        investigation: false,
        correctiveAction: false,
        verification: false,
        closure: false
    };
    activeTab = 1;
    tabs = [

        {
            id: 1,
            title: 'General',
            icon: 'bi-card-text',
            status: 'active'
        },
        {
            id: 2,
            title: 'Investigation',
            icon: 'bi-search',
            status: 'pending'
        },
        {
            id: 3,
            title: 'Corrective Action',
            icon: 'bi-tools',
            status: 'pending'
        },
        {
            id: 4,
            title: 'Verification',
            icon: 'bi-check-circle',
            status: 'pending'
        },
        {
            id: 5,
            title: 'Closure',
            icon: 'bi-lock',
            status: 'pending'
        }

    ];

    categories = [
        'QC Failure',
        'Equipment Failure',
        'Customer Complaint',
        'Internal Audit',
        'PT Failure',
        'Method Failure',
        'Environmental Failure',
        'Human Error',
        'Sample Mix-up',
        'Document Issue',
        'Major',
        'Minor',
        'Ohter'
    ]
    priorities = [
        'Minor',
        'Major',
        'Critical',
    ]
    sourcees = [
        'Internal Audit',
        'External Assessment(NABL)',
        'Management Review',
        'Customer Complaint',
        'PT / ILC',
        'Quality Control',
        'Equipment Breakdown',
        'Calibration',
        'Environmental Monitoring',
        'Document Review',
        'Staff Competency',
        'Training',
        'Test Report Review',
        'Method Validation / Verification',
        'Internal Observation',
        'Risk Assessment',
        'Supplier Evaluation',
        'Sample Handling'
    ]
    today = new Date().toISOString().split('T')[0];
    constructor(
        private fb: FormBuilder,
        private route: ActivatedRoute,
        private router: Router,
        private service: NonConformingWorkService
        , private unsavedChangesService: UnsavedChangesService,
        private nablHeaderService: NablHeaderService,
        private toastService: ToastService,
        private departmentService: DepartmentService,
        private ncCorrectiveActionService: NcCorrectiveActionService,
        private qcControlPlanservice: QualityControlPlanService,
    ) {
        this.initForm();
        this.nablHeaderService.getFormDefaults('NonConformingWork').subscribe({
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
                this.formTitle = this.isViewMode ? 'View NC Record' : 'Edit NC Record';
                this.loadRecord();
            }
            if (id == null && mode == 'create') {
                this.ncCorrectiveActionService.getNextNCNo().subscribe({
                    next: (res) => {
                        this.ncForm.patchValue({
                            ncNo: res.ncNo
                        })
                    },
                    error: () => { }
                });
                this.service.getActionNo().subscribe({
                    next: (res) => {
                        this.correctiveActionForm.patchValue({
                            actionNo: res.actionNo
                        })
                    },
                    error: () => { }
                })
                const source =
                    this.route.snapshot.queryParamMap.get('source');

                const checklistId = Number(
                    this.route.snapshot.queryParamMap.get('checklistId')
                );

                const checklistItemId = Number(
                    this.route.snapshot.queryParamMap.get('checklistItemId')
                );

                const scheduleItemId = Number(
                    this.route.snapshot.queryParamMap.get('scheduleItemId')
                );
                this.isChecklistNcr =
                    checklistId > 0 &&
                    checklistItemId > 0;

                if (
                    source === 'InternalAudit' &&
                    checklistItemId > 0
                ) {
                    this.loadAuditChecklistNcrData(
                        checklistId,
                        checklistItemId,
                        scheduleItemId
                    );
                }
            }
        });
    }

    private initForm() {
        this.ncForm = this.fb.group({
            formatNo: ['F-41'],
            documentNo: ['F-41'],
            issueNo: ['03'],
            issueDate: [null],
            date: [this.today, Validators.required],
            revNo: ['00'],
            revDate: [null],

            ncNo: ['', Validators.required],
            ncDate: [this.today, Validators.required],

            departmentName: [''],
            reportedByEmployeeName: [''],
            departmentId: [null, Validators.required],
            reportedByEmployeeId: [null, Validators.required],

            source: ['Internal Audit', Validators.required],
            category: ['QC Failure', Validators.required],
            priority: ['Major', Validators.required],

            referenceModule: [null],
            referenceId: [null],
            checklistId: [null],
            referenceNo: [''],

            customerAffected: [false],

            description: ['', Validators.required],
            immediateAction: ['', Validators.required],
            problemDescription: ['', Validators.required],

            // Workflow
            status: ['Draft'],
            currentStep: [1],
        });
        this.investigationForm = this.fb.group({
            assignedToEmployeeId: [null, Validators.required],
            assignedToEmployeeName: [null],
            investigationDate: [null, Validators.required],
            investigationMethod: ['', Validators.required],
            rootCause: ['', Validators.required],
            investigationDetails: ['', Validators.required],
            recommendedAction: ['']
        });
        this.correctiveActionForm = this.fb.group({

            actionNo: [''],
            correctiveAction: ['', Validators.required],
            responsiblePersonId: [null, Validators.required],
            responsiblePersonName: [null],
            targetDate: [null, Validators.required],
            completionDate: [null, Validators.required],
            resourcesRequired: ['', Validators.required],
            preventiveAction: ['', Validators.required]
        });
        this.verificationForm = this.fb.group({
            verificationDate: [this.today, Validators.required],
            verifiedByEmployeeId: [null, Validators.required],
            verifiedByEmployeeName: [null],
            verificationMethod: ['', Validators.required],
            observation: ['', Validators.required],
            result: ['Effective', Validators.required],
            remarks: ['']
        });

        this.closureForm = this.fb.group({
            closureDate: [this.today, Validators.required],
            closedByEmployeeId: [null, Validators.required],
            closedByEmployeeName: [null],
            finalRemarks: ['', Validators.required],
            status: ['Closed']
        });

        // System-managed fields — always readonly
        this.ncForm.get('documentNo')?.disable();
        this.ncForm.get('issueNo')?.disable();
        this.ncForm.get('revNo')?.disable();
        this.ncForm.get('formatNo')?.disable();
        this.ncForm.get('date')?.disable();
    }


    private loadRecord(): void {

        this.service.getById(this.recordId).subscribe((data: any) => {

            if (!data) return;
            if (!data) return;

            // ===========================
            // Checklist NCR Link Restore
            // ===========================

            if (
                data.checklistId &&
                data.referenceModule === 'AuditChecklistItem'
            ) {
                this.checklistId = data.checklistId;
                this.checklistItemId = data.referenceId;

                this.isChecklistNcr = true;
            } else {
                this.isChecklistNcr = false;
            }
            // ===========================
            // General Form
            // ===========================

            this.ncForm.patchValue({
                ...data,
                date: NablFormsHelper.formatDateForInput(data.date),
                ncDate: NablFormsHelper.formatDateForInput(data.ncDate),
                issueDate: NablFormsHelper.formatDateForInput(data.issueDate),
                revDate: NablFormsHelper.formatDateForInput(data.revDate),
                preparedDate: NablFormsHelper.formatDateForInput(data.preparedDate),
                reviewedDate: NablFormsHelper.formatDateForInput(data.reviewedDate),
                approvedDate: NablFormsHelper.formatDateForInput(data.approvedDate)
            });

            // ===========================
            // Investigation
            // ===========================

            if (data.investigation) {

                this.investigationForm.patchValue({

                    assignedToEmployeeId: data.investigation.assignedToEmployeeId,
                    assignedToEmployeeName: data.investigation.assignedToEmployeeName,

                    investigationDate: NablFormsHelper.formatDateForInput(
                        data.investigation.investigationDate
                    ),

                    investigationMethod: data.investigation.investigationMethod,
                    rootCause: data.investigation.rootCause,
                    contributingFactors: data.investigation.contributingFactors,
                    investigationDetails: data.investigation.investigationDetails,
                    recommendedAction: data.investigation.recommendedAction
                });
            }

            // ===========================
            // Corrective Action
            // ===========================

            if (data.correctiveAction) {

                this.correctiveActionForm.patchValue({

                    actionNo: data.correctiveAction.actionNo,
                    correctiveAction: data.correctiveAction.correctiveAction,

                    responsiblePersonId: data.correctiveAction.responsiblePersonId,
                    responsiblePersonName: data.correctiveAction.responsiblePersonName,

                    targetDate: NablFormsHelper.formatDateForInput(
                        data.correctiveAction.targetDate
                    ),

                    completionDate: NablFormsHelper.formatDateForInput(
                        data.correctiveAction.completionDate
                    ),

                    resourcesRequired: data.correctiveAction.resourcesRequired,
                    preventiveAction: data.correctiveAction.preventiveAction
                });

            }
            else {

                this.service.getActionNo().subscribe({
                    next: (res: any) => {

                        this.correctiveActionForm.patchValue({
                            actionNo: res.actionNo
                        });

                    }
                });
            }

            // ===========================
            // Verification
            // ===========================

            if (data.verification) {

                this.verificationForm.patchValue({

                    verificationDate: NablFormsHelper.formatDateForInput(
                        data.verification.verificationDate
                    ),

                    verifiedByEmployeeId: data.verification.verifiedByEmployeeId,
                    verifiedByEmployeeName: data.verification.verifiedByEmployeeName,

                    verificationMethod: data.verification.verificationMethod,
                    observation: data.verification.observation,
                    result: data.verification.result,
                    remarks: data.verification.remarks
                });
            }

            // ===========================
            // Closure
            // ===========================

            if (data.closure) {

                this.closureForm.patchValue({

                    closureDate: NablFormsHelper.formatDateForInput(
                        data.closure.closureDate
                    ),

                    closedByEmployeeId: data.closure.closedByEmployeeId,
                    closedByEmployeeName: data.closure.closedByEmployeeName,

                    finalRemarks: data.closure.finalRemarks,
                    status: data.closure.status
                });
            }

            // ===========================
            // Tab Status
            // ===========================

            this.tabs.forEach(t => t.status = 'pending');

            for (let i = 1; i <= data.currentStep; i++) {

                if (this.tabs[i - 1]) {
                    this.tabs[i - 1].status = 'completed';
                }
            }

            if (data.currentStep < this.tabs.length) {
                this.tabs[data.currentStep].status = 'active';
            }

            this.activeFormKey = Math.min(data.currentStep + 1, this.tabs.length);

            // ===========================
            // View Mode Only
            // ===========================

            if (this.isViewMode) {

                this.ncForm.disable();
                this.investigationForm.disable();
                this.correctiveActionForm.disable();
                this.verificationForm.disable();
                this.closureForm.disable();
            }
            else {

                this.ncForm.enable();
                this.investigationForm.enable();
                this.correctiveActionForm.enable();
                this.verificationForm.enable();
                this.closureForm.enable();

                // Header fields always readonly
                this.ncForm.get('documentNo')?.disable();
                this.ncForm.get('date')?.disable();
                this.ncForm.get('issueNo')?.disable();
                this.ncForm.get('revNo')?.disable();
                this.ncForm.get('formatNo')?.disable();
            }
        });

        this.selectTab(1);
    }
    selectTab(tabId: number): void {

        const tab = this.tabs.find(x => x.id === tabId);

        if (!tab) {
            return;
        }

        if (tab.status === 'pending' || tab.status === 'locked') {

            this.toastService.show(
                'Please complete previous section first.',
                'warning'
            );

            return;
        }

        this.activeFormKey = tab.id;
    }
    getDepartments = (term: string, page: number, pageSize: number): Observable<any[]> => {
        return this.departmentService.getDepartmentDropdown(term, page, pageSize);
    };

    onDepartmentSelected(item: any) {
        if (!item) { this.ncForm.patchValue({ departmentId: null }); return; }
        this.ncForm.patchValue({ departmentId: item.id, departmentName: item.name });
    }


    getEmployees = (term: string, page: number, pageSize: number): Observable<any[]> => {
        return this.qcControlPlanservice.getEmployeesDropdown(term, page, pageSize);
    }



    onEmployeeSelected(
        item: any,
        form: FormGroup,
        idControl: string,
        nameControl: string
    ): void {

        form.patchValue({

            [idControl]: item?.id ?? null,

            [nameControl]: item?.name ?? null

        });

    }

    currentTab(): void {

        const current = this.tabs[this.activeFormKey - 1];

        current.status = 'completed';

        if (this.activeFormKey < this.tabs.length) {

            this.tabs[this.activeFormKey].status = 'active';

            this.activeFormKey++;
        }
    }
    markTabCompleted(tabId: number): void {

        const currentTab = this.tabs.find(x => x.id === tabId);

        if (!currentTab) return;

        // Current completed
        currentTab.status = 'completed';

        // Next active
        const nextTab = this.tabs.find(x => x.id === tabId + 1);

        if (nextTab) {
            nextTab.status = 'locked';
        }

        // Current screen bhi next ho jaye
        if (nextTab) {
            this.activeFormKey = nextTab.id;
        }

    }

    changeTab(tab: any): void {

        if (tab.status === 'pending') {

            this.toastService.show(
                'Please complete previous section first.',
                'warning'
            );

            return;
        }

        this.activeFormKey = tab.id;

    }
    toggleSection(section: string) {
        this.openSections[section] = !this.openSections[section];
    }
    onSubmit(): void {

        switch (this.activeFormKey) {

            case 1:
                this.saveGeneral();
                break;

            case 2:
                this.saveInvestigation();
                break;

            case 3:
                this.saveCorrectiveAction();
                break;

            case 4:
                this.saveVerification();
                break;

            case 5:
                this.saveClosure();
                break;
        }

    }
    saveGeneral(): void {
        this.saveRecord(this.ncForm, 1);
    }


    saveInvestigation(): void {
        this.saveRecord(this.investigationForm, 2);

    }

    saveCorrectiveAction(): void {
        this.saveRecord(this.correctiveActionForm, 3);

    }

    saveVerification(): void {
        this.saveRecord(this.verificationForm, 4);
    }
    saveClosure(): void {

        this.saveRecord(this.closureForm, 5);
    }

    private saveRecord(form: FormGroup, step: number): void {

        if (form.invalid) {
            form.markAllAsTouched();
            return;
        }

        let payload: any;

        switch (step) {

            case 1:

                payload = {
                    ...this.ncForm.getRawValue(),
                    id: this.recordId,
                    requestStep: 1,
                    currentStep: 1
                };

                break;

            case 2:

                payload = {
                    id: this.recordId,
                    requestStep: 2,
                    investigation: form.getRawValue()
                };

                break;

            case 3:

                payload = {
                    id: this.recordId,
                    requestStep: 3,
                    correctiveAction: form.getRawValue()
                };

                break;

            case 4:

                payload = {
                    id: this.recordId,
                    requestStep: 4,
                    verification: form.getRawValue()
                };

                break;

            case 5:

                payload = {
                    id: this.recordId,
                    requestStep: 5,
                    closure: form.getRawValue()
                };

                break;
        }

        console.log(payload); // Check payload

        if (this.isEditMode) {

            this.service.update(this.recordId, payload)
                .subscribe({

                    next: () => {

                        this.markTabCompleted(step);
                        this.showSuccessMessage(step);

                    }

                });

        }
        else {

            this.service.create(payload)
                .subscribe({

                    next: (res: any) => {

                        this.recordId = res.id;
                        this.isEditMode = true;

                        this.markTabCompleted(step);
                        this.showSuccessMessage(step);

                    }

                });

        }

    }
    private showSuccessMessage(step: number): void {

        switch (step) {

            case 1:
                this.toastService.show(
                    'General information saved successfully',
                    'success'
                );
                break;

            case 2:
                this.toastService.show(
                    'Investigation saved successfully',
                    'success'
                );
                break;

            case 3:
                this.toastService.show(
                    'Corrective Action saved successfully',
                    'success'
                );
                break;

            case 4:
                this.toastService.show(
                    'Verification saved successfully',
                    'success'
                );
                break;

            case 5:
                this.toastService.show(
                    'Record completed successfully',
                    'success'
                );
                if (
                    this.isChecklistNcr &&
                    this.checklistId > 0
                ) {
                    this.router.navigate([
                        '/audit-checklist/edit',
                        this.checklistId
                    ]);

                    return;
                }

                // Normal individual NCR
                this.router.navigate([
                    '/non-conforming-work'
                ]);

                break;
        }

    }
    private loadAuditChecklistNcrData(
        checklistId: number,
        checklistItemId: number,
        scheduleItemId: number
    ): void {

        this.service
            .getAuditChecklistNcrData(checklistItemId)
            .subscribe({
                next: (data) => {
                    if (!data) {
                        return;
                    }

                    this.ncForm.patchValue({
                        source: 'Internal Audit',

                        departmentId: data.departmentId,
                        departmentName: data.departmentName,

                        reportedByEmployeeId: data.auditorId,
                        reportedByEmployeeName: data.auditorName,

                        category:
                            data.findingType === 'Major NC'
                                ? 'Major'
                                : 'Minor',

                        referenceModule: 'AuditChecklistItem',
                        referenceId: checklistItemId,
                        checklistId: checklistId,
                        referenceNo: data.checklistNo,

                        description: data.objectiveEvidence,
                        problemDescription: data.auditQuestion
                    });
                    if (this.isChecklistNcr) {
                        this.ncForm.get('source')?.disable();
                        this.ncForm.get('category')?.disable();
                        this.ncForm.get('referenceModule')?.disable();
                        this.ncForm.get('referenceId')?.disable();
                        this.ncForm.get('referenceNo')?.disable();

                    }


                    // Return/reference ke liye locally rakh sakte ho
                    this.checklistId = checklistId;
                    this.checklistItemId = checklistItemId;
                    this.scheduleItemId = scheduleItemId;
                },

                error: () => { }
            });
    }

    backToChecklist(): void {
        if (this.checklistId > 0) {
            this.router.navigate([
                '/audit-checklist/edit',
                this.checklistId
            ]);
        }
    }

    onCancel() {
        this.router.navigate(['/non-conforming-work']);
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
