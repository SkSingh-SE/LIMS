import { Component, OnInit, signal , HostListener } from '@angular/core';
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

@Component({
    selector: 'app-supplier-confidentiality-form',

    imports: [CommonModule, ReactiveFormsModule, RouterModule, QuillModule, NablSignatureSectionComponent],
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
            error: () => {}
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

            agreementDate: [today, Validators.required],
            validUntil: ['', Validators.required],

            preparedBy: [''],
            reviewedBy: [''],
            reviewedDate: [today, Validators.required],
            approvedBy: [''],
            approvalDate: [today, Validators.required],

            status: ['active'],
            remarks: ['']
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
                    const formValues = { ...data };
                    formValues.date = new Date().toISOString().split('T')[0];

                    this.agreementForm.patchValue(formValues);
                    // Lock form if not in editable status
                    const status = (data as any).status;
                    if (status && status !== 'Draft' && status !== 'Rejected') {
                        this.agreementForm.disable();
                        this.isViewMode = true;
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
        if (this.agreementForm.invalid) {
            this.agreementForm.markAllAsTouched();
            return;
        }

        const formData = this.agreementForm.getRawValue();

        if (this.isEditMode) {
            this.service.update(this.recordId, formData).subscribe({
                next: () => { this.saved = true; this.router.navigate(['/supplier-confidentiality-agreement']); },
                error: (error: any) => { this.toastService.show(error?.error?.message || 'Operation failed', 'error'); }
            });
        } else {
            this.service.create(formData).subscribe({
                next: () => { this.saved = true; this.router.navigate(['/supplier-confidentiality-agreement']); },
                error: (error: any) => { this.toastService.show(error?.error?.message || 'Operation failed', 'error'); }
            });
        }
    }

    onCancel(): void {
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
