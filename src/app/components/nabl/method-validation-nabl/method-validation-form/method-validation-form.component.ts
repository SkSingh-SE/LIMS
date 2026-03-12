import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MethodValidationNablService } from '../../../../services/method-validation-nabl.service';
import { NablFormsHelper } from '../../../../utility/nabl-helpers/nabl-forms.helper';
import { ToastService } from '../../../../services/toast.service';
import { QuillModule } from 'ngx-quill';

@Component({
    selector: 'app-method-validation-nabl-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterModule, QuillModule],
    templateUrl: './method-validation-form.component.html'
})
export class MethodValidationNablFormComponent implements OnInit {
    requestForm!: FormGroup;
    recordId: number = 0;
    isEditMode = false;
    isViewMode = false;
    isLoading = signal(false);
    formTitle = 'Add Method Validation Record (F-30)';
    formNumbers: string[] = NablFormsHelper.getFormNumbers();
    quillModules = { toolbar: [['bold', 'italic', 'underline'], [{ list: 'ordered' }, { list: 'bullet' }], ['clean']] };

    openSections: { [key: string]: boolean } = {
        header: true,
        methodInfo: true,
        parameters: true,
        results: true,
        signatures: true
    };

    constructor(
        private fb: FormBuilder,
        private service: MethodValidationNablService,
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
            this.formTitle = 'View Method Validation Record';
            this.requestForm.disable();
        } else if (path === 'edit') {
            this.isEditMode = true;
            this.formTitle = 'Edit Method Validation Record';
        }

        if (this.recordId) {
            this.loadData();
        } else {
            this.addValidationParameter();
        }
    }

    initForm(): void {
        const today = new Date().toISOString().split('T')[0];
        this.requestForm = this.fb.group({
            id: [0],
            formatNo: ['F-30', Validators.required],
            issueNo: ['03', Validators.required],
            revNo: ['00', Validators.required],
            date: [today, Validators.required],
            documentNo: ['', Validators.required],

            testMethodName: ['', Validators.required],
            scope: ['', Validators.required],
            equipmentUsed: ['', Validators.required],
            reagentsUsed: ['', Validators.required],

            validationParameters: this.fb.array([]),

            summaryOfResults: ['', Validators.required],
            conclusion: ['', Validators.required],

            preparedBy: ['', Validators.required],
            reviewedBy: ['', Validators.required],
            approvedBy: ['', Validators.required],
            status: ['Active']
        });
    }

    get validationParameters(): FormArray {
        return this.requestForm.get('validationParameters') as FormArray;
    }

    addValidationParameter(): void {
        const group = this.fb.group({
            parameter: ['', Validators.required],
            description: ['', Validators.required],
            acceptanceCriteria: ['', Validators.required],
            observedValue: ['', Validators.required],
            result: ['Pass', Validators.required]
        });
        this.validationParameters.push(group);
    }

    removeValidationParameter(index: number): void {
        if (this.validationParameters.length > 1) {
            this.validationParameters.removeAt(index);
        }
    }

    loadData(): void {
        this.isLoading.set(true);
        this.service.getById(this.recordId).subscribe({
            next: (data) => {
                if (data) {
                    if (data.validationParameters) {
                        this.validationParameters.clear();
                        data.validationParameters.forEach(() => this.addValidationParameter());
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
                this.router.navigate(['/nabl/method-validation']);
            },
            error: (err) => {
                this.toastService.show(err.message || 'Operation failed', 'error');
                this.isLoading.set(false);
            }
        });
    }

    onCancel(): void {
        this.router.navigate(['/nabl/method-validation']);
    }

    toggleSection(section: string): void {
        this.openSections[section] = !this.openSections[section];
    }
}
