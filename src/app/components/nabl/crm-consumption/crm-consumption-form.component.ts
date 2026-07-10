import { Component, OnInit, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CrmConsumptionService } from '../../../services/crm-consumption.service';
import { ReferenceMaterialService } from '../../../services/reference-material.service';
import { ToastService } from '../../../services/toast.service';
import { NablFormsHelper } from '../../../utility/nabl-helpers/nabl-forms.helper';
import { YearHelper } from '../../../utility/helper/year.helper';

import { QuillModule } from 'ngx-quill';
import { Observable } from 'rxjs';
import { CanComponentDeactivate } from '../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../services/unsaved-changes.service';
import { NablSignatureSectionComponent } from '../nabl-signature-section/nabl-signature-section.component';
import { NablHeaderService } from '../../../services/nabl-header.service';

@Component({
    selector: 'app-crm-consumption-form',

    imports: [CommonModule, ReactiveFormsModule, RouterModule, QuillModule, NablSignatureSectionComponent],
    templateUrl: './crm-consumption-form.component.html'
})
export class CrmConsumptionFormComponent implements CanComponentDeactivate, OnInit {
    saved = false;
    consumptionForm!: FormGroup;
    recordId: number = 0;
    isEditMode = false;
    isViewMode = false;
    formTitle = 'Add CRM Consumption Record';
    formNumbers: string[] = NablFormsHelper.getFormNumbers();
    yearOptions: number[] = YearHelper.planYears();
    consumptionLogs: any[] = [];
    purposeList = [
        'Method Verification',
        'Method Validation',
        'Quality Control',
        'Routine Testing',
        'PT/ILC',
        'Calibration',
        'Retesting',
        'Other'
    ];

    openSections: { [key: string]: boolean } = {
        header: true,
        material: true,
        grid: true,
        summary: true
    };

    quillModules = {
        toolbar: [
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            ['clean']
        ]
    };

    today = new Date().toISOString().split('T')[0];
    constructor(
        private fb: FormBuilder,
        private service: CrmConsumptionService,
        private materialService: ReferenceMaterialService,
        private router: Router,
        private route: ActivatedRoute,
        private toastService: ToastService,
        private unsavedChangesService: UnsavedChangesService,
        private nablHeaderService: NablHeaderService) { }

    ngOnInit(): void {
        this.initForm();
        this.nablHeaderService.getFormDefaults('CrmConsumption').subscribe({
            next: (defaults) => {
                this.consumptionForm.patchValue({ formatNo: defaults.formCode });
            },
            error: () => { }
        });

        this.recordId = Number(this.route.snapshot.params['id']);
        const path = this.route.snapshot.url[this.route.snapshot.url.length - 2]?.path;

        if (path === 'details') {
            this.isViewMode = true;
            this.formTitle = 'View CRM Consumption Record';
            this.consumptionForm.disable();
        } else if (path === 'edit') {
            this.isEditMode = true;
            this.formTitle = 'Edit CRM Consumption Record';
        }

        if (this.recordId) {
            this.loadData();
        }
    }

    initForm(): void {
        this.consumptionForm = this.fb.group({
            id: [0],
            formatNo: ['F-18'],
            issueNo: ['01'],
            revNo: ['00'],
            date: [this.today, Validators.required],
            documentNo: ['F-18'],
            issueDate: [this.today, Validators.required],
            rmCode: [{ value: '', disabled: true }],
            rmName: [{ value: '', disabled: true }],
            type: [{ value: '', disabled: true }],
            materialClassification: [{ value: '', disabled: true }],
            batchNo: [{ value: '', disabled: true }],
            certificateNo: [{ value: '', disabled: true }],
            validityDate: [{ value: '', disabled: true }],
            availableQuantity: [{ value: '', disabled: true }],
            referenceMaterialId: [0],
            openingQuantity: [{ value: 0, disabled: true }],
            totalConsumed: [{ value: 0, disabled: true }],
            remainingQuantity: [{ value: 0, disabled: true }],
            quantityConsumed: [0],
            purpose: [''],
            equipmentOrTest: [''],
            usedBy: [''],
            logRemarks: [''],
            consumptionDate: [this.today],
            remarks: [''],
            notes: [''],
            verifiedBy: [''],
            preparedBy: [''],
            reviewedBy: [null],
            approvedBy: [null]
        });

        // System-managed fields — always readonly
        this.consumptionForm.get('documentNo')?.disable();
        this.consumptionForm.get('issueNo')?.disable();
        this.consumptionForm.get('revNo')?.disable();
        this.consumptionForm.get('issueDate')?.disable();
        this.consumptionForm.get('formatNo')?.disable();

    }

    loadData(): void {
        this.service.getById(this.recordId).subscribe({
            next: (data: any) => {
                if (!data)
                    return;
                const crm = data.crmDetails;
                const header = data.consumptionHeader;
                const logs = data.logs || [];
                const formValues = { ...data };
                this.consumptionForm.patchValue({
                    id: header?.id || 0,
                    referenceMaterialId: crm?.referenceMaterialId,

                    // Header
                    formatNo: header?.formNo || 'F-18',
                    documentNo: header?.documentNo || crm?.documentNo || '',
                    issueNo: header?.issueNo || '01',
                    revNo: header?.revNo || '00',
                    date: crm?.validityDate
                        ? NablFormsHelper.formatDateForInput(crm.date)
                        : '',
                    // CRM Details
                    rmCode: crm?.rmCode || '',
                    rmName: crm?.rmName || '',
                    type: crm?.type || '',
                    materialClassification: crm?.materialClassification || '',
                    batchNo: crm?.batchNo || '',
                    certificateNo: crm?.certificateNo || '',
                    validityDate: crm?.validityDate
                        ? NablFormsHelper.formatDateForInput(crm.validityDate)
                        : '',
                    unit: crm?.unit || '',
                    availableQuantity: crm?.quantity || 0,
                    minimumQuantity: crm?.minimumQuantity || 0,

                    // Summary
                    openingQuantity: crm?.quantity ?? 0,
                    totalConsumed: header?.totalConsumed ?? this.getTotalConsumed(logs),
                    remainingQuantity: (crm?.quantity ?? 0) - (header?.totalConsumed ?? 0),

                    // Notes & Signatures
                    notes: header?.notes || '',
                    preparedBy: crm?.preparedBy || null,
                    reviewedBy: crm?.reviewedBy || null,
                    approvedBy: crm?.approvedBy || null,

                    // Add log row default
                    consumptionDate: NablFormsHelper.formatDateForInput(new Date()),
                    quantityConsumed: null,
                    purpose: '',
                    equipmentOrTest: '',
                    usedBy: '',
                    logRemarks: '',

                });
                this.consumptionLogs = [];

                if (data.logs && data.logs.length > 0) {

                    this.consumptionLogs = data.logs.map((x: any) => ({
                        id: x.id,
                        referenceMaterialId: x.referenceMaterialId,
                        referenceMaterialConsumptionId: x.referenceMaterialConsumptionId,

                        consumptionDate: x.consumptionDate,
                        quantityConsumed: x.quantityConsumed,
                        previousBalanceQty: x.previousBalanceQty,
                        // balanceQty: x.balanceQty,

                        purpose: x.purpose,
                        equipmentOrTest: x.equipmentOrTest,
                        usedBy: x.usedBy,
                        remarks: x.remarks
                    }));
                }

                this.consumptionForm.patchValue(formValues);
                // Lock form if not in editable status
                const status = (data as any).status;
                if (status && status !== 'Draft' && status !== 'Rejected') {
                    this.consumptionForm.disable();
                    this.isViewMode = true;
                }
                // Re-disable system fields
                this.consumptionForm.get('documentNo')?.disable();
                this.consumptionForm.get('issueNo')?.disable();
                this.consumptionForm.get('revNo')?.disable();
                this.consumptionForm.get('formatNo')?.disable();

            },
            error: (error: any) => { this.toastService.show(error?.error?.message || 'Failed to load record', 'error'); }
        });
    }
    addConsumptionLog() {
        const consumedQty = Number(this.consumptionForm.get('quantityConsumed')?.value || 0);
        const purpose = this.consumptionForm.get('purpose')?.value;
        const date = this.consumptionForm.get('consumptionDate')?.value;
        const equipmentOrTest = this.consumptionForm.get('equipmentOrTest')?.value;
        const usedBy = this.consumptionForm.get('usedBy')?.value;

        const openingQty = Number(this.consumptionForm.get('availableQuantity')?.value || 0);

        const alreadyConsumed = this.consumptionLogs
            .reduce((sum, x) => sum + Number(x.quantityConsumed || 0), 0);

        const currentBalance = openingQty - alreadyConsumed;

        if (!date) {
            this.toastService.show('Please select consumption date', 'warning');
            return;
        }

        if (!consumedQty) {
            this.toastService.show('Please enter consumed quantity', 'warning');
            return;
        }
        if (currentBalance <= 0) {
            this.toastService.show(
                `No quantity available for consumption. Current balance is ${currentBalance} ${this.consumptionForm.get('unit')?.value || ''}.`, 'warning'
            );
            return;
        }

        if (consumedQty > currentBalance) {
            this.toastService.show(
                `Entered quantity (${consumedQty} ${this.consumptionForm.get('unit')?.value || ''}) cannot exceed the available balance (${currentBalance} ${this.consumptionForm.get('unit')?.value || ''}).`, 'warning'
            ); return;
        }

        if (consumedQty <= 0) {
            this.toastService.show('Consumed quantity must be greater than 0', 'warning');
            return;
        }
        if (!purpose) {
            this.toastService.show('Please select purpose', 'warning');
            return;
        }
        if (!equipmentOrTest) {
            this.toastService.show('Please enter equipment/test', 'warning');
            return;
        }
        if (!usedBy) {
            this.toastService.show('Please enter used by', 'warning');
            return;
        }


        const newBalance = currentBalance - consumedQty;

        this.consumptionLogs.push({
            consumptionDate: date,
            quantityConsumed: consumedQty,
            previousBalanceQty: currentBalance,
            // balanceQty: newBalance,
            purpose: purpose,
            equipmentOrTest: equipmentOrTest,
            usedBy: usedBy,
            remarks: this.consumptionForm.get('logRemarks')?.value
        });

        const totalConsumed = this.consumptionLogs
            .reduce((sum, x) => sum + Number(x.quantityConsumed || 0), 0);

        this.consumptionForm.patchValue({
            openingQuantity: openingQty,
            totalConsumed: totalConsumed,
            remainingQuantity: openingQty - totalConsumed,
            quantityConsumed: 0,
            purpose: '',
            equipmentOrTest: '',
            usedBy: '',
            logRemarks: ''
        });
    }
    getTotalConsumed(logs: any[]): number {
        return logs.reduce((sum, x) => sum + Number(x.quantityConsumed || 0), 0);
    }

    onSubmit(): void {
        if (this.consumptionForm.invalid) {
            this.consumptionForm.markAllAsTouched();
            return;
        }
        const formData: any = this.consumptionForm.getRawValue();
        formData.id = this.consumptionForm.get('id')?.value || 0;
        formData.referenceMaterialId = this.recordId;

        formData.logs = this.consumptionLogs


        this.service.save(formData).subscribe({
            next: () => {
                this.saved = true;
                this.router.navigate(['/reference-material-consumption']);
                this.toastService.show('reference material consumption updated successfully', 'success')
            },
            error: (error: any) => {
                this.toastService.show(error?.error?.message || 'Failed to update record', 'error');
            }
        });

    }

    onCancel(): void {
        this.router.navigate(['/reference-material-consumption']);
    }

    toggleSection(section: string): void {
        this.openSections[section] = !this.openSections[section];
    }

    canDeactivate(): Observable<boolean> | boolean {
        if (!this.consumptionForm.dirty || this.saved) return true;
        return this.unsavedChangesService.confirm();
    }

    @HostListener('window:beforeunload', ['$event'])
    onBeforeUnload(event: BeforeUnloadEvent) {
        if (this.consumptionForm?.dirty && !this.saved) {
            event.preventDefault();
            event.returnValue = '';
        }
    }
}
