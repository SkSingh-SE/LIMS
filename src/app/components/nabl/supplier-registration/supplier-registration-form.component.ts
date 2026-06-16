import { Component, OnInit, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, ValueChangeEvent } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { SupplierRegistrationService } from '../../../services/supplier-registration.service';
import { ToastService } from '../../../services/toast.service';
import { NablFormsHelper } from '../../../utility/nabl-helpers/nabl-forms.helper';

import { QuillModule } from 'ngx-quill';
import { Observable } from 'rxjs';
import { CanComponentDeactivate } from '../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../services/unsaved-changes.service';
import { NablSignatureSectionComponent } from '../nabl-signature-section/nabl-signature-section.component';
import { NablHeaderService } from '../../../services/nabl-header.service';
import { errors } from '@playwright/test';

@Component({
    selector: 'app-supplier-registration-form',

    imports: [CommonModule, ReactiveFormsModule, RouterModule, QuillModule, NablSignatureSectionComponent],
    templateUrl: './supplier-registration-form.component.html'
})
export class SupplierRegistrationFormComponent implements CanComponentDeactivate, OnInit {
    saved = false;
    registrationForm!: FormGroup;
    recordId: number = 0;
    isEditMode = false;
    isViewMode = false;
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
    today = new Date().toISOString().split('T')[0];

    constructor(
        private fb: FormBuilder,
        private service: SupplierRegistrationService,
        private router: Router,
        private route: ActivatedRoute,
        private toastService: ToastService,
        private unsavedChangesService: UnsavedChangesService,
        private nablHeaderService: NablHeaderService) { }

    ngOnInit(): void {
        this.initForm();
        this.nablHeaderService.getFormDefaults('SupplierRegistration').subscribe({
            next: (defaults) => {
                this.registrationForm.patchValue({ formatNo: defaults.formCode });
            },
            error: () => { }
        });

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
        if (path != "details" && path != "edit") {
            this.service.getNextRegisterNo().subscribe({
                next: (res) => {
                    this.registrationForm.patchValue({
                        registerNo: res.registerNo
                    })
                },
                error: () => { }
            });
        }
        if (this.recordId) {
            this.loadData();
        }
    }


    initForm(): void {

        this.registrationForm = this.fb.group({
            id: [0],
            formatNo: ['F-19'],
            issueNo: ['01'],
            revNo: ['00'],
            date: [this.today, Validators.required],
            documentNo: ['F-19'],

            supplierName: ['', Validators.required],
            address: ['', Validators.required],
            contactPerson: ['', Validators.required],
            designation: [''],
            mobileNo: ['', [Validators.required, Validators.pattern('^[0-9]{10,12}$')]],
            email: ['', [Validators.required, Validators.email]],
            website: [''],
            preparedDate: [this.today],
            natureOfBusiness: ['Manufacturer'],
            productsServicesOffered: ['', Validators.required],
            gstNo: ['', [Validators.required, Validators.pattern('^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$')]],
            panNo: ['', [Validators.pattern('^[A-Z]{5}[0-9]{4}[A-Z]{1}$')]],
            isoCertified: [false],
            isoDetails: [''],
            registerNo: ['', Validators.required],
            documentsSubmitted: this.fb.group({
                monopolyCert: false,
                popularBrandCert: false,
                isoCertificate: false,
                workmanshipCert: false,
                deliveryRecord: false,
                supplierConfidentiality: false,
                supplierApproved: true,
                reasonNotApproved: '',
                price: false,
                evaluationRequired: true
            }),

            registrationStatus: ['Pending'],
            remarks: [''],
            recordedBy: [''],
            verifiedBy: [''],
            preparedBy: [''],
            reviewedBy: [null],
            approvedBy: [null],
            reviewedDate: [''],
            approvedDate: ['']
        });

        // System-managed fields — always readonly
        this.registrationForm.get('documentNo')?.disable();
        this.registrationForm.get('issueNo')?.disable();
        this.registrationForm.get('revNo')?.disable();
        this.registrationForm.get('formatNo')?.disable();
        this.registrationForm.get('registerNo')?.disable();
        // Call this in ngOnInit() after form creation
        this.registrationForm.get('documentsSubmitted.supplierApproved')?.valueChanges.subscribe((isApproved: boolean) => {
            const reasonControl = this.registrationForm.get('documentsSubmitted.reasonNotApproved');

            if (isApproved === false) {
                // Checkbox unchecked -> Reason is required
                reasonControl?.setValidators([Validators.required]);
            } else {
                // Checkbox checked -> Remove validation and clear value
                reasonControl?.clearValidators();
                reasonControl?.setValue('');
            }

            reasonControl?.updateValueAndValidity();
        });
    }

    loadData(): void {
        this.service.getById(this.recordId).subscribe({
            next: (data) => {
                if (data) {
                    const formValues = { ...data };
                    formValues.date = NablFormsHelper.formatDateForInput(data?.date || '')


                    this.registrationForm.patchValue(formValues);
                    // Lock form if not in editable status
                    const status = (data as any).status;
                    if (status && status !== 'Draft' && status !== 'Rejected') {
                        this.registrationForm.disable();
                        this.isViewMode = true;
                    }
                    // Re-disable system fields (in case form was enabled for Draft/Rejected)
                    this.registrationForm.get('documentNo')?.disable();
                    this.registrationForm.get('issueNo')?.disable();
                    this.registrationForm.get('revNo')?.disable();
                    this.registrationForm.get('formatNo')?.disable();
                }
            },
            error: (error: any) => { this.toastService.show(error?.error?.message || 'Operation failed', 'error'); }
        });
    }

    onSubmit(): void {
        if (this.registrationForm.invalid) {
            this.registrationForm.markAllAsTouched();
            return;
        }

        const formData = this.registrationForm.getRawValue();
        formData.preparedDate = this.today;
        formData.approvedDate = formData.approvedBy ? this.today : null;
        formData.reviewedDate = formData.reviewedBy ? this.today : null;
        if (this.isEditMode) {
            this.service.update(this.recordId, formData).subscribe({
                next: () => {
                    this.saved = true;
                    this.toastService.show('Supplier Register updated successfully', 'success');
                    this.router.navigate(['/supplier-registration']);
                },
                error: (error: any) => { this.toastService.show(error?.error?.message || 'Operation failed', 'error'); }
            });
        } else {
            this.service.create(formData).subscribe({
                next: () => {
                    this.saved = true;
                    this.toastService.show('Supplier Register create successfully', 'success');
                    this.router.navigate(['/supplier-registration']);
                },
                error: (error: any) => { this.toastService.show(error?.error?.message || 'Operation failed', 'error'); }
            });
        }
    }

    onCancel(): void {
        this.router.navigate(['/supplier-registration']);
    }

    toggleSection(section: string): void {
        this.openSections[section] = !this.openSections[section];
    }

    canDeactivate(): Observable<boolean> | boolean {
        if (!this.registrationForm.dirty || this.saved) return true;
        return this.unsavedChangesService.confirm();
    }

    @HostListener('window:beforeunload', ['$event'])
    onBeforeUnload(event: BeforeUnloadEvent) {
        if (this.registrationForm?.dirty && !this.saved) {
            event.preventDefault();
            event.returnValue = '';
        }
    }
}
