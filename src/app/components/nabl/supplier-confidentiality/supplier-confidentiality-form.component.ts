import { Component, OnInit, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { SupplierConfidentialityService } from '../../../services/supplier-confidentiality.service';
import { SupplierService } from '../../../services/supplier.service';
import { ToastService } from '../../../services/toast.service';
import { NablFormsHelper } from '../../../utility/nabl-helpers/nabl-forms.helper';

import { QuillModule } from 'ngx-quill';
import { Observable } from 'rxjs';
import { CanComponentDeactivate } from '../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../services/unsaved-changes.service';
import { NablSignatureSectionComponent } from '../nabl-signature-section/nabl-signature-section.component';
import { NablHeaderService } from '../../../services/nabl-header.service';
import { FormFieldErrorComponent } from '../../../utility/components/form-field-error/form-field-error.component';
import { FormValidationHelper } from '../../../utility/helper/form-validation.helper';
@Component({
    selector: 'app-supplier-confidentiality-form',

    imports: [CommonModule, ReactiveFormsModule, RouterModule, QuillModule, NablSignatureSectionComponent, FormFieldErrorComponent],
    templateUrl: './supplier-confidentiality-form.component.html'
})
export class SupplierConfidentialityFormComponent implements CanComponentDeactivate, OnInit {
    saved = false;
    agreementForm!: FormGroup;
    recordId: number = 0; 
    isEditMode = false;
    isViewMode = false;
    formTitle = 'Create Supplier Confidentiality Agreement';
    formNumbers: string[] = NablFormsHelper.getFormNumbers();
    suppliers: any[] = [];
    submitted = false;
    openSections: { [key: string]: boolean } = {
        header: true,
        supplier: true,
        agreement: true,
        approval: true
    };

    quillModules = {
        toolbar: [
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            [{ 'header': [1, 2, 3, false] }],
            [{ 'color': [] }, { 'background': [] }],
            ['clean']
        ]
    };

    today = new Date().toISOString().split('T')[0];
    constructor(
        private fb: FormBuilder,
        private service: SupplierConfidentialityService,
        private supplierService: SupplierService,
        private router: Router,
        private route: ActivatedRoute,
        private toastService: ToastService,
        private unsavedChangesService: UnsavedChangesService,
        private nablHeaderService: NablHeaderService) { }

    ngOnInit(): void {
        this.initForm();
        this.nablHeaderService.getFormDefaults('SupplierConfidentiality').subscribe({
            next: (defaults) => {
                this.agreementForm.patchValue({ formatNo: defaults.formCode });
            },
            error: () => { }
        });
        this.loadSuppliers();

        this.recordId = Number(this.route.snapshot.params['id']);
        const path = this.route.snapshot.url[this.route.snapshot.url.length - 2]?.path;

        if (path === 'details') {
            this.isViewMode = true;
            this.formTitle = 'View Supplier Confidentiality Agreement';
            this.agreementForm.disable();
        } else if (path === 'edit') {
            this.isEditMode = true;
            this.formTitle = 'Edit Supplier Confidentiality Agreement';
        }

        if (this.recordId) {
            this.loadData();
        }
    }

    initForm(): void {
        const today = new Date().toISOString().split('T')[0];
        this.agreementForm = this.fb.group({
            id: [0],
            formatNo: ['F-2'],
            documentNo: [{ value: '', disabled: true }],
            issueNo: ['01'],
            revNo: ['00'],
            date: [today, Validators.required],

            supplierId: [null, Validators.required],
            supplierName: ['', Validators.required],
            contactPerson: [''],
            address: [''],
            preparedDate: [this.today],
            agreementDate: [today, Validators.required],
            agreementValidUpto: ['', Validators.required],

            preparedBy: [''],
            reviewedBy: [''],
            reviewedDate: [''],
            approvedBy: [''],
            approvedDate: [''],
            status: ['active'],
            confidentialItems: ['']
        });

        // System-managed fields — always readonly
        this.agreementForm.get('issueNo')?.disable();
        this.agreementForm.get('revNo')?.disable();
        this.agreementForm.get('formatNo')?.disable();
    }

    loadSuppliers(): void {
        this.supplierService.getAllSuppliers({ PageNumber: 1, PageSize: 100 }).subscribe(res => {
            this.suppliers = res.items || [];
        });
    }
    isFieldInvalid(path: string): boolean {
        return FormValidationHelper.isFieldInvalid(this.agreementForm, path, this.submitted);
    }

    onSupplierChange(event: any): void {
        const supplierId = Number(event.target.value);
        const supplier = this.suppliers.find(s => s.id === supplierId);
        if (supplier) {
            this.agreementForm.patchValue({
                supplierId: supplier.id,
                supplierName: supplier.name,
                contactPerson: supplier.contactPerson1,
                address: supplier.address
            });
        }
    }

    loadData(): void {
        this.service.getById(this.recordId).subscribe({
            next: (data) => {
                if (data) {
                    debugger;
                    const formValues = { ...data };
                    formValues.date = NablFormsHelper.formatDateForInput((data as any)?.date || '');
                    formValues.agreementDate = NablFormsHelper.formatDateForInput((data as any)?.agreementDate || '');
                    formValues.agreementValidUpto = NablFormsHelper.formatDateForInput((data as any)?.agreementValidUpto || '');
                    formValues.reviewedDate = NablFormsHelper.formatDateForInput((data as any)?.reviewedDate || '');
                    formValues.approvedDate = NablFormsHelper.formatDateForInput((data as any)?.approvedDate || '');

                    this.agreementForm.patchValue(formValues);
                    // Lock form if not in editable status
                    const status = (data as any).status;
                    if (status && status !== 'Draft' && status !== 'Rejected') {
                        // this.agreementForm.disable();
                        // this.isViewMode = true;
                    }
                    // Re-disable system fields
                    this.agreementForm.get('issueNo')?.disable();
                    this.agreementForm.get('revNo')?.disable();
                    this.agreementForm.get('formatNo')?.disable();
                }
            },
            error: (error: any) => { this.toastService.show(error?.error?.message || 'Operation failed', 'error'); }
        });
    }

    onSubmit(): void {
        this.submitted = true;
        if (this.agreementForm.invalid) {
            this.agreementForm.markAllAsTouched();
            return;
        }

        const formData = this.agreementForm.getRawValue();
        formData.preparedDate = this.today;
        if (formData.approvedBy == "" || !formData.approvedDate) {
            formData.approvedDate = null;
        }
        if (formData.reviewedBy == "" || !formData.reviewedDate) {
            formData.reviewedDate = null;
        }
        if (this.isEditMode) {
            this.service.update(this.recordId, formData).subscribe({
                next: () => {
                    this.saved = true;
                    this.toastService.show('Supplier Confidentiality Agreement updated successfully', 'success');
                    this.router.navigate(['/supplier-confidentiality-agreement']);
                },
                error: (error: any) => { this.toastService.show(error?.error?.message || 'Operation failed', 'error'); }
            });
        } else {
            this.service.create(formData).subscribe({
                next: () => {
                    this.saved = true; this.toastService.show('Supplier Confidentiality Agreement created successfully', 'success');
                    this.router.navigate(['/supplier-confidentiality-agreement']);
                },
                error: (error: any) => { this.toastService.show(error?.error?.message || 'Operation failed', 'error'); }
            });
        }
    }

    onCancel(): void {
        this.submitted = false;

        this.router.navigate(['/supplier-confidentiality-agreement']);
    }

    toggleSection(section: string): void {
        this.openSections[section] = !this.openSections[section];
    }

    canDeactivate(): Observable<boolean> | boolean {
        if (!this.agreementForm.dirty || this.saved) return true;
        return this.unsavedChangesService.confirm();
    }

    @HostListener('window:beforeunload', ['$event'])
    onBeforeUnload(event: BeforeUnloadEvent) {
        if (this.agreementForm?.dirty && !this.saved) {
            event.preventDefault();
            event.returnValue = '';
        }
    }
}
