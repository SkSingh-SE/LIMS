import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { QuillModule } from 'ngx-quill';
import { AuditSummaryService } from '../../../../services/audit-summary.service';
import { NablFormsHelper } from '../../../../utility/nabl-helpers/nabl-forms.helper';
import { Observable } from 'rxjs';
import { CanComponentDeactivate } from '../../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../../services/unsaved-changes.service';
import { NablSignatureSectionComponent } from '../../nabl-signature-section/nabl-signature-section.component';
import { NablHeaderService } from '../../../../services/nabl-header.service';

@Component({
    selector: 'app-audit-summary-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, QuillModule, RouterModule, NablSignatureSectionComponent],
    templateUrl: './audit-summary-form.component.html',
    styleUrl: './audit-summary-form.component.css'
})
export class AuditSummaryFormComponent implements CanComponentDeactivate, OnInit {
    saved = false;
    isSubmitting = false;
    summaryForm!: FormGroup;
    isEditMode = false;
    isViewMode = false;
    recordId: number = 0;
    formTitle = 'Audit Summary Report';
    formNumbers = NablFormsHelper.getFormNumbers();
    departmentSummary: any[] = [];

    openSections: { [key: string]: boolean } = {
        header: true,
        summaryDetails: true,
        auditPlanDetails: true,
        executionSummary: true,
        findingsSummary: true,
        departmentSummary: true,
    };

    quillModules = {
        toolbar: [
            ['bold', 'italic', 'underline'],
            [{ list: 'ordered' }, { list: 'bullet' }],
            ['clean']
        ]
    };

    constructor(
        private fb: FormBuilder,
        private route: ActivatedRoute,
        private router: Router,
        private service: AuditSummaryService
        , private unsavedChangesService: UnsavedChangesService,
        private nablHeaderService: NablHeaderService) {
        this.initForm();
        this.nablHeaderService.getFormDefaults('AuditSummary').subscribe({
            next: (defaults) => {
                this.summaryForm.patchValue({ formatNo: defaults.formCode });
            },
            error: () => { }
        });
    }
    auditPlanId: number = 0;

    ngOnInit() {
        this.route.paramMap.subscribe(params => {

            const id = params.get('id');
            const mode = this.route.snapshot.url[1]?.path;

            if (id) {

                this.auditPlanId = +id;

                this.isViewMode = mode === 'details';
                this.formTitle = 'Audit Summary';

                this.loadRecord(this.auditPlanId);
            }
        });
    } private initForm() {
        this.summaryForm = this.fb.group({
            formatNo: ['F-52'],
            docNo: ['F-52'],
            issueNo: ['03'],
            issueDate: ['', Validators.required],
            revNo: ['00'],
            revDate: ['--', Validators.required],

            auditPlanId: [null],

            auditPlanNo: [''],

            auditType: [''],

            planningYear: [null],

            leadAuditorId: [null],

            leadAuditor: [''],

            auditFrom: [null],

            auditTo: [null],

            auditCriteria: [''],

            scopeOfAudit: [''],

            auditObjective: [''],

            overallAuditStatus: [''],


            // ==========================
            // III. Audit Execution
            // ==========================

            totalAudits: [0],

            completed: [0],

            inProgress: [0],

            scheduled: [0],


            // ==========================
            // IV. Audit Findings
            // ==========================

            totalNcrs: [0],

            majorNcrs: [0],

            minorNcrs: [0],

            observations: [0],

            closedNcrs: [0],

            pendingNcrs: [0],
            preparedBy: [null],
            preparedDate: [null],

            reviewedBy: [null],
            reviewedDate: [null],

            approvedBy: [null],
            approvedDate: [null]

        });

        // System-managed fields — always readonly
        this.summaryForm.get('docNo')?.disable();
        this.summaryForm.get('issueNo')?.disable();
        this.summaryForm.get('revNo')?.disable();
        this.summaryForm.get('formatNo')?.disable();
    }

    private loadRecord(auditPlanId: number) {
        this.service.getSummaryByAuditPlanId(auditPlanId).subscribe(data => {
            if (!data) {
                return;
            }

            // Overall Audit Status calculate
            let overallAuditStatus = 'Scheduled';

            if (data.totalAudits > 0 && data.completed === data.totalAudits) {
                overallAuditStatus = 'Completed';
            }
            else if (
                data.inProgress > 0 ||
                data.completed > 0
            ) {
                overallAuditStatus = 'InProgress';
            }

            // Form patch
            this.summaryForm.patchValue({
                ...data,

                auditFrom: NablFormsHelper.formatDateForInput(
                    data.auditFrom
                ),

                auditTo: NablFormsHelper.formatDateForInput(
                    data.auditTo
                ),

                overallAuditStatus: overallAuditStatus
            });

            // Department Summary
            this.departmentSummary =
                data.departmentSummary || [];

            // Summary is read-only
            this.summaryForm.disable();

            // System fields
            this.summaryForm.get('docNo')?.disable();
            this.summaryForm.get('issueNo')?.disable();
            this.summaryForm.get('revNo')?.disable();
            this.summaryForm.get('formatNo')?.disable();
        });
    }
    toggleSection(section: string) {
        this.openSections[section] = !this.openSections[section];
    }

    onCancel() {
        this.router.navigate(['/audit-plan']);
    }

    canDeactivate(): Observable<boolean> | boolean {
        if (!this.summaryForm.dirty || this.saved) return true;
        return this.unsavedChangesService.confirm();
    }

    @HostListener('window:beforeunload', ['$event'])
    onBeforeUnload(event: BeforeUnloadEvent) {
        if (this.summaryForm?.dirty && !this.saved) {
            event.preventDefault();
            event.returnValue = '';
        }
    }
}
