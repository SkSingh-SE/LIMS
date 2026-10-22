import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray, AbstractControl } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuditPlanService } from '../../../../services/audit-plan.service';
import { NablFormsHelper } from '../../../../utility/nabl-helpers/nabl-forms.helper';
import { Observable, of } from 'rxjs';
import { CanComponentDeactivate } from '../../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../../services/unsaved-changes.service';
import { NablSignatureSectionComponent } from '../../nabl-signature-section/nabl-signature-section.component';
import { NablHeaderService } from '../../../../services/nabl-header.service';
import { YearHelper } from '../../../../utility/helper/year.helper';
import { SearchableDropdownComponent } from '../../../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { DepartmentService } from '../../../../services/department.service';
import { MultiSelectDropdownComponent } from '../../../../utility/components/multi-select-dropdown/multi-select-dropdown.component';
import { QualityControlPlanService } from '../../../../services/quality-control-plan.service';
import { ToastService } from '../../../../services/toast.service';

@Component({
    selector: 'app-audit-plan-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterModule, NablSignatureSectionComponent, SearchableDropdownComponent, MultiSelectDropdownComponent],
    templateUrl: './audit-plan-form.component.html',
    styleUrl: './audit-plan-form.component.css'
})
export class AuditPlanFormComponent implements CanComponentDeactivate, OnInit {
    saved = false;
    isSubmitting = false;
    auditForm!: FormGroup;
    isEditMode = false;
    isViewMode = false;
    recordId: number = 0;
    formTitle = 'Audit Schedule & Plan';
    formNumbers = NablFormsHelper.getFormNumbers();
    yearOptions: number[] = YearHelper.planYears();

    openSections: { [key: string]: boolean } = {
        header: true,
        planDetails: true,
        scheduleItems: true
    };
    today = new Date().toISOString().split('T')[0];
    auditTypes = [
        'Internal Audit',
        'External Audit',
        'Special Audit',
        'Surveillance Audit',
    ]
    isoClauseOptions = [
        { id: 1, name: '4.1' },
        { id: 2, name: '4.2' },
        { id: 3, name: '5' },
        { id: 4, name: '6.1' },
        { id: 5, name: '6.2' },
        { id: 6, name: '6.3' },
        { id: 7, name: '6.4' },
        { id: 8, name: '6.5' },
        { id: 9, name: '6.6' },
        { id: 10, name: '7.1' },
        { id: 11, name: '7.2' },
        { id: 12, name: '7.3' },
        { id: 13, name: '7.4' },
        { id: 14, name: '7.5' },
        { id: 15, name: '7.6' },
        { id: 16, name: '7.7' },
        { id: 17, name: '7.8' },
        { id: 18, name: '7.9' },
        { id: 19, name: '7.10' },
        { id: 20, name: '7.11' },
        { id: 21, name: '8.1' },
        { id: 22, name: '8.2' },
        { id: 23, name: '8.3' },
        { id: 24, name: '8.4' },
        { id: 25, name: '8.5' },
        { id: 26, name: '8.6' },
        { id: 27, name: '8.7' },
        { id: 28, name: '8.8' },
        { id: 29, name: '8.9' }
    ];
    constructor(
        private fb: FormBuilder,
        private route: ActivatedRoute,
        private router: Router,
        private service: AuditPlanService
        , private unsavedChangesService: UnsavedChangesService,
        private departmentService: DepartmentService,
        private qcControlPlanservice: QualityControlPlanService,
        private toastService: ToastService,
        private nablHeaderService: NablHeaderService) {
        this.initForm();
        this.nablHeaderService.getFormDefaults('AuditPlan').subscribe({
            next: (defaults) => {
                this.auditForm.patchValue({ formatNo: defaults.formCode });
            },
            error: () => { }
        });
    }

    ngOnInit() {
        this.route.paramMap.subscribe(params => {
            const id = params.get('id');
            const mode = this.route.snapshot.url[1]?.path;

            if (id && id !== 'create') {
                this.recordId = +id;
                this.isEditMode = mode === 'edit';
                this.isViewMode = mode === 'details';
                this.formTitle = this.isViewMode ? 'View Audit Plan' : 'Edit Audit Plan';
                this.loadRecord();
            }
            else if (id == null && mode === 'create') {
                this.addScheduleItem();
                this.service.getNextPlanNo().subscribe({
                    next: (data) => {
                        this.auditForm.patchValue({ planNo: data.planNo });
                    },
                    error: () => { }
                })
            }
            else {
                this.addScheduleItem();
            }

        });
    }
    private initForm() {
        this.auditForm = this.fb.group({
            formatNo: ['F-50'],
            docNo: ['F-50'],
            issueNo: ['03'],
            issueDate: [null],
            date: [this.today, Validators.required],
            revNo: ['00'],
            revDate: [null],
            planNo: [null, Validators.required],
            auditYear: [null, Validators.required],

            leadAuditorId: [null, Validators.required],
            auditorName: [''],
            leadAuditorName: [''],

            scheduleDateFrom: [null, Validators.required],
            scheduleDateTo: [null, Validators.required],

            auditCriteria: ['', Validators.required],
            auditScope: ['', Validators.required],
            auditObjective: ['', Validators.required],
            remarks: [''],
            auditType: ['Internal Audit'],
            scheduleItems: this.fb.array([]),
            preparedBy: [''],
            reviewedBy: [null],
            approvedBy: [null],
            reviewedDate: [''],
            approvedDate: [''],
            preparedDate: [this.today],
        });

        // System-managed fields — always readonly
        this.auditForm.get('docNo')?.disable();
        this.auditForm.get('issueNo')?.disable();
        this.auditForm.get('revNo')?.disable();
        this.auditForm.get('formatNo')?.disable();
        this.auditForm.get('date')?.disable();
        this.auditForm.get('planNo')?.disable();
    }
    getAuditors = (term: string, page: number, pageSize: number): Observable<any[]> => {
        return this.service.getAuditorsDropdown(term, page, pageSize);
    }
    onAuditorsSelected(item: any) {
        if (!item) { this.auditForm.patchValue({ leadAuditorId: null }); return; }
        this.auditForm.patchValue({ leadAuditorId: item.id, leadAuditorName: item.name });
    }
    getEmployees = (term: string, page: number, pageSize: number): Observable<any[]> => {
        return this.qcControlPlanservice.getEmployeesDropdown(term, page, pageSize);
    }
    onEmployeeSelected(item: any) {
        if (!item) { this.auditForm.patchValue({ employeeId: null }); return; }
        this.auditForm.patchValue({ employeeId: item.id, employeeName: item.name });
    }
    getDepartments = (
        term: string,
        page: number,
        pageSize: number
    ): Observable<any[]> => {
        return this.departmentService.getDepartmentDropdown(
            term,
            page,
            pageSize
        );
    };
    onDepartmentSelected(item: any, index: number): void {
        const row = this.scheduleItems.at(index);

        const existingDepartmentId =
            Number(row.get('departmentId')?.value);

        const selectedDepartmentId =
            Number(item?.id);

        // Edit load par same department emit hua hai
        if (
            item &&
            existingDepartmentId === selectedDepartmentId
        ) {
            return;
        }

        if (!item) {
            row.patchValue({
                departmentId: null,
                departmentName: ''
            });

            this.clearRowAuditor(index);
            return;
        }

        row.patchValue({
            departmentId: item.id,
            departmentName: item.name
        });

        this.clearRowAuditor(index);
    }
    onScheduleDateChange(index: number): void {
        const row = this.scheduleItems.at(index);
        const dateControl = row.get('scheduleDate');

        const scheduleDate = dateControl?.value;
        const scheduleFrom =
            this.auditForm.get('scheduleDateFrom')?.value;
        const scheduleTo =
            this.auditForm.get('scheduleDateTo')?.value;

        if (!scheduleDate) {
            this.clearRowAuditor(index);
            return;
        }

        const errors = {
            ...(dateControl?.errors || {})
        };

        delete errors['beforeScheduleFrom'];
        delete errors['afterScheduleTo'];

        if (scheduleFrom && scheduleDate < scheduleFrom) {
            errors['beforeScheduleFrom'] = true;
        }

        if (scheduleTo && scheduleDate > scheduleTo) {
            errors['afterScheduleTo'] = true;
        }

        dateControl?.setErrors(
            Object.keys(errors).length ? errors : null
        );

        // Date badli, therefore Valid Upto condition dobara check hogi
        this.clearRowAuditor(index);
    }
    onAuditorSelected(item: any, index: number): void {
        const row = this.scheduleItems.at(index);

        row.patchValue({
            auditorId: item?.id ?? null,
            auditorName: item?.name ?? '',
            auditorSelectedItem: item ?? null
        });
    }
    onAuditeeSelected(item: any, index: number): void {
        const row = this.scheduleItems.at(index);

        row.patchValue({
            auditeeId: item?.id ?? null,
            auditeeName: item?.name ?? ''
        });
    }
    private clearRowAuditor(index: number): void {
        const row = this.scheduleItems.at(index);

        row.patchValue({
            auditorId: null,
            auditorName: '',
            auditorSelectedItem: null,
            showAuditorDropdown: false
        });

        // Purana dropdown destroy hoga aur fresh dropdown create hoga
        setTimeout(() => {
            row.patchValue({
                showAuditorDropdown: true
            });
        });
    }
    getISOClauses = (
        term: string,
        page: number,
        pageSize: number
    ): Observable<any[]> => {

        let data = [...this.isoClauseOptions];

        if (term) {
            const value = term.trim();
            const selectedId = Number(value);

            // Edit time selected ID resolve karega
            if (!Number.isNaN(selectedId)) {
                const selectedItem = data.find(
                    x => Number(x.id) === selectedId
                );

                if (selectedItem) {
                    return of([selectedItem]);
                }
            }

            // Normal dropdown search
            data = data.filter(x =>
                x.name.toLowerCase().includes(value.toLowerCase())
            );
        }

        const start = page * pageSize;

        return of(
            data.slice(start, start + pageSize)
        );
    };
    addScheduleItem(): void {
        const scheduleGroup = this.fb.group({
            id: [0],

            departmentId: [null, Validators.required],
            departmentName: [''],

            isoClauses: this.fb.array([], Validators.required),

            scheduleDate: [null, Validators.required],

            auditorId: [null, Validators.required],
            auditorName: [''],

            auditeeId: [null, Validators.required],
            auditeeName: [''],
            auditorSelectedItem: [null],
            status: ['Scheduled'],
            checklistId: [null],

            // Auditor dropdown refresh ke liye
            showAuditorDropdown: [true]
        });

        this.scheduleItems.push(scheduleGroup);
    }
    get scheduleItems() {
        return this.auditForm.get('scheduleItems') as any;
    }
    // removeScheduleItem(index: number) {
    //     if (this.scheduleItems.length > 1) {
    //         this.scheduleItems.removeAt(index);
    //     }
    // }
    isScheduleItemLocked(item: AbstractControl): boolean {
        const status = item.get('status')?.value;

        return this.isViewMode ||
            status === 'InProgress' ||
            status === 'Completed';
    }
    getRowISOClauses(index: number): FormArray {
        return this.scheduleItems
            .at(index)
            .get('isoClauses') as FormArray;
    }

    getSelectedISOClauseIds(index: number): number[] {
        return this.getRowISOClauses(index).controls
            .map(control =>
                Number(control.get('clauseId')?.value)
            )
            .filter(id => id > 0);
    }

    onISOClausesSelected(
        selectedItems: any[],
        index: number
    ): void {
        const clauseArray = this.getRowISOClauses(index);

        const existingIds = this.getSelectedISOClauseIds(index)
            .map(Number)
            .sort((a, b) => a - b);

        const selectedIds = (selectedItems || [])
            .map(x => Number(x.id))
            .filter(id => id > 0)
            .sort((a, b) => a - b);

        const isSameSelection =
            existingIds.length === selectedIds.length &&
            existingIds.every(
                (id, position) => id === selectedIds[position]
            );

        // Edit load par same clauses emit hue hain
        if (isSameSelection) {
            return;
        }

        clauseArray.clear();

        selectedItems.forEach((item: any) => {
            clauseArray.push(
                this.fb.group({
                    clauseId: [item.id],
                    clauseName: [item.name]
                })
            );
        });

        clauseArray.markAsTouched();
        clauseArray.updateValueAndValidity();

        this.clearRowAuditor(index);
    }
    private loadRecord(): void {

        this.service.getById(this.recordId).subscribe({
            next: (data) => {
                if (!data) {
                    return;
                }

                data.date =
                    NablFormsHelper.formatDateForInput(data.date);
                data.scheduleDateFrom = NablFormsHelper.formatDateForInput(data.scheduleDateFrom);

                data.scheduleDateTo = NablFormsHelper.formatDateForInput(data.scheduleDateTo);

                // ScheduleItems ko parent fields se separate rakho
                const { scheduleItems, ...parentData } = data;

                this.auditForm.patchValue(parentData);

                this.scheduleItems.clear();

                (scheduleItems || []).forEach((item: any) => {
                    this.addScheduleItem();
                    const rowIndex =
                        this.scheduleItems.length - 1;
                    const row =
                        this.scheduleItems.at(rowIndex) as FormGroup;
                    // Current row ke ISO Clauses
                    const clauseArray =
                        row.get('isoClauses') as FormArray;

                    clauseArray.clear();

                    const clauses =
                        item.isoClauses ??
                        item.IsoClauses ??
                        [];

                    clauses.forEach((clause: any) => {
                        clauseArray.push(
                            this.fb.group({
                                clauseId: [
                                    clause.clauseId ??
                                    clause.ClauseId ??
                                    null
                                ],
                                clauseName: [
                                    clause.clauseName ??
                                    clause.ClauseName ??
                                    ''
                                ]
                            })
                        );
                    });

                    const auditorId =
                        item.auditorId ??
                        item.AuditorId ??
                        null;

                    const auditorName =
                        item.auditorName ??
                        item.AuditorName ??
                        '';

                    row.patchValue({
                        id:
                            item.id ??
                            item.ID ??
                            0,

                        departmentId:
                            item.departmentId ??
                            item.DepartmentId ??
                            null,

                        departmentName:
                            item.departmentName ??
                            item.DepartmentName ??
                            '',

                        scheduleDate:
                            item.scheduleDate
                                ? NablFormsHelper.formatDateForInput(item.scheduleDate)
                                : null,

                        auditorId: auditorId,

                        auditorName: auditorName,

                        auditorSelectedItem:
                            auditorId && auditorName
                                ? { id: auditorId, name: auditorName }
                                : null,

                        auditeeId:
                            item.auditeeId ??
                            item.AuditeeId ??
                            null,

                        auditeeName:
                            item.auditeeName ??
                            item.AuditeeName ??
                            '',

                        status:
                            item.status ??
                            item.Status ??
                            'Scheduled',

                        checklistId:
                            item.checklistId ??
                            item.ChecklistId ??
                            null,

                        showAuditorDropdown: true
                    });
                });

                const status = (data as any).status;

                if (
                    status &&
                    status !== 'Draft' &&
                    status !== 'Rejected'
                ) {
                    this.auditForm.disable();
                    this.isViewMode = true;
                } else if (this.isViewMode) {
                    this.auditForm.disable();
                }

                this.auditForm.get('docNo')?.disable();
                this.auditForm.get('issueNo')?.disable();
                this.auditForm.get('revNo')?.disable();
                this.auditForm.get('formatNo')?.disable();


            },

            error: () => { }
        });
    }
    toggleSection(section: string) {
        this.openSections[section] = !this.openSections[section];
    }

    canLoadEligibleAuditors(index: number): boolean {
        const row = this.scheduleItems.at(index);

        const departmentId =
            row.get('departmentId')?.value;

        const scheduleDate =
            row.get('scheduleDate')?.value;

        const isoClauseIds =
            this.getSelectedISOClauseIds(index);

        return !!departmentId &&
            !!scheduleDate &&
            isoClauseIds.length > 0 &&
            row.get('scheduleDate')?.valid === true;
    }

    getEligibleAuditors(index: number) {
        return (
            term: string,
            page: number,
            pageSize: number
        ): Observable<any[]> => {

            const row = this.scheduleItems.at(index);

            const departmentId = Number(
                row.get('departmentId')?.value
            );

            const scheduleDate =
                row.get('scheduleDate')?.value;

            const isoClauseIds =
                this.getSelectedISOClauseIds(index);

            const savedAuditorId = Number(
                row.get('auditorId')?.value
            );

            const savedAuditorName =
                row.get('auditorName')?.value || '';

            const requestedId = Number(term);

            // Edit time par selected auditor ID resolve karo
            if (
                term &&
                !Number.isNaN(requestedId) &&
                requestedId === savedAuditorId &&
                savedAuditorName
            ) {
                return of([
                    {
                        id: savedAuditorId,
                        name: savedAuditorName
                    }
                ]);
            }

            if (
                !departmentId ||
                !scheduleDate ||
                isoClauseIds.length === 0 ||
                row.get('scheduleDate')?.invalid
            ) {
                return of([]);
            }

            return this.service.getEligibleAuditors(
                departmentId,
                isoClauseIds,
                scheduleDate
            );
        };
    }
    getChecklistButtonLabel(item: any): string {
        const checklistId = item.get('checklistId')?.value;
        const status = item.get('status')?.value;

        if (!checklistId && status === 'Scheduled') {
            return 'Start Checklist';
        }

        if (checklistId && status === 'InProgress') {
            return 'Open Checklist';
        }

        if (checklistId && status === 'Completed') {
            return 'View Checklist';
        }

        return 'Start Checklist';
    }
    openChecklist(item: any): void {
        const scheduleItemId = item.get('id')?.value;
        const checklistId = item.get('checklistId')?.value;
        const status = item.get('status')?.value;
        const auditPlanId = this.recordId;

        // Create
        // Create
        if (!checklistId && status === 'Scheduled') {
            this.router.navigate(
                ['/audit-checklist/create'],
                {
                    queryParams: {
                        scheduleItemId: scheduleItemId,
                        auditPlanId: auditPlanId
                    }
                }
            );

            return;
        }

        // Edit
        if (checklistId && status === 'InProgress') {
            this.router.navigate([
                '/audit-checklist/edit',
                checklistId
            ]);
            return;
        }

        // View
        if (checklistId && status === 'Completed') {
            // 1. URL Tree create karein bina path change kiye
            const urlTree = this.router.createUrlTree(['/audit-checklist/details', checklistId]);

            // 2. URL ko string me convert karein
            const url = this.router.serializeUrl(urlTree);

            // 3. New tab me open karein
            window.open(url, '_blank');
        }

    }
    onSubmit(): void {
        if (this.auditForm.invalid) {
            this.auditForm.markAllAsTouched(); return;
        }
        const formData = this.auditForm.getRawValue();
        formData.preparedDate = this.today;
        formData.approvedDate = formData.approvedBy ? this.today : null;
        formData.reviewedDate = formData.reviewedBy ? this.today : null;


        if (this.isEditMode) {
            this.service.update(this.recordId, formData).subscribe({
                next: () => {
                    this.saved = true;
                    this.router.navigate(['/audit-plan']);
                    this.toastService.show('audit plan updated successfully', 'success')
                },
                error: (error: any) => { this.toastService.show(error?.error?.message || 'Failed to update record', 'error'); }
            });
        } else {
            this.service.create(formData).subscribe({
                next: () => {
                    this.saved = true;
                    this.router.navigate(['/audit-plan']);
                    this.toastService.show('audit plan created successfully', 'success')
                },
                error: (error: any) => { this.toastService.show(error?.error?.message || 'Failed to create record', 'error'); }
            });
        }
    }

    onCancel() {
        this.router.navigate(['/audit-plan']);
    }

    canDeactivate(): Observable<boolean> | boolean {
        if (!this.auditForm.dirty || this.saved) return true;
        return this.unsavedChangesService.confirm();
    }

    @HostListener('window:beforeunload', ['$event'])
    onBeforeUnload(event: BeforeUnloadEvent) {
        if (this.auditForm?.dirty && !this.saved) {
            event.preventDefault();
            event.returnValue = '';
        }
    }
}
