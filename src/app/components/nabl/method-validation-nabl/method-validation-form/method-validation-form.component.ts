import { Component, OnInit, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MethodValidationNablService } from '../../../../services/method-validation-nabl.service';
import { NablFormsHelper } from '../../../../utility/nabl-helpers/nabl-forms.helper';
import { ToastService } from '../../../../services/toast.service';
import { QuillModule } from 'ngx-quill';
import { Observable } from 'rxjs';
import { CanComponentDeactivate } from '../../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../../services/unsaved-changes.service';
import { NablSignatureSectionComponent } from '../../nabl-signature-section/nabl-signature-section.component';
import { NablHeaderService } from '../../../../services/nabl-header.service';
import { read, start } from '@popperjs/core';

@Component({
    selector: 'app-method-validation-nabl-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterModule, QuillModule, NablSignatureSectionComponent],
    templateUrl: './method-validation-form.component.html'
})
export class MethodValidationNablFormComponent implements CanComponentDeactivate, OnInit {
    saved = false;
    isSubmitting = false;
    requestForm!: FormGroup;
    recordId: number = 0;
    isEditMode = false;
    isViewMode = false;
    formTitle = 'Add Method Validation Record (F-30)';
    formNumbers: string[] = NablFormsHelper.getFormNumbers();
    quillModules = { toolbar: [['bold', 'italic', 'underline'], [{ list: 'ordered' }, { list: 'bullet' }], ['clean']] };
    testMethodList: any[] = [];
    openSections: { [key: string]: boolean } = {
        header: true,
        methodInfo: true,
        parameters: true,
        results: true,
        signatures: true,
        documents: true,
        validationRequirement: true,
        conclusion: true,
        accuracy: true,
        precision: true,
        acceptanceCriteria: true
    };
    validationTypes: string[] = [
        'New Method',
        'Modified Method',
        'Method Transfer',
        'Scope Extension',
        'Equipment Change',
        'Regulatory Requirement',
        'Customer Requirement',
        'Periodic Revalidation'
    ];
    today = new Date().toISOString().split('T')[0];
    constructor(
        private fb: FormBuilder,
        private service: MethodValidationNablService,
        private router: Router,
        private route: ActivatedRoute,
        private toastService: ToastService
        , private unsavedChangesService: UnsavedChangesService,
        private nablHeaderService: NablHeaderService) { }

    ngOnInit(): void {
        this.initForm();
        this.nablHeaderService.getFormDefaults('MethodValidation').subscribe({
            next: (defaults) => {
                this.requestForm.patchValue({ formatNo: defaults.formCode });
            },
            error: () => { }
        });
        this.loadTestMethodList();
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
        }
    }

    initForm(): void {
        this.requestForm = this.fb.group({
            id: [0],
            formatNo: ['F-30'],
            issueNo: ['03'],
            revNo: ['00'],
            date: [this.today, Validators.required],
            documentNo: ['F-30'],
            testMethodName: ['', Validators.required],
            testMethodCode: ['', Validators.required],
            revIssue: ['', Validators.required],
            verificationDate: [this.today, Validators.required],
            verifiedBy: ['', Validators.required],
            validationDate: [this.today, Validators.required],
            validatedBy: ['', Validators.required],
            referenceStandard: ['', Validators.required],
            humidity: ['', Validators.required],
            temperature: ['', Validators.required],
            equipmentId: ['', Validators.required],
            equipmentName: ['', Validators.required],
            conclusion: ['', Validators.required],
            validStatus: ['Valid', Validators.required],
            reasonNotValid: [''],
            preparedBy: [''],
            reviewedBy: [null],
            approvedBy: [null],
            reviewedDate: [''],
            approvedDate: [''],
            accuracy: [false],
            precision: [false],
            repeatability: [false],
            recovery: [false],
            measurement: [false],
            robustness: [false],
            robustnessResults: [''],
            preparedDate: [this.today],
            crmMaterialParameters: this.fb.array([]),
            accuracyStudy: this.fb.array([]),
            precisionStudy: this.fb.array([]),
            status: ['Active'],
            // Acceptance Criteria
            recoveryMin: ['', Validators.required],
            recoveryMax: ['', Validators.required],
            rsdMax: ['', Validators.required],
            biasMax: ['', Validators.required],
            validationParameters: this.fb.array([]),
            measurementUncertainty: ['', Validators.required],
            expandedUncertainty: ['', Validators.required],
            coverageFactor: ['', Validators.required],
            confidenceLevel: ['', Validators.required],
            validationType: ['', Validators.required],
            reasonForValidation: ['', Validators.required],
            validationScope: [''],
        });

        // System-managed fields — always readonly
        this.requestForm.get('documentNo')?.disable();
        this.requestForm.get('issueNo')?.disable();
        this.requestForm.get('revNo')?.disable();
        this.requestForm.get('formatNo')?.disable();
        this.requestForm.get('validStatus')?.valueChanges.subscribe(value => {
            const reasonControl = this.requestForm.get('reasonNotValid');

            if (value === 'Not Valid') {
                reasonControl?.setValidators([Validators.required]);
            } else {
                reasonControl?.clearValidators();
                reasonControl?.setValue('');
            }

            reasonControl?.updateValueAndValidity();
        });
        // this.requestForm.get('robustness')?.valueChanges.subscribe(value => {
        //     const reasonControl = this.requestForm.get('robustnessRemarks');

        //     if (value === true) {
        //         reasonControl?.setValidators([Validators.required]);
        //     } else {
        //         reasonControl?.clearValidators();
        //         reasonControl?.setValue('');
        //     }

        //     reasonControl?.updateValueAndValidity();
        // });
    }
    loadTestMethodList(): void {
        this.service.getTestMethodList().subscribe({
            next: (data) => {
                this.testMethodList = data;
            },
            error: () => {
                this.testMethodList = [];
            }
        });
    }
    get crmMaterialParameters(): FormArray {
        return this.requestForm.get('crmMaterialParameters') as FormArray;
    }

    get accuracyStudy(): FormArray {
        return this.requestForm.get('accuracyStudy') as FormArray;
    }

    get precisionStudy(): FormArray {
        return this.requestForm.get('precisionStudy') as FormArray;
    }

    onChangeTestMethodCode(event: any): void {
        const testmethodCode = event.target.value;

        if (!testmethodCode) {
            return;
        }

        this.service.getTestMethodDetails(testmethodCode).subscribe({
            next: (data) => {
                this.requestForm.patchValue({
                    testMethodName: data?.testMethodName || '',
                    referenceStandard: data?.referenceStandard || '',
                    revIssue: data?.revIssue || '',
                    verificationDate: NablFormsHelper.formatDateForInput(data?.verificationDate),

                    verifiedBy: data?.verifiedBy || '',
                    humidity: data?.humidity || '',
                    temperature: data?.temperature || '',
                    equipmentId: data?.equipmentId || '',
                    equipmentName: data?.equipmentName || ''
                });

                if (data?.crmMaterialParameters) {
                    this.setCRMRows(data.crmMaterialParameters);
                }
            },
            error: () => {
                console.log('Failed to fetch test method details');
            }
        });
    }

    createCRMRow(crm?: any): FormGroup {
        const nextNo = this.crmMaterialParameters.length + 1;

        return this.fb.group({
            crmSampleId: [crm?.crmSampleId || `CRM-${nextNo.toString().padStart(3, '0')}`, Validators.required],
            certificateNo: [crm?.certificateNo || '', Validators.required],
            referenceValue: [crm?.referenceValue || '', Validators.required],
            unit: [crm?.unit || '', Validators.required],
            measurementUncertainty: [crm?.measurementUncertainty || '', Validators.required]
        });
    }

    createAccuracyRowFromCRM(crmRow: FormGroup): FormGroup {
        return this.fb.group({
            crmSampleId: [crmRow.get('crmSampleId')?.value],
            referenceValue: [crmRow.get('referenceValue')?.value],
            unit: [crmRow.get('unit')?.value],
            observationValue: ['', Validators.required],
            difference: [''],
            recovery: [''],
            status: ['']
        });
    }

    createPrecisionRowFromCRM(crmRow: FormGroup): FormGroup {
        return this.fb.group({
            crmSampleId: [crmRow.get('crmSampleId')?.value],
            referenceValue: [crmRow.get('referenceValue')?.value, Validators.required],
            unit: [crmRow.get('unit')?.value, Validators.required],
            reading1: [''],
            reading2: [''],
            reading3: [''],
            reading4: [''],
            reading5: [''],
            mean: ['', Validators.required],
            sd: ['', Validators.required],
            rsd: ['', Validators.required],
            status: ['']
        });
    }

    setCRMRows(crmList: any[]): void {
        this.crmMaterialParameters.clear();
        this.accuracyStudy.clear();
        this.precisionStudy.clear();

        if (!crmList || crmList.length === 0) {
            this.addCRMParameter();
            return;
        }

        crmList.forEach(crm => {
            this.addCRMParameter(crm);
        });
    }

    addCRMParameter(crm?: any): void {
        const crmGroup = this.createCRMRow(crm);

        this.crmMaterialParameters.push(crmGroup);
        this.accuracyStudy.push(this.createAccuracyRowFromCRM(crmGroup));
        this.precisionStudy.push(this.createPrecisionRowFromCRM(crmGroup));

        const index = this.crmMaterialParameters.length - 1;
        this.watchCRMChanges(index);
    }

    removeCRMParameter(index: number): void {
        if (this.crmMaterialParameters.length <= 1) {
            return;
        }

        this.crmMaterialParameters.removeAt(index);
        this.accuracyStudy.removeAt(index);
        this.precisionStudy.removeAt(index);

        this.regenerateCRMIds();
    }

    watchCRMChanges(index: number): void {
        const crmRow = this.crmMaterialParameters.at(index) as FormGroup;

        crmRow.get('crmSampleId')?.valueChanges.subscribe(value => {
            this.accuracyStudy.at(index)?.patchValue({ crmSampleId: value }, { emitEvent: false });
            this.precisionStudy.at(index)?.patchValue({ crmSampleId: value }, { emitEvent: false });
        });

        crmRow.get('referenceValue')?.valueChanges.subscribe(value => {
            this.accuracyStudy.at(index)?.patchValue({ referenceValue: value }, { emitEvent: false });
            this.precisionStudy.at(index)?.patchValue({ referenceValue: value }, { emitEvent: false });
            this.calculateaccuracyRow(index);
            this.calculatePrecisionRow(index);
        });

        crmRow.get('unit')?.valueChanges.subscribe(value => {
            this.accuracyStudy.at(index)?.patchValue({ unit: value }, { emitEvent: false });
            this.precisionStudy.at(index)?.patchValue({ unit: value }, { emitEvent: false });
        });
    }

    regenerateCRMIds(): void {
        this.crmMaterialParameters.controls.forEach((control, index) => {
            const newId = `CRM-${(index + 1).toString().padStart(3, '0')}`;

            control.patchValue({ crmSampleId: newId }, { emitEvent: false });

            this.accuracyStudy.at(index)?.patchValue({ crmSampleId: newId }, { emitEvent: false });
            this.precisionStudy.at(index)?.patchValue({ crmSampleId: newId }, { emitEvent: false });
        });
    }

    onAcceptanceCriteriaChange(): void {
        this.calculateAllaccuracyRows();
        this.calculateAllPrecisionRows();
    }

    calculateAllPrecisionRows(): void {
        this.precisionStudy.controls.forEach((_, index) => {
            this.calculatePrecisionRow(index);
        });
    }
    calculateAllaccuracyRows(): void {
        this.accuracyStudy.controls.forEach((_, index) => {
            this.calculateaccuracyRow(index);

        });
    }
    calculateaccuracyRow(index: number): void {
        const row = this.accuracyStudy.at(index) as FormGroup;

        const refRaw = row.get('referenceValue')?.value;
        const obsRaw = row.get('observationValue')?.value;

        const recoveryMinRaw = this.requestForm.get('recoveryMin')?.value;
        const recoveryMaxRaw = this.requestForm.get('recoveryMax')?.value;

        if (
            refRaw === '' || refRaw === null || refRaw === undefined ||
            obsRaw === '' || obsRaw === null || obsRaw === undefined ||
            recoveryMinRaw === '' || recoveryMinRaw === null || recoveryMinRaw === undefined ||
            recoveryMaxRaw === '' || recoveryMaxRaw === null || recoveryMaxRaw === undefined
        ) {
            row.patchValue({
                difference: '',
                recovery: '',
                status: ''
            }, { emitEvent: false });

            return;
        }

        const refValue = Number(refRaw);
        const obsValue = Number(obsRaw);
        const recoveryMin = Number(recoveryMinRaw);
        const recoveryMax = Number(recoveryMaxRaw);

        if (isNaN(refValue) || refValue === 0 || isNaN(obsValue)) {
            row.patchValue({
                difference: '',
                recovery: '',
                status: ''
            }, { emitEvent: false });
            return;
        }

        const difference = obsValue - refValue;
        const recovery = (obsValue / refValue) * 100;

        const status =
            recovery >= recoveryMin && recovery <= recoveryMax ? 'PASS' : 'FAIL';

        row.patchValue({
            difference: Number(difference.toFixed(2)),
            recovery: Number(recovery.toFixed(2)),
            status
        }, { emitEvent: false });
    }
    calculatePrecisionRow(index: number): void {
        const row = this.precisionStudy.at(index) as FormGroup;

        const rawReadings = [
            row.get('reading1')?.value,
            row.get('reading2')?.value,
            row.get('reading3')?.value,
            row.get('reading4')?.value,
            row.get('reading5')?.value
        ];

        const filledReadings = rawReadings
            .filter(x => x !== '' && x !== null && x !== undefined)
            .map(x => Number(x))
            .filter(x => !isNaN(x));

        if (filledReadings.length === 0) {
            row.patchValue({
                mean: '',
                sd: '',
                rsd: '',
                status: ''
            }, { emitEvent: false });

            return;
        }

        const totalReadings = filledReadings.length;

        const mean =
            filledReadings.reduce((sum, value) => sum + value, 0) / totalReadings;

        const variance =
            filledReadings.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0)
            / totalReadings;

        const sd = Math.sqrt(variance);

        const rsd = mean !== 0 ? (sd / mean) * 100 : 0;

        const rsdMaxRaw = this.requestForm.get('rsdMax')?.value;

        let status = '';

        if (rsdMaxRaw !== '' && rsdMaxRaw !== null && rsdMaxRaw !== undefined) {
            const rsdMax = Number(rsdMaxRaw);
            if (!isNaN(rsdMax)) {
                status = rsd <= rsdMax ? 'PASS' : 'FAIL';
            }
        }

        row.patchValue({
            mean: Number(mean.toFixed(2)),
            sd: Number(sd.toFixed(2)),
            rsd: Number(rsd.toFixed(2)),
            status
        }, { emitEvent: false });
    }
    calculateExpandedUncertainty(): void {
        const measurementUncertainty = Number(this.requestForm.get('measurementUncertainty')?.value);
        const coverageFactor = Number(this.requestForm.get('coverageFactor')?.value);
        if (isNaN(measurementUncertainty) || isNaN(coverageFactor)) {
            this.requestForm.patchValue({
                expandedUncertainty: ''
            }, { emitEvent: false });

            return;
        }
        const expandedUncertainty = measurementUncertainty * coverageFactor;

        this.requestForm.patchValue({
            expandedUncertainty: Number(expandedUncertainty.toFixed(2))
        }, { emitEvent: false });
    }


    loadData(): void {
        this.service.getById(this.recordId).subscribe({
            next: (data) => {
                if (data) {
                    if (data.crmMaterialParameters) {
                        this.crmMaterialParameters.clear();
                        data.crmMaterialParameters.forEach(() => this.addCRMParameter());
                    }
                    data.verificationDate = NablFormsHelper.formatDateForInput(data.verificationDate || null);
                    data.verificationDate = NablFormsHelper.formatDateForInput(data.verificationDate || null);
                    data.validationDate = NablFormsHelper.formatDateForInput(data.validationDate || null);
                    data.date = NablFormsHelper.formatDateForInput(data.date || null);
                    this.requestForm.patchValue(data);
                    // Lock form if not in editable status
                    const status = (data as any).status;
                    if (status && status !== 'Draft' && status !== 'Rejected') {
                        this.requestForm.disable();
                        this.isViewMode = true;
                    } else if (this.isViewMode) {
                        this.requestForm.disable();
                    }
                    // Re-disable system fields (in case form was enabled for Draft/Rejected)
                    this.requestForm.get('documentNo')?.disable();
                    this.requestForm.get('issueNo')?.disable();
                    this.requestForm.get('revNo')?.disable();
                    this.requestForm.get('formatNo')?.disable();
                }
            },
            error: () => { }
        });
    }

    onSubmit(): void {
        if (this.requestForm.invalid) {
            this.requestForm.markAllAsTouched();
            return;
        }

        const formData = this.requestForm.getRawValue();
        formData.precisionStudy?.forEach((row: any) => {

            row.reading1 = Number(row.reading1 || 0);
            row.reading2 = Number(row.reading2 || 0);
            row.reading3 = Number(row.reading3 || 0);
            row.reading4 = Number(row.reading4 || 0);
            row.reading5 = Number(row.reading5 || 0);
        });
        formData.preparedDate = this.today;
        formData.approvedDate = formData.approvedBy ? this.today : null;
        formData.reviewedDate = formData.reviewedBy ? this.today : null;
        if (formData.validStatus === "Valid") {
            formData.reasonNotValid = null;
        }
        if (formData.robustness === false) {
            formData.robustnessResults = null;
        }

        if (this.isEditMode) {
            this.service.update(this.recordId, formData).subscribe({
                next: () => {
                    this.saved = true;
                    this.toastService.show('Test Method Validation updated successfully', 'success');
                    this.router.navigate(['/nabl/method-validation']);
                },
                error: (error: any) => { this.toastService.show(error?.error?.message || 'Operation failed', 'error'); }
            });
        } else {
            this.service.create(formData).subscribe({
                next: () => {
                    this.saved = true;
                    this.toastService.show('Test Method Validation create successfully', 'success');
                    this.router.navigate(['/nabl/method-validation']);
                },
                error: (error: any) => { this.toastService.show(error?.error?.message || 'Operation failed', 'error'); }
            });
        }
    }
    onCancel(): void {
        this.router.navigate(['/nabl/method-validation']);
    }

    toggleSection(section: string): void {
        this.openSections[section] = !this.openSections[section];
    }

    canDeactivate(): Observable<boolean> | boolean {
        if (!this.requestForm.dirty || this.saved) return true;
        return this.unsavedChangesService.confirm();
    }

    @HostListener('window:beforeunload', ['$event'])
    onBeforeUnload(event: BeforeUnloadEvent) {
        if (this.requestForm?.dirty && !this.saved) {
            event.preventDefault();
            event.returnValue = '';
        }
    }
}
