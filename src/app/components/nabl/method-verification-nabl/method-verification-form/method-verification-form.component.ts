import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MethodVerificationNablService } from '../../../../services/method-verification-nabl.service';
import { NablFormsHelper } from '../../../../utility/nabl-helpers/nabl-forms.helper';
import { ToastService } from '../../../../services/toast.service';
import { QuillModule } from 'ngx-quill';

@Component({
    selector: 'app-method-verification-nabl-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterModule, QuillModule],
    templateUrl: './method-verification-form.component.html'
})
export class MethodVerificationNablFormComponent implements OnInit {
    requestForm!: FormGroup;
    recordId: number = 0;
    isEditMode = false;
    isViewMode = false;
    formTitle = 'Add Method Verification Record (F-29)';
    formNumbers: string[] = NablFormsHelper.getFormNumbers();
    quillModules = { toolbar: [['bold', 'italic', 'underline'], [{ list: 'ordered' }, { list: 'bullet' }], ['clean']] };

    openSections: { [key: string]: boolean } = {
        header: true,
        methodInfo: true,
        performance: true,
        rawData: true,
        conclusion: true,
        signatures: true
    };

    constructor(
        private fb: FormBuilder,
        private service: MethodVerificationNablService,
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
            this.formTitle = 'View Method Verification Record';
            this.requestForm.disable();
        } else if (path === 'edit') {
            this.isEditMode = true;
            this.formTitle = 'Edit Method Verification Record';
        }

        if (this.recordId) {
            this.loadData();
        } else {
            this.addPerformanceParameter();
            this.addRawDataRow();
        }
    }

    initForm(): void {
        const today = new Date().toISOString().split('T')[0];
        this.requestForm = this.fb.group({
            id: [0],
            formatNo: ['F-29', Validators.required],
            issueNo: ['03', Validators.required],
            revNo: ['00', Validators.required],
            date: [today, Validators.required],
            documentNo: ['', Validators.required],

            testMethodName: ['', Validators.required],
            referenceStandard: ['', Validators.required],
            equipmentUsed: ['', Validators.required],
            matrix: ['', Validators.required],
            range: ['', Validators.required],

            performanceParameters: this.fb.array([]),
            rawData: this.fb.array([]),

            conclusion: ['', Validators.required],

            preparedBy: ['', Validators.required],
            reviewedBy: ['', Validators.required],
            approvedBy: ['', Validators.required],
            status: ['Active']
        });
    }

    get performanceParameters(): FormArray {
        return this.requestForm.get('performanceParameters') as FormArray;
    }

    get rawData(): FormArray {
        return this.requestForm.get('rawData') as FormArray;
    }

    addPerformanceParameter(): void {
        const group = this.fb.group({
            parameter: ['', Validators.required],
            acceptanceCriteria: ['', Validators.required],
            observedValue: ['', Validators.required],
            result: ['Pass', Validators.required],
            remarks: ['']
        });
        this.performanceParameters.push(group);
    }

    removePerformanceParameter(index: number): void {
        if (this.performanceParameters.length > 1) {
            this.performanceParameters.removeAt(index);
        }
    }

    addRawDataRow(): void {
        const group = this.fb.group({
            sampleId: ['', Validators.required],
            reading1: [0, Validators.required],
            reading2: [0, Validators.required],
            reading3: [0, Validators.required],
            mean: [0],
            sd: [0],
            rsd: [0]
        });

        // Auto-calculate mean/sd/rsd
        group.valueChanges.subscribe(val => {
            const readings = [val.reading1, val.reading2, val.reading3].filter((r): r is number => r !== null && r !== undefined);
            if (readings.length > 0) {
                const sum = readings?.reduce((a, b) => a + b, 0);
                const mean = sum / readings.length;
                group.patchValue({ mean: Number(mean.toFixed(4)) }, { emitEvent: false });

                if (readings.length > 1) {
                    const sqDiffs = readings.map(v => Math.pow(v - mean, 2));
                    const avgSqDiff = sqDiffs.reduce((a, b) => a + b, 0) / (readings.length - 1);
                    const sd = Math.sqrt(avgSqDiff);
                    const rsd = mean !== 0 ? (sd / mean) * 100 : 0;
                    group.patchValue({
                        sd: Number(sd.toFixed(6)),
                        rsd: Number(rsd.toFixed(2))
                    }, { emitEvent: false });
                }
            }
        });

        this.rawData.push(group);
    }

    removeRawDataRow(index: number): void {
        if (this.rawData.length > 1) {
            this.rawData.removeAt(index);
        }
    }

    loadData(): void {
        this.service.getById(this.recordId).subscribe({
            next: (data) => {
                if (data) {
                    if (data.performanceParameters) {
                        this.performanceParameters.clear();
                        data.performanceParameters.forEach(() => this.addPerformanceParameter());
                    }
                    if (data.rawData) {
                        this.rawData.clear();
                        data.rawData.forEach(() => this.addRawDataRow());
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
                this.router.navigate(['/nabl/method-verification']);
            },
            error: (err) => {
                this.toastService.show(err.message || 'Operation failed', 'error');
            }
        });
    }

    onCancel(): void {
        this.router.navigate(['/nabl/method-verification']);
    }

    toggleSection(section: string): void {
        this.openSections[section] = !this.openSections[section];
    }
}
