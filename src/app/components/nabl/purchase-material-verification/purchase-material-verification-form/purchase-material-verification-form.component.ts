import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { PurchaseMaterialVerificationService } from '../../../../services/purchase-material-verification.service';
import { NablFormsHelper } from '../../../../utility/nabl-helpers/nabl-forms.helper';
import { QuillModule } from 'ngx-quill';
import { Observable } from 'rxjs';
import { CanComponentDeactivate } from '../../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../../services/unsaved-changes.service';
import { ToastService } from '../../../../services/toast.service';
import { NablSignatureSectionComponent } from '../../nabl-signature-section/nabl-signature-section.component';
import { NablHeaderService } from '../../../../services/nabl-header.service';
@Component({
    selector: 'app-purchase-material-verification-form',

    imports: [CommonModule, ReactiveFormsModule, QuillModule, NablSignatureSectionComponent],
    templateUrl: './purchase-material-verification-form.component.html',
    styleUrls: ['./purchase-material-verification-form.component.css']
})
export class PurchaseMaterialVerificationFormComponent implements CanComponentDeactivate, OnInit {
    saved = false;
    verificationForm!: FormGroup;
    isEditMode = false;
    isViewMode = false;
    recordId: number = 0;
    formNumbers: string[] = [];
    PurchaseOrderNoList: any[] = [];
    openSections: { [key: string]: boolean } = {
        header: true,
        supplier: true,
        items: true,
        approval: true
    };

    quillModules = {
        toolbar: [
            ['bold', 'italic', 'underline'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            ['clean']
        ]
    };

    verificationStatusOptions = [
        { value: 'Pass', label: 'Pass' },
        { value: 'Fail', label: 'Fail' },
        { value: 'Conditional', label: 'Conditional' }
    ];
    inspectionQtyStatus = ['Approved', 'Rejected', 'Conditional'];

    overallStatusOptions = [
        { value: 'Accepted', label: 'Accepted' },
        { value: 'Rejected', label: 'Rejected' },
        { value: 'Conditional', label: 'Hold' }
    ];

    incomingId = 0;
    today = new Date().toISOString().split('T')[0];
    constructor(
        private fb: FormBuilder,
        private service: PurchaseMaterialVerificationService,
        private router: Router,
        private route: ActivatedRoute,
        private unsavedChangesService: UnsavedChangesService,
        private toastService: ToastService,
        private nablHeaderService: NablHeaderService) { }

    ngOnInit(): void {
        this.formNumbers = NablFormsHelper.getFormNumbers();
        this.initForm();
        this.nablHeaderService.getFormDefaults('PurchaseMaterialVerification').subscribe({
            next: (defaults) => {
                this.verificationForm.patchValue({ formatNo: defaults.formCode });
            },
            error: () => { }
        });
        this.loadPONoList();
        this.route.params.subscribe(params => {
            if (params['id']) {
                this.recordId = +params['id'];
                this.isEditMode = this.router.url.includes('/edit');
                this.isViewMode = this.router.url.includes('/details');
                this.loadRecordData();
            }
        });
    }

    get formTitle(): string {
        if (this.isViewMode) return 'View Purchase Material Verification Record';
        return this.isEditMode ? 'Edit Purchase Material Verification Record' : 'New Purchase Material Verification Record';
    }
    initForm(): void {
        this.verificationForm = this.fb.group({
            formatNo: ['F-25'],
            documentNo: ['F-25'],
            issueNo: [{ value: '01', disabled: true }],
            revNo: [{ value: '00', disabled: true }],
            date: [this.today, Validators.required],

            supplierName: ['', Validators.required],
            invoiceNo: ['', Validators.required],
            invoiceDate: [this.today, Validators.required],
            grnNumber: ['', Validators.required],

            itemsParameters: this.fb.array([]),
            incomingMaterialId: [''],
            // overallStatus: ['Accepted', Validators.required],
            remarks: [''],
            preparedBy: [''],
            reviewedBy: [null],
            email: ['', Validators.required],
            phoneNo: ['', Validators.required],
            gstNo: ['', Validators.required],
            address: ['', Validators.required],
            orderType: ['', Validators.required],
            poDate: ['', Validators.required],
            correctiveActions: [''],
            deviations: [''],
            poNo: ['', Validators.required],
            approvedBy: [null],
            verifiedBy: ['', Validators.required],
            purchaseOrderNo: [''],
            inspectionBy: ['', Validators.required],

            approvedDate: [''],
            preparedDate: [this.today],
            reviewedDate: [''],
        });

        // System-managed fields — always readonly
        this.verificationForm.get('documentNo')?.disable();
        this.verificationForm.get('formatNo')?.disable();
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

    onPoNoChange(event: any): void {
        const selectedId = Number(event.target.value);
        const items = this.PurchaseOrderNoList.find((x: any) => x.id === selectedId || x.Id === selectedId);
        if (!items) {
            this.items.clear();
            return;
        }
        this.incomingId = selectedId;
        const data = items.additionalValues || items.AdditionalValues || {};
        this.verificationForm.patchValue({
            supplierName: data.SupplierName || '',
            purchaseOrderNo: data.PurchaseOrderNo || '',
            email: data.Email || '',
            phoneNo: data.PhoneNo || '',
            gstNo: data.GSTNo || '',
            orderType: data.OrderType || '',
            address: data.SupplierAddress || '',
            poDate: NablFormsHelper.formatDateForInput(data.PODate) || '',
            correctiveActions: data.CorrectiveActions || '',
            deviations: data.Deviations || '',
            verifiedBy: data.ReceivedBy || '',
            inspectionBy: data.InspectionBy || '',
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
                materialName: [p.MaterialName || p.materialName || ''],
                orderedQty: [p.OrderedQty || p.orderedQty || ''],
                receviceQty: [p.receviceQty || p.ReceviceQty],
                approvedQty: [0, [Validators.required]],
                rejectedQty: [0, [Validators.required]],
                verificationDetails: ['', Validators.required],
                inspectionQtyStatus: ['Approved'],
                verificationDone: ['', Validators.required],

            }));
        });
    }

    get items(): FormArray {
        return this.verificationForm.get('itemsParameters') as FormArray;
    }

    fetchInspectionPlanDetails() {
        const poNo = Number(this.verificationForm.get('poNo')?.value || 0);
        const id = this.incomingId || poNo;

        if (!id) {
            this.toastService.show('Please Select PO No.', 'warning');
            return;
        }

        const urlTree = this.router.createUrlTree(['incoming-material/details', id]);

        const url = this.router.serializeUrl(urlTree);

        window.open(url, '_blank');
    }


    toggleSection(section: string): void {
        this.openSections[section] = !this.openSections[section];
    }

    validateQty(row: AbstractControl, changedField: 'approvedQty' | 'rejectedQty'): void {
        const receiveQty = Number(row.get('receviceQty')?.value || 0);
        const approvedQty = Number(row.get('approvedQty')?.value || 0);
        const rejectedQty = Number(row.get('rejectedQty')?.value || 0);

        const total = approvedQty + rejectedQty;

        if (total > receiveQty) {
            this.toastService.show(
                'Approved Qty + Rejected Qty cannot be greater than Receive Qty',
                'warning'
            );

            row.get(changedField)?.setValue(0);
            return;
        }
    }
    loadRecordData(): void {
        if (!this.recordId) return;

        this.service.getById(this.recordId).subscribe({
            next: (record) => {
                if (record) {
                    // Clear empty default array
                    while (this.items.length !== 0) {
                        this.items.removeAt(0);
                    }

                    record.date = NablFormsHelper.formatDateForInput(record.date);
                    // record.poDate =  NablFormsHelper.formatDateForInput(record.poDate);
                    // Add item groups for each item in record
                    record.itemsParameters?.forEach((r: any) => {
                        this.items.push(this.fb.group({
                            materialName: [r.materialName || '', Validators.required],
                            orderedQty: [r.orderedQty || '', Validators.required],
                            receviceQty: [r.receviceQty || '', Validators.required],
                            approvedQty: [r.approvedQty || '', Validators.required],
                            rejectedQty: [r.rejectedQty || '', Validators.required],
                            verificationDetails: [r.verificationDetails || '', Validators.required],
                            inspectionQtyStatus: [r.inspectionQtyStatus || '', Validators.required],
                            verificationDone: [r.verificationDone || '', Validators.required],
                        }))

                    });


                    this.verificationForm.patchValue(record);
                    // Lock form if not in editable status
                    const status = (record as any).status;
                    if (status && status !== 'Draft' && status !== 'Rejected') {
                        this.verificationForm.disable();
                        this.isViewMode = true;
                    } else if (this.isViewMode) {
                        this.verificationForm.disable();
                    }
                    // Re-disable system fields
                    this.verificationForm.get('documentNo')?.disable();
                    this.verificationForm.get('formatNo')?.disable();
                } else {
                    this.toastService.show('Record not found', 'error');
                    this.router.navigate(['/purchase/material-verification/list']);
                }
            },
            error: (error: any) => {
                this.toastService.show(error?.error?.message || 'Failed to load record', 'error');
            }
        });
    }

    onSubmit(): void {
        if (this.verificationForm.invalid) {
            this.verificationForm.markAllAsTouched();
            this.toastService.show('Please fill all required fields', 'error');
            return;
        }

        const formData = this.verificationForm.getRawValue();

        formData.preparedDate = this.today;

        formData.approvedDate = formData.approvedBy ? this.today : null;
        formData.reviewedDate = formData.reviewedBy ? this.today : null;
        if (this.isEditMode) {
            this.service.update(this.recordId, formData).subscribe({
                next: () => {
                    this.saved = true;
                    this.toastService.show('purchase-material-verification updated successfully', 'success')
                    this.router.navigate(['/purchase-material-verification']);
                },
                error: (error: any) => { this.toastService.show(error?.error?.message || 'Operation failed', 'error'); }
            });
        } else {

            this.service.create(formData).subscribe({
                next: () => {
                    this.saved = true;
                    this.toastService.show('purchase-material-verification created successfully', 'success')
                    this.router.navigate(['/purchase-material-verification']);
                },
                error: (error: any) => { this.toastService.show(error?.error?.message || 'Operation failed', 'error'); }
            });
        }

    }

    onCancel(): void {
        this.router.navigate(['/purchase-material-verification']);
    }

    canDeactivate(): Observable<boolean> | boolean {
        if (!this.verificationForm.dirty || this.saved) return true;
        return this.unsavedChangesService.confirm();
    }

    @HostListener('window:beforeunload', ['$event'])
    onBeforeUnload(event: BeforeUnloadEvent) {
        if (this.verificationForm?.dirty && !this.saved) {
            event.preventDefault();
            event.returnValue = '';
        }
    }
}
