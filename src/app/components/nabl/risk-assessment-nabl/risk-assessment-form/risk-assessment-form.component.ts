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

@Component({
    selector: 'app-risk-assessment-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, QuillModule, RouterModule],
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
        private toastService: ToastService) {
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
                this.formTitle = this.isViewMode ? 'View Risk Assessment' : 'Edit Risk Assessment';
                this.loadRecord();
            }
        });
    }

    private initForm() {
        this.riskForm = this.fb.group({
            formatNo: ['F-46', Validators.required],
            docNo: ['DMSPL / Level-04 / Format / F-46', Validators.required],
            issueNo: ['03', Validators.required],
            issueDate: ['2021-10-01', Validators.required],
            revNo: ['00', Validators.required],
            revDate: ['--', Validators.required],

            date: ['', Validators.required],
            activityProcess: ['', Validators.required],
            riskIdentified: ['', Validators.required],
            opportunity: ['', Validators.required],
            mitigationPlan: ['', Validators.required],
            responsibility: ['', Validators.required],
            effectiveness: ['', Validators.required]
        });
    }

    private loadRecord() {
        this.service.getById(this.recordId).subscribe({
            next: (data) => {
                if (data) {
                    this.riskForm.patchValue(data);
                    if (this.isViewMode) this.riskForm.disable();
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
                this.service.update(this.recordId, this.riskForm.value).subscribe({
                    next: () => { this.saved = true; this.onCancel(); },
                    error: (error: any) => { this.toastService.show(error?.error?.message || 'Operation failed', 'error'); }
                });
            } else {
                this.service.create(this.riskForm.value).subscribe({
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
