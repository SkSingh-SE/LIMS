import { Component, OnInit , HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { InternalAuditorService } from '../../../../services/internal-auditor.service';
import { ToastService } from '../../../../services/toast.service';
import { NablFormsHelper } from '../../../../utility/nabl-helpers/nabl-forms.helper';
import { Observable } from 'rxjs';
import { CanComponentDeactivate } from '../../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../../services/unsaved-changes.service';

@Component({
    selector: 'app-internal-auditor-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterModule],
    templateUrl: './internal-auditor-form.component.html',
    styleUrl: './internal-auditor-form.component.css'
})
export class InternalAuditorFormComponent implements CanComponentDeactivate, OnInit {
  saved = false;
    auditorForm!: FormGroup;
    isEditMode = false;
    isViewMode = false;
    recordId: number = 0;
    formTitle = 'Add Trained Internal Auditor';
    formNumbers = NablFormsHelper.getFormNumbers();

    openSections: { [key: string]: boolean } = {
        header: true,
        auditorDetails: true
    };

    constructor(
        private fb: FormBuilder,
        private route: ActivatedRoute,
        private router: Router,
        private service: InternalAuditorService,
        private toastService: ToastService,
        private unsavedChangesService: UnsavedChangesService) {
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
                this.formTitle = this.isViewMode ? 'View Internal Auditor' : 'Edit Internal Auditor';
                this.loadRecord();
            }
        });
    }

    private initForm() {
        this.auditorForm = this.fb.group({
            formatNo: ['F-49', Validators.required],
            docNo: ['DMSPL / Level-04 / Format / F-49', Validators.required],
            issueNo: ['03', Validators.required],
            issueDate: ['2021-10-01', Validators.required],
            revNo: ['00', Validators.required],
            revDate: ['--', Validators.required],

            auditorName: ['', Validators.required],
            qualification: ['', Validators.required],
            trainingDate: ['', Validators.required],
            examScore: ['', Validators.required],
            remarks: ['']
        });
    }

    private loadRecord() {
        this.service.getById(this.recordId).subscribe({
            next: (data) => {
                if (data) {
                    this.auditorForm.patchValue(data);
                    if (this.isViewMode) this.auditorForm.disable();
                }
            },
            error: (error: any) => { this.toastService.show(error?.error?.message || 'Failed to load record', 'error'); }
        });
    }

    toggleSection(section: string) {
        this.openSections[section] = !this.openSections[section];
    }

    onSubmit() {
        if (this.auditorForm.valid) {
            if (this.isEditMode) {
                this.service.update(this.recordId, this.auditorForm.value).subscribe({
                    next: () => { this.saved = true; this.onCancel(); },
                    error: (error: any) => { this.toastService.show(error?.error?.message || 'Failed to update record', 'error'); }
                });
            } else {
                this.service.create(this.auditorForm.value).subscribe({
                    next: () => { this.saved = true; this.onCancel(); },
                    error: (error: any) => { this.toastService.show(error?.error?.message || 'Failed to create record', 'error'); }
                });
            }
        }
    }

    onCancel() {
        this.router.navigate(['/internal-auditor']);
    }

  canDeactivate(): Observable<boolean> | boolean {
    if (!this.auditorForm.dirty || this.saved) return true;
    return this.unsavedChangesService.confirm();
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent) {
    if (this.auditorForm?.dirty && !this.saved) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
