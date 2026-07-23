import { Component, OnInit, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { QuillModule } from 'ngx-quill';
import { ApprovedSupplierService } from '../../../services/approved-supplier.service';
import { ToastService } from '../../../services/toast.service';
import { NablFormsHelper } from '../../../utility/nabl-helpers/nabl-forms.helper';
import { Observable } from 'rxjs';
import { CanComponentDeactivate } from '../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../services/unsaved-changes.service';
import { NablSignatureSectionComponent } from '../nabl-signature-section/nabl-signature-section.component';
import { NablHeaderService } from '../../../services/nabl-header.service';

@Component({
    selector: 'app-approved-supplier-form',

    imports: [CommonModule, ReactiveFormsModule, RouterModule, QuillModule, NablSignatureSectionComponent],
    templateUrl: './approved-supplier-form.component.html'
})
export class ApprovedSupplierFormComponent implements CanComponentDeactivate, OnInit {
    saved = false;
    supplierForm!: FormGroup;
    recordId: number = 0;
    isEditMode = false;
    isViewMode = false;
    formTitle = 'Add Approved Supplier';
    formNumbers: string[] = NablFormsHelper.getFormNumbers();
    supplierList: any[] = [];
    openSections: { [key: string]: boolean } = {
        header: true,
        supplier: true,
        approval: true,
        evaluation: true,
        remarks: true
    };

    quillModules = {
        toolbar: [
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            ['clean']
        ]
    };

    performanceGrades = ['A', 'B', 'C', 'D'];
    today = new Date().toISOString().split('T')[0];
    constructor(
        private fb: FormBuilder,
        private service: ApprovedSupplierService,
        private router: Router,
        private route: ActivatedRoute,
        private toastService: ToastService,
        private unsavedChangesService: UnsavedChangesService,
        private nablHeaderService: NablHeaderService) { }

    ngOnInit(): void {
        this.initForm();
        this.nablHeaderService.getFormDefaults('ApprovedSupplier').subscribe({
            next: (defaults) => {
                this.supplierForm.patchValue({ formatNo: defaults.formCode });
            },
            error: () => { }
        });
        this.recordId = Number(this.route.snapshot.params['id']);
        const path = this.route.snapshot.url[this.route.snapshot.url.length - 2]?.path;
        this.loadSupplierList();
        if (path === 'details') {
            this.isViewMode = true;
            this.formTitle = 'View Approved Supplier';
            this.supplierForm.disable();
        } else if (path === 'edit') {
            this.isEditMode = true;
            this.formTitle = 'Edit Approved Supplier';
        }

        if (this.recordId) {
            this.loadData();
        }
    }

    initForm(): void {
        const today = new Date().toISOString().split('T')[0];
        this.supplierForm = this.fb.group({
            id: [0],
            formatNo: ['F-20'],
            issueNo: ['01'],
            revNo: ['00'],
            date: [today, Validators.required],
            documentNo: ['F-20'],

            supplierName: ['', Validators.required],
            supplierRegisterId: [null, Validators.required],
            contactPerson: ['', Validators.required],
            itemsApproved: [''],
            mobileNo: ['', [Validators.required, Validators.pattern('^[0-9]{10,12}$')]],
            email: ['', [Validators.required, Validators.email]],
            registerNo: ['', Validators.required],
            gstNo: ['', [Validators.required, Validators.pattern('^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$')]],
            serviceProviderName: ['', Validators.required],
            address: ['', Validators.required],
            approvalDate: [today, Validators.required],
            lastReviewDate: [''],
            lastScore: [null],
            performanceRating: [''],
            isBlacklisted: [false],
            blacklistDate: [null],
            blacklistReason: [null],
            isPresentStatus: [false],
            enlistmentDate: [null],
            isActive: [true],
            preparedBy: [''],
            preparedDate: [this.today],
            reviewedBy: [null],
            approvedBy: [null],
            productApproved: [false],
            agreementDate: [this.today, Validators.required],
            remarks: [null]
        });
        this.supplierForm.get('isBlacklisted')?.valueChanges.subscribe(isChecked => {
            const reason = this.supplierForm.get('blacklistReason');

            if (isChecked) {
                reason?.setValidators([Validators.required]);
            } else {
                reason?.clearValidators();
                reason?.setValue('');
            }

            reason?.updateValueAndValidity();
        });

        this.supplierForm.get('isPresentStatus')?.valueChanges.subscribe(status => {
            const enlistmentDate = this.supplierForm.get('enlistmentDate');

            if (status === true) {
                enlistmentDate?.setValidators([Validators.required]);
            } else {
                enlistmentDate?.clearValidators();
                enlistmentDate?.setValue(null);
            }

            enlistmentDate?.updateValueAndValidity();
        });
        // System-managed fields — always readonly
        this.supplierForm.get('documentNo')?.disable();
        this.supplierForm.get('issueNo')?.disable();
        this.supplierForm.get('revNo')?.disable();
        this.supplierForm.get('formatNo')?.disable();
    }

    loadData(): void {
        this.service.getById(this.recordId).subscribe({
            next: (data) => {
                if (data) {
                    const formValues = { ...data };
                    formValues.date = NablFormsHelper.formatDateForInput((data as any)?.date || '');
                    formValues.lastReviewDate = NablFormsHelper.formatDateForInput((data as any)?.lastReviewDate || '');
                    formValues.enlistmentDate = NablFormsHelper.formatDateForInput((data as any)?.enlistmentDate || '');
                    formValues.agreementDate = NablFormsHelper.formatDateForInput((data as any)?.agreementDate || '');
                    this.supplierForm.patchValue(formValues);
                    // Lock form if not in editable status
                    const status = (data as any).status;
                    if (status && status !== 'Draft' && status !== 'Rejected') {
                        this.supplierForm.disable();
                        this.isViewMode = true;
                    }
                    // Re-disable system fields (in case form was enabled for Draft/Rejected)
                    this.supplierForm.get('documentNo')?.disable();
                    this.supplierForm.get('issueNo')?.disable();
                    this.supplierForm.get('revNo')?.disable();
                    this.supplierForm.get('formatNo')?.disable();
                }
            },
            error: (error: any) => { this.toastService.show(error?.error?.message || 'Operation failed', 'error'); }
        });
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
    onSupplierChange(event: any): void {
        const supplierId = Number(event.target.value);
        const selectSupplier = this.supplierList.find(c => c.id === supplierId || c.Id === supplierId);
        if (!selectSupplier) {
            this.supplierForm.patchValue({
                supplierRegisterId: null,
                supplierName: '',
                contactPerson: '',
                mobileNo: '',
                email: '',
                registerNo: '',
                gstNo: '',
                address: '',
                itemsApproved: ''
            });
            return;
        }
        const additional = selectSupplier.additionalValues || selectSupplier.AdditionalValues || {};
        this.supplierForm.patchValue({
            supplierRegisterId: selectSupplier.id || selectSupplier.Id,
            supplierName: selectSupplier.name || selectSupplier.Name,
            contactPerson: additional.ContactPerson || '',
            mobileNo: additional.MobileNo || '',
            email: additional.Email || '',
            registerNo: additional.RegisterNo || '',
            gstNo: additional.GSTNo || '',
            address: additional.Address || '',
            itemsApproved: additional.ProductsServicesOffered
        });


    }


    onSubmit(): void {
        if (this.supplierForm.invalid) {
            this.supplierForm.markAllAsTouched();
            return;
        }

        const formData = this.supplierForm.getRawValue();
        formData.preparedDate = this.today;
        formData.approvedDate = formData.approvedBy ? this.today : null;
        formData.reviewedDate = formData.reviewedBy ? this.today : null;
        formData.lastReviewDate = formData.lastReviewDate ? formData.lastReviewDate : null;
        if (formData.isPresentStatus === false) {
            formData.enlistmentDate = null;
        }
        if (formData.isBlacklisted || formData.blacklistReason) {
            formData.blacklistDate = this.today;
        }
        if (formData.isBlacklisted === false) {
            formData.blacklistDate = null;
        }

        if (this.isEditMode) {
            this.service.update(this.recordId, formData).subscribe({
                next: () => {
                    this.saved = true;
                    this.toastService.show('Approved Supplier updated successfully', 'success')
                    this.router.navigate(['/approved-supplier']);
                },
                error: (error: any) => { this.toastService.show(error?.error?.message || 'Operation failed', 'error'); }
            });
        } else {
            this.service.create(formData).subscribe({
                next: () => {
                    this.saved = true;
                    this.toastService.show('Competence requirement created successfully', 'success');
                    this.router.navigate(['/approved-supplier']);
                },
                error: (error: any) => { this.toastService.show(error?.error?.message || 'Operation failed', 'error'); }
            });
        }
    }

    onCancel(): void {
        this.router.navigate(['/approved-supplier']);
    }

    toggleSection(section: string): void {
        this.openSections[section] = !this.openSections[section];
    }

    canDeactivate(): Observable<boolean> | boolean {
        if (!this.supplierForm.dirty || this.saved) return true;
        return this.unsavedChangesService.confirm();
    }

    @HostListener('window:beforeunload', ['$event'])
    onBeforeUnload(event: BeforeUnloadEvent) {
        if (this.supplierForm?.dirty && !this.saved) {
            event.preventDefault();
            event.returnValue = '';
        }
    }
}
