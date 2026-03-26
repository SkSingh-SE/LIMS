import { Component, OnInit , HostListener } from '@angular/core';
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

@Component({
    selector: 'app-nc-corrective-action-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, QuillModule, RouterModule, NablSignatureSectionComponent],
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

    constructor(
        private fb: FormBuilder,
        private route: ActivatedRoute,
        private router: Router,
        private service: NcCorrectiveActionService
    , private unsavedChangesService: UnsavedChangesService,
        private nablHeaderService: NablHeaderService) {
        this.initForm();
        this.nablHeaderService.getFormDefaults('NcCorrectiveAction').subscribe({
            next: (defaults) => {
                this.ncForm.patchValue({ formatNo: defaults.formCode });
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
                this.formTitle = this.isViewMode ? 'View NC Report' : 'Edit NC Report';
                this.loadRecord();
            }
        });
    }

    private initForm() {
        this.ncForm = this.fb.group({
            formatNo: ['F-42'],
            docNo: [''],
            issueNo: ['03'],
            issueDate: ['', Validators.required],
            revNo: ['00'],
            revDate: ['--', Validators.required],

            date: ['', Validators.required],
            ncNo: ['', Validators.required],
            clauseNo: [''],
            section: [''],
            activityAssessed: [''],
            auditor: [''],
            auditee: [''],
            ncObserved: ['', Validators.required],
            correctiveActionProposed: [''],
            timeRequired: [''],
            preparedBy: [''],
            reviewedBy: [''],
            proposedBy: [''],
            approvedBy: [''],
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
    }

    private loadRecord() {
        this.service.getById(this.recordId).subscribe(data => {
            if (data) {
                this.ncForm.patchValue(data);
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

    toggleSection(section: string) {
        this.openSections[section] = !this.openSections[section];
    }

    onSubmit() {
        if (this.ncForm.valid) {
            if (this.isEditMode) {
                this.service.update(this.recordId, this.ncForm.getRawValue()).subscribe(() => { this.saved = true; this.onCancel(); });
            } else {
                this.service.create(this.ncForm.getRawValue()).subscribe(() => { this.saved = true; this.onCancel(); });
            }
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
