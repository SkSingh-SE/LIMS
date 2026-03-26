import { Component, OnInit , HostListener } from '@angular/core';
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

@Component({
    selector: 'app-document-change-request-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, QuillModule, RouterModule, NablSignatureSectionComponent],
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

    openSections: { [key: string]: boolean } = {
        header: true,
        docInfo: true,
        changes: true,
        approval: true
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
        private service: DocumentChangeRequestService
    , private unsavedChangesService: UnsavedChangesService,
        private nablHeaderService: NablHeaderService) {
        this.initForm();
        this.nablHeaderService.getFormDefaults('DocumentChangeRequest').subscribe({
            next: (defaults) => {
                this.changeForm.patchValue({ formatNo: defaults.formCode });
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
                this.formTitle = this.isViewMode ? 'View Change Request' : 'Edit Change Request';
                this.loadRecord();
            }
        });
    }

    private initForm() {
        this.changeForm = this.fb.group({
            formatNo: ['F-44'],
            docNo: [''],
            headerIssueNo: ['03', Validators.required],
            headerIssueDate: ['', Validators.required],
            headerRevNo: ['00', Validators.required],
            headerRevDate: ['--', Validators.required],

            date: ['', Validators.required],
            documentTitle: ['', Validators.required],
            documentNo: [''],
            issueNo: [''],
            revNo: [''],
            changesRequired: ['', Validators.required],
            justification: ['', Validators.required],
            preparedBy: [''],
            reviewedBy: [''],
            initiatedBy: ['', Validators.required],
            approvedBy: [''],
            actionTaken: ['']
        });

        // System-managed fields — always readonly
        this.changeForm.get('documentNo')?.disable();
        this.changeForm.get('docNo')?.disable();
        this.changeForm.get('issueNo')?.disable();
        this.changeForm.get('revNo')?.disable();
        this.changeForm.get('formatNo')?.disable();
        this.changeForm.get('headerIssueNo')?.disable();
        this.changeForm.get('headerRevNo')?.disable();
    }

    private loadRecord() {
        this.service.getById(this.recordId).subscribe(data => {
            if (data) {
                this.changeForm.patchValue(data);
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
                this.changeForm.get('headerIssueNo')?.disable();
                this.changeForm.get('headerRevNo')?.disable();
            }
        });
    }

    toggleSection(section: string) {
        this.openSections[section] = !this.openSections[section];
    }

    onSubmit() {
        if (this.changeForm.valid) {
            if (this.isEditMode) {
                this.service.update(this.recordId, this.changeForm.getRawValue()).subscribe(() => { this.saved = true; this.onCancel(); });
            } else {
                this.service.create(this.changeForm.getRawValue()).subscribe(() => { this.saved = true; this.onCancel(); });
            }
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
