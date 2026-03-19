import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { SampleMusterRegisterNablService } from '../../../../services/sample-muster-register-nabl.service';
import { NablFormsHelper } from '../../../../utility/nabl-helpers/nabl-forms.helper';
import { ToastService } from '../../../../services/toast.service';

@Component({
    selector: 'app-sample-muster-register-nabl-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterModule],
    templateUrl: './sample-muster-register-form.component.html'
})
export class SampleMusterRegisterNablFormComponent implements OnInit {
    requestForm!: FormGroup;
    recordId: number = 0;
    isEditMode = false;
    isViewMode = false;
    formTitle = 'Add Sample Muster Register (F-32)';
    formNumbers: string[] = NablFormsHelper.getFormNumbers();

    openSections: { [key: string]: boolean } = {
        header: true,
        entries: true,
        signatures: true
    };

    constructor(
        private fb: FormBuilder,
        private service: SampleMusterRegisterNablService,
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
            this.formTitle = 'View Sample Muster Register';
            this.requestForm.disable();
        } else if (path === 'edit') {
            this.isEditMode = true;
            this.formTitle = 'Edit Sample Muster Register';
        }

        if (this.recordId) {
            this.loadData();
        } else {
            this.addEntry();
        }
    }

    initForm(): void {
        const today = new Date().toISOString().split('T')[0];
        this.requestForm = this.fb.group({
            id: [0],
            formatNo: ['F-32', Validators.required],
            issueNo: ['03', Validators.required],
            revNo: ['00', Validators.required],
            date: [today, Validators.required],
            documentNo: ['', Validators.required],

            entries: this.fb.array([]),

            preparedBy: ['', Validators.required],
            reviewedBy: ['', Validators.required],
            status: ['Active']
        });
    }

    get entries(): FormArray {
        return this.requestForm.get('entries') as FormArray;
    }

    addEntry(): void {
        const today = new Date().toISOString().split('T')[0];
        const group = this.fb.group({
            srNo: [this.entries.length + 1],
            sampleId: ['', Validators.required],
            receiptDate: [today, Validators.required],
            description: ['', Validators.required],
            testParameters: ['', Validators.required],
            analystName: ['', Validators.required],
            analysisStartDate: [''],
            analysisEndDate: [''],
            status: ['Pending', Validators.required],
            remarks: ['']
        });
        this.entries.push(group);
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
            },
            error: () => {}
        });
    }

    onSubmit(): void {
        if (this.requestForm.invalid) {
            this.requestForm.markAllAsTouched();
            return;
        }

        const formData = this.requestForm.getRawValue();

        const obs = this.isEditMode
            ? this.service.update(this.recordId, formData)
            : this.service.create(formData);

        obs.subscribe({
            next: (res) => {
                this.toastService.show(res.message, 'success');
                this.router.navigate(['/nabl/sample-muster-register']);
            },
            error: (err) => {
                this.toastService.show(err.message || 'Operation failed', 'error');
            }
        });
    }

    onCancel(): void {
        this.router.navigate(['/nabl/sample-muster-register']);
    }

    toggleSection(section: string): void {
        this.openSections[section] = !this.openSections[section];
    }
}
