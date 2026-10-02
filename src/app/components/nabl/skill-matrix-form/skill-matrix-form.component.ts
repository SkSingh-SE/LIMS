import { CommonModule } from '@angular/common';
import { Component, OnInit, signal, HostListener } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { SkillMatrixService } from '../../../services/skill-matrix.service';
import { SkillMatrix, EmployeeSkill } from '../../../models/skillMatrixModel';
import { DesignationService } from '../../../services/designation.service';
import { EmployeeService } from '../../../services/employee.service';
import { ToastService } from '../../../services/toast.service';
import { SearchableDropdownComponent } from '../../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { NablFormsHelper } from '../../../utility/nabl-helpers/nabl-forms.helper';
import { Observable } from 'rxjs';
import { CanComponentDeactivate } from '../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../services/unsaved-changes.service';
import { NablHeaderService } from '../../../services/nabl-header.service';
import { NablSignatureSectionComponent } from '../nabl-signature-section/nabl-signature-section.component';

@Component({
    selector: 'app-skill-matrix-form',

    imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule, SearchableDropdownComponent, NablSignatureSectionComponent],
    templateUrl: './skill-matrix-form.component.html',
    styleUrl: './skill-matrix-form.component.css'
})
export class SkillMatrixFormComponent implements CanComponentDeactivate, OnInit {
    saved = false;
    isSubmitting = false;
    matrixForm!: FormGroup;
    recordId: number = 0;
    isEditMode: boolean = false;
    isViewMode: boolean = false;
    formTitle = 'Create Skill Matrix';

    designations: any[] = [];
    formNumbers: string[] = NablFormsHelper.getFormNumbers();

    openSections: { [key: string]: boolean } = {
        header: true,
        skills: true,
        footer: true
    };

    leveltypes = [
        'Level 1 - Beginner',
        'Level 2 - Trained',
        'Level 3 - Competent',
        'Level 4 - Expert'
    ]

    today = new Date().toISOString().split('T')[0];

    constructor(
        private fb: FormBuilder,
        private skillMatrixService: SkillMatrixService,
        private designationService: DesignationService,
        private employeeService: EmployeeService,
        private router: Router,
        private route: ActivatedRoute,
        private toastService: ToastService
        , private unsavedChangesService: UnsavedChangesService,
        private nablHeaderService: NablHeaderService) { }

    ngOnInit(): void {

        const state = history.state as {
            employeeId?: number;
            mode?: string;
        };

        const url = this.router.url;

        // =========================
        // SET MODE FIRST
        // =========================

        if (url.includes('/skill-matrix/edit/')) {

            this.formTitle = 'Edit Skill Matrix Decision';

            this.isEditMode = true;
            this.isViewMode = false;

        }
        else if (url.includes('/skill-matrix/details/')) {

            this.formTitle = 'Skill Matrix Details';

            this.isEditMode = false;
            this.isViewMode = true;

        }
        else {

            this.formTitle = 'Create Skill Matrix Decision';

            this.isEditMode = false;
            this.isViewMode = false;
        }

        // =========================
        // INIT FORM
        // =========================

        this.initForm();

        // =========================
        // EXISTING HEADER DEFAULTS
        // =========================

        this.nablHeaderService
            .getFormDefaults('SkillMatrixDecision')
            .subscribe({
                next: (defaults) => {

                    this.matrixForm.patchValue({
                        formatNo: defaults.formCode
                    });

                },
                error: () => { }
            });

        // =========================
        // EDIT
        // =========================

        if (this.isEditMode) {

            this.route.paramMap.subscribe(params => {

                this.recordId = Number(params.get('id'));

                if (this.recordId > 0) {
                    this.loadData();
                }

            });

            return;
        }

        // =========================
        // VIEW
        // =========================

        if (this.isViewMode) {

            this.route.paramMap.subscribe(params => {

                this.recordId = Number(params.get('id'));

                if (this.recordId > 0) {
                    this.loadData();
                }

            });

            return;
        }

        // =========================
        // CREATE
        // =========================

        if (state?.employeeId) {

            this.loadEmployeeFromList(state.employeeId);
        }
    }
    initForm() {
        this.matrixForm = this.fb.group({
            id: [0],
            formatNo: ['F-6A'],
            designationId: ['', Validators.required],
            designationName: ['', Validators.required],
            issueNo: ['00'],
            date: [this.today, Validators.required],
            revNo: ['01'],
            averageRequiredSkillLevel: [''],
            averageRequiredSkill: [''],
            employeeSkills: this.fb.array([]),
            employeeName: [''],
            employeeId: ["", Validators.required],
            preparedBy: [''],
            reviewedBy: [null],
            approvedBy: [null],
            reviewedDate: [''],
            approvedDate: [''],
            preparedDate: [this.today],
        });

        // System-managed fields — always readonly
        this.matrixForm.get('issueNo')?.disable();
        this.matrixForm.get('revNo')?.disable();
        this.matrixForm.get('formatNo')?.disable();
        this.matrixForm.get('designationName')?.disable();
        this.matrixForm.get('date')?.disable();
    }


    get employeeSkills(): FormArray {
        return this.matrixForm.get('employeeSkills') as FormArray;
    }





    loadData(): void {
        this.skillMatrixService.getById(this.recordId).subscribe({
            next: (data) => {
                if (data) {
                    this.matrixForm.patchValue(data);
                    this.matrixForm.patchValue({
                        date: NablFormsHelper.formatDateForInput(data.date),
                    });

                    this.employeeSkills.clear();
                    data.employeeSkills.forEach((skill: any) => {
                        this.employeeSkills.push(this.fb.group({
                            skillName: [{ value: skill.skillName, disabled: true }],
                            skillLevel: [{ value: skill.skillLevel, disabled: true }],
                            level: skill.level,
                            required: [{ value: skill.required, disabled: true }],
                        }));

                    });
                    if (this.isViewMode) {
                        this.matrixForm.disable();
                    }
                }
            },
            error: (error) => {
                console.error('Error fetching matrix:', error);
                this.toastService.show('Error loading skill matrix', 'error');
                this.router.navigate(['/skill-matrix']);
            }
        });
    }

    getEmployees = (term: string, page: number, pageSize: number): Observable<any[]> => {
        return this.skillMatrixService.getEmployeeSkillMatrixDropdown(term, page, pageSize, this.recordId > 0 ? this.recordId : null);
    };
    averageRequiredSkill: number = 0;
    averageRequiredSkillLevel: string = '';
    onEmployeeSelected(item: any): void {

        // Employee deselect / null
        if (!item || !item.id) {

            this.matrixForm.patchValue({
                employeeId: null,
                employeeName: null,
                designationId: null,
                designationName: null
            });

            this.employeeSkills.clear();

            this.averageRequiredSkill = 0;
            this.averageRequiredSkillLevel = '';

            return;
        }

        // Selected employee
        this.matrixForm.patchValue({
            employeeId: item.id,
            employeeName: item.name
        });

        const employeeId = item.id;

        this.skillMatrixService.getByDesignationId(employeeId).subscribe({

            next: (data: any) => {

                // Clear previous employee skills
                this.employeeSkills.clear();

                // No skill data found
                if (!data || !data.skills || data.skills.length === 0) {

                    this.matrixForm.patchValue({
                        designationId: null,
                        designationName: null
                    });

                    this.averageRequiredSkill = 0;
                    this.averageRequiredSkillLevel = '';

                    return;
                }

                // Set designation data
                this.matrixForm.patchValue({
                    designationId: data.designationId,
                    designationName: data.designationName
                });

                // Load skills
                data.skills.forEach((skill: any) => {

                    const isRequired = skill.required === true;

                    const skillGroup = this.fb.group({

                        // Read-only skill name
                        skillName: [
                            {
                                value: skill.skillName || '',
                                disabled: true
                            }
                        ],

                        // Read-only required skill level
                        skillLevel: [
                            {
                                value: skill.leveltype || '',
                                disabled: true
                            }
                        ],

                        // Read-only required status
                        required: [
                            {
                                value: isRequired,
                                disabled: true
                            }
                        ],

                        // Editable employee's actual level
                        // Mandatory only if Required = true
                        level: [
                            null,
                            isRequired ? [Validators.required] : []
                        ]
                    });

                    // Recalculate average whenever level changes
                    skillGroup.get('level')?.valueChanges.subscribe(() => {
                        this.calculateAverageRequiredSkill();
                    });

                    this.employeeSkills.push(skillGroup);
                });

                // Initial average calculation
                this.calculateAverageRequiredSkill();
            },

            error: (error: any) => {

                console.error('Failed to load employee skills:', error);

                this.employeeSkills.clear();

                this.matrixForm.patchValue({
                    designationId: null,
                    designationName: null
                });

                this.averageRequiredSkill = 0;
                this.averageRequiredSkillLevel = '';

                this.toastService.show(
                    error?.error?.message || 'Failed to load employee skills',
                    'error'
                );
            }
        });
    }

    calculateAverageRequiredSkill(): void {

        const levelMap: { [key: string]: number } = {
            'Level 1 - Beginner': 1,
            'Level 2 - Trained': 2,
            'Level 3 - Competent': 3,
            'Level 4 - Expert': 4
        };

        // Sirf Required = true wale skills
        const requiredSkills = this.employeeSkills.controls.filter(skill =>
            skill.get('required')?.value === true
        );

        // Required skills nahi hain
        if (requiredSkills.length === 0) {

            this.matrixForm.patchValue({
                averageRequiredSkill: null,
                averageRequiredSkillLevel: null
            });

            return;
        }

        // Required skills ke selected levels
        const selectedLevels = requiredSkills
            .map(skill => {

                const level = skill.get('level')?.value;

                return levelMap[level] || 0;
            })
            .filter(value => value > 0);

        // Abhi koi level select nahi hua
        if (selectedLevels.length === 0) {

            this.matrixForm.patchValue({
                averageRequiredSkill: null,
                averageRequiredSkillLevel: null
            });

            return;
        }

        // Total
        const total = selectedLevels.reduce(
            (sum, value) => sum + value,
            0
        );

        // Average calculate
        const average = total / selectedLevels.length;

        // Final Result Level
        let resultLevel = '';

        if (average < 1.5) {

            resultLevel = 'Level 1 - Beginner';

        } else if (average < 2.5) {

            resultLevel = 'Level 2 - Trained';

        } else if (average < 3.5) {

            resultLevel = 'Level 3 - Competent';

        } else {

            resultLevel = 'Level 4 - Expert';
        }

        // Form fields me value set karo
        this.matrixForm.patchValue({
            averageRequiredSkill: Number(average.toFixed(2)),
            averageRequiredSkillLevel: resultLevel
        });
    }
    toggleSection(section: string): void {
        this.openSections[section] = !this.openSections[section];
    }
    private loadEmployeeFromList(employeeId: number): void {

        this.employeeService
            .getEmployeeById(employeeId)
            .subscribe({

                next: (employee: any) => {

                    if (!employee) {
                        return;
                    }
                    const item = {
                        id: employee.id,
                        name: employee.name
                    };
                    // Set selected employee
                    this.onEmployeeSelected(item);
                },

                error: (error: any) => {

                    console.error(
                        'Failed to load employee:',
                        error
                    );

                    this.toastService.show(
                        error?.error?.message ||
                        'Failed to load employee',
                        'error'
                    );
                }
            });
    }

    onSubmit(): void {
        if (this.matrixForm.invalid) {
            this.matrixForm.markAllAsTouched();
            return;
        }

        const formData = this.matrixForm.getRawValue();
        formData.preparedDate = this.today;
        formData.approvedDate = formData.approvedBy ? this.today : null;
        formData.reviewedDate = formData.reviewedBy ? this.today : null;

        if (this.isEditMode) {
            formData.id = this.recordId;
            this.skillMatrixService.update(formData).subscribe({
                next: (response) => {
                    this.saved = true;
                    this.toastService.show('Skill matrix updated successfully', 'success');
                    this.router.navigate(['/skill-matrix']);
                },
                error: (error: any) => {
                    this.toastService.show('Error updating skill matrix', 'error');
                }
            });
        } else {
            this.skillMatrixService.create(formData).subscribe({
                next: (response) => {
                    this.saved = true;
                    this.toastService.show('Skill matrix created successfully', 'success');
                    this.router.navigate(['/skill-matrix']);
                },
                error: (error: any) => {
                    this.toastService.show('Error creating skill matrix', 'error');
                }
            });
        }

    }

    goBack(): void {
        this.router.navigate(['/skill-matrix']);
    }

    canDeactivate(): Observable<boolean> | boolean {
        if (!this.matrixForm.dirty || this.saved) return true;
        return this.unsavedChangesService.confirm();
    }

    @HostListener('window:beforeunload', ['$event'])
    onBeforeUnload(event: BeforeUnloadEvent) {
        if (this.matrixForm?.dirty && !this.saved) {
            event.preventDefault();
            event.returnValue = '';
        }
    }
}
