import { Component, OnInit , HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DocumentReviewService } from '../../../../services/document-review.service';
import { NablFormsHelper } from '../../../../utility/nabl-helpers/nabl-forms.helper';
import { Observable } from 'rxjs';
import { CanComponentDeactivate } from '../../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../../services/unsaved-changes.service';

@Component({
    selector: 'app-document-review-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterModule],
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

    openSections: { [key: string]: boolean } = {
        header: true,
        reviewDetails: true
    };

    constructor(
        private fb: FormBuilder,
        private route: ActivatedRoute,
        private router: Router,
        private service: DocumentReviewService
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
                this.formTitle = this.isViewMode ? 'View Document Review' : 'Edit Document Review';
                this.loadRecord();
            }
        });
    }

    private initForm() {
        this.reviewForm = this.fb.group({
            formatNo: ['F-45', Validators.required],
            docNo: ['DMSPL / Level-04 / Format / F-45', Validators.required],
            issueNo: ['03', Validators.required],
            issueDate: ['2021-10-01', Validators.required],
            revNo: ['00', Validators.required],
            revDate: ['--', Validators.required],

            srNo: [null],
            documentName: ['', Validators.required],
            lastReviewDate: ['', Validators.required],
            nextReviewDate: ['', Validators.required],
            reviewDoneBy: ['', Validators.required]
        });
    }

    private loadRecord() {
        this.service.getById(this.recordId).subscribe(data => {
            if (data) {
                this.reviewForm.patchValue(data);
                if (this.isViewMode) this.reviewForm.disable();
            }
        });
    }

    toggleSection(section: string) {
        this.openSections[section] = !this.openSections[section];
    }

    onSubmit() {
        if (this.reviewForm.valid) {
            if (this.isEditMode) {
                this.service.update(this.recordId, this.reviewForm.value).subscribe(() => { this.saved = true; this.onCancel(); });
            } else {
                this.service.create(this.reviewForm.value).subscribe(() => { this.saved = true; this.onCancel(); });
            }
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
