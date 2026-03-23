import { Component, OnInit, signal , HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ReferenceMaterialService } from '../../../services/reference-material.service';
import { ToastService } from '../../../services/toast.service';
import { NablFormsHelper } from '../../../utility/nabl-helpers/nabl-forms.helper';

import { QuillModule } from 'ngx-quill';
import { Observable } from 'rxjs';
import { CanComponentDeactivate } from '../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../services/unsaved-changes.service';

@Component({
    selector: 'app-reference-material-form',

    imports: [CommonModule, ReactiveFormsModule, RouterModule, QuillModule],
    templateUrl: './reference-material-form.component.html'
})
export class ReferenceMaterialFormComponent implements CanComponentDeactivate, OnInit {
  saved = false;
    materialForm!: FormGroup;
    recordId: number = 0;
    isEditMode = false;
    isViewMode = false;
    formTitle = 'Add Reference Material (CRM)';
    formNumbers: string[] = NablFormsHelper.getFormNumbers();

    openSections: { [key: string]: boolean } = {
        header: true,
        material: true,
        technical: true,
        certification: true,
        inventory: true
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
        private service: ReferenceMaterialService,
        private router: Router,
        private route: ActivatedRoute,
        private toastService: ToastService,
        private unsavedChangesService: UnsavedChangesService) { }

    ngOnInit(): void {
        this.initForm();

        this.recordId = Number(this.route.snapshot.params['id']);
        const path = this.route.snapshot.url[this.route.snapshot.url.length - 2]?.path;

        if (path === 'details') {
            this.isViewMode = true;
            this.formTitle = 'View Reference Material';
            this.materialForm.disable();
        } else if (path === 'edit') {
            this.isEditMode = true;
            this.formTitle = 'Edit Reference Material';
        }

        if (this.recordId) {
            this.loadData();
        }
    }

    initForm(): void {
        const today = new Date().toISOString().split('T')[0];
        this.materialForm = this.fb.group({
            id: [0],
            formatNo: ['F-17', Validators.required],
            issueNo: ['01', Validators.required],
            revNo: ['00', Validators.required],
            date: [today, Validators.required],
            documentNo: ['', Validators.required],
            issueDate: [today, Validators.required],

            materialName: ['', Validators.required],
            materialCode: ['', Validators.required],
            category: ['', Validators.required],
            type: ['physical', Validators.required],
            grade: ['', Validators.required],
            manufacturer: ['', Validators.required],
            manufacturerCode: [''],
            batchNo: ['', Validators.required],
            lotNo: [''],

            specifications: ['', Validators.required],
            purity: [null],
            concentration: [''],
            physicalState: ['solid', Validators.required],
            storageConditions: ['', Validators.required],
            shelfLife: [null, [Validators.required, Validators.min(1)]],
            expiryDate: ['', Validators.required],

            certificateOfAnalysis: [true],
            certificateNo: [''],
            certifiedBy: [''],
            certificationDate: [''],
            traceability: [''],

            currentStock: [0, [Validators.required, Validators.min(0)]],
            unitOfMeasure: ['', Validators.required],
            minimumStock: [0, Validators.min(0)],
            maximumStock: [0, Validators.min(0)],
            reorderLevel: [0, Validators.min(0)],
            storageLocation: ['', Validators.required],

            usageFrequency: ['as-needed'],
            criticality: ['normal'],

            qualityCheckFrequency: [''],
            lastQualityCheck: [''],
            nextQualityCheck: ['']
        });
    }

    loadData(): void {
        this.service.getById(this.recordId).subscribe({
            next: (data: any) => {
                if (data) {
                    const formValues = { ...data };
                    formValues.date = new Date().toISOString().split('T')[0];

                    if (this.isEditMode) {
                        const currentRev = parseInt(data.revNo || '0');
                        formValues.revNo = (currentRev + 1).toString().padStart(2, '0');
                    }

                    // Ensure dates are in YYYY-MM-DD format for inputs
                    ['issueDate', 'expiryDate', 'certificationDate', 'lastQualityCheck', 'nextQualityCheck'].forEach((key: string) => {
                        if (formValues[key]) {
                            formValues[key] = new Date(formValues[key]).toISOString().split('T')[0];
                        }
                    });

                    this.materialForm.patchValue(formValues);
                }
            },
            error: (error: any) => { this.toastService.show(error?.error?.message || 'Failed to load record', 'error'); }
        });
    }

    onSubmit(): void {
        if (this.materialForm.invalid) {
            this.materialForm.markAllAsTouched();
            return;
        }

        const formData = this.materialForm.getRawValue();

        if (this.isEditMode) {
            this.service.update(this.recordId, formData).subscribe({
                next: () => { this.saved = true; this.router.navigate(['/reference-material']); },
                error: (error: any) => { this.toastService.show(error?.error?.message || 'Failed to update record', 'error'); }
            });
        } else {
            this.service.create(formData).subscribe({
                next: () => { this.saved = true; this.router.navigate(['/reference-material']); },
                error: (error: any) => { this.toastService.show(error?.error?.message || 'Failed to create record', 'error'); }
            });
        }
    }

    onCancel(): void {
        this.router.navigate(['/reference-material']);
    }

    toggleSection(section: string): void {
        this.openSections[section] = !this.openSections[section];
    }

  canDeactivate(): Observable<boolean> | boolean {
    if (!this.materialForm.dirty || this.saved) return true;
    return this.unsavedChangesService.confirm();
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent) {
    if (this.materialForm?.dirty && !this.saved) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
