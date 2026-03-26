import { Component, OnInit, signal , HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { QualityControlPlanService } from '../../../../services/quality-control-plan.service';
import { NablFormsHelper } from '../../../../utility/nabl-helpers/nabl-forms.helper';
import { ToastService } from '../../../../services/toast.service';

import { QuillModule } from 'ngx-quill';
import { Observable } from 'rxjs';
import { CanComponentDeactivate } from '../../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../../services/unsaved-changes.service';
import { NablSignatureSectionComponent } from '../../nabl-signature-section/nabl-signature-section.component';
import { NablHeaderService } from '../../../../services/nabl-header.service';

@Component({
    selector: 'app-quality-control-plan-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterModule, QuillModule, NablSignatureSectionComponent],
    templateUrl: './quality-control-plan-form.component.html',
    styleUrl: './quality-control-plan-form.component.css'
})
export class QualityControlPlanFormComponent implements CanComponentDeactivate, OnInit {
  saved = false;
    qcpForm!: FormGroup;
    recordId: number = 0;
    isEditMode = false;
    isViewMode = false;
    formTitle = 'Add Quality Control Plan (F-37)';
    formNumbers: string[] = NablFormsHelper.getFormNumbers();

    openSections: { [key: string]: boolean } = {
        header: true,
        planInfo: true,
        activities: true,
        approval: true
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

    constructor(
        private fb: FormBuilder,
        private service: QualityControlPlanService,
        private router: Router,
        private route: ActivatedRoute,
        private toastService: ToastService
    , private unsavedChangesService: UnsavedChangesService,
        private nablHeaderService: NablHeaderService) { }

    ngOnInit(): void {
        this.initForm();
        this.nablHeaderService.getFormDefaults('QualityControlPlan').subscribe({
            next: (defaults) => {
                this.qcpForm.patchValue({ formatNo: defaults.formCode });
            },
            error: () => {}
        });
        this.recordId = Number(this.route.snapshot.params['id']);
        const path = this.route.snapshot.url[this.route.snapshot.url.length - 2]?.path;
        if (path === 'details') { this.isViewMode = true; this.formTitle = 'View Quality Control Plan'; this.qcpForm.disable(); }
        else if (path === 'edit') { this.isEditMode = true; this.formTitle = 'Edit Quality Control Plan'; }
        if (this.recordId) { this.loadData(); } else { this.addActivity(); }
    }

    initForm(): void {
        const today = new Date().toISOString().split('T')[0];
        const currentYear = new Date().getFullYear().toString();
        this.qcpForm = this.fb.group({
            id: [0],
            formatNo: ['F-37'],
            issueNo: ['01'],
            revNo: ['00'],
            date: [today, Validators.required],
            documentNo: [''],
            planYear: [currentYear, Validators.required],
            discipline: ['', Validators.required],
            materialProductGroup: ['', Validators.required],
            labIncharge: ['', Validators.required],
            activities: this.fb.array([]),
            preparedBy: [''],
            reviewedBy: [''],
            approvedBy: [''],
            status: ['Active']
        });

        // System-managed fields — always readonly
        this.qcpForm.get('documentNo')?.disable();
        this.qcpForm.get('issueNo')?.disable();
        this.qcpForm.get('revNo')?.disable();
        this.qcpForm.get('formatNo')?.disable();
    }

    get activities(): FormArray { return this.qcpForm.get('activities') as FormArray; }

    addActivity(): void {
        const activityGroup = this.fb.group({
            srNo: [this.activities.length + 1],
            activityName: ['', Validators.required],
            plannedFrequency: ['', Validators.required],
            targetCriteria: ['', Validators.required],
            plannedDate: [''],
            actualDate: [''],
            resultStatus: ['Pending'],
            remarks: ['']
        });
        this.activities.push(activityGroup);
    }

    removeActivity(index: number): void {
        if (this.activities.length > 1) {
            this.activities.removeAt(index);
            this.activities.controls.forEach((ctrl, i) => ctrl.get('srNo')?.setValue(i + 1));
        }
    }

    loadData(): void {
        this.service.getById(this.recordId).subscribe({
            next: (data) => {
                if (data) {
                    if (data.activities) { this.activities.clear(); data.activities.forEach(() => this.addActivity()); }
                    this.qcpForm.patchValue(data);
                // Lock form if not in editable status
                const status = (data as any).status;
                if (status && status !== 'Draft' && status !== 'Rejected') {
                    this.qcpForm.disable();
                    this.isViewMode = true;
                } else if (this.isViewMode) {
                    this.qcpForm.disable();
                }
                // Re-disable system fields (in case form was enabled for Draft/Rejected)
                this.qcpForm.get('documentNo')?.disable();
                this.qcpForm.get('issueNo')?.disable();
                this.qcpForm.get('revNo')?.disable();
                this.qcpForm.get('formatNo')?.disable();
                }
            },
            error: () => {}
        });
    }

    onSubmit(): void {
        if (this.qcpForm.invalid) { this.qcpForm.markAllAsTouched(); return; }
        const formData = this.qcpForm.getRawValue();
        const obs = this.isEditMode ? this.service.update(this.recordId, formData) : this.service.create(formData);
        obs.subscribe({
            next: (res) => {
              this.saved = true; this.toastService.show(res.message, 'success'); this.router.navigate(['/quality-control-plan']); },
            error: (err) => { this.toastService.show(err.message || 'Operation failed', 'error');  }
        });
    }

    onCancel(): void { this.router.navigate(['/quality-control-plan']); }
    toggleSection(section: string): void { this.openSections[section] = !this.openSections[section]; }

  canDeactivate(): Observable<boolean> | boolean {
    if (!this.qcpForm.dirty || this.saved) return true;
    return this.unsavedChangesService.confirm();
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent) {
    if (this.qcpForm?.dirty && !this.saved) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
