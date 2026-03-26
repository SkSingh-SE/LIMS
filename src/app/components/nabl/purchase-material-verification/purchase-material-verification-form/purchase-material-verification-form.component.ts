import { Component, OnInit , HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
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
    recordId: number | null = null;
    formNumbers: string[] = [];

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

    overallStatusOptions = [
        { value: 'Accepted', label: 'Accepted' },
        { value: 'Rejected', label: 'Rejected' },
        { value: 'Hold', label: 'Hold' }
    ];

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
            error: () => {}
        });

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
            documentNo: [''],
            issueNo: [{ value: '01', disabled: true }],
            revNo: [{ value: '00', disabled: true }],
            date: [{ value: new Date().toISOString().split('T')[0], disabled: true }, Validators.required],

            supplierName: ['', Validators.required],
            invoiceNo: ['', Validators.required],
            invoiceDate: ['', Validators.required],
            grnNo: [''],

            items: this.fb.array([], Validators.required),

            overallStatus: ['Accepted', Validators.required],
            remarks: [''],
            preparedBy: [''],
            reviewedBy: [''],
            verifiedBy: ['', Validators.required],
            approvedBy: ['']
        });

        // System-managed fields — always readonly
        this.verificationForm.get('documentNo')?.disable();
        this.verificationForm.get('formatNo')?.disable();

        if (!this.isEditMode) {
            this.addItem();
        }
    }

    get items(): FormArray {
        return this.verificationForm.get('items') as FormArray;
    }

    addItem(): void {
        const itemGroup = this.fb.group({
            materialName: ['', Validators.required],
            poNumber: ['', Validators.required],
            verifiedQuantity: [0, [Validators.required, Validators.min(0)]],
            observation: ['', Validators.required],
            verificationStatus: ['Pass', Validators.required]
        });
        this.items.push(itemGroup);
    }

    removeItem(index: number): void {
        this.items.removeAt(index);
    }

    toggleSection(section: string): void {
        this.openSections[section] = !this.openSections[section];
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

                    // Add item groups for each item in record
                    record.items.forEach(() => {
                        this.addItem();
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

        const request = this.isEditMode && this.recordId
            ? this.service.update(this.recordId, formData)
            : this.service.create(formData);

        request.subscribe({
            next: (res) => {
                this.saved = true;
                if (res.success) {
                    this.toastService.show(`Record ${this.isEditMode ? 'updated' : 'created'} successfully`, 'success');
                    this.router.navigate(['/purchase-material-verification']);
                } else {
                    this.toastService.show('Failed to save record', 'error');
                }
            },
            error: (error: any) => {
                this.toastService.show(error?.error?.message || 'Operation failed', 'error');
            }
        });
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
