import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { QuillModule } from 'ngx-quill';
import { NonConformingWorkService } from '../../../../services/non-conforming-work.service';
import { NablFormsHelper } from '../../../../utility/nabl-helpers/nabl-forms.helper';
import { Observable } from 'rxjs';
import { CanComponentDeactivate } from '../../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../../services/unsaved-changes.service';
import { NablSignatureSectionComponent } from '../../nabl-signature-section/nabl-signature-section.component';
import { NablHeaderService } from '../../../../services/nabl-header.service';
import { ToastService } from '../../../../services/toast.service';
import { Toast } from 'bootstrap';
@Component({
    selector: 'app-non-conforming-work-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, QuillModule, RouterModule, NablSignatureSectionComponent],
    templateUrl: './non-conforming-work-form.component.html',
    styleUrl: './non-conforming-work-form.component.css'
})
export class NonConformingWorkFormComponent implements CanComponentDeactivate, OnInit {
    saved = false;
    ncForm!: FormGroup;
    isEditMode = false;
    isViewMode = false;
    recordId: number = 0;
    formTitle = 'Add New Non-Conforming Work Record';
    formNumbers = NablFormsHelper.getFormNumbers();

    openSections: { [key: string]: boolean } = {
        header: true,
        basicInfo: true,
        analysis: true,
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
        private service: NonConformingWorkService
        , private unsavedChangesService: UnsavedChangesService,
        private nablHeaderService: NablHeaderService,
        private toastService: ToastService
    ) {
        this.initForm();
        this.nablHeaderService.getFormDefaults('NonConformingWork').subscribe({
            next: (defaults) => {
                this.ncForm.patchValue({ formatNo: defaults.formCode });
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
                this.formTitle = this.isViewMode ? 'View NC Record' : 'Edit NC Record';
                this.loadRecord();
            }
        });
    }

    private initForm() {
        this.ncForm = this.fb.group({
            formatNo: ['F-41'],
            docNo: ['F-41'],
            issueNo: ['03'],
            issueDate: [null],
            date: [this.today, Validators.required],
            revNo: ['00'],
            revDate: [null],

            ncDate: [this.today, Validators.required],
            ncDescription: ['', Validators.required],
            rootCauseAnalysis: [''],
            correctiveAction: [''],
            closerDate: [null],
            preparedBy: [''],
            reviewedBy: [null],
            approvedBy: [null],
            reviewedDate: [''],
            approvedDate: [''],
            preparedDate: [this.today],
        });

        // System-managed fields — always readonly
        this.ncForm.get('docNo')?.disable();
        this.ncForm.get('issueNo')?.disable();
        this.ncForm.get('revNo')?.disable();
        this.ncForm.get('formatNo')?.disable();
        this.ncForm.get('date')?.disable();
    }

    private loadRecord() {
        this.service.getById(this.recordId).subscribe(data => {
            if (data) {

                this.ncForm.patchValue(data);
                this.ncForm.patchValue({
                    date: NablFormsHelper.formatDateForInput(data.date),
                    ncDate: NablFormsHelper.formatDateForInput(data.ncDate),
                    closerDate: NablFormsHelper.formatDateForInput(data.closerDate)
                });
                // Lock form if not in editable status
                const status = (data as any).status;
                if (status && status !== 'Draft' && status !== 'Rejected') {
                    this.ncForm.disable();
                    this.isViewMode = true;
                } else if (this.isViewMode) {
                    this.ncForm.disable();
                }
                // Re-disable system fields (in case form was enabled for Draft/Rejected)
                this.ncForm.get('docNo')?.disable();
                this.ncForm.get('issueNo')?.disable();
                this.ncForm.get('revNo')?.disable();
                this.ncForm.get('formatNo')?.disable();
            }
        });
    }

    toggleSection(section: string) {
        this.openSections[section] = !this.openSections[section];
    }

    onSubmit(): void {
        if (this.ncForm.invalid) {
            this.ncForm.markAllAsTouched();
            return;
        }

        const formData = this.ncForm.getRawValue();
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
                    this.router.navigate(['/non-conforming-work']);
                    this.toastService.show('non-conforming-work updated successfully', 'success')
                },
                error: (error: any) => { this.toastService.show(error?.error?.message || 'Failed to update record', 'error'); }
            });
        } else {
            this.service.create(formData).subscribe({
                next: () => {
                    this.saved = true;
                    this.router.navigate(['/non-conforming-work']);
                    this.toastService.show('non-conforming-work created successfully', 'success')
                },
                error: (error: any) => { this.toastService.show(error?.error?.message || 'Failed to create record', 'error'); }
            });
        }
    }


    onCancel() {
        this.router.navigate(['/non-conforming-work']);
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
