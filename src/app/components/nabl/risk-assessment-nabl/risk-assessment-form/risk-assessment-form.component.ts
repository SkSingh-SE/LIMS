import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { QuillModule } from 'ngx-quill';
import { RiskAssessmentService } from '../../../../services/risk-assessment.service';
import { NablFormsHelper } from '../../../../utility/nabl-helpers/nabl-forms.helper';
import { Observable } from 'rxjs';
import { CanComponentDeactivate } from '../../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../../services/unsaved-changes.service';
import { ToastService } from '../../../../services/toast.service';
import { NablSignatureSectionComponent } from '../../nabl-signature-section/nabl-signature-section.component';
import { NablHeaderService } from '../../../../services/nabl-header.service';
import { DepartmentService } from '../../../../services/department.service';
import { SearchableDropdownComponent } from '../../../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { QualityControlPlanService } from '../../../../services/quality-control-plan.service';

@Component({
    selector: 'app-risk-assessment-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, QuillModule, RouterModule, NablSignatureSectionComponent, SearchableDropdownComponent],
    templateUrl: './risk-assessment-form.component.html',
    styleUrl: './risk-assessment-form.component.css'
})
export class RiskAssessmentFormComponent implements CanComponentDeactivate, OnInit {
    saved = false;
    riskForm!: FormGroup;
    isEditMode = false;
    isViewMode = false;
    recordId: number = 0;
    formTitle = 'Add New Risk Assessment';
    formNumbers = NablFormsHelper.getFormNumbers();

    openSections: { [key: string]: boolean } = {
        header: true,
        assessment: true,
        controls: true,
        actionplans: true,
        review: true,
        riskDetails: true
    };

    quillModules = {
        toolbar: [
            ['bold', 'italic', 'underline'],
            [{ list: 'ordered' }, { list: 'bullet' }],
            ['clean']
        ]
    };

    types = [
        'Risk',
        'Opportunity'
    ]
    categories = [
        'Equipment',
        'Personnel',
        'Testing Process',
        'Quality Control',
        'PT / ILC',
        'Reference Material / CRM',
        'Sample Management',
        'Environmental Conditions',
        'Supplier / Procurement',
        'Customer',
        'Documents',
        'Information Technology',
        'Health & Safety',
        'Regulatory / NABL Compliance',
        'Improvement Opportunity',
        'Others'
    ];
    likelihoodOptions = [
        '1 - Rare',
        '2 - Unlikely',
        '3 - Possible',
        '4 - Likely',
        '5 - Almost Certain'
    ];
    effectivenesses = [
        'Effective',
        'Partially Effective',
        'Not Effective'
    ];
    statuses = [
        'Pending',
        'In Progress',
        'Completed',
        'Cancelled'
    ];
    impactOptions = [
        '1 - Insignificant',
        '2 - Minor',
        '3 - Moderate',
        '4 - Major',
        '5 - Critical'
    ];

    today = new Date().toISOString().split('T')[0];
    constructor(
        private fb: FormBuilder,
        private route: ActivatedRoute,
        private router: Router,
        private service: RiskAssessmentService,
        private unsavedChangesService: UnsavedChangesService,
        private toastService: ToastService,
        private nablHeaderService: NablHeaderService,
        private departmentService: DepartmentService,
        private qcControlPlanservice: QualityControlPlanService
    ) {
        this.initForm();
        this.nablHeaderService.getFormDefaults('RiskAssessment').subscribe({
            next: (defaults) => {
                this.riskForm.patchValue({ formatNo: defaults.formCode });
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
                this.formTitle = this.isViewMode ? 'View Risk Assessment' : 'Edit Risk Assessment';
                this.loadRecord();
            }
            else {
                this.addActionPlans();
            }
            if (id == null && mode == 'create') {
                this.service.getNextRiskNo().subscribe({
                    next: (res) => {
                        this.riskForm.patchValue({
                            riskNo: res.riskNo
                        })
                    },
                    error: () => { }
                });
            }
            this.riskForm.get('likelihood')?.valueChanges.subscribe(() => {
                this.calculateRisk();
            });

            this.riskForm.get('impact')?.valueChanges.subscribe(() => {
                this.calculateRisk();
            });
        });
    }

    private initForm() {
        this.riskForm = this.fb.group({
            formatNo: ['F-46'],
            docNo: ['F-46'],
            issueNo: ['03'],
            issueDate: [null],
            revNo: ['00'],
            riskNo: ["RISK-2026-001", Validators.required],
            revDate: [null],
            departmentName: [''],
            departmentId: [null, Validators.required],
            date: [this.today, Validators.required],
            riskDate: [this.today, Validators.required],
            type: ['Risk'],
            impact: ['1 - Insignificant'],
            likelihood: ['1 - Rare'],
            category: ['Equipment'],
            identifiedByName: [''],
            identifiedById: [null, Validators.required],
            riskScore: [1],
            riskLevel: ['Low'],
            actionPlans: this.fb.array([]),
            opportunity: ['', Validators.required],
            existingSituation: ['', Validators.required],
            expectedBenefit: [null],
            title: [null, Validators.required],
            existingControls: [null, Validators.required],
            riskOwner: [null, Validators.required],
            effectivenessRemarks: [null],
            effectiveness: ['Effective'],
            riskRemarks: [null],
            reviewedBy: [null],
            preparedBy: [null],
            approvedBy: [null],
            reviewedDate: [''],
            approvedDate: [''],
            preparedDate: [this.today],
        });

        // System-managed fields — always readonly
        this.riskForm.get('docNo')?.disable();
        this.riskForm.get('issueNo')?.disable();
        this.riskForm.get('revNo')?.disable();
        this.riskForm.get('formatNo')?.disable();
        this.riskForm.get('date')?.disable();
        this.riskForm.get('riskNo')?.disable();
        this.riskForm.get('riskLevel')?.disable();
        this.riskForm.get('riskScore')?.disable();
    }

    get actionPlans(): FormArray {
        return this.riskForm.get('actionPlans') as FormArray;
    }
    addActionPlans(): void {
        const actionplan = this.fb.group({
            action: [null, Validators.required],
            responsiblePerson: [null, Validators.required],
            targetDate: [this.today, Validators.required],
            completionDate: [null],
            status: ['Pending']
        });
        this.actionPlans.push(actionplan);
    }
    removeActionPlans(index: number): void {
        if (this.actionPlans.length > 1) {
            this.actionPlans.removeAt(index);
        }
    }


    private loadRecord() {
        this.service.getById(this.recordId).subscribe({
            next: (data: any) => {

                if (!data) {
                    return;
                }

                // Clear existing rows
                this.actionPlans.clear();

                // Patch main form (except actionPlans)
                this.riskForm.patchValue({
                    ...data,
                    date: NablFormsHelper.formatDateForInput(data.date),
                    riskDate: NablFormsHelper.formatDateForInput(data.riskDate),
                    actionPlans: []   // Ignore FormArray here
                });

                // Load Action Plans
                if (data.actionPlans?.length) {

                    data.actionPlans.forEach((plan: any) => {

                        this.addActionPlans();

                        const group = this.actionPlans.at(this.actionPlans.length - 1);

                        group.patchValue({
                            action: plan.action,
                            responsiblePerson: plan.responsiblePerson,
                            targetDate: plan.targetDate
                                ? NablFormsHelper.formatDateForInput(plan.targetDate)
                                : null,
                            completionDate: plan.completionDate
                                ? NablFormsHelper.formatDateForInput(plan.completionDate)
                                : null,
                            status: plan.status
                        });

                    });

                }

                // Lock form if not in editable status
                const status = data.status;

                if (status && status !== 'Draft' && status !== 'Rejected') {
                    this.riskForm.disable();
                    this.isViewMode = true;
                } else if (this.isViewMode) {
                    this.riskForm.disable();
                }

                // Keep system fields disabled
                this.riskForm.get('docNo')?.disable();
                this.riskForm.get('issueNo')?.disable();
                this.riskForm.get('revNo')?.disable();
                this.riskForm.get('formatNo')?.disable();
            },

            error: (error: any) => {
                this.toastService.show(
                    error?.error?.message || 'Failed to load record',
                    'error'
                );
            }
        });
    }
    toggleSection(section: string) {
        this.openSections[section] = !this.openSections[section];
    }

    getDepartments = (term: string, page: number, pageSize: number): Observable<any[]> => {
        return this.departmentService.getDepartmentDropdown(term, page, pageSize);
    };

    getEmployees = (term: string, page: number, pageSize: number): Observable<any[]> => {
        return this.qcControlPlanservice.getEmployeesDropdown(term, page, pageSize);
    }

    onDepartmentSelected(item: any) {
        if (!item) { this.riskForm.patchValue({ departmentId: null }); return; }
        this.riskForm.patchValue({ departmentId: item.id, departmentName: item.name });
    }

    onEmployeeSelected(item: any) {
        if (!item) { this.riskForm.patchValue({ identifiedById: null }); return; }
        this.riskForm.patchValue({ identifiedById: item.id, identifiedByName: item.name });
    }

    onSubmit() {
        if (this.riskForm.invalid) {
            this.riskForm.markAllAsTouched();
            return;
        }
        const formData = this.riskForm.getRawValue();
        formData.actionPlans?.forEach((plan: any) => {
            if (plan.completionDate === '') {
                plan.completionDate = null;
            }
        });
        formData.preparedDate = this.today;
        formData.approvedDate = formData.approvedBy ? this.today : null;
        formData.reviewedDate = formData.reviewedBy ? this.today : null;
        if (this.isEditMode) {
            this.service.update(this.recordId, formData).subscribe({
                next: () => {
                    this.saved = true;
                    this.router.navigate(['/risk-assessment']);
                    this.toastService.show('risk assessment updated successfully', 'success')
                },
                error: (error: any) => { this.toastService.show(error?.error?.message || 'Operation failed', 'error'); }
            });
        } else {
            this.service.create(formData).subscribe({
                next: () => {
                    this.saved = true;
                    this.router.navigate(['/risk-assessment']);
                    this.toastService.show('risk assessment updated successfully', 'success')
                },
                error: (error: any) => { this.toastService.show(error?.error?.message || 'Operation failed', 'error'); }
            });
        }
    }
    calculateRisk() {

        const likelihood = this.riskForm.get('likelihood')?.value;
        const impact = this.riskForm.get('impact')?.value;

        if (!likelihood || !impact) {
            this.riskForm.patchValue({
                riskScore: null,
                riskLevel: ''
            }, { emitEvent: false });

            return;
        }

        // Extract Number
        const likelihoodValue = Number(likelihood.split('-')[0].trim());
        const impactValue = Number(impact.split('-')[0].trim());

        const score = likelihoodValue * impactValue;

        let level = '';

        if (score <= 4) {
            level = 'Low';
        }
        else if (score <= 9) {
            level = 'Medium';
        }
        else if (score <= 16) {
            level = 'High';
        }
        else {
            level = 'Critical';
        }

        this.riskForm.patchValue({
            riskScore: score,
            riskLevel: level
        }, { emitEvent: false });

    }
    onCancel() {
        this.router.navigate(['/risk-assessment']);
    }

    canDeactivate(): Observable<boolean> | boolean {
        if (!this.riskForm.dirty || this.saved) return true;
        return this.unsavedChangesService.confirm();
    }

    @HostListener('window:beforeunload', ['$event'])
    onBeforeUnload(event: BeforeUnloadEvent) {
        if (this.riskForm?.dirty && !this.saved) {
            event.preventDefault();
            event.returnValue = '';
        }
    }
}
