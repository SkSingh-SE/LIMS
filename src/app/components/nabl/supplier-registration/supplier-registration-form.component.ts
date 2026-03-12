import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { SupplierRegistrationService } from '../../../services/supplier-registration.service';
import { NablFormsHelper } from '../../../utility/nabl-helpers/nabl-forms.helper';

import { QuillModule } from 'ngx-quill';

@Component({
    selector: 'app-supplier-registration-form',

    imports: [CommonModule, ReactiveFormsModule, RouterModule, QuillModule],
    templateUrl: './supplier-registration-form.component.html'
})
export class SupplierRegistrationFormComponent implements OnInit {
    registrationForm!: FormGroup;
    recordId: number = 0;
    isEditMode = false;
    isViewMode = false;
    isLoading = signal(false);
    formTitle = 'Add Supplier Registration (F-19)';
    formNumbers: string[] = NablFormsHelper.getFormNumbers();

    openSections: { [key: string]: boolean } = {
        header: true,
        basic: true,
        business: true,
        bank: true,
        documents: true,
        status: true
    };

    quillModules = {
        toolbar: [
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            ['clean']
        ]
    };

    constructor(
        private fb: FormBuilder,
        private service: SupplierRegistrationService,
        private router: Router,
        private route: ActivatedRoute
    ) { }

    ngOnInit(): void {
        this.initForm();

        this.recordId = Number(this.route.snapshot.params['id']);
        const path = this.route.snapshot.url[this.route.snapshot.url.length - 2]?.path;

        if (path === 'details') {
            this.isViewMode = true;
            this.formTitle = 'View Supplier Registration';
            this.registrationForm.disable();
        } else if (path === 'edit') {
            this.isEditMode = true;
            this.formTitle = 'Edit Supplier Registration';
        }

        if (this.recordId) {
            this.loadData();
        }
    }

    initForm(): void {
        const today = new Date().toISOString().split('T')[0];
        this.registrationForm = this.fb.group({
            id: [0],
            formatNo: ['F-19', Validators.required],
            issueNo: ['01', Validators.required],
            revNo: ['00', Validators.required],
            date: [today, Validators.required],
            documentNo: ['', Validators.required],

            supplierName: ['', Validators.required],
            address: ['', Validators.required],
            contactPerson: ['', Validators.required],
            designation: ['', Validators.required],
            mobileNo: ['', [Validators.required, Validators.pattern('^[0-9]{10,12}$')]],
            email: ['', [Validators.required, Validators.email]],
            website: [''],

            natureOfBusiness: ['Manufacturer', Validators.required],
            productsServicesOffered: ['', Validators.required],
            gstNo: ['', [Validators.required, Validators.pattern('^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$')]],
            panNo: ['', [Validators.required, Validators.pattern('^[A-Z]{5}[0-9]{4}[A-Z]{1}$')]],
            isoCertified: [false],
            isoDetails: [''],

            bankDetails: this.fb.group({
                bankName: ['', Validators.required],
                accountNo: ['', Validators.required],
                ifscCode: ['', Validators.required],
                branch: ['', Validators.required]
            }),

            documentsSubmitted: this.fb.group({
                gstCertificate: [false],
                panCard: [false],
                isoCertificate: [false],
                cancelledCheque: [false],
                msmeCertificate: [false],
                otherDocs: ['']
            }),

            registrationStatus: ['Pending', Validators.required],
            remarks: [''],
            recordedBy: ['', Validators.required],
            verifiedBy: ['']
        });
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

                    this.registrationForm.patchValue(formValues);
                }
                this.isLoading.set(false);
            },
            error: () => this.isLoading.set(false)
        });
    }

    onSubmit(): void {
        if (this.registrationForm.invalid) {
            this.registrationForm.markAllAsTouched();
            return;
        }

        this.isLoading.set(true);
        const formData = this.registrationForm.getRawValue();

        if (this.isEditMode) {
            this.service.update(this.recordId, formData).subscribe({
                next: () => this.router.navigate(['/supplier-registration']),
                error: () => this.isLoading.set(false)
            });
        } else {
            this.service.create(formData).subscribe({
                next: () => this.router.navigate(['/supplier-registration']),
                error: () => this.isLoading.set(false)
            });
        }
    }

    onCancel(): void {
        this.router.navigate(['/supplier-registration']);
    }

    toggleSection(section: string): void {
        this.openSections[section] = !this.openSections[section];
    }
}
