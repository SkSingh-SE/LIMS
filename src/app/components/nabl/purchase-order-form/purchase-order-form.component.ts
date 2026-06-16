import { Component, OnInit, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { QuillModule } from 'ngx-quill';
import { PurchaseOrderService } from '../../../services/purchase-order.service';
import { NablFormsHelper } from '../../../utility/nabl-helpers/nabl-forms.helper';
import { Observable } from 'rxjs';
import { CanComponentDeactivate } from '../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../services/unsaved-changes.service';
import { ToastService } from '../../../services/toast.service';
import { NablSignatureSectionComponent } from '../nabl-signature-section/nabl-signature-section.component';
import { NablHeaderService } from '../../../services/nabl-header.service';
@Component({
    selector: 'app-purchase-order-form',

    imports: [CommonModule, ReactiveFormsModule, RouterModule, QuillModule, NablSignatureSectionComponent],
    templateUrl: './purchase-order-form.component.html'
})
export class PurchaseOrderFormComponent implements CanComponentDeactivate, OnInit {
    saved = false;
    poForm!: FormGroup;
    recordId: number = 0;
    isEditMode = false;
    isViewMode = false;
    formTitle = 'Create Purchase Order';
    formNumbers: string[] = NablFormsHelper.getFormNumbers();
    indentNoList: any[] = [];
    supplierList: any[] = [];
    openSections: { [key: string]: boolean } = {
        header: true,
        supplier: true,
        items: true,
        terms: true
    };

    quillModules = {
        toolbar: [
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            ['clean']
        ]
    };

    poTypes = ['Regular', 'Rate Contract', 'Service'];
    currencies = ['INR', 'USD', 'EUR', 'GBP'];
    today = new Date().toISOString().split('T')[0];
    constructor(
        private fb: FormBuilder,
        private service: PurchaseOrderService,
        private router: Router,
        private route: ActivatedRoute,
        private unsavedChangesService: UnsavedChangesService,
        private toastService: ToastService,
        private nablHeaderService: NablHeaderService,
    ) { }

    ngOnInit(): void {
        this.initForm();
        this.nablHeaderService.getFormDefaults('PurchaseOrder').subscribe({
            next: (defaults) => {
                this.poForm.patchValue({ formatNo: defaults.formCode });
            },
            error: () => { }
        });
        this.recordId = Number(this.route.snapshot.params['id']);
        const path = this.route.snapshot.url[this.route.snapshot.url.length - 2]?.path;
        this.loadIndentNo();
        this.loadSupplierList();
        if (path === 'details') {
            this.isViewMode = true;
            this.formTitle = 'View Purchase Order';
            this.poForm.disable();
        } else if (path === 'edit') {
            this.isEditMode = true;
            this.formTitle = 'Edit Purchase Order';
        }

        if (this.recordId) {
            this.loadData();
        } else {
            this.addItem();
        }
    }

    initForm(): void {

        this.poForm = this.fb.group({
            id: [0],
            formatNo: ['F-22'],
            issueNo: ['01'],
            revNo: ['00'],
            date: [this.today, Validators.required],
            documentNo: ['F-22'],
            approvedSupplierId: [null, Validators.required],
            supplierName: ['', Validators.required],
            supplierAddress: ['', Validators.required],
            gstNo: [''],
            referenceIndentNo: ['', Validators.required],
            referenceIndentName: [''],
            orderType: ['Regular'],
            currency: ['INR'],
            poDate: [this.today],
            items: this.fb.array([]),
            totalAmount: [0],
            gstPercentage: [18, [Validators.min(0), Validators.max(100)]],
            gstAmount: [0],
            grandTotal: [0],

            tearmCondition: [''],
            deliveryDate: ['',Validators.required],
            paymentTerms: ['', Validators.required],

            preparedBy: [''],
            approvedBy: [null],
            reviewedBy: [null],
            approvedDate: [''],
            preparedDate: [this.today],
            reviewedDate: [''],
            poNo: ['', Validators.required],
            email: ['', Validators.required],
            phoneNo: ['',Validators.required],
            requestedQuantity: ['', Validators.required],
            indentorName: [''],
            // authorizedBy: ['', Validators.required],
            status: ['Draft'],
            isActive: [true]
        });

        // System-managed fields — always readonly
        this.poForm.get('documentNo')?.disable();
        this.poForm.get('issueNo')?.disable();
        this.poForm.get('revNo')?.disable();
        this.poForm.get('formatNo')?.disable();

        // Watch items and GST for totals calculation
        this.poForm.get('items')?.valueChanges.subscribe(() => this.calculateTotals());
        this.poForm.get('gstPercentage')?.valueChanges.subscribe(() => this.calculateTotals());
    }

    get items(): FormArray {
        return this.poForm.get('items') as FormArray;
    }
    loadSupplierList(): void {
        this.service.getAllSuppliers().subscribe({
            next: (res) => {
                this.supplierList = res;
            },
            error: () => {
                this.supplierList = [];
            }
        })
    }
    loadIndentNo(): void {
        this.service.getLoadIndentNo().subscribe({
            next: (res) => {
                this.indentNoList = res;
            },
            error: () => {
                this.indentNoList = [];
            }
        })
    }
    addItem(): void {
        const itemForm = this.fb.group({
            description: [null, Validators.required],
            quantity: [0, [Validators.required, Validators.min(0.01)]],
            unitOfMeasure: ['Nos', Validators.required],
            unitPrice: [0, [Validators.required, Validators.min(0)]],
            totalAmount: [{ value: 0, disabled: true }]
        });

        itemForm.valueChanges.subscribe(val => {
            const qty = val.quantity || 0;
            const price = val.unitPrice || 0;
            itemForm.patchValue({ totalAmount: qty * price }, { emitEvent: false });
        });

        this.items.push(itemForm);
    }

    removeItem(index: number): void {
        if (this.items.length > 1) {
            this.items.removeAt(index);
        }
    }
    validateOrderedQuantity(): boolean {
        const requestedQuantity = Number(this.poForm.get('requestedQuantity')?.value || 0);

        let totalQuantity = 0;
        let invalidControl: any = null;

        this.items.controls.forEach((control: any) => {
            const qty = Number(control.get('quantity')?.value || 0);
            totalQuantity += qty;

            if (totalQuantity > requestedQuantity && !invalidControl) {
                invalidControl = control;
            }
        });

        if (invalidControl) {
            invalidControl.get('quantity')?.setValue('');

            this.toastService.show(
                `Total quantity cannot be greater than requested quantity (${requestedQuantity}).`,
                'warning'
            );

            return false;
        }

        return true;
    }

    onSupplierChange(event: any): void {
        const supplierId = Number(event.target.value);
        const selectSupplier = this.supplierList.find(c => c.id === supplierId || c.Id === supplierId);
        if (!selectSupplier) {
            this.poForm.patchValue({
                approvedSupplierId: null,
                supplierName: '',
                phoneNo: '',
                email: '',
                gstNo: '',
                supplierAddress: '',
            });
            return;
        }
        const additional = selectSupplier.additionalValues || selectSupplier.AdditionalValues || {};
        this.poForm.patchValue({
            approvedSupplierId: selectSupplier.id || selectSupplier.Id,
            supplierName: selectSupplier.name || selectSupplier.Name,
            phoneNo: additional.MobileNo || '',
            email: additional.Email || '',
            gstNo: additional.GSTNo || '',
            supplierAddress: additional.Address || ''

        });

    }
    onIndentNoChange(event: any): void {
        const id = Number(event.target.value);
        const selectSupplier = this.indentNoList.find(c => c.id === id || c.Id === id);
        if (!selectSupplier) {
            this.poForm.patchValue({
                requestedQuantity: null,
                indentorName: '',
                referenceIndentName: '',
            });
            return;
        }
        const additional = selectSupplier.additionalValues || selectSupplier.AdditionalValues || {};
        this.poForm.patchValue({
            requestedQuantity: additional.Qaulity || '',
            indentorName: additional.IndetorName || '',
            referenceIndentName: additional.ReferenceIndentorName || ''
        });
    }

    calculateTotals(): void {
        const items = this.items.getRawValue();
        const total = items.reduce((sum: number, item: any) => sum + (item.totalAmount || 0), 0);
        const gstPercent = this.poForm.get('gstPercentage')?.value || 0;
        const gst = (total * gstPercent) / 100;

        this.poForm.patchValue({
            totalAmount: total,
            gstAmount: gst,
            grandTotal: total + gst
        }, { emitEvent: false });
    }

    loadData(): void {
        this.service.getById(this.recordId).subscribe({
            next: (data) => {
                if (data) {
                    const formValues = { ...data };
                    formValues.date = NablFormsHelper.formatDateForInput(data.date);
                    formValues.deliveryDate = NablFormsHelper.formatDateForInput(data.deliveryDate);
                    this.items.clear();
                    data.items?.forEach(item => {
                        const itemForm = this.fb.group({
                            description: [item.description, Validators.required],
                            quantity: [item.quantity, [Validators.required, Validators.min(0.01)]],
                            unitOfMeasure: [item.unitOfMeasure, Validators.required],
                            unitPrice: [item.unitPrice, [Validators.required, Validators.min(0)]],
                            totalAmount: [{ value: item.totalAmount, disabled: true }]
                        });
                        this.items.push(itemForm);
                    });

                    this.poForm.patchValue(formValues);
                    // Lock form if not in editable status
                    const status = (data as any).status;
                    if (status && status !== 'Draft' && status !== 'Rejected') {
                        this.poForm.disable();
                        this.isViewMode = true;
                    }
                    // Re-disable system fields
                    this.poForm.get('documentNo')?.disable();
                    this.poForm.get('issueNo')?.disable();
                    this.poForm.get('revNo')?.disable();
                    this.poForm.get('formatNo')?.disable();
                }
            },
            error: (error: any) => {
                this.toastService.show(error?.error?.message || 'Failed to load record', 'error');
            }
        });
    }

    onSubmit(): void {
        if (this.poForm.invalid) {
            this.poForm.markAllAsTouched();
            return;
        }

        const formData = this.poForm.getRawValue();
        formData.preparedDate = this.today;

        formData.approvedDate = formData.approvedBy ? this.today : null;
        formData.reviewedDate = formData.reviewedBy ? this.today : null;
        formData.deliveryDate = formData.deliveryDate ? formData.deliveryDate : null;
        if (this.isEditMode) {
            this.service.update(this.recordId, formData).subscribe({
                next: () => {
                    this.saved = true;
                    this.toastService.show('Purchase Order updated successfully', 'success')
                    this.router.navigate(['/purchase-order']);
                },
                error: (error: any) => { this.toastService.show(error?.error?.message || 'Operation failed', 'error'); }
            });
        } else {
            formData.poDate = this.today;
            this.service.create(formData).subscribe({
                next: () => {
                    this.saved = true;
                    this.toastService.show('Purchase Order created successfully', 'success')
                    this.router.navigate(['/purchase-order']);
                },
                error: (error: any) => { this.toastService.show(error?.error?.message || 'Operation failed', 'error'); }
            });
        }
    }

    onCancel(): void {
        this.router.navigate(['/purchase-order']);
    }

    toggleSection(section: string): void {
        this.openSections[section] = !this.openSections[section];
    }

    canDeactivate(): Observable<boolean> | boolean {
        if (!this.poForm.dirty || this.saved) return true;
        return this.unsavedChangesService.confirm();
    }

    @HostListener('window:beforeunload', ['$event'])
    onBeforeUnload(event: BeforeUnloadEvent) {
        if (this.poForm?.dirty && !this.saved) {
            event.preventDefault();
            event.returnValue = '';
        }
    }
}
