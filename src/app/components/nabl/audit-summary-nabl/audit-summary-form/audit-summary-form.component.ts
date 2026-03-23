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

@Component({
    selector: 'app-audit-summary-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, QuillModule, RouterModule],
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
    , private unsavedChangesService: UnsavedChangesService) {
        this.initForm();
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
            formatNo: ['F-52', Validators.required],
            docNo: ['DMSPL / Level-04 / Format / F-52', Validators.required],
            issueNo: ['03', Validators.required],
            issueDate: ['2021-10-01', Validators.required],
            revNo: ['00', Validators.required],
            revDate: ['--', Validators.required],

            auditDate: ['', Validators.required],
            areasCovered: ['', Validators.required],
            majorNCs: [0, [Validators.required, Validators.min(0)]],
            minorNCs: [0, [Validators.required, Validators.min(0)]],
            observationSummary: ['', Validators.required],
            conclusion: ['', Validators.required]
        });
    }

    private loadRecord() {
        this.service.getById(this.recordId).subscribe(data => {
            if (data) {
                this.summaryForm.patchValue(data);
                if (this.isViewMode) this.summaryForm.disable();
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
                this.service.update(this.recordId, this.summaryForm.value).subscribe({
                    next: () => { this.isSubmitting = false; this.saved = true; this.onCancel(); },
                    error: () => { this.isSubmitting = false; }
                });
            } else {
                this.service.create(this.summaryForm.value).subscribe({
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
