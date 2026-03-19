import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TestRequestNablService } from '../../../../services/test-request-nabl.service';
import { NablFormsHelper } from '../../../../utility/nabl-helpers/nabl-forms.helper';
import { ToastService } from '../../../../services/toast.service';
import { QuillModule } from 'ngx-quill';

@Component({
    selector: 'app-test-request-nabl-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterModule, QuillModule],
    templateUrl: './test-request-form.component.html'
})
export class TestRequestNablFormComponent implements OnInit {
    requestForm!: FormGroup;
    recordId: number = 0;
    isEditMode = false;
    isViewMode = false;
    formTitle = 'Add Test Request & Sample Receipt Record (F-27)';
    formNumbers: string[] = NablFormsHelper.getFormNumbers();

    dispatchModeOptions = ['Email', 'Courier', 'WhatsApp', 'Self Pickup', 'Speed Post'];
    quillModules = { toolbar: [['bold', 'italic', 'underline'], [{ list: 'ordered' }, { list: 'bullet' }], ['clean']] };

    openSections: { [key: string]: boolean } = {
        header: true,
        customer: true,
        samples: true,
        requirements: true,
        signatures: true
    };

    constructor(
        private fb: FormBuilder,
        private service: TestRequestNablService,
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
            this.formTitle = 'View Test Request & Sample Receipt Record';
            this.requestForm.disable();
        } else if (path === 'edit') {
            this.isEditMode = true;
            this.formTitle = 'Edit Test Request & Sample Receipt Record';
        }

        if (this.recordId) {
            this.loadData();
        } else {
            this.addSample();
        }
    }

    initForm(): void {
        const today = new Date().toISOString().split('T')[0];
        this.requestForm = this.fb.group({
            id: [0],
            formatNo: ['F-27', Validators.required],
            issueNo: ['01', Validators.required],
            revNo: ['00', Validators.required],
            date: [today, Validators.required],
            documentNo: ['', Validators.required],

            customerName: ['', Validators.required],
            address: ['', Validators.required],
            contactPerson: ['', Validators.required],
            mobileNo: ['', [Validators.required, Validators.pattern('^[0-9]{10,12}$')]],
            email: ['', [Validators.required, Validators.email]],
            gstNo: ['', Validators.pattern('^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$')],

            samples: this.fb.array([]),

            urgent: [false],
            returnSample: [false],
            holdTesting: [false],
            poNumber: [''],

            billRequired: [true],
            advancePIRequired: [false],
            dispatchModes: [[]],

            remarks: [''],
            preparedBy: ['', Validators.required],
            reviewedBy: [''],
            status: ['Completed']
        });
    }

    get samples(): FormArray {
        return this.requestForm.get('samples') as FormArray;
    }

    addSample(): void {
        const sampleGroup = this.fb.group({
            sampleNo: ['', Validators.required],
            description: ['', Validators.required],
            quantity: [1, [Validators.required, Validators.min(1)]],
            condition: ['Good Condition', Validators.required],
            metalClassification: ['']
        });
        this.samples.push(sampleGroup);
    }

    removeSample(index: number): void {
        if (this.samples.length > 1) {
            this.samples.removeAt(index);
        }
    }

    loadData(): void {
        this.service.getById(this.recordId).subscribe({
            next: (data) => {
                if (data) {
                    if (data.samples) {
                        this.samples.clear();
                        data.samples.forEach(() => this.addSample());
                    }
                    this.requestForm.patchValue(data);
                    if (this.isViewMode) this.requestForm.disable();
                }
            },
            error: () => {}
        });
    }

    onDispatchModeToggle(mode: string, event: Event): void {
        const checkbox = event.target as HTMLInputElement;
        const currentModes = this.requestForm.get('dispatchModes')?.value || [];
        if (checkbox.checked) {
            this.requestForm.get('dispatchModes')?.setValue([...currentModes, mode]);
        } else {
            this.requestForm.get('dispatchModes')?.setValue(currentModes.filter((m: string) => m !== mode));
        }
    }

    isDispatchModeSelected(mode: string): boolean {
        return (this.requestForm.get('dispatchModes')?.value || []).includes(mode);
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
                this.router.navigate(['/nabl/test-request']);
            },
            error: (err) => {
                this.toastService.show(err.message || 'Operation failed', 'error');
            }
        });
    }

    onCancel(): void {
        this.router.navigate(['/nabl/test-request']);
    }

    toggleSection(section: string): void {
        this.openSections[section] = !this.openSections[section];
    }
}
