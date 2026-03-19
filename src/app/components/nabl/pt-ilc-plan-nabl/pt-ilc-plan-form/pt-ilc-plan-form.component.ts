import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PtIlcPlanService } from '../../../../services/pt-ilc-plan.service';
import { NablFormsHelper } from '../../../../utility/nabl-helpers/nabl-forms.helper';
import { ToastService } from '../../../../services/toast.service';

import { QuillModule } from 'ngx-quill';

@Component({
    selector: 'app-pt-ilc-plan-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterModule, QuillModule],
    templateUrl: './pt-ilc-plan-form.component.html',
    styleUrl: './pt-ilc-plan-form.component.css'
})
export class PtIlcPlanFormComponent implements OnInit {
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
    ) { }

    ngOnInit(): void {
        this.initForm();
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
            formatNo: ['F-36', Validators.required],
            issueNo: ['01', Validators.required],
            revNo: ['00', Validators.required],
            date: [today, Validators.required],
            documentNo: ['', Validators.required],
            laboratoryId: ['', Validators.required],
            laboratoryName: ['', Validators.required],
            fieldOfAccreditation: ['', Validators.required],
            periodOfParticipation: ['', Validators.required],
            entries: this.fb.array([]),
            notes: [''],
            preparedBy: ['', Validators.required],
            issuedBy: [''],
            reviewedApprovedBy: [''],
            status: ['Active']
        });
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
                    if (this.isViewMode) this.planForm.disable();
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
            next: (res) => { this.toastService.show(res.message, 'success'); this.router.navigate(['/pt-ilc-plan']); },
            error: (err) => { this.toastService.show(err.message || 'Operation failed', 'error');  }
        });
    }

    onCancel(): void { this.router.navigate(['/pt-ilc-plan']); }
    toggleSection(section: string): void { this.openSections[section] = !this.openSections[section]; }
}
