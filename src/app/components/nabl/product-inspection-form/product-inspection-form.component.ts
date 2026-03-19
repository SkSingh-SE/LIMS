import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { QuillModule } from 'ngx-quill';
import { ProductInspectionService } from '../../../services/product-inspection.service';
import { NablFormsHelper } from '../../../utility/nabl-helpers/nabl-forms.helper';

@Component({
    selector: 'app-product-inspection-form',

    imports: [CommonModule, ReactiveFormsModule, RouterModule, QuillModule],
    templateUrl: './product-inspection-form.component.html'
})
export class ProductInspectionFormComponent implements OnInit {
    inspectionForm!: FormGroup;
    recordId: number = 0;
    isEditMode = false;
    isViewMode = false;
    formTitle = 'Create Inspection Plan';
    formNumbers: string[] = NablFormsHelper.getFormNumbers();

    openSections: { [key: string]: boolean } = {
        header: true,
        product: true,
        parameters: true,
        signatories: true
    };

    quillModules = {
        toolbar: [
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            ['clean']
        ]
    };

    categories = ['Product', 'Service'];
    stages = ['Incoming', 'In-process', 'Final'];

    constructor(
        private fb: FormBuilder,
        private service: ProductInspectionService,
        private router: Router,
        private route: ActivatedRoute
    ) { }

    ngOnInit(): void {
        this.initForm();
        this.recordId = Number(this.route.snapshot.params['id']);
        const path = this.route.snapshot.url[this.route.snapshot.url.length - 2]?.path;

        if (path === 'details') {
            this.isViewMode = true;
            this.formTitle = 'View Inspection Plan';
            this.inspectionForm.disable();
        } else if (path === 'edit') {
            this.isEditMode = true;
            this.formTitle = 'Edit Inspection Plan';
        }

        if (this.recordId) {
            this.loadData();
        } else {
            this.addParameter();
        }
    }

    initForm(): void {
        const today = new Date().toISOString().split('T')[0];
        this.inspectionForm = this.fb.group({
            id: [0],
            formatNo: ['F-23', Validators.required],
            issueNo: ['01', Validators.required],
            revNo: ['00', Validators.required],
            date: [today, Validators.required],
            documentNo: ['', Validators.required],

            productName: ['', Validators.required],
            productCode: ['', Validators.required],
            category: ['Product', Validators.required],
            inspectionStage: ['Incoming', Validators.required],

            parameters: this.fb.array([]),
            remarks: [''],

            preparedBy: ['', Validators.required],
            reviewedBy: ['', Validators.required],
            approvedBy: ['', Validators.required],

            status: ['Pending'],
            isActive: [true]
        });
    }

    get parameters(): FormArray {
        return this.inspectionForm.get('parameters') as FormArray;
    }

    addParameter(): void {
        const paramForm = this.fb.group({
            parameterName: ['', Validators.required],
            requirement: ['', Validators.required],
            methodOfCheck: ['', Validators.required],
            frequency: ['', Validators.required],
            acceptanceCriteria: ['', Validators.required]
        });
        this.parameters.push(paramForm);
    }

    removeParameter(index: number): void {
        if (this.parameters.length > 1) {
            this.parameters.removeAt(index);
        }
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

                    this.parameters.clear();
                    data.parameters?.forEach(p => {
                        const paramForm = this.fb.group({
                            parameterName: [p.parameterName, Validators.required],
                            requirement: [p.requirement, Validators.required],
                            methodOfCheck: [p.methodOfCheck, Validators.required],
                            frequency: [p.frequency, Validators.required],
                            acceptanceCriteria: [p.acceptanceCriteria, Validators.required]
                        });
                        this.parameters.push(paramForm);
                    });

                    this.inspectionForm.patchValue(formValues);
                }
            },
            error: () => {}
        });
    }

    onSubmit(): void {
        if (this.inspectionForm.invalid) {
            this.inspectionForm.markAllAsTouched();
            return;
        }

        const formData = this.inspectionForm.getRawValue();

        if (this.isEditMode) {
            this.service.update(this.recordId, formData).subscribe({
                next: () => this.router.navigate(['/product-inspection']),
                error: () => {}
            });
        } else {
            this.service.create(formData).subscribe({
                next: () => this.router.navigate(['/product-inspection']),
                error: () => {}
            });
        }
    }

    onCancel(): void {
        this.router.navigate(['/product-inspection']);
    }

    toggleSection(section: string): void {
        this.openSections[section] = !this.openSections[section];
    }
}
