import { Component, OnInit, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { QualityControlPlanService } from '../../../../services/quality-control-plan.service';
import { NablFormsHelper } from '../../../../utility/nabl-helpers/nabl-forms.helper';
import { YearHelper } from '../../../../utility/helper/year.helper';
import { ToastService } from '../../../../services/toast.service';

import { QuillModule } from 'ngx-quill';
import { Observable } from 'rxjs';
import { CanComponentDeactivate } from '../../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../../services/unsaved-changes.service';
import { NablSignatureSectionComponent } from '../../nabl-signature-section/nabl-signature-section.component';
import { NablHeaderService } from '../../../../services/nabl-header.service';
import { SearchableDropdownComponent } from '../../../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { DepartmentService } from '../../../../services/department.service';
import { EmployeeService } from '../../../../services/employee.service';
@Component({
    selector: 'app-quality-control-plan-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterModule, QuillModule, NablSignatureSectionComponent, SearchableDropdownComponent],
    templateUrl: './quality-control-plan-form.component.html',
    styleUrl: './quality-control-plan-form.component.css'
})
export class QualityControlPlanFormComponent implements CanComponentDeactivate, OnInit {
    saved = false;
    qcpForm!: FormGroup;
    recordId: number = 0;
    isEditMode = false;
    isViewMode = false;
    formTitle = 'Add Quality Control Plan (F-37)';
    formNumbers: string[] = NablFormsHelper.getFormNumbers();
    yearOptions: number[] = YearHelper.planYears();

    openSections: { [key: string]: boolean } = {
        header: true,
        planInfo: true,
        activities: true,
        approval: true
    };
    retentionPeriods = [
        '6 Months',
        '12 Months',
        '2 Years',
        '3 Years',
        '5 Years',
        'Permanent'
    ];
    frequencyTypes = [
        'Daily',
        'Weekly',
        'Monthly',
        'Quarterly',
        'Half-Yearly',
        'Yearly'
    ];
    referenceTypes = [
        'CRM',
        'Equipment',
        'Retained Sample',
        'Blind Sample',
        'Duplicate Sample',
        'Control Chart',
        'Other'
    ];
    statusList = [
        'Planned',
        'In Progress',
        'Completed',
        'Deferred',
        'Cancelled'
    ];
    quillModules = {
        toolbar: [
            ['bold', 'italic', 'underline', 'strike'],
            ['blockquote', 'code-block'],
            [{ 'header': 1 }, { 'header': 2 }],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            [{ 'script': 'sub' }, { 'script': 'super' }],
            [{ 'indent': '-1' }, { 'indent': '+1' }],
            [{ 'direction': 'rtl' }],
            [{ 'size': ['small', false, 'large', 'huge'] }],
            [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
            [{ 'color': [] }, { 'background': [] }],
            [{ 'font': [] }],
            [{ 'align': [] }],
            ['clean']
        ]
    };
    today = new Date().toISOString().split('T')[0];

    constructor(
        private fb: FormBuilder,
        private service: QualityControlPlanService,
        private router: Router,
        private route: ActivatedRoute,
        private toastService: ToastService
        , private unsavedChangesService: UnsavedChangesService,
        private nablHeaderService: NablHeaderService,
        private departmentService: DepartmentService,
        private employeeService: EmployeeService
    ) { }

    ngOnInit(): void {
        this.initForm();
        this.nablHeaderService.getFormDefaults('QualityControlPlan').subscribe({
            next: (defaults) => {
                this.qcpForm.patchValue({ formatNo: defaults.formCode });
            },
            error: () => { }
        });
        this.recordId = Number(this.route.snapshot.params['id']);
        const path = this.route.snapshot.url[this.route.snapshot.url.length - 2]?.path;
        if (path === 'details') { this.isViewMode = true; this.formTitle = 'View Quality Control Plan'; this.qcpForm.disable(); }
        else if (path === 'edit') { this.isEditMode = true; this.formTitle = 'Edit Quality Control Plan'; }
        if (path != "details" && path != "edit") {
            this.service.getNextPlanNo().subscribe({
                next: (res) => {
                    this.qcpForm.patchValue({
                        planNo: res.planNo
                    })
                },
                error: () => { }
            });
        }
        if (this.recordId) { this.loadData(); } else { this.addActivity(); }
    }

    initForm(): void {
        this.qcpForm = this.fb.group({
            id: [0],
            formatNo: ['F-37'],
            issueNo: ['01'],
            revNo: ['00'],
            date: [this.today, Validators.required],
            documentNo: ['F-37'],
            planYear: [new Date().getFullYear(), Validators.required],
            discipline: ['', Validators.required],
            materialProductGroup: ['', Validators.required],
            labIncharge: ['', Validators.required],
            activities: this.fb.array([]),
            planNo: [''],
            retentionPeriod: ['', Validators.required],
            effectiveTo: ['', Validators.required],
            effectiveFrom: ['', Validators.required],
            preparedBy: [''],
            reviewedBy: [null],
            approvedBy: [null],
            reviewedDate: [''],
            approvedDate: [''],
            preparedDate: [this.today],
            status: ['Active']
        });

        // System-managed fields — always readonly
        this.qcpForm.get('documentNo')?.disable();
        this.qcpForm.get('issueNo')?.disable();
        this.qcpForm.get('revNo')?.disable();
        this.qcpForm.get('formatNo')?.disable();
        this.qcpForm.get('date')?.disable();
    }

    get activities(): FormArray { return this.qcpForm.get('activities') as FormArray; }
    getDepartments = (term: string, page: number, pageSize: number): Observable<any[]> => {
        return this.departmentService.getDepartmentDropdown(term, page, pageSize);
    };
    fetchTestMethods = (term: string, page: number, pageSize: number): Observable<any[]> => {
        // Replace with actual service call to fetch test methods
        return this.employeeService.getTestMethodsDropdown(term, page, pageSize);
    }
    getEmployees = (term: string, page: number, pageSize: number): Observable<any[]> => {
        // Replace with actual service call to fetch test methods
        return this.service.getEmployeesDropdown(term, page, pageSize);
    }
    onDepartmentSelected(item: any, index: number) {
        const row = this.activities.at(index) as FormGroup;

        row.patchValue({
            departmentID: item ? item.id : null,
            departmentName: item ? item.name : ''
        });
    }
    onEmployeeSelected(item: any, index: number) {
        const row = this.activities.at(index) as FormGroup;

        row.patchValue({
            employeeId: item ? item.id : null,
            employeeName: item ? item.name : ''
        });
    }
    onTestMethodSelected(item: any, index: number) {
        const row = this.activities.at(index) as FormGroup;

        row.patchValue({
            testMethodId: item ? item.id : null,
            testMethod: item ? item.name : ''
        });
    }
    addActivity(): void {
        const activityGroup = this.fb.group({
            id: [0],
            activityName: ['', Validators.required],
            departmentID: ['', Validators.required],
            referenceId: [],
            referenceName: [''],
            referenceOptions: [[]],
            testMethodId: ['', Validators.required],
            referenceType: ['', Validators.required],
            frequencyType: ['', Validators.required],
            effectiveFrom: ['', Validators.required],
            employeeId: ['', Validators.required],
            acceptanceCriteria: ['', Validators.required],
            resultStatus: ['Planned'],
            remarks: [''],
            departmentName: [''],
            testMethod: [''],
            employeeName: [''],
        });
        this.activities.push(activityGroup);
    }
    onPeriodStartChange(): void {
        const startDate = this.qcpForm.get('effectiveFrom')?.value;
        const endDateControl = this.qcpForm.get('effectiveTo');

        if (!startDate) {
            endDateControl?.setValue('');
            this.clearActivityDates();
            return;
        }

        if (endDateControl?.value && endDateControl.value < startDate) {
            endDateControl.setValue('');
            this.clearActivityDates();
        }
    }


    validateActivityDate(index: number): void {
        const row = this.activities.at(index);
        const planFrom = this.qcpForm.get('effectiveFrom')?.value;
        const planTo = this.qcpForm.get('effectiveTo')?.value;
        const activityDate = row.get('effectiveFrom')?.value;
        const frequencyType = row.get('frequencyType')?.value;

        if (!planFrom || !planTo) {
            this.toastService.show('Please select Effective From and Effective To first.', 'warning');
            row.get('effectiveFrom')?.setValue('');
            return;
        }
        if (activityDate && (activityDate < planFrom || activityDate > planTo)) {
            this.toastService.show('Activity date must be between Effective From and Effective To.', 'warning');
            row.get('effectiveFrom')?.setValue('');
            return;

        }
        if (planFrom === planTo && frequencyType && frequencyType != "Daily") {
            this.toastService.show('For same Effective From and To date, only Daily frequency is allowed.', 'warning')
            row.patchValue({
                frequencyType: '',
                effectiveFrom: ''
            }
            );
        }
    }

    clearActivityDates(): void {
        this.activities.controls.forEach((x: any) => {
            x.get('effectiveFrom')?.setValue('');
        });
    }
    onReferenceTypeChange(index: number) {
        const row = this.activities.at(index) as FormGroup;
        const referenceType = row.get('referenceType')?.value;

        row.patchValue({
            referenceId: null,
            referenceName: ''
        });

        row.get('referenceOptions')?.setValue([]);


        this.loadReferenceOptions(row);
        if (referenceType === 'CRM' || referenceType === 'Equipment') {
            row.get('referenceId')?.setValidators([Validators.required]);
            row.get('referenceName')?.clearValidators();

            this.service.getReferenceOptions(referenceType).subscribe({
                next: (res: any) => {
                    row.get('referenceOptions')?.setValue(res || []);
                },
                error: () => {
                    row.get('referenceOptions')?.setValue([]);
                    this.toastService.show('Failed to load reference list', 'warning');
                }
            });
        } else {
            row.get('referenceName')?.setValidators([Validators.required]);
            row.get('referenceId')?.clearValidators();
        }

        row.get('referenceId')?.updateValueAndValidity();
        row.get('referenceName')?.updateValueAndValidity();
    }
    onReferenceSelected(index: number) {
        const row = this.activities.at(index) as FormGroup;

        const referenceId = row.get('referenceId')?.value;
        const options = row.get('referenceOptions')?.value || [];

        const selected = options.find((x: any) => x.id == referenceId);

        row.patchValue({
            referenceName: selected ? selected.name : ''
        });
    }
    removeActivity(index: number): void {
        if (this.activities.length > 1) {
            this.activities.removeAt(index);
            this.activities.controls.forEach((ctrl, i) => ctrl.get('srNo')?.setValue(i + 1));
        }
    }

    checkDuplicateActivity(index: number): void {
        const currentRow = this.activities.at(index);
        const selectedActivity = currentRow.get("activityName")?.value;
        if (!selectedActivity) {
            currentRow.get('activityName')?.setValue(null);
            return;
        }
        const isDuplicate = this.activities.controls.some((row: any, i: number) =>
            i !== index && row.get('activityName')?.value === selectedActivity
        );
        if (isDuplicate) {
            this.toastService.show('This QA / QC activity is already selected.', 'warning');
            currentRow.get('activityName')?.setErrors({ duplicate: true });
            currentRow.get('activityName')?.setValue('');
        }
        else {
            currentRow.get('activityName')?.setErrors(null);
        }

    }
    loadData(): void {
        this.service.getById(this.recordId).subscribe({
            next: (data) => {
                if (!data)
                    return;

                data.date = NablFormsHelper.formatDateForInput(data.date);
                data.effectiveFrom = NablFormsHelper.formatDateForInput(data.effectiveFrom);
                data.effectiveTo = NablFormsHelper.formatDateForInput(data.effectiveTo);

                data.activities?.forEach((x: any) => {
                    x.effectiveFrom = x.effectiveFrom
                        ? NablFormsHelper.formatDateForInput(x.effectiveFrom)
                        : null
                })
                this.activities.clear();
                (data.activities || []).forEach((x: any) => {
                    this.addActivity();

                    const row = this.activities.at(this.activities.length - 1) as FormGroup;

                    row.patchValue({
                        ...x,
                        id: x.id || x.ID || 0,
                        referenceId: x.referenceId ? Number(x.referenceId) : null
                    });

                    this.loadReferenceOptions(row);
                });

                this.qcpForm.patchValue(data);
                // Lock form if not in editable status
                const status = (data as any).status;
                if (status && status !== 'Draft' && status !== 'Rejected') {
                    this.qcpForm.disable();
                    this.isViewMode = true;
                } else if (this.isViewMode) {
                    this.qcpForm.disable();
                }
                // Re-disable system fields (in case form was enabled for Draft/Rejected)
                this.qcpForm.get('documentNo')?.disable();
                this.qcpForm.get('issueNo')?.disable();
                this.qcpForm.get('revNo')?.disable();
                this.qcpForm.get('formatNo')?.disable();

            },
            error: () => { }
        });
    }
    loadReferenceOptions(row: FormGroup) {
        const type = row.get('referenceType')?.value;

        if (type === 'CRM' || type === 'Equipment') {
            this.service.getReferenceOptions(type).subscribe((res: any) => {
                row.get('referenceOptions')?.setValue(res || []);
            });
        }
    }
    onSubmit(): void {
        if (this.qcpForm.invalid) {
            this.qcpForm.markAllAsTouched(); return;
        }
        const formData = this.qcpForm.getRawValue();
        formData.preparedDate = this.today;
        formData.approvedDate = formData.approvedBy ? this.today : null;
        formData.reviewedDate = formData.reviewedBy ? this.today : null;
        formData.activities.forEach((x: any) => {
            delete x.referenceOptions;
        });


        if (this.isEditMode) {
            this.service.update(this.recordId, formData).subscribe({
                next: () => {
                    this.saved = true;
                    this.router.navigate(['/quality-control-plan']);
                    this.toastService.show('quality-control-plan updated successfully', 'success')
                },
                error: (error: any) => { this.toastService.show(error?.error?.message || 'Failed to update record', 'error'); }
            });
        } else {
            this.service.create(formData).subscribe({
                next: () => {
                    this.saved = true;
                    this.router.navigate(['/quality-control-plan']);
                    this.toastService.show('quality-control-plan created successfully', 'success')
                },
                error: (error: any) => { this.toastService.show(error?.error?.message || 'Failed to create record', 'error'); }
            });
        }
    }

    onCancel(): void { this.router.navigate(['/quality-control-plan']); }
    toggleSection(section: string): void { this.openSections[section] = !this.openSections[section]; }

    canDeactivate(): Observable<boolean> | boolean {
        if (!this.qcpForm.dirty || this.saved) return true;
        return this.unsavedChangesService.confirm();
    }

    @HostListener('window:beforeunload', ['$event'])
    onBeforeUnload(event: BeforeUnloadEvent) {
        if (this.qcpForm?.dirty && !this.saved) {
            event.preventDefault();
            event.returnValue = '';
        }
    }
}
