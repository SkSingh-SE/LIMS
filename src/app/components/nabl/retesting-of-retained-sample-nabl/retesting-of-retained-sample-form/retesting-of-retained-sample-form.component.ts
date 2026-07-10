import { Component, OnInit, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { RetestingOfRetainedSampleService } from '../../../../services/retesting-of-retained-sample.service';
import { NablFormsHelper } from '../../../../utility/nabl-helpers/nabl-forms.helper';
import { ToastService } from '../../../../services/toast.service';

import { QuillModule } from 'ngx-quill';
import { Observable } from 'rxjs';
import { CanComponentDeactivate } from '../../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../../services/unsaved-changes.service';
import { NablSignatureSectionComponent } from '../../nabl-signature-section/nabl-signature-section.component';
import { NablHeaderService } from '../../../../services/nabl-header.service';
import { SearchableDropdownComponent } from '../../../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { QualityControlPlanService } from '../../../../services/quality-control-plan.service';
@Component({
    selector: 'app-retesting-of-retained-sample-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterModule, QuillModule, NablSignatureSectionComponent, SearchableDropdownComponent],
    templateUrl: './retesting-of-retained-sample-form.component.html',
    styleUrl: './retesting-of-retained-sample-form.component.css'
})
export class RetestingOfRetainedSampleFormComponent implements CanComponentDeactivate, OnInit {
    saved = false;
    retestForm!: FormGroup;
    recordId: number = 0;
    isEditMode = false;
    isViewMode = false;
    isRetestingMode = false;
    formTitle = 'Add Retesting of Retained Sample (F-38)';
    formNumbers: string[] = NablFormsHelper.getFormNumbers();
    selectedInitialLogIndex: number | null = null;
    editInitialIndex: number | null = null;
    editRetestingIndex: number | null = null;
    openSections: { [key: string]: boolean } = {
        header: true,
        sampleInfo: true,
        parameters: true,
        approval: true
    };

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
    editLogIndex: number | null = null;
    constructor(
        private fb: FormBuilder,
        private service: RetestingOfRetainedSampleService,
        private router: Router,
        private route: ActivatedRoute,
        private toastService: ToastService
        , private unsavedChangesService: UnsavedChangesService,
        private nablHeaderService: NablHeaderService,
        private qcPlanService: QualityControlPlanService
    ) { }

    ngOnInit(): void {
        this.initForm();
        this.nablHeaderService.getFormDefaults('Retesting').subscribe({
            next: (defaults) => {
                this.retestForm.patchValue({ formatNo: defaults.formCode });
            },
            error: () => { }
        });
        this.recordId = Number(this.route.snapshot.params['id']);
        const path = this.route.snapshot.url[this.route.snapshot.url.length - 2]?.path;
        if (path === 'details') { this.isViewMode = true; this.formTitle = 'View Retesting Record'; this.retestForm.disable(); }
        else if (path === 'edit') { this.isEditMode = true; this.formTitle = 'Edit Retesting Record'; }
        if (this.recordId) { this.loadData(); }
        // else { this.addParameter(); }
    }

    initForm(): void {
        this.retestForm = this.fb.group({
            id: [0],
            formatNo: ['F-38'],
            issueNo: ['01'],
            revNo: ['00'],
            date: [this.today, Validators.required],
            documentNo: ['F-38'],
            discipline: ['', Validators.required],
            dateOfRetesting: [this.today],
            remarks: [''],
            qcPlanNoId: ['', Validators.required],
            qcPlanActivityId: [0],
            // Auto Fetch Details (Read Only)
            planNo: [''],
            planYear: [''],
            materialProductGroup: [''],
            labIncharge: [''],
            effectiveFrom: [''],
            effectiveTo: [''],
            nextDueDate: [''],

            qcActivity: [''],
            departmentName: [''],
            testMethodName: [''],
            referenceType: [''],
            referenceName: [''],
            frequencyType: [''],
            frequencyName: [''],
            responsibleEmployee: [''],
            acceptanceCriteria: [''],
            dateOfTesting: [''],
            sampleId: [''],
            resultPrefix: [''],
            resultValue: [''],
            testedBy: [''],
            initialRemarks: [''],
            initialEmployeeId: [null],
            initialEmployeeName: [''],
            initialEmployeeSelected: [null],

            // Retesting
            retestEmployeeId: [null],
            retestEmployeeName: [''],
            retestEmployeeSelected: [null],
            // Retesting Form
            qcMonth: [''],
            retestSampleId: [{ value: '', disabled: true }],
            previousPrefix: [{ value: '' }],
            previousValue: [{ value: '' }],
            retestPrefix: [''],
            retestValue: [''],
            difference: [{ value: '', disabled: true }],
            acceptableLimit: [null],
            resultStatus: [{ value: '' }],
            retestTestedBy: [''],
            retestRemarks: [''],

            // Child Logs
            initialTestingLogs: this.fb.array([]),
            retestingLogs: this.fb.array([]),
            authorizedSignatory: [''],
            status: ['Completed'],
            preparedBy: [''],
            reviewedBy: [null],
            approvedBy: [null],
            reviewedDate: [''],
            approvedDate: [''],
            employeeSelected: [null],
            preparedDate: [this.today],
        });

        // System-managed fields — always readonly
        this.retestForm.get('documentNo')?.disable();
        this.retestForm.get('issueNo')?.disable();
        this.retestForm.get('revNo')?.disable();
        this.retestForm.get('formatNo')?.disable();
        this.retestForm.get('date')?.disable();
        this.retestForm.get('retestValue')?.valueChanges.subscribe(() => {
            this.calculateDifferenceAndStatus();
        });

        this.retestForm.get('acceptableLimit')?.valueChanges.subscribe(() => {
            this.calculateDifferenceAndStatus();
        });
    }
    get testLogs(): FormArray {
        return this.retestForm.get('testLogs') as FormArray;
    }

    fetchQCPlanNo = (term: string, page: number, pageSize: number): Observable<any[]> => {
        // Replace with actual service call to fetch test methods
        return this.service.getQCPlanNo(term, page, pageSize);
    }
    getEmployees = (term: string, page: number, pageSize: number): Observable<any[]> => {
        // Replace with actual service call to fetch test methods
        return this.qcPlanService.getEmployeesDropdown(term, page, pageSize);
    }

    onInitialEmployeeSelected(employee: any): void {
        if (!employee) {
            this.retestForm.patchValue({
                initialEmployeeId: null,
                initialEmployeeName: '',
                initialEmployeeSelected: null
            });
            return;
        }

        this.retestForm.patchValue({
            initialEmployeeId: employee.id || employee.ID,
            initialEmployeeName: employee.name || employee.Name || employee.employeeName || employee.EmployeeName,
            initialEmployeeSelected: employee
        });
    }
    onRetestEmployeeSelected(employee: any): void {
        if (!employee) {
            this.retestForm.patchValue({
                retestEmployeeId: null,
                retestEmployeeName: '',
                retestEmployeeSelected: null
            });
            return;
        }

        this.retestForm.patchValue({
            retestEmployeeId: employee.id || employee.ID,
            retestEmployeeName: employee.name || employee.Name || employee.employeeName || employee.EmployeeName,
            retestEmployeeSelected: employee
        });
    }
    onQcPlanNo(item: any) {
        const id = Number(item?.id);
        this.service.getQcDetails(id).subscribe({
            next: (res) => {
                this.retestForm.patchValue({
                    qcPlanId: res.qcPlanId,
                    qcPlanActivityId: res.qcPlanActivityId,

                    planNo: res.planNo,
                    planYear: res.planYear,
                    discipline: res.discipline,
                    materialProductGroup: res.materialProductGroup,
                    labIncharge: res.labIncharge,
                    effectiveFrom: NablFormsHelper.formatDateForInput(res.effectiveFrom),
                    effectiveTo: NablFormsHelper.formatDateForInput(res.effectiveTo),

                    qcActivity: res.qcActivity,
                    departmentName: res.departmentName,
                    testMethodName: res.testMethodName,
                    referenceType: res.referenceType,
                    referenceName: res.referenceName,
                    frequencyType: res.frequencyType,
                    responsibleEmployee: res.responsibleEmployee,
                    acceptanceCriteria: res.acceptanceCriteria,
                    nextDueDate: NablFormsHelper.formatDateForInput(res.nextDueDate)

                });
            },
        })
        this.retestForm.patchValue({
            qcPlanNoId: item ? item.id : null,
            qcPlanNo: item ? item.name : ''
        });
    }


    loadData(): void {
        this.service.getById(this.recordId).subscribe({
            next: (data) => {
                if (data) {
                    this.initialTestingLogs.clear();
                    this.retestingLogs.clear();

                    data.initialTestingLogs?.forEach((x: any) => {
                        this.initialTestingLogs.push(
                            this.fb.group({
                                id: [x.id],
                                dateOfTesting: [x.dateOfTesting],
                                sampleId: [x.sampleId],
                                resultPrefix: [x.resultPrefix],
                                resultValue: [x.resultValue],
                                latestResultPrefix: [x.latestResultPrefix],
                                latestResultValue: [x.latestResultValue],
                                testedById: [x.testedById],
                                testedByName: [x.testedByName],
                                remarks: [x.remarks]
                            })
                        )
                    });
                    data.retestingLogs?.forEach((x: any) => {
                        this.retestingLogs.push(
                            this.fb.group({
                                id: [x.id],
                                initialTestLogId: [x.initialTestLogId],
                                qcMonth: [x.qcMonth],
                                dateOfRetesting: [x.dateOfRetesting],
                                sampleId: [x.sampleId],
                                previousPrefix: [x.previousPrefix],
                                previousValue: [x.previousValue],
                                retestPrefix: [x.retestPrefix],
                                retestValue: [x.retestValue],
                                difference: [x.difference],
                                acceptableLimit: [x.acceptableLimit],
                                resultStatus: [x.resultStatus],
                                testedById: [x.testedById],
                                testedByName: [x.testedByName],
                                qmSignature: [x.qmSignature],
                                remarks: [x.remarks]
                            })
                        )
                    });
                    this.retestForm.patchValue(data);
                    // Lock form if not in editable status
                    const status = (data as any).status;
                    if (status && status !== 'Draft' && status !== 'Rejected') {
                        this.retestForm.disable();
                        this.isViewMode = true;
                    } else if (this.isViewMode) {
                        this.retestForm.disable();
                    }
                    // Re-disable system fields (in case form was enabled for Draft/Rejected)
                    this.retestForm.get('documentNo')?.disable();
                    this.retestForm.get('issueNo')?.disable();
                    this.retestForm.get('revNo')?.disable();
                    this.retestForm.get('formatNo')?.disable();
                }
            },
            error: () => { }
        });
    }
    get initialTestingLogs(): FormArray {
        return this.retestForm.get('initialTestingLogs') as FormArray;
    }

    get retestingLogs(): FormArray {
        return this.retestForm.get('retestingLogs') as FormArray;
    }

    addInitialLog(): void {
        const v = this.retestForm.getRawValue();
        const qcPlanNoId = this.retestForm.get('qcPlanNoId')?.value;

        if (!qcPlanNoId) return this.toastService.show('Please select a QC Plan No before adding the Initial Testing log.', 'warning');
        if (!v.dateOfTesting) return this.toastService.show('Date of Testing is required', 'warning');
        if (!v.sampleId) return this.toastService.show('Sample Id is required', 'warning');
        if (!v.resultPrefix) return this.toastService.show('Result Prefix is required', 'warning');
        if (!v.resultValue) return this.toastService.show('Result Value is required', 'warning');
        if (!v.initialEmployeeId) return this.toastService.show('Tested By is required', 'warning');

        const testDate = new Date(v.dateOfTesting);
        const fromDate = new Date(v.effectiveFrom);
        const toDate = new Date(v.effectiveTo);

        if (testDate < fromDate || testDate > toDate) {
            return this.toastService.show('Date of Testing must be between Effective From and Effective To', 'warning');
        }

        const log = this.fb.group({
            dateOfTesting: [v.dateOfTesting],
            sampleId: [v.sampleId],
            resultPrefix: [v.resultPrefix],
            resultValue: [v.resultValue],
            latestResultPrefix: [v.resultPrefix],
            latestResultValue: [v.resultValue],
            testedById: [v.initialEmployeeId],
            testedByName: [v.initialEmployeeName],
            testedBySelected: [v.initialEmployeeSelected],
            remarks: [v.initialRemarks]
        });

        if (this.editInitialIndex !== null) {
            this.initialTestingLogs.setControl(this.editInitialIndex, log);
            this.editInitialIndex = null;
        } else {
            this.initialTestingLogs.push(log);
        }

        this.clearInitialForm();
    }
    openRetestingForm(log: any, index: number): void {
        this.isRetestingMode = true;
        this.selectedInitialLogIndex = index;
        const nextDueDate = this.retestForm.get('nextDueDate')?.value;
        this.retestForm.patchValue({
            initialTestLogId: log.id,
            qcMonth: nextDueDate ? new Date(nextDueDate).toISOString().substring(0, 7) : '',
            retestSampleId: log.sampleId,
            previousPrefix: log.latestResultPrefix || log.resultPrefix,
            previousValue: log.latestResultValue ?? log.resultValue,

            retestPrefix: log.latestResultPrefix || log.resultPrefix,
            retestValue: '',
            difference: '',
            acceptableLimit: null,
            resultStatus: '',
            retestEmployeeSelected: '',
            retestEmployeeId: '',
            retestRemarks: log.remarks
        });
    }
    cancelRetesting(): void {
        this.isRetestingMode = false;
        this.selectedInitialLogIndex = null;
        this.editRetestingIndex = null;

        this.clearRetestingForm();
    }


    clearRetestingForm(): void {
        this.retestForm.patchValue({
            qcMonth: '',
            dateOfRetesting: '',
            retestSampleId: '',
            previousPrefix: '',
            previousValue: '',
            retestPrefix: '',
            retestValue: '',
            difference: '',
            acceptableLimit: null,
            resultStatus: '',
            retestTestedBy: '',
            retestRemarks: ''
        });
    }

    clearInitialForm(): void {
        this.retestForm.patchValue({
            dateOfTesting: '',
            sampleId: '',
            resultPrefix: '',
            resultValue: '',
            initialEmployeeId: null,
            initialEmployeeName: '',
            initialEmployeeSelected: null,
            initialRemarks: ''
        });
    }
    calculateDifferenceAndStatus(): void {
        const previousValue = Number(this.retestForm.get('previousValue')?.value);
        const retestValue = Number(this.retestForm.get('retestValue')?.value);
        const acceptableLimit = Number(this.retestForm.get('acceptableLimit')?.value);

        if (!previousValue || !retestValue) {
            return;
        }

        const difference = Number((retestValue - previousValue).toFixed(3));

        let status = '';

        if (acceptableLimit) {
            status = Math.abs(difference) <= acceptableLimit ? 'OK' : 'Not OK';
        }

        this.retestForm.patchValue({
            difference: difference,
            resultStatus: status
        }, { emitEvent: false });
    }


    onSubmit(): void {
        if (this.retestForm.invalid) {
            this.retestForm.markAllAsTouched(); return;
        }
        const formData = this.retestForm.getRawValue();

        formData.preparedDate = this.today;
        formData.approvedDate = formData.approvedBy ? this.today : null;
        formData.reviewedDate = formData.reviewedBy ? this.today : null;

        if (this.isEditMode) {
            this.service.update(this.recordId, formData).subscribe({
                next: () => {
                    this.saved = true;
                    this.router.navigate(['/retesting-retained-sample']);
                    this.toastService.show('Retesting retained updated successfully', 'success');
                },
                error: (error: any) => {
                    this.toastService.show(error?.error?.message || 'Failed to update record', 'error');
                }
            });
        } else {
            this.service.create(formData).subscribe({
                next: () => {
                    this.saved = true;
                    this.router.navigate(['/retesting-retained-sample']);
                    this.toastService.show('Retesting retained created successfully', 'success');
                },
                error: (error: any) => {
                    this.toastService.show(error?.error?.message || 'Failed to create record', 'error');
                }
            });
        }
    }

    addRetestingLog(): void {
        const v = this.retestForm.getRawValue();

        if (!v.qcMonth) return this.toastService.show('QC Month is required.', 'warning');
        if (!v.dateOfRetesting) return this.toastService.show('Date of Retesting is required.', 'warning');
        if (!v.retestSampleId) return this.toastService.show('Sample Id is required.', 'warning');
        if (!v.previousValue) return this.toastService.show('Previous Test Result is required.', 'warning');
        if (!v.retestPrefix) return this.toastService.show('Retesting Result Prefix is required.', 'warning');
        if (!v.retestValue) return this.toastService.show('Retesting Result Value is required.', 'warning');
        if (!v.resultStatus) return this.toastService.show('Result Status is required.', 'warning');
        if (!v.retestEmployeeId) return this.toastService.show('Tested By is required.', 'warning');

        const retestDate = new Date(v.dateOfRetesting);
        const fromDate = new Date(v.effectiveFrom);
        const toDate = new Date(v.effectiveTo);

        if (retestDate < fromDate || retestDate > toDate) {
            return this.toastService.show('Date of Retesting must be between Effective From and Effective To.', 'warning');
        }

        const difference = Math.abs(+(Number(v.retestValue) - Number(v.previousValue)).toFixed(3));
        if (this.selectedInitialLogIndex === null)
            return;

        const initialLog = this.initialTestingLogs.at(this.selectedInitialLogIndex);

        initialLog.patchValue({
            latestResultPrefix: v.previousPrefix,
            latestResultValue: v.previousValue
        });
        const log = this.fb.group({
            initialTestLogId: [initialLog.value.id],

            qcMonth: [v.qcMonth],
            dateOfRetesting: [v.dateOfRetesting],
            sampleId: [v.retestSampleId],

            previousPrefix: [v.previousPrefix],
            previousValue: [v.previousValue],

            retestPrefix: [v.retestPrefix],
            retestValue: [v.retestValue],

            difference: [difference],
            acceptableLimit: [v.acceptableLimit],
            resultStatus: [v.resultStatus],

            testedById: [v.retestEmployeeId],
            testedByName: [v.retestEmployeeName],
            remarks: [v.retestRemarks]
        });

        if (this.editRetestingIndex !== null) {
            this.retestingLogs.setControl(this.editRetestingIndex, log);
            this.editRetestingIndex = null;
        } else {
            this.retestingLogs.push(log);
        }
        this.clearRetestingForm();
        this.cancelRetesting();
    }

    onCancel(): void { this.router.navigate(['/retesting-retained-sample']); }
    toggleSection(section: string): void { this.openSections[section] = !this.openSections[section]; }

    canDeactivate(): Observable<boolean> | boolean {
        if (!this.retestForm.dirty || this.saved) return true;
        return this.unsavedChangesService.confirm();
    }

    @HostListener('window:beforeunload', ['$event'])
    onBeforeUnload(event: BeforeUnloadEvent) {
        if (this.retestForm?.dirty && !this.saved) {
            event.preventDefault();
            event.returnValue = '';
        }
    }
}
