import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TestMethodNablService } from '../../../../services/test-method-nabl.service';
import { NablFormsHelper } from '../../../../utility/nabl-helpers/nabl-forms.helper';
import { ToastService } from '../../../../services/toast.service';

@Component({
    selector: 'app-test-method-nabl-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterModule],
    templateUrl: './test-method-form.component.html'
})
export class TestMethodNablFormComponent implements OnInit {
    requestForm!: FormGroup;
    recordId: number = 0;
    isEditMode = false;
    isViewMode = false;
    isLoading = signal(false);
    formTitle = 'Add List of Test Methods / Ext Documents (F-28)';
    formNumbers: string[] = NablFormsHelper.getFormNumbers();

    listTypes = ['Test Method', 'External Document'];

    openSections: { [key: string]: boolean } = {
        header: true,
        details: true,
        entries: true,
        signatures: true
    };

    constructor(
        private fb: FormBuilder,
        private service: TestMethodNablService,
        private router: Router,
        private route: ActivatedRoute,
        private toastService: ToastService
    ) { }

    ngOnInit(): void {
        this.initForm();
        this.recordId = Number(this.route.snapshot.params['id']);

        const path = this.route.snapshot.url[this.route.snapshot.url.length - 2]?.path;
        if (path === 'details') {
            this.isViewMode = true;
            this.formTitle = 'View List of Test Methods / Ext Documents';
            this.requestForm.disable();
        } else if (path === 'edit') {
            this.isEditMode = true;
            this.formTitle = 'Edit List of Test Methods / Ext Documents';
        }

        if (this.recordId) {
            this.loadData();
        } else {
            this.addEntry();
        }

        // Update title when list type changes
        this.requestForm.get('listType')?.valueChanges.subscribe(type => {
            const currentTitle = this.requestForm.get('title')?.value;
            if (!currentTitle || currentTitle.startsWith('LIST OF ')) {
                const newTitle = type === 'Test Method'
                    ? 'LIST OF TEST METHOD (CHEMICAL ANALYSIS)'
                    : 'LIST OF EXTERNAL ORIGIN DOCUMENTS';
                this.requestForm.get('title')?.setValue(newTitle);
            }
        });
    }

    initForm(): void {
        const today = new Date().toISOString().split('T')[0];
        this.requestForm = this.fb.group({
            id: [0],
            formatNo: ['F-28', Validators.required],
            issueNo: ['03', Validators.required],
            revNo: ['00', Validators.required],
            date: [today, Validators.required],
            documentNo: ['', Validators.required],
            listType: ['Test Method', Validators.required],
            title: ['LIST OF TEST METHOD (CHEMICAL ANALYSIS)', Validators.required],

            entries: this.fb.array([]),

            preparedBy: ['', Validators.required],
            issuedBy: ['', Validators.required],
            reviewedBy: ['', Validators.required],
            status: ['Active']
        });
    }

    get entries(): FormArray {
        return this.requestForm.get('entries') as FormArray;
    }

    addEntry(): void {
        const entryGroup = this.fb.group({
            srNo: [this.entries.length + 1],
            specificationCode: ['', Validators.required],
            details: ['', Validators.required],
            requirement: [''],
            latestIssueRev: [''],
            monthYear: ['']
        });
        this.entries.push(entryGroup);
    }

    removeEntry(index: number): void {
        if (this.entries.length > 1) {
            this.entries.removeAt(index);
            // Re-index
            this.entries.controls.forEach((ctrl, idx) => {
                ctrl.get('srNo')?.setValue(idx + 1);
            });
        }
    }

    loadData(): void {
        this.isLoading.set(true);
        this.service.getById(this.recordId).subscribe({
            next: (data) => {
                if (data) {
                    if (data.entries) {
                        this.entries.clear();
                        data.entries.forEach(() => this.addEntry());
                    }
                    this.requestForm.patchValue(data);
                    if (this.isViewMode) this.requestForm.disable();
                }
                this.isLoading.set(false);
            },
            error: () => this.isLoading.set(false)
        });
    }

    onSubmit(): void {
        if (this.requestForm.invalid) {
            this.requestForm.markAllAsTouched();
            return;
        }

        this.isLoading.set(true);
        const formData = this.requestForm.getRawValue();

        const obs = this.isEditMode
            ? this.service.update(this.recordId, formData)
            : this.service.create(formData);

        obs.subscribe({
            next: (res) => {
                this.toastService.show(res.message, 'success');
                this.router.navigate(['/nabl/test-method']);
            },
            error: (err) => {
                this.toastService.show(err.message || 'Operation failed', 'error');
                this.isLoading.set(false);
            }
        });
    }

    onCancel(): void {
        this.router.navigate(['/nabl/test-method']);
    }

    toggleSection(section: string): void {
        this.openSections[section] = !this.openSections[section];
    }
}
