import { Component, OnInit, signal , HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { IntermediateCheckService } from '../../../services/intermediate-check.service';
import { EquipmentService } from '../../../services/equipment.service';
import { ToastService } from '../../../services/toast.service';
import { NablFormsHelper } from '../../../utility/nabl-helpers/nabl-forms.helper';

import { QuillModule } from 'ngx-quill';
import { Observable } from 'rxjs';
import { CanComponentDeactivate } from '../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../services/unsaved-changes.service';
import { NablSignatureSectionComponent } from '../nabl-signature-section/nabl-signature-section.component';
import { NablHeaderService } from '../../../services/nabl-header.service';

@Component({
    selector: 'app-intermediate-check-form',

    imports: [CommonModule, ReactiveFormsModule, RouterModule, QuillModule, NablSignatureSectionComponent],
    templateUrl: './intermediate-check-form.component.html'
})
export class IntermediateCheckFormComponent implements CanComponentDeactivate, OnInit {
  saved = false;
    checkForm!: FormGroup;
    recordId: number = 0;
    isEditMode = false;
    isViewMode = false;
    formTitle = 'Create Intermediate Check Record';
    formNumbers: string[] = NablFormsHelper.getFormNumbers();
    equipments: any[] = [];

    months = [
        { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
        { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
        { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
        { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' }
    ];

    openSections: { [key: string]: boolean } = {
        header: true,
        equipment: true,
        daily: true,
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
        private service: IntermediateCheckService,
        private equipmentService: EquipmentService,
        private router: Router,
        private route: ActivatedRoute,
        private toastService: ToastService,
        private unsavedChangesService: UnsavedChangesService,
        private nablHeaderService: NablHeaderService) { }

    ngOnInit(): void {
        this.initForm();
        this.nablHeaderService.getFormDefaults('IntermediateCheck').subscribe({
            next: (defaults) => {
                this.checkForm.patchValue({ formatNo: defaults.formCode });
            },
            error: () => {}
        });
        this.loadEquipments();

        this.recordId = Number(this.route.snapshot.params['id']);
        const path = this.route.snapshot.url[this.route.snapshot.url.length - 2]?.path;

        if (path === 'details') {
            this.isViewMode = true;
            this.formTitle = 'View Intermediate Check Record';
            this.checkForm.disable();
        } else if (path === 'edit') {
            this.isEditMode = true;
            this.formTitle = 'Edit Intermediate Check Record';
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
        this.checkForm = this.fb.group({
            id: [0],
            formatNo: ['F-16'],
            issueNo: ['01'],
            revNo: ['00'],
            date: [todayStr, Validators.required],
            documentNo: [''],
            issueDate: [todayStr, Validators.required],

            checkMonth: [today.getMonth() + 1, Validators.required],
            checkYear: [today.getFullYear(), Validators.required],
            location: ['', Validators.required],

            equipmentId: [null, Validators.required],
            equipmentName: ['', Validators.required],
            equipmentNo: ['', Validators.required],

            dailyRecords: this.fb.array([]),

            deviationsObserved: [''],
            correctiveActions: [''],
            nextCalibrationDue: ['', Validators.required],

            checkedBy: ['', Validators.required],
            verifiedBy: [''],
            preparedBy: [''],
            reviewedBy: [''],
            approvedBy: ['']
        });

        // System-managed fields — always readonly
        this.checkForm.get('documentNo')?.disable();
        this.checkForm.get('issueNo')?.disable();
        this.checkForm.get('revNo')?.disable();
        this.checkForm.get('formatNo')?.disable();
    }

    get dailyRecords(): FormArray {
        return this.checkForm.get('dailyRecords') as FormArray;
    }

    loadEquipments(): void {
        this.equipmentService.getAllEquipments({ pageNo: 1, pageSize: 100 }).subscribe((res: any) => {
            this.equipments = res.items || [];
        });
    }

    onEquipmentChange(event: any): void {
        const equipId = Number(event.target.value);
        const equip = this.equipments.find(e => e.id === equipId);
        if (equip) {
            this.checkForm.patchValue({
                equipmentId: equip.id,
                equipmentName: equip.name,
                equipmentNo: equip.equipmentNo
            });
        }
    }

    generateDailyRows(): void {
        const month = this.checkForm.get('checkMonth')?.value;
        const year = this.checkForm.get('checkYear')?.value;
        const daysInMonth = new Date(year, month, 0).getDate();

        this.dailyRecords.clear();
        for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(year, month - 1, i).toISOString().split('T')[0];
            this.dailyRecords.push(this.fb.group({
                date: [date],
                day: [i],
                checkStatus: ['ok', Validators.required],
                equipmentCondition: ['Normal'],
                observations: [''],
                checkTime: ['']
            }));
        }
    }

    loadData(): void {
        this.service.getById(this.recordId).subscribe({
            next: (data) => {
                if (data) {
                    const formValues = { ...data };
                    formValues.date = new Date().toISOString().split('T')[0];
                    formValues.nextCalibrationDue = data.nextCalibrationDue ? new Date(data.nextCalibrationDue).toISOString().split('T')[0] : '';
                    formValues.issueDate = data.issueDate ? new Date(data.issueDate).toISOString().split('T')[0] : '';

                    this.dailyRecords.clear();
                    data.dailyRecords?.forEach((r, index) => {
                        this.dailyRecords.push(this.fb.group({
                            date: [new Date(r.date).toISOString().split('T')[0]],
                            day: [index + 1],
                            checkStatus: [r.checkStatus, Validators.required],
                            equipmentCondition: [r.equipmentCondition],
                            observations: [r.observations],
                            checkTime: [r.checkTime]
                        }));
                    });

                    this.checkForm.patchValue(formValues);
                    // Lock form if not in editable status
                    const status = (data as any).status;
                    if (status && status !== 'Draft' && status !== 'Rejected') {
                        this.checkForm.disable();
                        this.isViewMode = true;
                    }
                    // Re-disable system fields
                    this.checkForm.get('documentNo')?.disable();
                    this.checkForm.get('issueNo')?.disable();
                    this.checkForm.get('revNo')?.disable();
                    this.checkForm.get('formatNo')?.disable();
                }
            },
            error: (error: any) => { this.toastService.show(error?.error?.message || 'Failed to load record', 'error'); }
        });
    }

    onSubmit(): void {
        if (this.checkForm.invalid) {
            this.checkForm.markAllAsTouched();
            return;
        }

        const formData = this.checkForm.getRawValue();

        if (this.isEditMode) {
            this.service.update(this.recordId, formData).subscribe({
                next: () => { this.saved = true; this.router.navigate(['/intermediate-check-records']); },
                error: (error: any) => { this.toastService.show(error?.error?.message || 'Failed to update record', 'error'); }
            });
        } else {
            this.service.create(formData).subscribe({
                next: () => { this.saved = true; this.router.navigate(['/intermediate-check-records']); },
                error: (error: any) => { this.toastService.show(error?.error?.message || 'Failed to create record', 'error'); }
            });
        }
    }

    onCancel(): void {
        this.router.navigate(['/intermediate-check-records']);
    }

    toggleSection(section: string): void {
        this.openSections[section] = !this.openSections[section];
    }

  canDeactivate(): Observable<boolean> | boolean {
    if (!this.checkForm.dirty || this.saved) return true;
    return this.unsavedChangesService.confirm();
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent) {
    if (this.checkForm?.dirty && !this.saved) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
