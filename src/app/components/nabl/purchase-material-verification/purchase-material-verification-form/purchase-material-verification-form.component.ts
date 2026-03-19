import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { PurchaseMaterialVerificationService } from '../../../../services/purchase-material-verification.service';
import { NablFormsHelper } from '../../../../utility/nabl-helpers/nabl-forms.helper';
import { QuillModule } from 'ngx-quill';
@Component({
    selector: 'app-purchase-material-verification-form',

    imports: [CommonModule, ReactiveFormsModule, QuillModule],
    templateUrl: './purchase-material-verification-form.component.html',
    styleUrls: ['./purchase-material-verification-form.component.css']
})
export class PurchaseMaterialVerificationFormComponent implements OnInit {
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
        private route: ActivatedRoute
    ) { }

    ngOnInit(): void {
        this.formNumbers = NablFormsHelper.getFormNumbers();
        this.initForm();

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
            formatNo: ['F-25', Validators.required],
            documentNo: ['', Validators.required],
            issueNo: [{ value: '01', disabled: true }, Validators.required],
            revNo: [{ value: '00', disabled: true }, Validators.required],
            date: [{ value: new Date().toISOString().split('T')[0], disabled: true }, Validators.required],

            supplierName: ['', Validators.required],
            invoiceNo: ['', Validators.required],
            invoiceDate: ['', Validators.required],
            grnNo: [''],

            items: this.fb.array([], Validators.required),

            overallStatus: ['Accepted', Validators.required],
            remarks: [''],
            verifiedBy: ['', Validators.required],
            approvedBy: ['', Validators.required]
        });

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

        this.service.getById(this.recordId).subscribe(record => {
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

                if (this.isViewMode) {
                    this.verificationForm.disable();
                }
            } else {
                alert('Record not found');
                this.router.navigate(['/purchase/material-verification/list']);
            }
        });
    }

    onSubmit(): void {
        if (this.verificationForm.invalid) {
            this.verificationForm.markAllAsTouched();
            alert('Please fill all required fields');
            return;
        }

        const formData = this.verificationForm.getRawValue();

        const request = this.isEditMode && this.recordId
            ? this.service.update(this.recordId, formData)
            : this.service.create(formData);

        request.subscribe(res => {
            if (res.success) {
                alert(`Record ${this.isEditMode ? 'updated' : 'created'} successfully`);
                this.router.navigate(['/purchase-material-verification']);
            } else {
                alert('Failed to save record');
            }
        });
    }

    onCancel(): void {
        this.router.navigate(['/purchase-material-verification']);
    }
}
