import { Component, OnInit, signal , HostListener } from '@angular/core';
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

@Component({
    selector: 'app-pt-ilc-plan-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterModule, QuillModule],
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
            error: () => {}
        });
        this.recordId = Number(this.route.snapshot.params['id']);
        const path = this.route.snapshot.url[this.route.snapshot.url.length - 2]?.path;
        if (path === 'details') { this.isViewMode = true; this.formTitle = 'View PT/ILC Plan'; this.planForm.disable(); }
        else if (path === 'edit') { this.isEditMode = true; this.formTitle = 'Edit PT/ILC Plan'; }
        if (this.recordId) { this.loadData(); } else { this.addEntry(); }
    }

    initForm(): void {
        const today = new Date().toISOString().split('T')[0];
        this.planForm = this.fb.group({
            id: [0],
            formatNo: ['F-36'],
            issueNo: ['01'],
            revNo: ['00'],
            date: [today, Validators.required],
            documentNo: [''],
            laboratoryId: ['', Validators.required],
            laboratoryName: ['', Validators.required],
            fieldOfAccreditation: ['', Validators.required],
            periodOfParticipation: ['', Validators.required],
            entries: this.fb.array([]),
            notes: [''],
            preparedBy: [''],
            issuedBy: [''],
            reviewedApprovedBy: [''],
            status: ['Active']
        });

        // System-managed fields — always readonly
        this.planForm.get('documentNo')?.disable();
        this.planForm.get('issueNo')?.disable();
        this.planForm.get('revNo')?.disable();
        this.planForm.get('formatNo')?.disable();
    }

    get entries(): FormArray { return this.planForm.get('entries') as FormArray; }

    addEntry(): void {
        const entryGroup = this.fb.group({
            srNo: [this.entries.length + 1],
            accreditedDiscipline: ['', Validators.required],
            groupSubgroup: ['', Validators.required],
            ptActivityYear1: [''],
            ptActivityYear2: [''],
            statusYear1: [''],
            statusYear2: [''],
            remarksYear1: [''],
            remarksYear2: ['']
        });
        this.entries.push(entryGroup);
    }

    removeEntry(index: number): void {
        if (this.entries.length > 1) {
            this.entries.removeAt(index);
            this.entries.controls.forEach((ctrl, i) => ctrl.get('srNo')?.setValue(i + 1));
        }
    }

    loadData(): void {
        this.service.getById(this.recordId).subscribe({
            next: (data) => {
                if (data) {
                    if (data.entries) { this.entries.clear(); data.entries.forEach(() => this.addEntry()); }
                    this.planForm.patchValue(data);
                // Lock form if not in editable status
                const status = (data as any).status;
                if (status && status !== 'Draft' && status !== 'Rejected') {
                    this.planForm.disable();
                    this.isViewMode = true;
                } else if (this.isViewMode) {
                    this.planForm.disable();
                }
                // Re-disable system fields (in case form was enabled for Draft/Rejected)
                this.planForm.get('documentNo')?.disable();
                this.planForm.get('issueNo')?.disable();
                this.planForm.get('revNo')?.disable();
                this.planForm.get('formatNo')?.disable();
                }
            },
            error: () => {}
        });
    }

    onSubmit(): void {
        if (this.planForm.invalid) { this.planForm.markAllAsTouched(); return; }
        const formData = this.planForm.getRawValue();
        const obs = this.isEditMode ? this.service.update(this.recordId, formData) : this.service.create(formData);
        obs.subscribe({
            next: (res) => {
              this.saved = true; this.toastService.show(res.message, 'success'); this.router.navigate(['/pt-ilc-plan']); },
            error: (err) => { this.toastService.show(err.message || 'Operation failed', 'error');  }
        });
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
