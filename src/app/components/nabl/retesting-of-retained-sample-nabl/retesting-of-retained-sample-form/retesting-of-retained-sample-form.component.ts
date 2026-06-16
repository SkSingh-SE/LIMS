import { Component, OnInit, signal , HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { RetestingOfRetainedSampleService } from '../../../../services/retesting-of-retained-sample.service';
import { NablFormsHelper } from '../../../../utility/nabl-helpers/nabl-forms.helper';
import { ToastService } from '../../../../services/toast.service';

import { QuillModule } from 'ngx-quill';
import { Observable } from 'rxjs';
import { CanComponentDeactivate } from '../../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../../services/unsaved-changes.service';
import { NablSignatureSectionComponent } from '../../nabl-signature-section/nabl-signature-section.component';
import { NablHeaderService } from '../../../../services/nabl-header.service';

@Component({
    selector: 'app-retesting-of-retained-sample-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterModule, QuillModule, NablSignatureSectionComponent],
    templateUrl: './retesting-of-retained-sample-form.component.html',
    styleUrl: './retesting-of-retained-sample-form.component.css'
})
export class RetestingOfRetainedSampleFormComponent implements CanComponentDeactivate, OnInit {
  saved = false;
    retestForm!: FormGroup;
    recordId: number = 0;
    isEditMode = false;
    isViewMode = false;
    formTitle = 'Add Retesting of Retained Sample (F-38)';
    formNumbers: string[] = NablFormsHelper.getFormNumbers();

    openSections: { [key: string]: boolean } = {
        header: true,
        sampleInfo: true,
        parameters: true,
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
        private service: RetestingOfRetainedSampleService,
        private router: Router,
        private route: ActivatedRoute,
        private toastService: ToastService
    , private unsavedChangesService: UnsavedChangesService,
        private nablHeaderService: NablHeaderService) { }

    ngOnInit(): void {
        this.initForm();
        this.nablHeaderService.getFormDefaults('Retesting').subscribe({
            next: (defaults) => {
                this.retestForm.patchValue({ formatNo: defaults.formCode });
            },
            error: () => {}
        });
        this.recordId = Number(this.route.snapshot.params['id']);
        const path = this.route.snapshot.url[this.route.snapshot.url.length - 2]?.path;
        if (path === 'details') { this.isViewMode = true; this.formTitle = 'View Retesting Record'; this.retestForm.disable(); }
        else if (path === 'edit') { this.isEditMode = true; this.formTitle = 'Edit Retesting Record'; }
        if (this.recordId) { this.loadData(); } else { this.addParameter(); }
    }

    initForm(): void {
        const today = new Date().toISOString().split('T')[0];
        this.retestForm = this.fb.group({
            id: [0],
            formatNo: ['F-38'],
            issueNo: ['01'],
            revNo: ['00'],
            date: [today, Validators.required],
            documentNo: [''],
            discipline: ['', Validators.required],
            groupSubgroup: ['', Validators.required],
            sampleName: ['', Validators.required],
            originalSampleId: ['', Validators.required],
            dateOfOriginalTesting: ['', Validators.required],
            dateOfRetesting: [today, Validators.required],
            parameters: this.fb.array([]),
            remarks: [''],
            analyst: ['', Validators.required],
            authorizedSignatory: [''],
            status: ['Completed'],
            preparedBy: [''],
            reviewedBy: [''],
            approvedBy: ['']
        });

        // System-managed fields — always readonly
        this.retestForm.get('documentNo')?.disable();
        this.retestForm.get('issueNo')?.disable();
        this.retestForm.get('revNo')?.disable();
        this.retestForm.get('formatNo')?.disable();
    }

    get parameters(): FormArray { return this.retestForm.get('parameters') as FormArray; }

    addParameter(): void {
        const paramGroup = this.fb.group({
            srNo: [this.parameters.length + 1],
            parameterTested: ['', Validators.required],
            originalResult: ['', Validators.required],
            retestResult: ['', Validators.required],
            acceptableLimits: [''],
            deviation: [''],
            status: ['Satisfactory']
        });
        this.parameters.push(paramGroup);
    }

    removeParameter(index: number): void {
        if (this.parameters.length > 1) {
            this.parameters.removeAt(index);
            this.parameters.controls.forEach((ctrl, i) => ctrl.get('srNo')?.setValue(i + 1));
        }
    }

    loadData(): void {
        this.service.getById(this.recordId).subscribe({
            next: (data) => {
                if (data) {
                    if (data.parameters) { this.parameters.clear(); data.parameters.forEach(() => this.addParameter()); }
                    this.retestForm.patchValue(data);
                // Lock form if not in editable status
                const status = (data as any).status;
                if (status && status !== 'Draft' && status !== 'Rejected') {
                    this.retestForm.disable();
                    this.isViewMode = true;
                } else if (this.isViewMode) {
                    this.retestForm.disable();
                }
                // Re-disable system fields (in case form was enabled for Draft/Rejected)
                this.retestForm.get('documentNo')?.disable();
                this.retestForm.get('issueNo')?.disable();
                this.retestForm.get('revNo')?.disable();
                this.retestForm.get('formatNo')?.disable();
                }
            },
            error: () => {}
        });
    }

    onSubmit(): void {
        if (this.retestForm.invalid) { this.retestForm.markAllAsTouched(); return; }
        const formData = this.retestForm.getRawValue();
        const obs = this.isEditMode ? this.service.update(this.recordId, formData) : this.service.create(formData);
        obs.subscribe({
            next: (res) => {
              this.saved = true; this.toastService.show(res.message, 'success'); this.router.navigate(['/retesting-retained-sample']); },
            error: (err) => { this.toastService.show(err.message || 'Operation failed', 'error');  }
        });
    }

    onCancel(): void { this.router.navigate(['/retesting-retained-sample']); }
    toggleSection(section: string): void { this.openSections[section] = !this.openSections[section]; }

  canDeactivate(): Observable<boolean> | boolean {
    if (!this.retestForm.dirty || this.saved) return true;
    return this.unsavedChangesService.confirm();
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent) {
    if (this.retestForm?.dirty && !this.saved) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
