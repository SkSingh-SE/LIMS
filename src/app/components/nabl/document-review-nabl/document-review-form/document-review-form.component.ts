import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DocumentReviewService } from '../../../../services/document-review.service';
import { NablFormsHelper } from '../../../../utility/nabl-helpers/nabl-forms.helper';

@Component({
    selector: 'app-document-review-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterModule],
    templateUrl: './document-review-form.component.html',
    styleUrl: './document-review-form.component.css'
})
export class DocumentReviewFormComponent implements OnInit {
    reviewForm!: FormGroup;
    isEditMode = false;
    isViewMode = false;
    recordId: number = 0;
    isLoading = false;
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
    ) {
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
        this.isLoading = true;
        this.service.getById(this.recordId).subscribe(data => {
            if (data) {
                this.reviewForm.patchValue(data);
                if (this.isViewMode) this.reviewForm.disable();
            }
            this.isLoading = false;
        });
    }

    toggleSection(section: string) {
        this.openSections[section] = !this.openSections[section];
    }

    onSubmit() {
        if (this.reviewForm.valid) {
            if (this.isEditMode) {
                this.service.update(this.recordId, this.reviewForm.value).subscribe(() => this.onCancel());
            } else {
                this.service.create(this.reviewForm.value).subscribe(() => this.onCancel());
            }
        }
    }

    onCancel() {
        this.router.navigate(['/document-review']);
    }
}
