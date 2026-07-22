import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { QuillModule } from 'ngx-quill';
import { ComplaintService } from '../../../../services/complaint.service';
import { NablFormsHelper } from '../../../../utility/nabl-helpers/nabl-forms.helper';
import { Observable } from 'rxjs';
import { CanComponentDeactivate } from '../../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../../services/unsaved-changes.service';
import { NablSignatureSectionComponent } from '../../nabl-signature-section/nabl-signature-section.component';
import { NablHeaderService } from '../../../../services/nabl-header.service';
import { ToastService } from '../../../../services/toast.service';
@Component({
    selector: 'app-complaint-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, QuillModule, RouterModule, NablSignatureSectionComponent],
    templateUrl: './complaint-form.component.html',
    styleUrl: './complaint-form.component.css'
})
export class ComplaintFormComponent implements CanComponentDeactivate, OnInit {
    saved = false;
    complaintForm!: FormGroup;
    isEditMode = false;
    isViewMode = false;
    recordId: number = 0;
    formTitle = 'Add New Complaint Entry';
    formNumbers = NablFormsHelper.getFormNumbers();

    openSections: { [key: string]: boolean } = {
        header: true,
        basicInfo: true,
        details: true,
        investigation: true,
        action: true
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
        private service: ComplaintService
        , private unsavedChangesService: UnsavedChangesService,
        private nablHeaderService: NablHeaderService,
        private toastService: ToastService) {
        this.initForm();
        this.nablHeaderService.getFormDefaults('Complaint').subscribe({
            next: (defaults) => {
                this.complaintForm.patchValue({ formatNo: defaults.formCode });
            },
            error: () => { }
        });
    }

    ngOnInit() {
        this.route.paramMap.subscribe(params => {
            const id = params.get('id');
            const mode = this.route.snapshot.url[1]?.path; // create/edit/details

            if (id && id !== 'create') {
                this.recordId = +id;
                this.isEditMode = mode === 'edit';
                this.isViewMode = mode === 'details';
                this.formTitle = this.isViewMode ? 'View Complaint Details' : 'Edit Complaint Entry';
                this.loadRecord();
            }
        });
    }

    private initForm() {
        this.complaintForm = this.fb.group({
            formatNo: ['F-40'],
            docNo: ['F-40'],
            issueNo: ['00'],
            date: [this.today, Validators.required],
            revNo: ['00'],
            // revDate: ['--', Validators.required],

            monthYear: ['', Validators.required],
            complaintNo: ['', Validators.required],
            complaintDate: [this.today, Validators.required],
            complainantName: ['', Validators.required],
            complaintDescription: ['', Validators.required],
            validationOfComplaint: [''],
            outcomeOfInvestigation: [''],
            correctiveAction: [''],
            referenceNoDate: ['', Validators.required],
            signatureQM: [null],
            preparedBy: [''],
            reviewedBy: [null],
            approvedBy: [null],
            reviewedDate: [''],
            approvedDate: [''],
            preparedDate: [this.today],
        });

        // System-managed fields — always readonly
        this.complaintForm.get('docNo')?.disable();
        this.complaintForm.get('issueNo')?.disable();
        this.complaintForm.get('revNo')?.disable();
        this.complaintForm.get('formatNo')?.disable();
        this.complaintForm.get('date')?.disable();
    }

    private loadRecord() {
        this.service.getById(this.recordId).subscribe(data => {
            if (data) {
                this.complaintForm.patchValue(data);
                this.complaintForm.patchValue({
                    monthYear: data.monthYear ? data.monthYear.substring(0, 7) : '',
                    complaintDate: NablFormsHelper.formatDateForInput(data.complaintDate),
                    referenceNoDate: NablFormsHelper.formatDateForInput(data.referenceNoDate),
                    date: NablFormsHelper.formatDateForInput(data.date),

                });
                // Lock form if not in editable status
                const status = (data as any).status;
                if (status && status !== 'Draft' && status !== 'Rejected') {
                    this.complaintForm.disable();
                    this.isViewMode = true;
                } else if (this.isViewMode) {
                    this.complaintForm.disable();
                }
                // Re-disable system fields (in case form was enabled for Draft/Rejected)
                this.complaintForm.get('docNo')?.disable();
                this.complaintForm.get('issueNo')?.disable();
                this.complaintForm.get('revNo')?.disable();
                this.complaintForm.get('formatNo')?.disable();
                this.complaintForm.get('date')?.disable();
            }
        });
    }

    toggleSection(section: string) {
        this.openSections[section] = !this.openSections[section];
    }



    onSubmit(): void {
        if (this.complaintForm.invalid) {
            this.complaintForm.markAllAsTouched();
            return;
        }

        const formData = this.complaintForm.getRawValue();
        if (formData.monthYear) {
            formData.monthYear = `${formData.monthYear}-01`;
        }
        formData.preparedDate = this.today;
        formData.approvedDate = formData.approvedBy ? this.today : null;
        formData.reviewedDate = formData.reviewedBy ? this.today : null;
        if (this.isEditMode) {
            this.service.update(this.recordId, formData).subscribe({
                next: () => {
                    this.saved = true;
                    this.router.navigate(['/complaint-register']);
                    this.toastService.show('complaint register updated successfully', 'success')
                },
                error: (error: any) => { this.toastService.show(error?.error?.message || 'Failed to update record', 'error'); }
            });
        } else {
            this.service.create(formData).subscribe({
                next: () => {
                    this.saved = true;
                    this.router.navigate(['/complaint-register']);
                    this.toastService.show('complaint register created successfully', 'success')
                },
                error: (error: any) => { this.toastService.show(error?.error?.message || 'Failed to create record', 'error'); }
            });
        }
    }

    onCancel() {
        this.router.navigate(['/complaint-register']);
    }

    canDeactivate(): Observable<boolean> | boolean {
        if (!this.complaintForm.dirty || this.saved) return true;
        return this.unsavedChangesService.confirm();
    }

    @HostListener('window:beforeunload', ['$event'])
    onBeforeUnload(event: BeforeUnloadEvent) {
        if (this.complaintForm?.dirty && !this.saved) {
            event.preventDefault();
            event.returnValue = '';
        }
    }
}
