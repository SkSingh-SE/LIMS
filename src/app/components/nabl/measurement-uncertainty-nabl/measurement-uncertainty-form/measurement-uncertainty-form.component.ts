import { Component, OnInit, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MeasurementUncertaintyService } from '../../../../services/measurement-uncertainty.service';
import { NablFormsHelper } from '../../../../utility/nabl-helpers/nabl-forms.helper';
import { ToastService } from '../../../../services/toast.service';

import { QuillModule } from 'ngx-quill';
import { Observable } from 'rxjs';
import { CanComponentDeactivate } from '../../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../../services/unsaved-changes.service';
import { NablSignatureSectionComponent } from '../../nabl-signature-section/nabl-signature-section.component';
import { NablHeaderService } from '../../../../services/nabl-header.service';
import { LaboratoryTestService } from '../../../../services/laboratory-test.service';
import { TestMethodSpecificationService } from '../../../../services/test-method-specification.service';
import { EmployeeService } from '../../../../services/employee.service';
import { SearchableDropdownComponent } from '../../../../utility/components/searchable-dropdown/searchable-dropdown.component';
@Component({
    imports: [CommonModule, ReactiveFormsModule, RouterModule, QuillModule, NablSignatureSectionComponent, SearchableDropdownComponent],
    templateUrl: './measurement-uncertainty-form.component.html',
    styleUrl: './measurement-uncertainty-form.component.css'
})
export class MeasurementUncertaintyFormComponent implements CanComponentDeactivate, OnInit {
    saved = false;
    isSubmitting = false;
    uncertaintyForm!: FormGroup;
    recordId: number = 0;
    isEditMode = false;
    isViewMode = false;
    formTitle = 'Add Measurement of Uncertainty Record (F-35)';
    formNumbers: string[] = NablFormsHelper.getFormNumbers();

    openSections: { [key: string]: boolean } = {
        header: true,
        testInfo: true,
        readings: true,
        sources: true,
        analysis: true,
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

    distributionDivisors: { [key: string]: number } = {
        'Normal': 2.0000,
        'Rectangular': 1.7320,
        'Triangular': 2.4490,
        'U-shaped': 1.4140
    };
    sourcees = [
        'Calibration Uncertainty',
        'Instrument Resolution',
        'Repeatability',
        'Reference Standard / CRM',
        'Operator Variation',
        'Environmental Conditions',
        'Temperature Variation',
        'Method Bias',
        'Reading Error',
        'Other'
    ];

    today = new Date().toISOString().split('T')[0];

    constructor(
        private fb: FormBuilder,
        private service: MeasurementUncertaintyService,
        private router: Router,
        private route: ActivatedRoute,
        private toastService: ToastService
        , private unsavedChangesService: UnsavedChangesService,
        private nablHeaderService: NablHeaderService,
        private laboratoryTestService: LaboratoryTestService,
        private testMethodSpecificationService: TestMethodSpecificationService,
        private employeeService: EmployeeService

    ) { }

    ngOnInit(): void {
        this.initForm();
        this.nablHeaderService.getFormDefaults('MeasurementUncertainty').subscribe({
            next: (defaults) => {
                this.uncertaintyForm.patchValue({ formatNo: defaults.formCode });
            },
            error: () => { }
        });
        this.recordId = Number(this.route.snapshot.params['id']);

        const path = this.route.snapshot.url[this.route.snapshot.url.length - 2]?.path;
        if (path === 'details') {
            this.isViewMode = true;
            this.formTitle = 'View Measurement of Uncertainty Record';
            this.uncertaintyForm.disable();
        } else if (path === 'edit') {
            this.isEditMode = true;
            this.formTitle = 'Edit Measurement of Uncertainty Record';
        }
        if (path != "details" && path != "edit") {
            this.service.getNextMUNo().subscribe({
                next: (res) => {
                    this.uncertaintyForm.patchValue({
                        muCode: res.muCode
                    })
                },
                error: () => { }
            });
        }
        if (this.recordId) {
            this.loadData();
        } else {
            // this.addReading();
            this.addUncertaintySource();
        }
        this.setupCalculation();
    }

    initForm(): void {
        this.uncertaintyForm = this.fb.group({
            id: [0],
            formatNo: ['F-35'],
            issueNo: ['01'],
            revNo: ['00'],
            date: [this.today, Validators.required],
            effectiveDate: [this.today, Validators.required],
            // reviewDate: [this.today, Validators.required],
            documentNo: ['F-35'],

            testParameter: [null, Validators.required],
            muCode: ['MU-001', Validators.required],
            // testMethod: ['', Validators.required],
            // equipmentUsed: ['', Validators.required],
            // sampleDescription: ['', Validators.required],
            laboratoryTestID: ['', Validators.required],
            testMethodID: ['', Validators.required],
            equipmentName: [''],
            equipmentID: ['', Validators.required],
            testMethodName: [''],
            laboratoryTestName: [''],
            sumOfSquares: [null, Validators.required],

            numberOfReadings: [10, [Validators.required, Validators.min(2)]],
            // readings: this.fb.array([]),

            // mean: [0],
            version: [null, Validators.required],
            // standardDeviation: [0],
            // typeAUncertainty: [0],
            // typeBUncertainty: [0],
            combinedUncertainty: [null, Validators.required],
            expandedUncertainty: [null, Validators.required],
            coverageFactor: [2, Validators.required],
            effectiveDegreesOfFreedom: [0],
            // confidenceLevel: ['95%', Validators.required],

            uncertaintySources: this.fb.array([]),

            remarks: [''],
            reviewedBy: [null],
            preparedBy: [null],
            approvedBy: [null],
            reviewedDate: [''],
            approvedDate: [''],
            preparedDate: [this.today],
            status: ['Completed']
        });

        // System-managed fields — always readonly
        this.uncertaintyForm.get('documentNo')?.disable();
        this.uncertaintyForm.get('issueNo')?.disable();
        this.uncertaintyForm.get('revNo')?.disable();
        this.uncertaintyForm.get('formatNo')?.disable();
        this.uncertaintyForm.get('date')?.disable();
        this.uncertaintyForm.get('muCode')?.disable();
    }

    // get readings(): FormArray {
    //     return this.uncertaintyForm.get('readings') as FormArray;
    // }

    get uncertaintySources(): FormArray {
        return this.uncertaintyForm.get('uncertaintySources') as FormArray;
    }
    getTestMethodDropdown = (searchTerm: string, pageNo: number, pageSize: number) => {
        return this.testMethodSpecificationService.getTestMethodSpecificationDropdown(searchTerm, pageNo, pageSize);
    };

    fetchEquipmentList = (term: string, page: number, pageSize: number): Observable<any[]> => {
        // Replace with actual service call to fetch equipment list
        return this.employeeService.getEquipmentDropdown(term, page, pageSize);
    }
    addUncertaintySource(): void {
        const sourceGroup = this.fb.group({
            source: ['Calibration Uncertainty', Validators.required],
            type: ['Type A', Validators.required],
            distribution: ['Normal', Validators.required],
            inputValue: [null, Validators.required],
            divisor: [2, Validators.required],
            sensitivityCoefficient: [null, Validators.required],
            standardUncertainty: [0, Validators.required],
            unit: [null, [Validators.required]],
            remarks: [null]
        });
        this.uncertaintySources.push(sourceGroup);
        this.calculateUncertainty();
    }

    removeUncertaintySource(index: number): void {
        if (this.uncertaintySources.length > 1) {
            this.uncertaintySources.removeAt(index);
        }
        this.calculateUncertainty();
    }

    onDistributionChange(index: number) {

        const row = this.uncertaintySources.at(index);

        const distribution = row.get('distribution')?.value;

        const divisor = this.distributionDivisors[distribution];

        row.patchValue({
            divisor: divisor
        }, { emitEvent: false });

        this.calculateUncertainty();

    }
    getLaboratoryTest = (term: string, page: number, pageSize: number): Observable<any[]> => {
        return this.laboratoryTestService.getLaboratoryTestDropdown(term, page, pageSize);
    };

    onLaboratorySelected(item: any) {
        if (!item) {
            this.uncertaintyForm.patchValue({ laboratoryTestID: null });
            return;
        }
        this.uncertaintyForm.patchValue({ laboratoryTestID: item.id, laboratoryTestName: item.name });
    }
    onEquipmentSelected(item: any) {
        if (!item) {
            this.uncertaintyForm.patchValue({ equipmentID: null });
            return;
        }
        this.uncertaintyForm.patchValue({ equipmentID: item.id, equipmentName: item.name });
    }

    onTestMethodSelected(item: any) {
        if (!item) {
            this.uncertaintyForm.patchValue({ testMethodID: null });
            return;
        }
        this.uncertaintyForm.patchValue({ testMethodID: item.id, testMethodName: item.name });
    }

    setupCalculation() {

        // Uncertainty rows
        this.uncertaintySources.valueChanges.subscribe(() => {
            this.calculateUncertainty();
        });

        // Coverage Factor
        this.uncertaintyForm.get('coverageFactor')?.valueChanges.subscribe(() => {
            this.calculateUncertainty();
        });

    }
    loadData(): void {
        this.service.getById(this.recordId).subscribe({
            next: (data) => {
                if (data) {

                    if (data.uncertaintySources) {
                        this.uncertaintySources.clear();
                        data.uncertaintySources.forEach(() => this.addUncertaintySource());
                    }
                    this.uncertaintyForm.patchValue(data);
                    this.uncertaintyForm.patchValue({
                        date: NablFormsHelper.formatDateForInput(data.date),
                        effectiveDate: NablFormsHelper.formatDateForInput(data.effectiveDate)
                    });
                    // Lock form if not in editable status
                    const status = (data as any).status;
                    if (status && status !== 'Draft' && status !== 'Rejected') {
                        this.uncertaintyForm.disable();
                        this.isViewMode = true;
                    } else if (this.isViewMode) {
                        this.uncertaintyForm.disable();
                    }
                    // Re-disable system fields (in case form was enabled for Draft/Rejected)
                    this.uncertaintyForm.get('documentNo')?.disable();
                    this.uncertaintyForm.get('issueNo')?.disable();
                    this.uncertaintyForm.get('revNo')?.disable();
                    this.uncertaintyForm.get('formatNo')?.disable();
                }
            },
            error: () => { }
        });
    }
    calculateUncertainty() {

        let sumOfSquares = 0;

        this.uncertaintySources.controls.forEach((row: any) => {

            const input = Number(row.get('inputValue')?.value) || 0;
            const divisor = Number(row.get('divisor')?.value) || 0;
            const sensitivity = Number(row.get('sensitivityCoefficient')?.value) || 0;

            let std = 0;

            if (divisor > 0) {
                std = (input / divisor) * sensitivity;
            }

            // Row Standard Uncertainty
            row.get('standardUncertainty')?.patchValue(
                Number(std.toFixed(4)),
                { emitEvent: false }
            );

            sumOfSquares += Math.pow(std, 2);

        });

        const combined = Math.sqrt(sumOfSquares);

        const k = Number(this.uncertaintyForm.get('coverageFactor')?.value) || 0;

        const expanded = combined * k;

        this.uncertaintyForm.patchValue({

            sumOfSquares: Number(sumOfSquares.toFixed(4)),

            combinedUncertainty: Number(combined.toFixed(4)),

            expandedUncertainty: Number(expanded.toFixed(4))

        }, { emitEvent: false });

    }




    onSubmit(): void {
        if (this.uncertaintyForm.invalid) {
            this.uncertaintyForm.markAllAsTouched();
            return;
        }

        const formData = this.uncertaintyForm.getRawValue();
        formData.preparedDate = this.today;
        formData.approvedDate = formData.approvedBy ? this.today : null;
        formData.reviewedDate = formData.reviewedBy ? this.today : null;
        if (this.isEditMode) {
            this.service.update(this.recordId, formData).subscribe({
                next: () => {
                    this.saved = true;
                    this.router.navigate(['/measurement-uncertainty']);
                    this.toastService.show('measurement uncertainty updated successfully', 'success')
                },
                error: (error: any) => { this.toastService.show(error?.error?.message || 'Failed to update record', 'error'); }
            });
        } else {
            this.service.create(formData).subscribe({
                next: () => {
                    this.saved = true;
                    this.router.navigate(['/measurement-uncertainty']);
                    this.toastService.show('measurement uncertainty created successfully', 'success')
                },
                error: (error: any) => { this.toastService.show(error?.error?.message || 'Failed to create record', 'error'); }
            });
        }
    }

    onCancel(): void {
        this.router.navigate(['/measurement-uncertainty']);
    }

    toggleSection(section: string): void {
        this.openSections[section] = !this.openSections[section];
    }

    canDeactivate(): Observable<boolean> | boolean {
        if (!this.uncertaintyForm.dirty || this.saved) return true;
        return this.unsavedChangesService.confirm();
    }

    @HostListener('window:beforeunload', ['$event'])
    onBeforeUnload(event: BeforeUnloadEvent) {
        if (this.uncertaintyForm?.dirty && !this.saved) {
            event.preventDefault();
            event.returnValue = '';
        }
    }
}
