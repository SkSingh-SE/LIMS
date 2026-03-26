import { Component, OnInit , HostListener } from '@angular/core';
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

    openSections: { [key: string]: boolean } = {
        header: true,
        summaryDetails: true
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
            error: () => {}
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
                this.formTitle = this.isViewMode ? 'View Audit Summary' : 'Edit Audit Summary';
                this.loadRecord();
            }
        });
    }

    private initForm() {
        this.summaryForm = this.fb.group({
            formatNo: ['F-52'],
            docNo: [''],
            issueNo: ['03'],
            issueDate: ['', Validators.required],
            revNo: ['00'],
            revDate: ['--', Validators.required],

            auditDate: ['', Validators.required],
            areasCovered: ['', Validators.required],
            majorNCs: [0, [Validators.required, Validators.min(0)]],
            minorNCs: [0, [Validators.required, Validators.min(0)]],
            observationSummary: ['', Validators.required],
            conclusion: ['', Validators.required],
            preparedBy: [''],
            reviewedBy: [''],
            approvedBy: ['']
        });

        // System-managed fields — always readonly
        this.summaryForm.get('docNo')?.disable();
        this.summaryForm.get('issueNo')?.disable();
        this.summaryForm.get('revNo')?.disable();
        this.summaryForm.get('formatNo')?.disable();
    }

    private loadRecord() {
        this.service.getById(this.recordId).subscribe(data => {
            if (data) {
                this.summaryForm.patchValue(data);
                // Lock form if not in editable status
                const status = (data as any).status;
                if (status && status !== 'Draft' && status !== 'Rejected') {
                    this.summaryForm.disable();
                    this.isViewMode = true;
                } else if (this.isViewMode) {
                    this.summaryForm.disable();
                }
                // Re-disable system fields (in case form was enabled for Draft/Rejected)
                this.summaryForm.get('docNo')?.disable();
                this.summaryForm.get('issueNo')?.disable();
                this.summaryForm.get('revNo')?.disable();
                this.summaryForm.get('formatNo')?.disable();
            }
        });
    }

    toggleSection(section: string) {
        this.openSections[section] = !this.openSections[section];
    }

    onSubmit() {
        if (this.summaryForm.valid) {
            this.isSubmitting = true;
            if (this.isEditMode) {
                this.service.update(this.recordId, this.summaryForm.getRawValue()).subscribe({
                    next: () => { this.isSubmitting = false; this.saved = true; this.onCancel(); },
                    error: () => { this.isSubmitting = false; }
                });
            } else {
                this.service.create(this.summaryForm.getRawValue()).subscribe({
                    next: () => { this.isSubmitting = false; this.saved = true; this.onCancel(); },
                    error: () => { this.isSubmitting = false; }
                });
            }
        }
    }

    onCancel() {
        this.router.navigate(['/audit-summary']);
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
