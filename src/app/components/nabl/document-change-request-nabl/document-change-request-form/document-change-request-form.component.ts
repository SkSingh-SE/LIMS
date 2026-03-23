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

@Component({
    selector: 'app-document-change-request-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, QuillModule, RouterModule],
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
                this.formTitle = this.isViewMode ? 'View Change Request' : 'Edit Change Request';
                this.loadRecord();
            }
        });
    }

    private initForm() {
        this.changeForm = this.fb.group({
            formatNo: ['F-44', Validators.required],
            docNo: ['DMSPL / Level-04 / Format / F-44', Validators.required],
            headerIssueNo: ['03', Validators.required],
            headerIssueDate: ['2021-10-01', Validators.required],
            headerRevNo: ['00', Validators.required],
            headerRevDate: ['--', Validators.required],

            date: ['', Validators.required],
            documentTitle: ['', Validators.required],
            documentNo: ['', Validators.required],
            issueNo: ['', Validators.required],
            revNo: ['', Validators.required],
            changesRequired: ['', Validators.required],
            justification: ['', Validators.required],
            initiatedBy: ['', Validators.required],
            approvedBy: ['', Validators.required],
            actionTaken: ['']
        });
    }

    private loadRecord() {
        this.service.getById(this.recordId).subscribe(data => {
            if (data) {
                this.changeForm.patchValue(data);
                if (this.isViewMode) this.changeForm.disable();
            }
        });
    }

    toggleSection(section: string) {
        this.openSections[section] = !this.openSections[section];
    }

    onSubmit() {
        if (this.changeForm.valid) {
            if (this.isEditMode) {
                this.service.update(this.recordId, this.changeForm.value).subscribe(() => { this.saved = true; this.onCancel(); });
            } else {
                this.service.create(this.changeForm.value).subscribe(() => { this.saved = true; this.onCancel(); });
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
