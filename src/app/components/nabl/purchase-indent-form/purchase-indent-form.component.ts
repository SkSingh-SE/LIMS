import { Component, OnInit, signal , HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { QuillModule } from 'ngx-quill';
import { PurchaseIndentService } from '../../../services/purchase-indent.service';
import { NablFormsHelper } from '../../../utility/nabl-helpers/nabl-forms.helper';
import { Observable } from 'rxjs';
import { CanComponentDeactivate } from '../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../services/unsaved-changes.service';
import { ToastService } from '../../../services/toast.service';
import { NablSignatureSectionComponent } from '../nabl-signature-section/nabl-signature-section.component';
import { NablHeaderService } from '../../../services/nabl-header.service';

@Component({
    selector: 'app-purchase-indent-form',

    imports: [CommonModule, ReactiveFormsModule, RouterModule, QuillModule, NablSignatureSectionComponent],
    templateUrl: './purchase-indent-form.component.html'
})
export class PurchaseIndentFormComponent implements CanComponentDeactivate, OnInit {
  saved = false;
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
        private route: ActivatedRoute,
        private unsavedChangesService: UnsavedChangesService,
        private toastService: ToastService,
        private nablHeaderService: NablHeaderService) { }

    ngOnInit(): void {
        this.initForm();
        this.nablHeaderService.getFormDefaults('PurchaseIndent').subscribe({
            next: (defaults) => {
                this.indentForm.patchValue({ formatNo: defaults.formCode });
            },
            error: () => {}
        });
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
            formatNo: ['F-21'],
            issueNo: ['01'],
            revNo: ['00'],
            date: [today, Validators.required],
            documentNo: [''],

            departmentName: ['', Validators.required],
            indentorName: ['', Validators.required],
            priority: ['Medium', Validators.required],

            items: this.fb.array([]),

            status: ['Pending'],
            remarks: [''],
            preparedBy: [''],
            isActive: [true]
        });

        // System-managed fields — always readonly
        this.indentForm.get('documentNo')?.disable();
        this.indentForm.get('issueNo')?.disable();
        this.indentForm.get('revNo')?.disable();
        this.indentForm.get('formatNo')?.disable();
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
            estimatedCost: [null, [Validators.min(0)]]
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

                    this.items.clear();
                    data.items?.forEach(item => {
                        this.items.push(this.fb.group({
                            description: [item.description, Validators.required],
                            quantity: [item.quantity, [Validators.required, Validators.min(0.01)]],
                            unitOfMeasure: [item.unitOfMeasure, Validators.required],
                            purpose: [item.purpose],
                            estimatedCost: [item.estimatedCost, [Validators.min(0)]]
                        }));
                    });

                    this.indentForm.patchValue(formValues);
                // Lock form if not in editable status
                const status = (data as any).status;
                if (status && status !== 'Draft' && status !== 'Rejected') {
                    this.indentForm.disable();
                    this.isViewMode = true;
                }
                // Re-disable system fields (in case form was enabled for Draft/Rejected)
                this.indentForm.get('documentNo')?.disable();
                this.indentForm.get('issueNo')?.disable();
                this.indentForm.get('revNo')?.disable();
                this.indentForm.get('formatNo')?.disable();
                }
            },
            error: (error: any) => {
                this.toastService.show(error?.error?.message || 'Failed to load record', 'error');
            }
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
                next: () => { this.saved = true; this.router.navigate(['/purchase-indent']); },
                error: (error: any) => { this.toastService.show(error?.error?.message || 'Operation failed', 'error'); }
            });
        } else {
            this.service.create(formData).subscribe({
                next: () => { this.saved = true; this.router.navigate(['/purchase-indent']); },
                error: (error: any) => { this.toastService.show(error?.error?.message || 'Operation failed', 'error'); }
            });
        }
    }

    onCancel(): void {
        this.router.navigate(['/purchase-indent']);
    }

    toggleSection(section: string): void {
        this.openSections[section] = !this.openSections[section];
    }

  canDeactivate(): Observable<boolean> | boolean {
    if (!this.indentForm.dirty || this.saved) return true;
    return this.unsavedChangesService.confirm();
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent) {
    if (this.indentForm?.dirty && !this.saved) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
