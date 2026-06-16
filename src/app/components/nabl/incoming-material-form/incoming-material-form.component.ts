import { Component, OnInit, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { QuillModule } from 'ngx-quill';
import { IncomingMaterialService } from '../../../services/incoming-material.service';
import { ToastService } from '../../../services/toast.service';
import { NablFormsHelper } from '../../../utility/nabl-helpers/nabl-forms.helper';
import { Observable } from 'rxjs';
import { CanComponentDeactivate } from '../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../services/unsaved-changes.service';
import { NablSignatureSectionComponent } from '../nabl-signature-section/nabl-signature-section.component';
import { NablHeaderService } from '../../../services/nabl-header.service';

@Component({
    selector: 'app-incoming-material-form',

    imports: [CommonModule, ReactiveFormsModule, RouterModule, QuillModule, NablSignatureSectionComponent],
    templateUrl: './incoming-material-form.component.html'
})
export class IncomingMaterialFormComponent implements CanComponentDeactivate, OnInit {
    saved = false;
    materialForm!: FormGroup;
    recordId: number = 0;
    isEditMode = false;
    isViewMode = false;
    formTitle = 'Log Incoming Material Inspection';
    formNumbers: string[] = NablFormsHelper.getFormNumbers();
    planNoList: any[] = [];
    PurchaseOrderNoList: any[] = [];
    openSections: { [key: string]: boolean } = {
        header: true,
        referenceDetails: true,
        inspectionPlan: true,
        receivedItem: true,
        inspectionDetails: true,
        outcome: true
    };

    quillModules = {
        toolbar: [
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            ['clean']
        ]
    };

    statuses = ['Accepted', 'Rejected', 'Conditional'];
    results = ['Pass', 'Fail', 'NA'];
    coaAvailable = ['Yes', 'No'];
    today = new Date().toISOString().split('T')[0];
    constructor(
        private fb: FormBuilder,
        private service: IncomingMaterialService,
        private router: Router,
        private route: ActivatedRoute,
        private toastService: ToastService,
        private unsavedChangesService: UnsavedChangesService,
        private nablHeaderService: NablHeaderService) { }

    ngOnInit(): void {
        this.initForm();
        this.nablHeaderService.getFormDefaults('IncomingMaterial').subscribe({
            next: (defaults) => {
                this.materialForm.patchValue({ formatNo: defaults.formCode });
            },
            error: () => { }
        });
        this.recordId = Number(this.route.snapshot.params['id']);
        const path = this.route.snapshot.url[this.route.snapshot.url.length - 2]?.path;
        this.loadplanNoList();
        this.loadPONoList();
        if (path === 'details') {
            this.isViewMode = true;
            this.formTitle = 'View Inspection Record';
            this.materialForm.disable();
            
        } else if (path === 'edit') {
            this.isEditMode = true;
            this.formTitle = 'Edit Inspection Record';
        }

        if (this.recordId) {
            this.loadData();
        }
    }

    initForm(): void {

        this.materialForm = this.fb.group({
            id: [0],
            formatNo: ['F-24'],
            issueNo: ['01'],
            revNo: ['00'],
            date: [this.today, Validators.required],
            documentNo: ['F-24'],
            supplierName: ['', Validators.required],
            inspectionParameters: this.fb.array([]),
            itemsParameters: this.fb.array([]),
            inspectionResult: ['Accepted'],
            deviations: [''],
            correctiveActions: [''],
            inspectionBy: ['', Validators.required],
            receivedBy: ['', Validators.required],
            riskLevel: ['', Validators.required],
            inspectionStage: ['', Validators.required],
            productName: ['', Validators.required],
            category: ['', Validators.required],
            productCode: ['', Validators.required],
            inspectionPlanNo: ['', Validators.required],
            poNo: ['', Validators.required],
            inspectionPlanNoName: [''],
            purchaseOrderNo: [''],
            indentNoPoNo: ['', Validators.required],
            email: ['', Validators.required],
            phoneNo: ['', Validators.required],
            address: ['', Validators.required],
            gstNo: [''],
            storageLocation: [''],
            generalRemarks: [''],
            orderType: ['', Validators.required],
            isActive: [true],
            preparedBy: [''],
            reviewedBy: [null],
            approvedBy: [null],
            approvedDate: [''],
            preparedDate: [this.today],
            reviewedDate: [''],

        });

        // System-managed fields — always readonly
        this.materialForm.get('documentNo')?.disable();
        this.materialForm.get('issueNo')?.disable();
        this.materialForm.get('revNo')?.disable();
        this.materialForm.get('formatNo')?.disable();
    }

    // get resultsArray(): FormArray {
    //     return this.materialForm.get('inspectionParameters') as FormArray;
    // }


    loadplanNoList(): void {
        this.service.getAllPlanNoDetails().subscribe({
            next: (res) => {
                this.planNoList = res;
            },
            error: () => {
                this.planNoList = [];
            }
        })
    }
    loadPONoList(): void {
        this.service.getAllPONoetails().subscribe({
            next: (res) => {
                this.PurchaseOrderNoList = res;
            },
            error: () => {
                this.PurchaseOrderNoList = [];
            }
        })
    }
    get parameters(): FormArray {
        return this.materialForm.get('inspectionParameters') as FormArray;
    }
    get items(): FormArray {
        return this.materialForm.get('itemsParameters') as FormArray;
    }

    onPoNoChange(event: any): void {
        const selectedId = Number(event.target.value);

        const item = this.PurchaseOrderNoList.find((x: any) => x.id === selectedId || x.Id === selectedId);

        if (!item) {
            this.items.clear();
            return;
        }

        const data = item.additionalValues || item.AdditionalValues || {};

        this.materialForm.patchValue({
            supplierName: data.SupplierName || '',
            indentNoPoNo: data.ReferenceIndentNo || '',
            purchaseOrderNo: data.PurchaseOrderNo || '',
            email: data.Email || '',
            phoneNo: data.PhoneNo || '',
            gstNo: data.GSTNo || '',
            orderType: data.OrderType || '',
            address: data.SupplierAddress || ''
        });

        let parameters: any[] = [];

        try {
            parameters = data.ItemsJson
                ? JSON.parse(data.ItemsJson)
                : [];
        } catch {
            parameters = [];
            this.toastService.show('Invalid inspection parameter data', 'error');
        }

        this.items.clear();

        parameters.forEach((p: any) => {
            this.items.push(this.fb.group({
                materialName: [p.Description || p.description || ''],
                materialCode: [''],
                orderedQty: [p.Quantity || p.quantity || ''],
                unit: [p.UnitPrice || p.unitPrice || ''],
                receviceQty: [''],
                batchNo: [''],
                lotNo: [''],
                invoiceNo: [''],
                expiryDate: [''],
                coaAvailable: ['Yes']
                // result: ['Pass']
            }));
        });
    }

    validateReceivedQuantity(index: number): boolean {
        const row = this.items.at(index);

        const orderedQty = Number(row.get('orderedQty')?.value || 0);
        const receivedQty = Number(row.get('receviceQty')?.value || 0);

        if (receivedQty > orderedQty) {
            row.get('receviceQty')?.setValue('');

            this.toastService.show(
                `Received quantity cannot be greater than ordered quantity (${orderedQty}).`,
                'warning'
            );

            return false;
        }

        return true;
    }

    onPlanNoChange(event: any): void {
        const selectedId = Number(event.target.value);

        const item = this.planNoList.find((x: any) => x.id === selectedId || x.Id === selectedId);

        if (!item) {
            this.parameters.clear();
            return;
        }

        const data = item.additionalValues || item.AdditionalValues || {};

        this.materialForm.patchValue({
            riskLevel: data.Risklevel || '',
            inspectionStage: data.InspectionStage || '',
            category: data.Category || '',
            productCode: data.ProductCode || '',
            productName: data.ProductName || '',
            inspectionPlanNoName: data.PlanNoName || '',
        });

        let items: any[] = [];

        try {
            items = data.InspectionResultsJson
                ? JSON.parse(data.InspectionResultsJson)
                : [];
        } catch {
            items = [];
            this.toastService.show('Invalid inspection parameter data', 'error');
        }

        this.parameters.clear();

        items.forEach((p: any) => {
            this.parameters.push(this.fb.group({
                parameterName: [p.parameterName || p.ParameterName || ''],
                requirement: [p.requirement || p.Requirement || ''],
                referenceStandard: [p.referenceStandard || p.ReferenceStandard || ''],
                methodOfCheck: [p.methodOfCheck || p.MethodOfCheck || ''],
                frequency: [p.frequency || p.Frequency || ''],
                acceptanceCriteria: [p.acceptanceCriteria || p.AcceptanceCriteria || '']

            }));
        });
    }

    loadData(): void {
        this.service.getById(this.recordId).subscribe({
            next: (data) => {
                if (data) {
                    const formValues = { ...data };
                    formValues.date = NablFormsHelper.formatDateForInput(data.date);

                    this.parameters.clear();
                    this.items.clear();

                    data.inspectionParameters?.forEach((r: any) => {
                        this.parameters.push(this.fb.group({
                            acceptanceCriteria: [r.acceptanceCriteria || '', Validators.required],
                            frequency: [r.frequency || '', Validators.required],
                            methodOfCheck: [r.methodOfCheck || '', Validators.required],
                            requirement: [r.requirement || '', Validators.required],
                            parameterName: [r.parameterName || '', Validators.required],
                            referenceStandard: [r.referenceStandard || '', Validators.required],
                            // result: [r.result || 'Pass', Validators.required]
                        }));
                    });

                    data.itemsParameters?.forEach((r: any) => {
                        this.items.push(this.fb.group({
                            coaAvailable: [r.coaAvailable || '', Validators.required],
                            batchNo: [r.batchNo || '', Validators.required],
                            expiryDate: [r.expiryDate ? r.expiryDate.split('T')[0] : '', Validators.required],
                            invoiceNo: [r.invoiceNo || '', Validators.required],
                            materialCode: [r.materialCode || '', Validators.required],
                            unit: [r.unit || '', Validators.required],
                            orderedQty: [r.orderedQty || '', Validators.required],
                            receviceQty: [r.receviceQty || '', Validators.required],
                            lotNo: [r.lotNo || '', Validators.required],
                            materialName: [r.materialName || '', Validators.required],
                            // result: [r.result || 'Pass', Validators.required]
                        }));
                    });

                    this.materialForm.patchValue(formValues);

                    data.itemsParameters?.forEach((r: any, index: number) => {

                        const itemGroup = this.items.at(index);

                        itemGroup.get('expiryDate')?.setValue(
                            r.expiryDate ? r.expiryDate.split('T')[0] : ''
                        );

                    });
                    const status = (data as any).status;
                    if (status && status !== 'Draft' && status !== 'Rejected') {
                        this.materialForm.disable();
                        this.isViewMode = true;
                    }

                    this.materialForm.get('documentNo')?.disable();
                    this.materialForm.get('issueNo')?.disable();
                    this.materialForm.get('revNo')?.disable();
                    this.materialForm.get('formatNo')?.disable();
                }
            },
            error: (error: any) => {
                this.toastService.show(error?.error?.message || 'Failed to load record', 'error');
            }
        });
    }
    onSubmit(): void {
        if (this.materialForm.invalid) {
            this.materialForm.markAllAsTouched();
            return;
        }

        const formData = this.materialForm.getRawValue();
        formData.preparedDate = this.today;
        formData.approvedDate = formData.approvedBy ? this.today : null;
        formData.reviewedDate = formData.reviewedBy ? this.today : null;
        if (this.isEditMode) {
            this.service.update(this.recordId, formData).subscribe({
                next: () => {
                    this.saved = true;
                    this.toastService.show('Incoming Material Inspection Record updated successfully', 'success');
                    this.router.navigate(['/incoming-material']);
                },
                error: (error: any) => { this.toastService.show(error?.error?.message || 'Failed to update record', 'error'); }
            });
        } else {
            this.service.create(formData).subscribe({
                next: () => {
                    this.saved = true;
                    this.toastService.show('Incoming Material Inspection Record created successfully', 'success');
                    this.router.navigate(['/incoming-material']);
                },
                error: (error: any) => { this.toastService.show(error?.error?.message || 'Failed to create record', 'error'); }
            });
        }
    }

    onCancel(): void {
        this.router.navigate(['/incoming-material']);
    }

    toggleSection(section: string): void {
        this.openSections[section] = !this.openSections[section];
    }

    canDeactivate(): Observable<boolean> | boolean {
        if (!this.materialForm.dirty || this.saved) return true;
        return this.unsavedChangesService.confirm();
    }

    @HostListener('window:beforeunload', ['$event'])
    onBeforeUnload(event: BeforeUnloadEvent) {
        if (this.materialForm?.dirty && !this.saved) {
            event.preventDefault();
            event.returnValue = '';
        }
    }
}
