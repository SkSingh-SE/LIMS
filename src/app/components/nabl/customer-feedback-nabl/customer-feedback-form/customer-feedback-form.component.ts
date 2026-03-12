import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { QuillModule } from 'ngx-quill';
import { CustomerFeedbackService } from '../../../../services/customer-feedback.service';
import { NablFormsHelper } from '../../../../utility/nabl-helpers/nabl-forms.helper';

@Component({
    selector: 'app-customer-feedback-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, QuillModule, RouterModule],
    templateUrl: './customer-feedback-form.component.html',
    styleUrl: './customer-feedback-form.component.css'
})
export class CustomerFeedbackFormComponent implements OnInit {
    feedbackForm!: FormGroup;
    isEditMode = false;
    isViewMode = false;
    recordId: number = 0;
    isLoading = false;
    formTitle = 'Customer Feedback Form';
    formNumbers = NablFormsHelper.getFormNumbers();

    feedbackParameters = [
        'Quality of Test Results',
        'Timely Delivery of Reports',
        'Technical Competence of Staff',
        'Response to Queries',
        'Behavior of Lab Personnel',
        'Overall Service'
    ];

    openSections: { [key: string]: boolean } = {
        header: true,
        customerInfo: true,
        ratings: true,
        comments: true
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
        private service: CustomerFeedbackService
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
                this.formTitle = this.isViewMode ? 'View Customer Feedback' : 'Edit Customer Feedback';
                this.loadRecord();
            }
        });
    }

    private initForm() {
        this.feedbackForm = this.fb.group({
            formatNo: ['F-47', Validators.required],
            docNo: ['DMSPL / Level-04 / Format / F-47', Validators.required],
            issueNo: ['03', Validators.required],
            issueDate: ['2021-10-01', Validators.required],
            revNo: ['00', Validators.required],
            revDate: ['--', Validators.required],

            customerName: ['', Validators.required],
            contactPerson: ['', Validators.required],
            date: ['', Validators.required],
            ratings: this.fb.array(this.feedbackParameters.map(p => this.fb.group({
                parameter: [p, Validators.required],
                rating: [null, [Validators.required, Validators.min(1), Validators.max(5)]]
            }))),
            comments: [''],
            suggestions: ['']
        });
    }

    get ratingsArray() {
        return this.feedbackForm.get('ratings') as FormArray;
    }

    private loadRecord() {
        this.isLoading = true;
        this.service.getById(this.recordId).subscribe(data => {
            if (data) {
                // Clear and rebuild ratings array if number of parameters differs (unlikely here but safe)
                this.feedbackForm.patchValue(data);
                if (this.isViewMode) this.feedbackForm.disable();
            }
            this.isLoading = false;
        });
    }

    toggleSection(section: string) {
        this.openSections[section] = !this.openSections[section];
    }

    onSubmit() {
        if (this.feedbackForm.valid) {
            if (this.isEditMode) {
                this.service.update(this.recordId, this.feedbackForm.value).subscribe(() => this.onCancel());
            } else {
                this.service.create(this.feedbackForm.value).subscribe(() => this.onCancel());
            }
        }
    }

    onCancel() {
        this.router.navigate(['/customer-feedback']);
    }
}
