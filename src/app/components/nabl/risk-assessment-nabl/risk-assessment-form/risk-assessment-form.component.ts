import { Component, OnInit , HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { QuillModule } from 'ngx-quill';
import { RiskAssessmentService } from '../../../../services/risk-assessment.service';
import { NablFormsHelper } from '../../../../utility/nabl-helpers/nabl-forms.helper';
import { Observable } from 'rxjs';
import { CanComponentDeactivate } from '../../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../../services/unsaved-changes.service';
import { ToastService } from '../../../../services/toast.service';
import { NablSignatureSectionComponent } from '../../nabl-signature-section/nabl-signature-section.component';
import { NablHeaderService } from '../../../../services/nabl-header.service';

@Component({
    selector: 'app-risk-assessment-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, QuillModule, RouterModule, NablSignatureSectionComponent],
    templateUrl: './risk-assessment-form.component.html',
    styleUrl: './risk-assessment-form.component.css'
})
export class RiskAssessmentFormComponent implements CanComponentDeactivate, OnInit {
  saved = false;
    riskForm!: FormGroup;
    isEditMode = false;
    isViewMode = false;
    recordId: number = 0;
    formTitle = 'Add New Risk Assessment';
    formNumbers = NablFormsHelper.getFormNumbers();

    openSections: { [key: string]: boolean } = {
        header: true,
        riskDetails: true
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
        private service: RiskAssessmentService,
        private unsavedChangesService: UnsavedChangesService,
        private toastService: ToastService,
        private nablHeaderService: NablHeaderService) {
        this.initForm();
        this.nablHeaderService.getFormDefaults('RiskAssessment').subscribe({
            next: (defaults) => {
                this.riskForm.patchValue({ formatNo: defaults.formCode });
            },
            error: () => {}
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
                this.formTitle = this.isViewMode ? 'View Risk Assessment' : 'Edit Risk Assessment';
                this.loadRecord();
            }
        });
    }

    private initForm() {
        this.riskForm = this.fb.group({
            formatNo: ['F-46'],
            docNo: [''],
            issueNo: ['03'],
            issueDate: ['', Validators.required],
            revNo: ['00'],
            revDate: ['--', Validators.required],

            date: ['', Validators.required],
            activityProcess: ['', Validators.required],
            riskIdentified: ['', Validators.required],
            opportunity: ['', Validators.required],
            mitigationPlan: ['', Validators.required],
            responsibility: ['', Validators.required],
            effectiveness: ['', Validators.required],
            preparedBy: [''],
            reviewedBy: [''],
            approvedBy: ['']
        });

        // System-managed fields — always readonly
        this.riskForm.get('docNo')?.disable();
        this.riskForm.get('issueNo')?.disable();
        this.riskForm.get('revNo')?.disable();
        this.riskForm.get('formatNo')?.disable();
    }

    private loadRecord() {
        this.service.getById(this.recordId).subscribe({
            next: (data) => {
                if (data) {
                    this.riskForm.patchValue(data);
                // Lock form if not in editable status
                const status = (data as any).status;
                if (status && status !== 'Draft' && status !== 'Rejected') {
                    this.riskForm.disable();
                    this.isViewMode = true;
                } else if (this.isViewMode) {
                    this.riskForm.disable();
                }
                // Re-disable system fields (in case form was enabled for Draft/Rejected)
                this.riskForm.get('docNo')?.disable();
                this.riskForm.get('issueNo')?.disable();
                this.riskForm.get('revNo')?.disable();
                this.riskForm.get('formatNo')?.disable();
                }
            },
            error: (error: any) => {
                this.toastService.show(error?.error?.message || 'Failed to load record', 'error');
            }
        });
    }

    toggleSection(section: string) {
        this.openSections[section] = !this.openSections[section];
    }

    onSubmit() {
        if (this.riskForm.valid) {
            if (this.isEditMode) {
                this.service.update(this.recordId, this.riskForm.getRawValue()).subscribe({
                    next: () => { this.saved = true; this.onCancel(); },
                    error: (error: any) => { this.toastService.show(error?.error?.message || 'Operation failed', 'error'); }
                });
            } else {
                this.service.create(this.riskForm.getRawValue()).subscribe({
                    next: () => { this.saved = true; this.onCancel(); },
                    error: (error: any) => { this.toastService.show(error?.error?.message || 'Operation failed', 'error'); }
                });
            }
        }
    }

    onCancel() {
        this.router.navigate(['/risk-assessment']);
    }

  canDeactivate(): Observable<boolean> | boolean {
    if (!this.riskForm.dirty || this.saved) return true;
    return this.unsavedChangesService.confirm();
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent) {
    if (this.riskForm?.dirty && !this.saved) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
