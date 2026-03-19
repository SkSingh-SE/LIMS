import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { QuillModule } from 'ngx-quill';
import { PurchaseIndentService } from '../../../services/purchase-indent.service';
import { NablFormsHelper } from '../../../utility/nabl-helpers/nabl-forms.helper';

@Component({
    selector: 'app-purchase-indent-form',

    imports: [CommonModule, ReactiveFormsModule, RouterModule, QuillModule],
    templateUrl: './purchase-indent-form.component.html'
})
export class PurchaseIndentFormComponent implements OnInit {
    indentForm!: FormGroup;
    recordId: number = 0;
    isEditMode = false;
    isViewMode = false;
    formTitle = 'Create Purchase Indent';
    formNumbers: string[] = NablFormsHelper.getFormNumbers();

    openSections: { [key: string]: boolean } = {
        header: true,
        details: true,
        items: true,
        remarks: true
    };

    quillModules = {
        toolbar: [
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            ['clean']
        ]
    };

    priorities = ['Low', 'Medium', 'High', 'Urgent'];
    departments = ['Chemical Lab', 'Mechanical Lab', 'Quality Dept', 'Stores', 'Administration'];

    constructor(
        private fb: FormBuilder,
        private service: PurchaseIndentService,
        private router: Router,
        private route: ActivatedRoute
    ) { }

    ngOnInit(): void {
        this.initForm();
        this.recordId = Number(this.route.snapshot.params['id']);
        const path = this.route.snapshot.url[this.route.snapshot.url.length - 2]?.path;

        if (path === 'details') {
            this.isViewMode = true;
            this.formTitle = 'View Purchase Indent';
            this.indentForm.disable();
        } else if (path === 'edit') {
            this.isEditMode = true;
            this.formTitle = 'Edit Purchase Indent';
        }

        if (this.recordId) {
            this.loadData();
        } else {
            this.addItem(); // Start with one empty item
        }
    }

    initForm(): void {
        const today = new Date().toISOString().split('T')[0];
        this.indentForm = this.fb.group({
            id: [0],
            formatNo: ['F-21', Validators.required],
            issueNo: ['01', Validators.required],
            revNo: ['00', Validators.required],
            date: [today, Validators.required],
            documentNo: ['', Validators.required],

            departmentName: ['', Validators.required],
            indentorName: ['', Validators.required],
            priority: ['Medium', Validators.required],

            items: this.fb.array([]),

            status: ['Pending'],
            remarks: [''],
            preparedBy: ['', Validators.required],
            isActive: [true]
        });
    }

    get items(): FormArray {
        return this.indentForm.get('items') as FormArray;
    }

    addItem(): void {
        this.items.push(this.fb.group({
            description: ['', Validators.required],
            quantity: [1, [Validators.required, Validators.min(0.01)]],
            unitOfMeasure: ['Nos', Validators.required],
            purpose: [''],
            estimatedCost: [null]
        }));
    }

    removeItem(index: number): void {
        if (this.items.length > 1) {
            this.items.removeAt(index);
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

                    this.items.clear();
                    data.items?.forEach(item => {
                        this.items.push(this.fb.group({
                            description: [item.description, Validators.required],
                            quantity: [item.quantity, [Validators.required, Validators.min(0.01)]],
                            unitOfMeasure: [item.unitOfMeasure, Validators.required],
                            purpose: [item.purpose],
                            estimatedCost: [item.estimatedCost]
                        }));
                    });

                    this.indentForm.patchValue(formValues);
                }
            },
            error: () => {}
        });
    }

    onSubmit(): void {
        if (this.indentForm.invalid) {
            this.indentForm.markAllAsTouched();
            return;
        }

        const formData = this.indentForm.getRawValue();

        if (this.isEditMode) {
            this.service.update(this.recordId, formData).subscribe({
                next: () => this.router.navigate(['/purchase-indent']),
                error: () => {}
            });
        } else {
            this.service.create(formData).subscribe({
                next: () => this.router.navigate(['/purchase-indent']),
                error: () => {}
            });
        }
    }

    onCancel(): void {
        this.router.navigate(['/purchase-indent']);
    }

    toggleSection(section: string): void {
        this.openSections[section] = !this.openSections[section];
    }
}
