import { Component, OnInit, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { IntermediateCheckService } from '../../../services/intermediate-check.service';
import { EquipmentService } from '../../../services/equipment.service';
import { ToastService } from '../../../services/toast.service';
import { NablFormsHelper } from '../../../utility/nabl-helpers/nabl-forms.helper';
import { YearHelper } from '../../../utility/helper/year.helper';

import { QuillModule } from 'ngx-quill';
import { Observable } from 'rxjs';
import { CanComponentDeactivate } from '../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../services/unsaved-changes.service';
import { NablSignatureSectionComponent } from '../nabl-signature-section/nabl-signature-section.component';
import { NablHeaderService } from '../../../services/nabl-header.service';
import { SearchableDropdownComponent } from '../../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { QualityControlPlanService } from '../../../services/quality-control-plan.service';

@Component({
    selector: 'app-intermediate-check-form',

    imports: [CommonModule, ReactiveFormsModule, RouterModule, QuillModule, NablSignatureSectionComponent, SearchableDropdownComponent],
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
    yearOptions: number[] = YearHelper.planYears();
    equipments: any[] = [];
    intermediateCheckintervalOptions: string[] = ['EveryDay', 'Weekly', '1 Month', '3 Months', '4 Months', '6 Months', '1 Year', '2 Years'];

    months = [
        { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
        { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
        { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
        { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' }
    ];

    openSections: { [key: string]: boolean } = {
        header: true,
        equipment: true,
        intermediateCheckintervalOptions: true,
        summary: true
    };

    quillModules = {
        toolbar: [
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            ['clean']
        ]
    };

    checkTypes = [
        'Accuracy Check',
        'Precision Check',
        'Repeatability Check',
        'Performance Check',
        'Functional Check',
        'Zero Check',
        'Balance Check',
        'Temperature Check',
        'Other'
    ]


    constructor(
        private fb: FormBuilder,
        private service: IntermediateCheckService,
        private equipmentService: EquipmentService,
        private router: Router,
        private route: ActivatedRoute,
        private toastService: ToastService,
        private unsavedChangesService: UnsavedChangesService,
        private nablHeaderService: NablHeaderService,
        private qcControlPlanservice: QualityControlPlanService,
    ) { }
    today = new Date().toISOString().split('T')[0];
    ngOnInit(): void {
        this.initForm();
        this.nablHeaderService.getFormDefaults('IntermediateCheck').subscribe({
            next: (defaults) => {
                this.checkForm.patchValue({ formatNo: defaults.formCode });
            },
            error: () => { }
        });
        this.recordId = Number(this.route.snapshot.params['id']);
        const path = this.route.snapshot.url[this.route.snapshot.url.length - 2]?.path;

        if (path === 'details') {
            this.isViewMode = true;
            this.formTitle = 'View Intermediate Check Record';
            this.loadData();
            this.checkForm.disable();
        } else if (path === 'edit') {
            this.isEditMode = true;
            this.formTitle = 'Edit Intermediate Check Record';
            this.loadData();
        }

        // if (this.recordId) {

        // }
        //  else {
        //     this.generateDailyRows();
        // }
        if (this.intermediateCheckLogs.length === 0) {
            this.addIntermediateCheckLog();
        }
    }

    initForm(): void {


        this.checkForm = this.fb.group({
            id: [0],
            formatNo: ['F-16'],
            issueNo: ['01'],
            revNo: ['00'],
            date: [this.today, Validators.required],
            documentNo: ['F-16'],
            issueDate: [this.today, Validators.required],
            equipmentId: [null, Validators.required],
            equipmentName: [''],
            equipmentNo: [''],
            departmentName: [''],
            equipmentType: [''],
            oemName: [''],
            modelNumber: [null],

            // Calibration Information
            lastCalibrationDate: [''],
            calibrationFrequencyDays: [null],
            nextCalibrationDueDate: [''],

            // Intermediate Check Configuration
            intermediateCheckInterval: [''],


            intermediateCheckLogs: this.fb.array([]),
            preparedBy: [''],
            reviewedBy: [null],
            approvedBy: [null],
            reviewedDate: [''],
            approvedDate: [''],
            preparedDate: [this.today],
        });

        // System-managed fields — always readonly
        this.checkForm.get('documentNo')?.disable();
        this.checkForm.get('issueNo')?.disable();
        this.checkForm.get('revNo')?.disable();
        this.checkForm.get('formatNo')?.disable();
    }

    get intermediateCheckLogs(): FormArray {
        return this.checkForm.get('intermediateCheckLogs') as FormArray;
    }

    loadEquipments = (searchTearm: string, page: number, pageSize: number): Observable<any[]> => {
        return this.service.getAllEquipments(searchTearm, page, pageSize, this.recordId > 0 ? this.recordId : null);
    };

    onEquipmentChange(item: any): void {

        const equipmentId = item.id;

        // Set selected equipment immediately
        this.checkForm.patchValue({
            equipmentId: item.id,
            equipmentName: item.name || ''
        });

        this.service.getByEquipmentId(equipmentId).subscribe({
            next: (data) => {

                this.checkForm.patchValue({
                    equipmentName: data.equipmentName || item.name || '',
                    equipmentNo: data.equipmentNo || '',
                    departmentName: data.departmmentName || '',
                    equipmentType: data.equipmentType || '',
                    oemName: data.oemName || '',
                    modelNumber: data.modelNumber || '',

                    lastCalibrationDate:
                        NablFormsHelper.formatDateForInput(data.lastCalibrationDate),

                    calibrationFrequencyDays:
                        data.calibrationFrequencyDays ?? null,

                    nextCalibrationDueDate:
                        NablFormsHelper.formatDateForInput(data.nextCalibrationDueDate),

                    intermediateCheckRequired: true,

                    intermediateCheckInterval:
                        data.intermediateCheckInterval || ''
                });

                // Calculate next intermediate check due date
                // this.calculateNextIntermediateCheckDueDate();
            },

            error: (error: any) => {
                console.error('Error loading equipment details:', error);
            }
        });
    }
    getEmployees = (term: string, page: number, pageSize: number): Observable<any[]> => {
        return this.qcControlPlanservice.getEmployeesDropdown(term, page, pageSize);
    }
    onAuditeeSelected(item: any, index: number): void {
        const row = this.intermediateCheckLogs.at(index);

        row.patchValue({
            auditeeId: item?.id ?? null,
            auditeeName: item?.name ?? ''
        });
    }

    addIntermediateCheckLog(): void {
        const log = this.fb.group({
            checkDate: ['', Validators.required],

            checkType: ['', Validators.required],

            referenceStandard: ['', Validators.required],
            referenceValue: [null, [Validators.required, Validators.min(0)]],

            observedValue: [null, [Validators.required, Validators.min(0)]],

            acceptanceCriteria: [null, [Validators.required, Validators.min(0)]],

            result: [{ value: '', disabled: true }],

            auditeeId: [null, Validators.required],
            auditeeName: [null]
        });

        this.intermediateCheckLogs.push(log);

        this.calculateIntermediateCheckResult(
            this.intermediateCheckLogs.length - 1
        );
    }

    calculateIntermediateCheckResult(index: number): void {
        const log = this.intermediateCheckLogs.at(index) as FormGroup;

        const referenceValue = Number(log.get('referenceValue')?.value);
        const observedValue = Number(log.get('observedValue')?.value);
        const acceptanceCriteria = Number(
            log.get('acceptanceCriteria')?.value
        );

        if (
            log.get('referenceValue')?.value === null ||
            log.get('observedValue')?.value === null ||
            log.get('acceptanceCriteria')?.value === null ||
            isNaN(referenceValue) ||
            isNaN(observedValue) ||
            isNaN(acceptanceCriteria)
        ) {
            log.get('result')?.setValue('');
            return;
        }

        const difference = Math.abs(observedValue - referenceValue);

        const result =
            difference <= acceptanceCriteria
                ? 'PASS'
                : 'FAIL';

        log.get('result')?.setValue(result);
    }

    loadData(): void {
        this.service.getById(this.recordId).subscribe({
            next: (data) => {
                if (data) {

                    this.checkForm.patchValue(data);
                    this.checkForm.patchValue({
                        date: NablFormsHelper.formatDateForInput(data.date),
                        lastCalibrationDate: NablFormsHelper.formatDateForInput(data.lastCalibrationDate),
                        nextCalibrationDueDate: NablFormsHelper.formatDateForInput(data.nextCalibrationDueDate),
                    })
                    this.intermediateCheckLogs.clear();
                    data.intermediateCheckLogs.forEach((item: any) => {
                        this.intermediateCheckLogs.push(
                            this.fb.group({
                                checkDate: [NablFormsHelper.formatDateForInput(item.checkDate)],
                                checkType: [item.checkType],
                                referenceStandard: [item.referenceStandard],
                                referenceValue: [item.referenceValue],
                                observedValue: [item.observedValue],
                                acceptanceCriteria: [item.acceptanceCriteria],
                                auditeeId: [item.auditeeId],
                                result: [item.result],
                                auditeeName: [item.auditeeName],
                            })
                        );
                    })

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
        formData.preparedDate = this.today;
        formData.approvedDate = formData.approvedBy ? this.today : null;
        formData.reviewedDate = formData.reviewedBy ? this.today : null;
        formData.lastCalibrationDate = formData.lastCalibrationDate ? formData.lastCalibrationDate : null;
        formData.nextCalibrationDueDate = formData.nextCalibrationDueDate ? formData.nextCalibrationDueDate : null;

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
