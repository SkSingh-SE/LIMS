import { Component, OnInit , HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { SupplierEvaluationRecordService } from '../../../../services/supplier-evaluation-record.service';
import { ToastService } from '../../../../services/toast.service';
import { NablFormsHelper } from '../../../../utility/nabl-helpers/nabl-forms.helper';
import { QuillModule } from 'ngx-quill';
import { Observable } from 'rxjs';
import { CanComponentDeactivate } from '../../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../../services/unsaved-changes.service';
import { NablSignatureSectionComponent } from '../../nabl-signature-section/nabl-signature-section.component';
import { NablHeaderService } from '../../../../services/nabl-header.service';

@Component({
    selector: 'app-supplier-evaluation-record-form',

    imports: [CommonModule, ReactiveFormsModule, QuillModule, NablSignatureSectionComponent],
    templateUrl: './supplier-evaluation-record-form.component.html',
    styleUrls: ['./supplier-evaluation-record-form.component.css']
})
export class SupplierEvaluationRecordFormComponent implements CanComponentDeactivate, OnInit {
  saved = false;
    evaluationForm!: FormGroup;
    isEditMode = false;
    isViewMode = false;
    recordId: number | null = null;
    formNumbers: string[] = [];

    openSections: { [key: string]: boolean } = {
        header: true,
        supplier: true,
        evaluation: true,
        approval: true
    };

    quillModules = {
        toolbar: [
            ['bold', 'italic', 'underline'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            ['clean']
        ]
    };

    recommendationOptions = [
        { value: 'Approved', label: 'Approved' },
        { value: 'Conditionally Approved', label: 'Conditionally Approved' },
        { value: 'Rejected', label: 'Rejected' }
    ];

    defaultCriteria = [
        { parameter: 'Quality of Materials Supplied', maxScore: 40 },
        { parameter: 'Delivery Compliance', maxScore: 30 },
        { parameter: 'Pricing & Commercial Terms', maxScore: 15 },
        { parameter: 'After Sales Support / Response', maxScore: 15 }
    ];

    constructor(
        private fb: FormBuilder,
        private service: SupplierEvaluationRecordService,
        private router: Router,
        private route: ActivatedRoute,
        private toastService: ToastService,
        private unsavedChangesService: UnsavedChangesService,
        private nablHeaderService: NablHeaderService) { }

    ngOnInit(): void {
        this.formNumbers = NablFormsHelper.getFormNumbers();
        this.initForm();
        this.nablHeaderService.getFormDefaults('SupplierEvaluation').subscribe({
            next: (defaults) => {
                this.evaluationForm.patchValue({ formatNo: defaults.formCode });
            },
            error: () => {}
        });

        this.route.params.subscribe(params => {
            if (params['id']) {
                this.recordId = +params['id'];
                this.isEditMode = this.router.url.includes('/edit');
                this.isViewMode = this.router.url.includes('/details');
                this.loadRecordData();
            } else {
                // Init with default criteria if new
                this.defaultCriteria.forEach(c => this.addCriteria(c.parameter, c.maxScore));
                this.calculateTotals();
            }
        });

        // Subscribe to form value changes to calculate totals dynamically
        this.evaluationForm.get('criteria')?.valueChanges.subscribe(() => {
            this.calculateTotals();
        });
    }

    get formTitle(): string {
        if (this.isViewMode) return 'View Supplier Evaluation Record';
        return this.isEditMode ? 'Edit Supplier Evaluation Record' : 'New Supplier Evaluation Record';
    }

    initForm(): void {
        this.evaluationForm = this.fb.group({
            formatNo: ['F-26'],
            documentNo: [''],
            issueNo: [{ value: '01', disabled: true }],
            revNo: [{ value: '00', disabled: true }],
            date: [{ value: new Date().toISOString().split('T')[0], disabled: true }, Validators.required],

            supplierName: ['', Validators.required],
            contactPerson: [''],
            materialsSupplied: ['', Validators.required],
            evaluatingPeriodFrom: ['', Validators.required],
            evaluatingPeriodTo: ['', Validators.required],

            criteria: this.fb.array([]),

            totalScore: [{ value: 0, disabled: true }],
            maxPossibleScore: [{ value: 0, disabled: true }],
            percentageScore: [{ value: 0, disabled: true }],

            recommendation: ['Approved', Validators.required],
            generalRemarks: [''],
            evaluatedBy: ['', Validators.required],
            approvedBy: ['']
        });

        // System-managed fields — always readonly
        this.evaluationForm.get('documentNo')?.disable();
        this.evaluationForm.get('formatNo')?.disable();
    }

    get criteria(): FormArray {
        return this.evaluationForm.get('criteria') as FormArray;
    }

    addCriteria(parameter: string = '', maxScore: number = 10, scoreObtained: number = 0, remarks: string = ''): void {
        const itemGroup = this.fb.group({
            parameter: [parameter, Validators.required],
            maxScore: [maxScore, [Validators.required, Validators.min(1)]],
            scoreObtained: [scoreObtained, [Validators.required, Validators.min(0)]],
            remarks: [remarks]
        });
        this.criteria.push(itemGroup);
    }

    removeCriteria(index: number): void {
        this.criteria.removeAt(index);
        this.calculateTotals();
    }

    calculateTotals(): void {
        let totalObtained = 0;
        let maxTotal = 0;

        this.criteria.controls.forEach(ctrl => {
            const max = Number(ctrl.get('maxScore')?.value) || 0;
            const obtained = Number(ctrl.get('scoreObtained')?.value) || 0;

            // Prevent obtained from exceeding max in individual rows
            if (obtained > max && max > 0 && !this.isViewMode) {
                ctrl.get('scoreObtained')?.setValue(max, { emitEvent: false });
                totalObtained += max;
            } else {
                totalObtained += obtained;
            }

            maxTotal += max;
        });

        const percentage = maxTotal > 0 ? ((totalObtained / maxTotal) * 100).toFixed(2) : 0;

        this.evaluationForm.patchValue({
            totalScore: totalObtained,
            maxPossibleScore: maxTotal,
            percentageScore: Number(percentage)
        }, { emitEvent: false });
    }

    toggleSection(section: string): void {
        this.openSections[section] = !this.openSections[section];
    }

    loadRecordData(): void {
        if (!this.recordId) return;

        this.service.getById(this.recordId).subscribe(record => {
            if (record) {
                // Clear empty array default
                while (this.criteria.length !== 0) {
                    this.criteria.removeAt(0);
                }

                record.criteria.forEach((c) => {
                    this.addCriteria(c.parameter, c.maxScore, c.scoreObtained, c.remarks);
                });

                this.evaluationForm.patchValue(record);
                // Lock form if not in editable status
                const status = (record as any).status;
                if (status && status !== 'Draft' && status !== 'Rejected') {
                    this.evaluationForm.disable();
                    this.isViewMode = true;
                } else if (this.isViewMode) {
                    this.evaluationForm.disable();
                }
                // Re-disable system fields
                this.evaluationForm.get('documentNo')?.disable();
                this.evaluationForm.get('formatNo')?.disable();
            } else {
                this.toastService.show('Record not found', 'error');
                this.router.navigate(['/supplier-evaluation']);
            }
        });
    }

    onSubmit(): void {
        if (this.evaluationForm.invalid) {
            this.evaluationForm.markAllAsTouched();
            this.toastService.show('Please fill all required fields', 'warning');
            return;
        }

        const formData = this.evaluationForm.getRawValue();

        const request = this.isEditMode && this.recordId
            ? this.service.update(this.recordId, formData)
            : this.service.create(formData);

        request.subscribe(res => {
          this.saved = true;
            if (res.success) {
                this.toastService.show(`Record ${this.isEditMode ? 'updated' : 'created'} successfully`, 'success');
                this.router.navigate(['/supplier-evaluation']);
            } else {
                this.toastService.show('Failed to save record', 'error');
            }
        });
    }

    onCancel(): void {
        this.router.navigate(['/supplier-evaluation']);
    }

  canDeactivate(): Observable<boolean> | boolean {
    if (!this.evaluationForm.dirty || this.saved) return true;
    return this.unsavedChangesService.confirm();
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent) {
    if (this.evaluationForm?.dirty && !this.saved) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
