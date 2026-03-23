import { Component, OnInit, signal , HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CrmConsumptionService } from '../../../services/crm-consumption.service';
import { ReferenceMaterialService } from '../../../services/reference-material.service';
import { ToastService } from '../../../services/toast.service';
import { NablFormsHelper } from '../../../utility/nabl-helpers/nabl-forms.helper';

import { QuillModule } from 'ngx-quill';
import { Observable } from 'rxjs';
import { CanComponentDeactivate } from '../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../services/unsaved-changes.service';

@Component({
    selector: 'app-crm-consumption-form',

    imports: [CommonModule, ReactiveFormsModule, RouterModule, QuillModule],
    templateUrl: './crm-consumption-form.component.html'
})
export class CrmConsumptionFormComponent implements CanComponentDeactivate, OnInit {
  saved = false;
    consumptionForm!: FormGroup;
    recordId: number = 0;
    isEditMode = false;
    isViewMode = false;
    formTitle = 'Add CRM Consumption Record';
    formNumbers: string[] = NablFormsHelper.getFormNumbers();
    materials: any[] = [];

    months = [
        { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
        { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
        { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
        { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' }
    ];

    openSections: { [key: string]: boolean } = {
        header: true,
        material: true,
        grid: true,
        summary: true
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
        private service: CrmConsumptionService,
        private materialService: ReferenceMaterialService,
        private router: Router,
        private route: ActivatedRoute,
        private toastService: ToastService,
        private unsavedChangesService: UnsavedChangesService) { }

    ngOnInit(): void {
        this.initForm();
        this.loadMaterials();

        this.recordId = Number(this.route.snapshot.params['id']);
        const path = this.route.snapshot.url[this.route.snapshot.url.length - 2]?.path;

        if (path === 'details') {
            this.isViewMode = true;
            this.formTitle = 'View CRM Consumption Record';
            this.consumptionForm.disable();
        } else if (path === 'edit') {
            this.isEditMode = true;
            this.formTitle = 'Edit CRM Consumption Record';
        }

        if (this.recordId) {
            this.loadData();
        } else {
            this.generateDailyRows();
        }
    }

    initForm(): void {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        this.consumptionForm = this.fb.group({
            id: [0],
            formatNo: ['F-18', Validators.required],
            issueNo: ['01', Validators.required],
            revNo: ['00', Validators.required],
            date: [todayStr, Validators.required],
            documentNo: ['', Validators.required],
            issueDate: [todayStr, Validators.required],

            consumptionMonth: [today.getMonth() + 1, Validators.required],
            consumptionYear: [today.getFullYear(), Validators.required],

            referenceMaterialId: [null, Validators.required],
            materialName: ['', Validators.required],
            materialCode: ['', Validators.required],
            batchNo: ['', Validators.required],
            unitOfMeasure: ['', Validators.required],

            openingStock: [0, Validators.required],
            received: [0],
            consumed: [0],
            wastage: [0],
            closingStock: [0],

            dailyConsumption: this.fb.array([]),

            purposeOfUse: ['', Validators.required],
            remarks: [''],
            recordedBy: ['', Validators.required],
            verifiedBy: ['']
        });

        // Auto-calculate summary totals when daily grid changes
        this.dailyConsumption.valueChanges.subscribe(() => {
            this.calculateSummary();
        });
    }

    get dailyConsumption(): FormArray {
        return this.consumptionForm.get('dailyConsumption') as FormArray;
    }

    loadMaterials(): void {
        this.materialService.getAll({ PageNumber: 1, PageSize: 100 }).subscribe(res => {
            this.materials = res.items || [];
        });
    }

    onMaterialChange(event: any): void {
        const matId = Number(event.target.value);
        const mat = this.materials.find(m => m.id === matId);
        if (mat) {
            this.consumptionForm.patchValue({
                referenceMaterialId: mat.id,
                materialName: mat.materialName,
                materialCode: mat.materialCode,
                batchNo: mat.batchNo,
                unitOfMeasure: mat.unitOfMeasure,
                openingStock: mat.currentStock
            });
            this.calculateSummary();
        }
    }

    generateDailyRows(): void {
        const month = this.consumptionForm.get('consumptionMonth')?.value;
        const year = this.consumptionForm.get('consumptionYear')?.value;
        const daysInMonth = new Date(year, month, 0).getDate();

        this.dailyConsumption.clear();
        for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(year, month - 1, i).toISOString().split('T')[0];
            this.dailyConsumption.push(this.fb.group({
                date: [date],
                day: [i],
                openingBalance: [0],
                quantityConsumed: [0],
                quantityWasted: [0],
                closingBalance: [0],
                purpose: [''],
                performedBy: ['']
            }));
        }
    }

    calculateSummary(): void {
        const rows = this.dailyConsumption.getRawValue();
        let totalConsumed = 0;
        let totalWasted = 0;

        rows.forEach(r => {
            totalConsumed += Number(r.quantityConsumed || 0);
            totalWasted += Number(r.quantityWasted || 0);
        });

        const opening = Number(this.consumptionForm.get('openingStock')?.value || 0);
        const received = Number(this.consumptionForm.get('received')?.value || 0);
        const closing = opening + received - totalConsumed - totalWasted;

        this.consumptionForm.patchValue({
            consumed: totalConsumed,
            wastage: totalWasted,
            closingStock: closing
        }, { emitEvent: false });
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

                    this.dailyConsumption.clear();
                    data.dailyConsumption?.forEach((r, index) => {
                        this.dailyConsumption.push(this.fb.group({
                            date: [new Date(r.date).toISOString().split('T')[0]],
                            day: [index + 1],
                            openingBalance: [r.openingBalance],
                            quantityConsumed: [r.quantityConsumed],
                            quantityWasted: [r.quantityWasted],
                            closingBalance: [r.closingBalance],
                            purpose: [r.purpose],
                            performedBy: [r.performedBy]
                        }));
                    });

                    this.consumptionForm.patchValue(formValues);
                }
            },
            error: (error: any) => { this.toastService.show(error?.error?.message || 'Failed to load record', 'error'); }
        });
    }

    onSubmit(): void {
        if (this.consumptionForm.invalid) {
            this.consumptionForm.markAllAsTouched();
            return;
        }

        const formData = this.consumptionForm.getRawValue();

        if (this.isEditMode) {
            this.service.update(this.recordId, formData).subscribe({
                next: () => { this.saved = true; this.router.navigate(['/reference-material-consumption']); },
                error: (error: any) => { this.toastService.show(error?.error?.message || 'Failed to update record', 'error'); }
            });
        } else {
            this.service.create(formData).subscribe({
                next: () => { this.saved = true; this.router.navigate(['/reference-material-consumption']); },
                error: (error: any) => { this.toastService.show(error?.error?.message || 'Failed to create record', 'error'); }
            });
        }
    }

    onCancel(): void {
        this.router.navigate(['/reference-material-consumption']);
    }

    toggleSection(section: string): void {
        this.openSections[section] = !this.openSections[section];
    }

  canDeactivate(): Observable<boolean> | boolean {
    if (!this.consumptionForm.dirty || this.saved) return true;
    return this.unsavedChangesService.confirm();
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent) {
    if (this.consumptionForm?.dirty && !this.saved) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
