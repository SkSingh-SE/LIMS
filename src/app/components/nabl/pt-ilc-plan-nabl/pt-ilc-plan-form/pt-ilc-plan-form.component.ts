import { Component, OnInit, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PtIlcPlanService } from '../../../../services/pt-ilc-plan.service';
import { NablFormsHelper } from '../../../../utility/nabl-helpers/nabl-forms.helper';
import { ToastService } from '../../../../services/toast.service';

import { QuillModule } from 'ngx-quill';
import { Observable } from 'rxjs';
import { CanComponentDeactivate } from '../../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../../services/unsaved-changes.service';
import { NablHeaderService } from '../../../../services/nabl-header.service';
import { NablSignatureSectionComponent } from '../../nabl-signature-section/nabl-signature-section.component';

@Component({
    selector: 'app-pt-ilc-plan-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterModule, QuillModule, NablSignatureSectionComponent],
    templateUrl: './pt-ilc-plan-form.component.html',
    styleUrl: './pt-ilc-plan-form.component.css'
})
export class PtIlcPlanFormComponent implements CanComponentDeactivate, OnInit {
    saved = false;
    planForm!: FormGroup;
    recordId: number = 0;
    isEditMode = false;
    isViewMode = false;
    formTitle = 'Add PT/ILC Plan (F-36)';
    formNumbers: string[] = NablFormsHelper.getFormNumbers();

    openSections: { [key: string]: boolean } = {
        header: true,
        labInfo: true,
        entries: true,
        note: true
    };

    quillModules = {
        toolbar: [
            ['bold', 'italic', 'underline', 'strike'],
            ['blockquote', 'code-block'],
            [{ 'header': 1 }, { 'header': 2 }],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            [{ 'script': 'sub' }, { 'script': 'super' }],
            [{ 'indent': '-1' }, { 'indent': '+1' }],
            [{ 'direction': 'rtl' }],
            [{ 'size': ['small', false, 'large', 'huge'] }],
            [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
            [{ 'color': [] }, { 'background': [] }],
            [{ 'font': [] }],
            [{ 'align': [] }],
            ['clean']
        ]
    };
    today = new Date().toISOString().split('T')[0];

    constructor(
        private fb: FormBuilder,
        private service: PtIlcPlanService,
        private router: Router,
        private route: ActivatedRoute,
        private toastService: ToastService
        , private unsavedChangesService: UnsavedChangesService,
        private nablHeaderService: NablHeaderService) { }

    ngOnInit(): void {
        this.initForm();
        this.nablHeaderService.getFormDefaults('PtIlcPlan').subscribe({
            next: (defaults) => {
                this.planForm.patchValue({ formatNo: defaults.formCode });
            },
            error: () => { }
        });
        this.recordId = Number(this.route.snapshot.params['id']);
        const path = this.route.snapshot.url[this.route.snapshot.url.length - 2]?.path;
        if (path === 'details') { this.isViewMode = true; this.formTitle = 'View PT/ILC Plan'; this.planForm.disable(); }
        else if (path === 'edit') { this.isEditMode = true; this.formTitle = 'Edit PT/ILC Plan'; }
        if (this.recordId) { this.loadData(); }
    }

    initForm(): void {
        this.planForm = this.fb.group({
            id: [0],
            formatNo: ['F-36'],
            issueNo: ['01'],
            revNo: ['00'],
            date: [this.today, Validators.required],
            preparedDate: [this.today],
            documentNo: ['F-36'],
            laboratoryId: ['', Validators.required],
            laboratoryName: ['', Validators.required],
            fieldOfAccreditation: ['', Validators.required],
            // entries: this.fb.array([]),
            activities: this.fb.array([this.createActivity()]),
            note: [this.service.getDefaultNoteClause()],
            preparedBy: [''],
            reviewedBy: [null],
            approvedBy: [null],
            reviewedDate: [''],
            approvedDate: [''],
            issuedBy: [''],
            reviewedApprovedBy: [''],
            status: ['Active'],
            periodStartDate: ['', Validators.required],
            periodEndDate: ['', Validators.required],
        });

        // System-managed fields — always readonly
        this.planForm.get('documentNo')?.disable();
        this.planForm.get('issueNo')?.disable();
        this.planForm.get('revNo')?.disable();
        this.planForm.get('date')?.disable();
        this.planForm.get('formatNo')?.disable();
    }

    get activities(): FormArray {
        return this.planForm.get('activities') as FormArray;
    }
    years(activityIndex: number): FormArray {
        return this.activities.at(activityIndex).get('years') as FormArray;
    }
    createYear(): FormGroup {
        return this.fb.group({
            ptActivity: ['', Validators.required],
            status: ['', Validators.required],
            remarks: ['']
        });
    }
    createActivity(): FormGroup {
        return this.fb.group({
            accreditedDiscipline: ['', Validators.required],
            groupSubgroup: ['', Validators.required],
            years: this.fb.array([this.createYear()])
        });
    }
    addActivity(): void {
        this.activities.push(this.createActivity());
    }

    removeActivity(index: number): void {
        if (this.activities.length > 1) {
            this.activities.removeAt(index);
        }
    }

    addYear(activityIndex: number): void {
        const yearArray = this.years(activityIndex);

        if (yearArray.length >= 4) {
            this.toastService.show("You cannot enter more than 4 years","warning");
            return;
        }
        this.years(activityIndex).push(this.createYear());
    }

    removeYear(activityIndex: number, yearIndex: number): void {
        const yearArray = this.years(activityIndex);

        if (yearArray.length > 1) {
            yearArray.removeAt(yearIndex);
        }
    }
    onPeriodStartChange(): void {
        const startDate = this.planForm.get('periodStartDate')?.value;
        const endDateControl = this.planForm.get('periodEndDate');

        if (!startDate) {
            endDateControl?.setValue('');
            return;
        }

        const endDate = endDateControl?.value;

        if (endDate && endDate < startDate) {
            endDateControl?.setValue('');
        }

        endDateControl?.updateValueAndValidity();
    }

    loadData(): void {
        this.service.getById(this.recordId).subscribe({
            next: (data) => {
                if (!data) return;

                const { activities, ...mainData } = data;

                this.planForm.patchValue({
                    ...mainData,
                    periodStartDate: NablFormsHelper.formatDateForInput(data.periodStartDate),
                    periodEndDate: NablFormsHelper.formatDateForInput(data.periodEndDate),
                    date: NablFormsHelper.formatDateForInput(data.date)
                });

                this.activities.clear();

                (activities || []).forEach((activity: any) => {
                    const activityGroup = this.fb.group({
                        accreditedDiscipline: [activity.accreditedDiscipline || '', Validators.required],
                        groupSubgroup: [activity.groupSubgroup || '', Validators.required],
                        years: this.fb.array([])
                    });

                    const yearsArray = activityGroup.get('years') as FormArray;

                    (activity.years || []).forEach((year: any) => {
                        yearsArray.push(this.fb.group({
                            ptActivity: [year.ptActivity || '', Validators.required],
                            status: [year.status || '', Validators.required],
                            remarks: [year.remarks || '']
                        }));
                    });

                    if (yearsArray.length === 0) {
                        yearsArray.push(this.createYear());
                    }

                    this.activities.push(activityGroup);
                });

                if (this.activities.length === 0) {
                    this.addActivity();
                }

                const status = data.status;

                if (status && status !== 'Draft' && status !== 'Rejected') {
                    this.planForm.disable();
                    this.isViewMode = true;
                } else if (this.isViewMode) {
                    this.planForm.disable();
                }

                this.planForm.get('documentNo')?.disable();
                this.planForm.get('issueNo')?.disable();
                this.planForm.get('revNo')?.disable();
                this.planForm.get('formatNo')?.disable();
            },
            error: () => { }
        });
    }
    onSubmit(): void {
        if (this.planForm.invalid) {
            this.planForm.markAllAsTouched(); return;
        }

        const formData = this.planForm.getRawValue();
        formData.preparedDate = this.today;
        formData.approvedDate = formData.approvedBy ? this.today : null;
        formData.reviewedDate = formData.reviewedBy ? this.today : null;
        if (this.isEditMode) {
            this.service.update(this.recordId, formData).subscribe({
                next: () => {
                    this.saved = true;
                    this.toastService.show('PT / ILC Plan updated successfully', 'success');
                    this.router.navigate(['/pt-ilc-plan']);
                },
                error: (error: any) => { this.toastService.show(error?.error?.message || 'Operation failed', 'error'); }
            });
        } else {
            this.service.create(formData).subscribe({
                next: () => {
                    this.saved = true;
                    this.toastService.show('PT / ILC Plan create successfully', 'success');
                    this.router.navigate(['/pt-ilc-plan']);
                },
                error: (error: any) => { this.toastService.show(error?.error?.message || 'Operation failed', 'error'); }
            });
        }
    }

    onCancel(): void { this.router.navigate(['/pt-ilc-plan']); }
    toggleSection(section: string): void { this.openSections[section] = !this.openSections[section]; }

    canDeactivate(): Observable<boolean> | boolean {
        if (!this.planForm.dirty || this.saved) return true;
        return this.unsavedChangesService.confirm();
    }


    @HostListener('window:beforeunload', ['$event'])
    onBeforeUnload(event: BeforeUnloadEvent) {
        if (this.planForm?.dirty && !this.saved) {
            event.preventDefault();
            event.returnValue = '';
        }
    }
}
