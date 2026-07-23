import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { QuillModule } from 'ngx-quill';
import { CustomerFeedbackService } from '../../../../services/customer-feedback.service';
import { NablFormsHelper } from '../../../../utility/nabl-helpers/nabl-forms.helper';
import { Observable } from 'rxjs';
import { CanComponentDeactivate } from '../../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../../services/unsaved-changes.service';
import { NablSignatureSectionComponent } from '../../nabl-signature-section/nabl-signature-section.component';
import { NablHeaderService } from '../../../../services/nabl-header.service';
import { ToastService } from '../../../../services/toast.service';
@Component({
    selector: 'app-customer-feedback-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, QuillModule, RouterModule, NablSignatureSectionComponent],
    templateUrl: './customer-feedback-form.component.html',
    styleUrl: './customer-feedback-form.component.css'
})
export class CustomerFeedbackFormComponent implements CanComponentDeactivate, OnInit {
    saved = false;
    feedbackForm!: FormGroup;
    isEditMode = false;
    isViewMode = false;
    recordId: number = 0;
    formTitle = 'Customer Feedback Form';
    formNumbers = NablFormsHelper.getFormNumbers();

    feedbackParameters = [
        'Response to your inquiry',
        'Quality of Testing',
        'Testing Time',
        'Quality of Reporting',
        'Communication',
        'Complaint Handling'
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
    today = new Date().toISOString().split('T')[0];
    constructor(
        private fb: FormBuilder,
        private route: ActivatedRoute,
        private router: Router,
        private service: CustomerFeedbackService
        , private unsavedChangesService: UnsavedChangesService,
        private nablHeaderService: NablHeaderService,
        private toastService: ToastService
    ) {
        this.initForm();
        this.nablHeaderService.getFormDefaults('CustomerFeedback').subscribe({
            next: (defaults) => {
                this.feedbackForm.patchValue({ formatNo: defaults.formCode });
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
                this.formTitle = this.isViewMode ? 'View Customer Feedback' : 'Edit Customer Feedback';
                this.loadRecord();
            }
        });
    }

    private initForm() {
        this.feedbackForm = this.fb.group({
            formatNo: ['F-47'],
            docNo: ['F-47'],
            issueNo: ['03'],
            issueDate: [''],
            revNo: ['00'],
            revDate: [null],

            companyName: ['', Validators.required],
            reportedBy: ['', Validators.required],
            companyAddress: ['', Validators.required],
            contactPerson: ['', Validators.required],
            email: ['', [Validators.required, Validators.email]],
            mobileNo: ['', [Validators.required, Validators.pattern('^[0-9]{10,12}$')]],
            designation: ['', Validators.required],
            date: [this.today, Validators.required],
            feedbackDate: [this.today, Validators.required],
            ratings: this.fb.array(this.feedbackParameters.map(p => this.fb.group({
                parameter: [p],
                rating: [null]
            }))),
            commentsSuggestions: [''],
            note: [this.service.getDefaultNoteClause(), Validators.required],
            suggestions: [''],
            preparedBy: [''],
            reviewedBy: [null],
            approvedBy: [null],
            reviewedDate: [''],
            approvedDate: [''],
            preparedDate: [this.today],
        });

        // System-managed fields — always readonly
        this.feedbackForm.get('docNo')?.disable();
        this.feedbackForm.get('issueNo')?.disable();
        this.feedbackForm.get('revNo')?.disable();
        this.feedbackForm.get('formatNo')?.disable();
        this.feedbackForm.get('date')?.disable();
    }

    get ratingsArray() {
        return this.feedbackForm.get('ratings') as FormArray;
    }

    private loadRecord() {
        this.service.getById(this.recordId).subscribe(data => {
            if (data) {
                // Clear and rebuild ratings array if number of parameters differs (unlikely here but safe)
                this.feedbackForm.patchValue(data);
                this.feedbackForm.patchValue({
                    date: NablFormsHelper.formatDateForInput(data.date),
                    feedbackDate: NablFormsHelper.formatDateForInput(data.feedbackDate),
                });
                // Lock form if not in editable status
                const status = (data as any).status;
                if (status && status !== 'Draft' && status !== 'Rejected') {
                    this.feedbackForm.disable();
                    this.isViewMode = true;
                } else if (this.isViewMode) {
                    this.feedbackForm.disable();
                }
                // Re-disable system fields (in case form was enabled for Draft/Rejected)
                this.feedbackForm.get('docNo')?.disable();
                this.feedbackForm.get('issueNo')?.disable();
                this.feedbackForm.get('revNo')?.disable();
                this.feedbackForm.get('formatNo')?.disable();
            }
        });
    }

    toggleSection(section: string) {
        this.openSections[section] = !this.openSections[section];
    }

    onSubmit(): void {
        if (this.feedbackForm.invalid) {
            this.feedbackForm.markAllAsTouched();
            return;
        }

        const formData = this.feedbackForm.getRawValue();
        formData.preparedDate = this.today;
        formData.approvedDate = formData.approvedBy ? this.today : null;
        formData.reviewedDate = formData.reviewedBy ? this.today : null;
        if (formData.closerDate == "") {
            formData.closerDate = null;
        }

        if (this.isEditMode) {
            this.service.update(this.recordId, formData).subscribe({
                next: () => {
                    this.saved = true;
                    this.router.navigate(['/customer-feedback']);
                    this.toastService.show('customer feedback updated successfully', 'success')
                },
                error: (error: any) => { this.toastService.show(error?.error?.message || 'Failed to update record', 'error'); }
            });
        } else {
            this.service.create(formData).subscribe({
                next: () => {
                    this.saved = true;
                    this.router.navigate(['/customer-feedback']);
                    this.toastService.show('customer feedback created successfully', 'success')
                },
                error: (error: any) => { this.toastService.show(error?.error?.message || 'Failed to create record', 'error'); }
            });
        }
    }


    onCancel() {
        this.router.navigate(['/customer-feedback']);
    }

    canDeactivate(): Observable<boolean> | boolean {
        if (!this.feedbackForm.dirty || this.saved) return true;
        return this.unsavedChangesService.confirm();
    }

    @HostListener('window:beforeunload', ['$event'])
    onBeforeUnload(event: BeforeUnloadEvent) {
        if (this.feedbackForm?.dirty && !this.saved) {
            event.preventDefault();
            event.returnValue = '';
        }
    }
}
