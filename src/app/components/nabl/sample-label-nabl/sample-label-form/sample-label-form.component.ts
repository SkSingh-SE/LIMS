import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { SampleLabelNablService } from '../../../../services/sample-label-nabl.service';
import { NablFormsHelper } from '../../../../utility/nabl-helpers/nabl-forms.helper';
import { ToastService } from '../../../../services/toast.service';

@Component({
    selector: 'app-sample-label-nabl-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterModule],
    templateUrl: './sample-label-form.component.html'
})
export class SampleLabelNablFormComponent implements OnInit {
    requestForm!: FormGroup;
    recordId: number = 0;
    isEditMode = false;
    isViewMode = false;
    formTitle = 'Add Sample Label (F-33)';
    formNumbers: string[] = NablFormsHelper.getFormNumbers();
    openSections: { [key: string]: boolean } = { header: true, sample: true, analysis: true };

    toggleSection(section: string): void {
        this.openSections[section] = !this.openSections[section];
    }

    constructor(
        private fb: FormBuilder,
        private service: SampleLabelNablService,
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
            this.formTitle = 'View Sample Label';
            this.requestForm.disable();
        } else if (path === 'edit') {
            this.isEditMode = true;
            this.formTitle = 'Edit Sample Label';
        }

        if (this.recordId) {
            this.loadData();
        }
    }

    initForm(): void {
        const today = new Date().toISOString().split('T')[0];
        this.requestForm = this.fb.group({
            id: [0],
            formatNo: ['F-33', Validators.required],
            issueNo: ['03', Validators.required],
            revNo: ['00', Validators.required],
            sampleId: ['', Validators.required],
            receiptDate: [today, Validators.required],
            description: ['', Validators.required],
            quantity: ['', Validators.required],
            testParameters: ['', Validators.required],
            preparedBy: ['', Validators.required],
            status: ['Active']
        });
    }

    loadData(): void {
        this.service.getById(this.recordId).subscribe({
            next: (data) => {
                if (data) {
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
                this.router.navigate(['/nabl/sample-label']);
            },
            error: (err) => {
                this.toastService.show(err.message || 'Operation failed', 'error');
            }
        });
    }

    onCancel(): void {
        this.router.navigate(['/nabl/sample-label']);
    }
}
