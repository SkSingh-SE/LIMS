import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { SupplierConfidentialityService } from '../../../services/supplier-confidentiality.service';
import { SupplierService } from '../../../services/supplier.service';
import { NablFormsHelper } from '../../../utility/nabl-helpers/nabl-forms.helper';

import { QuillModule } from 'ngx-quill';

@Component({
    selector: 'app-supplier-confidentiality-form',

    imports: [CommonModule, ReactiveFormsModule, RouterModule, QuillModule],
    templateUrl: './supplier-confidentiality-form.component.html'
})
export class SupplierConfidentialityFormComponent implements OnInit {
    agreementForm!: FormGroup;
    recordId: number = 0;
    isEditMode = false;
    isViewMode = false;
    isLoading = signal(false);
    formTitle = 'Create Supplier Confidentiality Agreement';
    formNumbers: string[] = NablFormsHelper.getFormNumbers();
    suppliers: any[] = [];

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

    constructor(
        private fb: FormBuilder,
        private service: SupplierConfidentialityService,
        private supplierService: SupplierService,
        private router: Router,
        private route: ActivatedRoute
    ) { }

    ngOnInit(): void {
        this.initForm();
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
            formatNo: ['F-2', Validators.required],
            documentNo: [{ value: '', disabled: true }],
            issueNo: ['01', Validators.required],
            revNo: ['00', Validators.required],
            date: [today, Validators.required],

            supplierId: [null, Validators.required],
            supplierName: ['', Validators.required],
            contactPerson: [''],
            address: [''],

            agreementDate: [today, Validators.required],
            validUntil: ['', Validators.required],

            reviewedBy: ['Quality Manager', Validators.required],
            reviewedDate: [today, Validators.required],
            approvedBy: ['Director', Validators.required],
            approvalDate: [today, Validators.required],

            status: ['active', Validators.required],
            remarks: ['']
        });
    }

    loadSuppliers(): void {
        this.supplierService.getAllSuppliers({ PageNumber: 1, PageSize: 100 }).subscribe(res => {
            this.suppliers = res.items || [];
        });
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
        this.isLoading.set(true);
        this.service.getById(this.recordId).subscribe({
            next: (data) => {
                if (data) {
                    const formValues = { ...data };
                    formValues.date = new Date().toISOString().split('T')[0];

                    if (this.isEditMode) {
                        const currentRev = parseInt(data.revNo || '0');
                        formValues.revNo = (currentRev + 1).toString().padStart(2, '0');
                    }

                    this.agreementForm.patchValue(formValues);
                }
                this.isLoading.set(false);
            },
            error: () => this.isLoading.set(false)
        });
    }

    onSubmit(): void {
        if (this.agreementForm.invalid) {
            this.agreementForm.markAllAsTouched();
            return;
        }

        this.isLoading.set(true);
        const formData = this.agreementForm.getRawValue();

        if (this.isEditMode) {
            this.service.update(this.recordId, formData).subscribe({
                next: () => this.router.navigate(['/supplier-confidentiality-agreement']),
                error: () => this.isLoading.set(false)
            });
        } else {
            this.service.create(formData).subscribe({
                next: () => this.router.navigate(['/supplier-confidentiality-agreement']),
                error: () => this.isLoading.set(false)
            });
        }
    }

    onCancel(): void {
        this.router.navigate(['/supplier-confidentiality-agreement']);
    }

    toggleSection(section: string): void {
        this.openSections[section] = !this.openSections[section];
    }
}
