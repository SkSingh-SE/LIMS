import { Component, OnInit, signal , HostListener } from '@angular/core';
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

@Component({
    selector: 'app-purchase-order-form',

    imports: [CommonModule, ReactiveFormsModule, RouterModule, QuillModule],
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

    constructor(
        private fb: FormBuilder,
        private service: PurchaseOrderService,
        private router: Router,
        private route: ActivatedRoute,
        private unsavedChangesService: UnsavedChangesService,
        private toastService: ToastService) { }

    ngOnInit(): void {
        this.initForm();
        this.recordId = Number(this.route.snapshot.params['id']);
        const path = this.route.snapshot.url[this.route.snapshot.url.length - 2]?.path;

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
        const today = new Date().toISOString().split('T')[0];
        this.poForm = this.fb.group({
            id: [0],
            formatNo: ['F-22', Validators.required],
            issueNo: ['01', Validators.required],
            revNo: ['00', Validators.required],
            date: [today, Validators.required],
            documentNo: ['', Validators.required],

            supplierName: ['', Validators.required],
            supplierAddress: ['', Validators.required],
            gstNo: [''],

            indentNo: [''],
            poType: ['Regular', Validators.required],
            currency: ['INR', Validators.required],

            items: this.fb.array([]),
            totalAmount: [0],
            gstPercentage: [18],
            gstAmount: [0],
            grandTotal: [0],

            termsAndConditions: ['', Validators.required],
            deliveryDate: ['', Validators.required],
            paymentTerms: ['', Validators.required],

            preparedBy: ['', Validators.required],
            authorizedBy: ['', Validators.required],
            status: ['Draft'],
            isActive: [true]
        });

        // Watch items and GST for totals calculation
        this.poForm.get('items')?.valueChanges.subscribe(() => this.calculateTotals());
        this.poForm.get('gstPercentage')?.valueChanges.subscribe(() => this.calculateTotals());
    }

    get items(): FormArray {
        return this.poForm.get('items') as FormArray;
    }

    addItem(): void {
        const itemForm = this.fb.group({
            description: ['', Validators.required],
            quantity: [1, [Validators.required, Validators.min(0.01)]],
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
                    formValues.date = new Date().toISOString().split('T')[0];

                    if (this.isEditMode) {
                        const currentRev = parseInt(data.revNo || '0');
                        formValues.revNo = (currentRev + 1).toString().padStart(2, '0');
                    }

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

        if (this.isEditMode) {
            this.service.update(this.recordId, formData).subscribe({
                next: () => { this.saved = true; this.router.navigate(['/purchase-order']); },
                error: (error: any) => { this.toastService.show(error?.error?.message || 'Operation failed', 'error'); }
            });
        } else {
            this.service.create(formData).subscribe({
                next: () => { this.saved = true; this.router.navigate(['/purchase-order']); },
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
