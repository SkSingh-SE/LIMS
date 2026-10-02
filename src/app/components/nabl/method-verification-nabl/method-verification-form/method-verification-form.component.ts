import { Component, OnInit, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MethodVerificationNablService } from '../../../../services/method-verification-nabl.service';
import { NablFormsHelper } from '../../../../utility/nabl-helpers/nabl-forms.helper';
import { ToastService } from '../../../../services/toast.service';
import { QuillModule } from 'ngx-quill';
import { Observable } from 'rxjs';
import { CanComponentDeactivate } from '../../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../../services/unsaved-changes.service';
import { NablSignatureSectionComponent } from '../../nabl-signature-section/nabl-signature-section.component';
import { NablHeaderService } from '../../../../services/nabl-header.service';

@Component({
    selector: 'app-method-verification-nabl-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterModule, QuillModule, NablSignatureSectionComponent],
    templateUrl: './method-verification-form.component.html'
})
export class MethodVerificationNablFormComponent implements CanComponentDeactivate, OnInit {
    saved = false;
    isSubmitting = false;
    requestForm!: FormGroup;
    recordId: number = 0;
    isEditMode = false;
    isViewMode = false;
    formTitle = 'Add Method Verification Record (F-29)';
    formNumbers: string[] = NablFormsHelper.getFormNumbers();
    quillModules = { toolbar: [['bold', 'italic', 'underline'], [{ list: 'ordered' }, { list: 'bullet' }], ['clean']] };
    testMethodList: any[] = [];
    openSections: { [key: string]: boolean } = {
        header: true,
        methodInfo: true,
        equipmentInfo: true,
        performance: true,
        rawData: true,
        conclusion: true,
        verificationData: true,
        acceptanceCriteria: true,
        signatures: true
    };
    today = new Date().toISOString().split('T')[0];
    constructor(
        private fb: FormBuilder,
        private service: MethodVerificationNablService,
        private router: Router,
        private route: ActivatedRoute,
        private toastService: ToastService
        , private unsavedChangesService: UnsavedChangesService,
        private nablHeaderService: NablHeaderService) { }


    initForm(): void {

        this.requestForm = this.fb.group({
            id: [0],
            formatNo: ['F-29'],
            issueNo: ['03'],
            revNo: ['00'],
            date: [this.today, Validators.required],
            documentNo: [''],

            testMethodName: ['', Validators.required],
            testMethodCode: ['', Validators.required],
            revIssue: ['', Validators.required],
            verificationDate: [this.today, Validators.required],
            verifiedBy: ['', Validators.required],
            referenceStandard: ['', Validators.required],
            humidity: ['', Validators.required],
            temperature: ['', Validators.required],
            calibrationDueDate: ['', Validators.required],
            equipmentId: ['', Validators.required],
            equipmentName: ['', Validators.required],
            crmParameters: this.fb.array([]),
            verificationData: this.fb.array([]),

            conclusion: ['', Validators.required],
            verificationStatus: ['Verified', Validators.required],
            reasonNotVerified: [''],
            preparedBy: [''],
            reviewedBy: [null],
            approvedBy: [null],
            reviewedDate: [''],
            approvedDate: [''],
            preparedDate: [this.today],
            status: ['Active'],
            // Acceptance Criteria
            recoveryMin: ['', Validators.required],
            recoveryMax: ['', Validators.required],
            rsdMax: ['', Validators.required],
            biasMax: ['', Validators.required]
        });

        // System-managed fields — always readonly
        this.requestForm.get('documentNo')?.disable();
        this.requestForm.get('issueNo')?.disable();
        this.requestForm.get('revNo')?.disable();
        this.requestForm.get('formatNo')?.disable();
        this.requestForm.get('verificationStatus')?.valueChanges.subscribe(value => {
            const reasonControl = this.requestForm.get('reasonNotVerified');

            if (value === 'Not Verified') {
                reasonControl?.setValidators([Validators.required]);
            } else {
                reasonControl?.clearValidators();
                reasonControl?.setValue('');
            }

            reasonControl?.updateValueAndValidity();
        });

    }
    ngOnInit(): void {
        this.formNumbers = NablFormsHelper.getFormNumbers();
        this.initForm();
        this.nablHeaderService.getFormDefaults('MethodVerification').subscribe({
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
            this.formTitle = 'View Method Verification Record';
            this.requestForm.disable();
        } else if (path === 'edit') {
            this.isEditMode = true;
            this.formTitle = 'Edit Method Verification Record';
        }

        if (this.recordId) {
            this.loadData();
        } else {
            this.addCRMParameter();
            // this.addRawDataRow();
        }
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
    onChangeTestMethodCode(event: any): void {
        const testmethodCode = event.target.value;
        const selectedMethod = this.testMethodList.find(m => m.name === testmethodCode || m.Name === testmethodCode);
        if (!selectedMethod) {
            this.requestForm.patchValue({
                testMethodName: "",
                referenceStandard: "",
                revIssue: ""
            });
            return;
        }
        const additional = selectedMethod.additionalValues || selectedMethod.AdditionalValues || {};
        this.requestForm.patchValue({
            testMethodName: additional.MethodName || '',
            referenceStandard: additional.ReferenceStandard || '',
            revIssue: additional.RevisionNo || ''
        });
    }
    generateCRMSampleId(): string {
        const nextNo = this.crmParameters.length + 1;
        return `CRM-${nextNo.toString().padStart(3, '0')}`;
    }
    createCRMParameters(): FormGroup {
        return this.fb.group({
            crmSampleId: [this.generateCRMSampleId(), Validators.required],
            certificateNo: ['', Validators.required],
            referenceValue: ['', Validators.required],
            unit: ['', Validators.required],
            measurementUncertainty: ['', Validators.required]
        });
    }
    watchVerificationChanges(index: number): void {
        const verificationGroup = this.verificationData.at(index) as FormGroup;

        verificationGroup.get('observationValue')?.valueChanges.subscribe(() => {
            this.calculateVerificationRow(index);
        });
    }
    createVerificationDataFromCRM(crmRow: FormGroup): FormGroup {
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

    get crmParameters(): FormArray {
        return this.requestForm.get('crmParameters') as FormArray;
    }

    get verificationData(): FormArray {
        return this.requestForm.get('verificationData') as FormArray;
    }
    addCRMParameter(): void {
        const crmGroup = this.createCRMParameters();

        this.crmParameters.push(crmGroup);

        const verificationGroup = this.createVerificationDataFromCRM(crmGroup);
        this.verificationData.push(verificationGroup);

        const index = this.crmParameters.length - 1;

        this.watchCRMChanges(index);
        // this.watchVerificationChanges(index);

    }

    removeCRMParameter(index: number): void {
        if (this.crmParameters.length <= 1) {
            return;
        }

        this.crmParameters.removeAt(index);
        this.verificationData.removeAt(index);

        this.regenerateCRMSampleIds();
        this.calculateAllVerificationRows();
    }


    watchCRMChanges(index: number): void {
        const crmGroup = this.crmParameters.at(index) as FormGroup;

        crmGroup.get('referenceValue')?.valueChanges.subscribe(value => {
            const verificationGroup = this.verificationData.at(index) as FormGroup;

            if (verificationGroup) {
                verificationGroup.patchValue({
                    referenceValue: value
                }, { emitEvent: false });

                this.calculateVerificationRow(index);
            }
        });

        crmGroup.get('unit')?.valueChanges.subscribe(value => {
            const verificationGroup = this.verificationData.at(index) as FormGroup;

            if (verificationGroup) {
                verificationGroup.patchValue({
                    unit: value
                }, { emitEvent: false });
            }
        });

        crmGroup.get('crmSampleId')?.valueChanges.subscribe(value => {
            const verificationGroup = this.verificationData.at(index) as FormGroup;

            if (verificationGroup) {
                verificationGroup.patchValue({
                    crmSampleId: value
                }, { emitEvent: false });
            }
        });
    }
    rebindCRMWatchers(): void {
        this.crmParameters.controls.forEach((control, index) => {
            this.watchCRMChanges(index);
        });
    }

    regenerateCRMSampleIds(): void {
        this.crmParameters.controls.forEach((control, index) => {
            const newId = `CRM-${(index + 1).toString().padStart(3, '0')}`;

            control.patchValue({
                crmSampleId: newId
            }, { emitEvent: false });

            const verificationGroup = this.verificationData.at(index) as FormGroup;

            if (verificationGroup) {
                verificationGroup.patchValue({
                    crmSampleId: newId
                }, { emitEvent: false });
            }
        });
    }

    calculateVerificationRow(index: number): void {
        const row = this.verificationData.at(index) as FormGroup;

        const refRaw = row.get('referenceValue')?.value;
        const obsRaw = row.get('observationValue')?.value;

        const recoveryMinRaw = this.requestForm.get('recoveryMin')?.value;
        const recoveryMaxRaw = this.requestForm.get('recoveryMax')?.value;
        // const biasMax = Number(this.requestForm.get('biasMax')?.value);

        if (refRaw === '' || refRaw === null || refRaw === undefined ||
            obsRaw === '' || obsRaw === null || obsRaw === undefined ||
            recoveryMinRaw === '' || recoveryMinRaw === null || recoveryMinRaw === undefined ||
            recoveryMaxRaw === '' || recoveryMaxRaw === null || recoveryMaxRaw === undefined) {
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

        if (
            isNaN(refValue) || refValue === 0 ||
            isNaN(obsValue) ||
            isNaN(recoveryMin) ||
            isNaN(recoveryMax)
        ) {
            row.patchValue({
                difference: '',
                recovery: '',
                status: ''
            }, { emitEvent: false });

            return;
        }

        const difference = obsValue - refValue;
        const recovery = (obsValue / refValue) * 100;
        const isRecoveryPass = recovery >= recoveryMin && recovery <= recoveryMax;
        const status = isRecoveryPass ? 'PASS' : 'FAIL';

        row.patchValue({
            difference: Number(difference.toFixed(2)),
            recovery: Number(recovery.toFixed(2)),
            status: status
        }, { emitEvent: false });
    }
    
    calculateAllVerificationRows(): void {
        this.verificationData.controls.forEach((_, index) => {
            this.calculateVerificationRow(index);
        });
    }

    onAcceptanceCriteriaChange(): void {
        this.calculateAllVerificationRows();
    }

    loadData(): void {
        this.service.getById(this.recordId).subscribe({
            next: (data) => {
                if (data) {
                    if (data.crmParameters) {
                        this.crmParameters.clear();
                        data.crmParameters.forEach(() => this.addCRMParameter());
                    }
                    data.date = NablFormsHelper.formatDateForInput(data.date || null);
                    data.verificationDate = NablFormsHelper.formatDateForInput(data.verificationDate || null);
                    data.calibrationDueDate = NablFormsHelper.formatDateForInput(data.calibrationDueDate || null);
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
        formData.preparedDate = this.today;
        formData.approvedDate = formData.approvedBy ? this.today : null;
        formData.reviewedDate = formData.reviewedBy ? this.today : null;
        if (formData.verificationStatus === "Verified") {
            formData.reasonNotVerified = null;
        }
        if (this.isEditMode) {
            this.service.update(this.recordId, formData).subscribe({
                next: () => {
                    this.saved = true;
                    this.toastService.show('Test Method Verification updated successfully', 'success');
                    this.router.navigate(['/nabl/method-verification']);
                },
                error: (error: any) => { this.toastService.show(error?.error?.message || 'Operation failed', 'error'); }
            });
        } else {
            this.service.create(formData).subscribe({
                next: () => {
                    this.saved = true;
                    this.toastService.show('Test Method Verification create successfully', 'success');
                    this.router.navigate(['/nabl/method-verification']);
                },
                error: (error: any) => { this.toastService.show(error?.error?.message || 'Operation failed', 'error'); }
            });
        }
    }

    onCancel(): void {
        this.router.navigate(['/nabl/method-verification']);
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
