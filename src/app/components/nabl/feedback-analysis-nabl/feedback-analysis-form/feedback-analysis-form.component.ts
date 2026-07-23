import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { QuillModule } from 'ngx-quill';
import { FeedbackAnalysisService } from '../../../../services/feedback-analysis.service';
import { NablFormsHelper } from '../../../../utility/nabl-helpers/nabl-forms.helper';
import { Observable } from 'rxjs';
import { CanComponentDeactivate } from '../../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../../services/unsaved-changes.service';
import { NablSignatureSectionComponent } from '../../nabl-signature-section/nabl-signature-section.component';
import { NablHeaderService } from '../../../../services/nabl-header.service';
import { SearchableDropdownComponent } from '../../../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { ToastService } from '../../../../services/toast.service';

@Component({
    selector: 'app-feedback-analysis-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, QuillModule, RouterModule, NablSignatureSectionComponent, SearchableDropdownComponent],
    templateUrl: './feedback-analysis-form.component.html',
    styleUrl: './feedback-analysis-form.component.css'
})
export class FeedbackAnalysisFormComponent implements CanComponentDeactivate, OnInit {
    saved = false;
    analysisForm!: FormGroup;
    isEditMode = false;
    isViewMode = false;
    recordId: number = 0;
    formTitle = 'Customer Feedback Analysis';
    formNumbers = NablFormsHelper.getFormNumbers();
    relatedFeedback: any = null;

    openSections: { [key: string]: boolean } = {
        header: true,
        analysisDetails: true,
        relatedForms: true,
        feedbackSummary: true,
        conclusion: true,
        verification: true,
        qualityAnalysis: true,
        comments: true
    };

    quillModules = {
        toolbar: [
            ['bold', 'italic', 'underline'],
            [{ list: 'ordered' }, { list: 'bullet' }],
            ['clean']
        ]
    };
    satisfactionList = [
        'Excellent',
        'Very Good',
        'Good',
        'Average',
        'Poor'
    ];

    // responsiblePersonList = [
    //     'Laboratory Incharge',
    //     'Quality Manager',
    //     'Technical Manager',
    //     'Section Head',
    //     'Department Head'
    // ];


    finalStatusList = [
        'Open',
        'Under Review',
        'Action Initiated',
        'Action Completed',
        'Closed'
    ];
    today = new Date().toISOString().split('T')[0];

    constructor(
        private fb: FormBuilder,
        private route: ActivatedRoute,
        private router: Router,
        private service: FeedbackAnalysisService
        , private unsavedChangesService: UnsavedChangesService,
        private nablHeaderService: NablHeaderService,
        private toastService: ToastService
    ) {
        this.initForm();
        this.nablHeaderService.getFormDefaults('FeedbackAnalysis').subscribe({
            next: (defaults) => {
                this.analysisForm.patchValue({ formatNo: defaults.formCode });
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
                this.formTitle = this.isViewMode ? 'View Feedback Analysis' : 'Edit Feedback Analysis';
                this.loadRecord();

            }
            if (id == null && mode == 'create') {
                this.service.getNextAnalysisNoNo().subscribe({
                    next: (res) => {
                        this.analysisForm.patchValue({
                            analysisNo: res.analysisNo
                        })
                    },
                    error: () => { }
                });
            }

        });
    }

    private initForm() {
        this.analysisForm = this.fb.group({
            formatNo: ['F-48'],
            docNo: ['F-48'],
            issueNo: ['03'],
            issueDate: [''],
            date: [this.today, Validators.required],
            revNo: ['00'],
            revDate: [null],
            preparedBy: [''],
            reviewedBy: [null],
            approvedBy: [null],
            reviewedDate: [null],
            approvedDate: [null],
            feedbackDate: [null],
            address: [''],
            averageRating: ['', Validators.required],
            overallGrade: ['', Validators.required],
            newRequirement: [''],
            customerRemarks: [''],
            suggestions: [''],
            preparedDate: [this.today],
            analysisDate: [this.today, Validators.required],
            feedbackRatings: this.fb.array([]),
            customerID: ['', Validators.required],
            customerName: [''],
            contactPerson: [''],
            email: [''],
            mobileNo: [''],
            analysisNo: ['', Validators.required],
            overallCustomerSatisfaction: ['', Validators.required],
            positiveObservations: [''],
            issuesIdentified: [''],
            rootCause: ['', Validators.required],
            improvementOpportunity: [''],
            correctiveActionRequired: ['No'],
            actionDetails: ['', Validators.required],
            responsiblePerson: [''],
            targetCompletionDate: [null],

            actionTaken: ['', Validators.required],
            effectivenessStatus: ['Effective', Validators.required],
            verificationRemarks: ['', Validators.required],
            verificationDate: [],

            overallConclusion: [null, Validators.required],
            finalStatus: ['Open', Validators.required],
        });

        // System-managed fields — always readonly
        this.analysisForm.get('documentNo')?.disable();
        this.analysisForm.get('docNo')?.disable();
        this.analysisForm.get('issueNo')?.disable();
        this.analysisForm.get('revNo')?.disable();
        this.analysisForm.get('formatNo')?.disable();
        this.analysisForm.get('date')?.disable();
        this.analysisForm.get('suggestions')?.disable();
        this.analysisForm.get('newRequirement')?.disable();
        this.analysisForm.get('analysisNo')?.disable();
    }

    get feedbackRatings(): FormArray {
        return this.analysisForm.get('feedbackRatings') as FormArray;
    }
    private loadRecord() {
        this.service.getById(this.recordId).subscribe(data => {
            if (data) {
                this.analysisForm.patchValue(data);
                this.analysisForm.patchValue({
                    date: NablFormsHelper.formatDateForInput(data.date),
                    analysisDate: NablFormsHelper.formatDateForInput(data.analysisDate) ?? null,
                    verificationDate: NablFormsHelper.formatDateForInput(data.verificationDate) ?? null,
                    targetCompletionDate: NablFormsHelper.formatDateForInput(data.targetCompletionDate) ?? null
                })
                // Lock form if not in editable status
                const status = (data as any).status;
                if (status && status !== 'Draft' && status !== 'Rejected') {
                    this.analysisForm.disable();
                    this.isViewMode = true;
                } else if (this.isViewMode) {
                    this.analysisForm.disable();
                }
                // Re-disable system fields (in case form was enabled for Draft/Rejected)
                this.analysisForm.get('documentNo')?.disable();
                this.analysisForm.get('docNo')?.disable();
                this.analysisForm.get('issueNo')?.disable();
                this.analysisForm.get('revNo')?.disable();
                this.analysisForm.get('formatNo')?.disable();
                // Load related Customer Feedback if linked
                const record = data as any;
                if (record.customerFeedbackId) {
                    this.relatedFeedback = {
                        id: record.customerFeedbackId,
                        documentNo: record.customerFeedback?.documentNo || 'N/A',
                        status: record.customerFeedback?.status || 'Draft'
                    };
                }
            }
        });
    }
    getCustomers = (term: string, page: number, pageSize: number): Observable<any[]> => {
        return this.service.getCustomerDropdown(term, page, pageSize)
    }
    onCustomerSelected(item: any) {
        if (!item) {
            this.analysisForm.patchValue({ customerID: null, customerName: '' });
            this.feedbackRatings.clear();
            return;
        }
        this.analysisForm.patchValue({
            customerID: item.id,
            customerName: item.name,
        });
        const id = item.id;
        this.service.getFeedbackDetails(id).subscribe({
            next: (res) => {

                this.analysisForm.patchValue({
                    companyName: res.companyName,
                    address: res.address,
                    contactPerson: res.contactPerson,
                    designation: res.designation,
                    email: res.email,
                    mobileNo: res.mobileNo,
                    averageRating: res.averageRating,
                    feedbackDate: NablFormsHelper.formatDateForInput(res.feedbackDate),
                    overallGrade: this.getOverallGrade(res.averageRating),
                    newRequirement: res.newRequirement,
                    suggestions: res.suggestions,
                });

                this.feedbackRatings.clear();

                res.ratings.forEach((x: any) => {
                    this.feedbackRatings.push(
                        this.fb.group({
                            parameterName: [x.parameter],
                            rating: [x.rating ?? 0]
                        })
                    );
                });

            }
        });
    }

    getOverallGrade(avg: number): string {
        switch (true) {
            case avg >= 4.5:
                return "Excellent";
            case avg >= 3.5:
                return "Very Good";
            case avg >= 2.5:
                return "Good";
            case avg >= 1.5:
                return "Average";
            default:
                return "Poor";
        }
    }
    toggleSection(section: string) {
        this.openSections[section] = !this.openSections[section];
    }

    onSubmit(): void {
        if (this.analysisForm.invalid) {
            this.analysisForm.markAllAsTouched();
            return;
        }

        const formData = this.analysisForm.getRawValue();
        formData.preparedDate = this.today;
        formData.approvedDate = formData.approvedBy ? this.today : null;
        formData.reviewedDate = formData.reviewedBy ? this.today : null;
        formData.verificationDate = formData.verificationDate ? formData.verificationDate : null;
        formData.targetCompletionDate = formData.targetCompletionDate ? formData.targetCompletionDate : null;
        formData.analysisDate = formData.analysisDate ? formData.analysisDate : null;

        if (this.isEditMode) {
            this.service.update(this.recordId, formData).subscribe({
                next: () => {
                    this.saved = true;
                    this.router.navigate(['/feedback-analysis']);
                    this.toastService.show('feedback analysis updated successfully', 'success')
                },
                error: (error: any) => { this.toastService.show(error?.error?.message || 'Failed to update record', 'error'); }
            });
        } else {
            this.service.create(formData).subscribe({
                next: () => {
                    this.saved = true;
                    this.router.navigate(['/feedback-analysis']);
                    this.toastService.show('feedback analysis created successfully', 'success')
                },
                error: (error: any) => { this.toastService.show(error?.error?.message || 'Failed to create record', 'error'); }
            });
        }
    }
    onCancel() {
        this.router.navigate(['/feedback-analysis']);
    }

    canDeactivate(): Observable<boolean> | boolean {
        if (!this.analysisForm.dirty || this.saved) return true;
        return this.unsavedChangesService.confirm();
    }

    @HostListener('window:beforeunload', ['$event'])
    onBeforeUnload(event: BeforeUnloadEvent) {
        if (this.analysisForm?.dirty && !this.saved) {
            event.preventDefault();
            event.returnValue = '';
        }
    }
}
