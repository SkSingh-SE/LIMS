import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
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

@Component({
    selector: 'app-skill-matrix-form',

    imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule, SearchableDropdownComponent],
    templateUrl: './skill-matrix-form.component.html',
    styleUrl: './skill-matrix-form.component.css'
})
export class SkillMatrixFormComponent implements OnInit {
    matrixForm!: FormGroup;
    matrixId: number = 0;
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

    constructor(
        private fb: FormBuilder,
        private skillMatrixService: SkillMatrixService,
        private designationService: DesignationService,
        private employeeService: EmployeeService,
        private router: Router,
        private route: ActivatedRoute,
        private toastService: ToastService
    ) { }

    ngOnInit(): void {
        this.initForm();
        this.loadDesignations();

        this.route.paramMap.subscribe(params => {
            this.matrixId = Number(params.get('id'));
            if (this.matrixId > 0) {
                this.loadData();
            }
        });

        const state = history.state as { mode?: string };
        const url = this.router.url;

        if (state && state.mode === 'view') {
            this.formTitle = 'Skill Matrix Details';
            this.isViewMode = true;
            this.matrixForm.disable();
        } else if (url.includes('/skill-matrix/details/')) {
            this.formTitle = 'Skill Matrix Details';
            this.isViewMode = true;
            this.matrixForm.disable();
        } else if (state && state.mode === 'edit') {
            this.formTitle = 'Edit Skill Matrix';
            this.isEditMode = true;
            this.isViewMode = false;
        } else if (url.includes('/skill-matrix/edit/')) {
            this.formTitle = 'Edit Skill Matrix';
            this.isEditMode = true;
            this.isViewMode = false;
        } else {
            this.formTitle = 'Create Skill Matrix';
            this.isEditMode = false;
            this.isViewMode = false;
        }
    }

    loadDesignations() {
        this.designationService.getDesignationDropdown('', 1, 100).subscribe(res => {
            this.designations = res?.items || [];
        });
    }

    getDesignations = (term: string, page: number, pageSize: number): Observable<any[]> => {
        return this.designationService.getDesignationDropdown(term, page, pageSize) as Observable<any[]>;
    };

    onDesignationSelected(item: any): void {
        this.matrixForm.patchValue({
            designationId: item.id,
            designationName: item.name,
            title: item.name
        });
        // Auto-load employees
        this.employeeService.getAllEmployees({ designationId: item.id }).subscribe(resp => {
            const emps = resp?.items || [];
            this.employeeSkills.clear();
            emps.forEach((e: any) => {
                this.addEmployeeSkill({
                    employeeId: e.id,
                    employeeName: e.name,
                    designationName: e.designationName,
                    skills: {}
                });
            });
        });
    }

    toggleSection(section: string): void {
        this.openSections[section] = !this.openSections[section];
    }

    initForm() {
        this.matrixForm = this.fb.group({
            id: [0],
            formatNo: ['F-6', Validators.required],
            designationId: [null, Validators.required],
            designationName: [''],
            issueNo: ['', Validators.required],
            date: ['', Validators.required],
            revNo: ['', Validators.required],
            title: ['', Validators.required],
            decision: [''],
            skills: this.fb.array([], Validators.required),
            employeeSkills: this.fb.array([]),
            preparedBy: [''],
            issuedBy: [''],
            reviewedApprovedBy: ['']
        });
    }

    get skills(): FormArray {
        return this.matrixForm.get('skills') as FormArray;
    }

    get employeeSkills(): FormArray {
        return this.matrixForm.get('employeeSkills') as FormArray;
    }

    get employeeSkillsGroups(): FormGroup[] {
        return this.employeeSkills.controls as FormGroup[];
    }

    addSkill(name: string = '') {
        this.skills.push(this.fb.control(name, Validators.required));
    }

    addEmployeeSkill(emp: EmployeeSkill) {
        const group = this.fb.group({
            employeeId: [emp.employeeId],
            employeeName: [emp.employeeName],
            designationName: [emp.designationName],
            skills: [emp.skills]
        });
        this.employeeSkills.push(group);
    }

    loadData(): void {
        this.skillMatrixService.getById(this.matrixId).subscribe({
            next: (data) => {
                if (data) {
                    this.matrixForm.patchValue(data);
                    this.skills.clear();
                    data.skills.forEach(s => this.addSkill(s));
                    this.employeeSkills.clear();
                    data.employeeSkills.forEach(e => this.addEmployeeSkill(e));
                }
            },
            error: (error) => {
                console.error('Error fetching matrix:', error);
                this.toastService.show('Error loading skill matrix', 'error');
                this.router.navigate(['/skill-matrix']);
            }
        });
    }

    onSubmit(): void {
        if (this.matrixForm.valid) {
            const formData = this.matrixForm.getRawValue();
            formData.skills = this.skills.value;
            formData.employeeSkills = this.employeeSkills.value;

            if (this.isEditMode) {
                formData.id = this.matrixId;
                this.skillMatrixService.update(formData).subscribe({
                    next: (response) => {
                        this.toastService.show('Skill matrix updated successfully', 'success');
                        this.router.navigate(['/skill-matrix/preview', this.matrixId]);
                    },
                    error: (error) => {
                        this.toastService.show('Error updating skill matrix', 'error');
                    }
                });
            } else {
                this.skillMatrixService.create(formData).subscribe({
                    next: (response) => {
                        this.toastService.show('Skill matrix created successfully', 'success');
                        this.router.navigate(['/skill-matrix/preview', response.id]);
                    },
                    error: (error) => {
                        this.toastService.show('Error creating skill matrix', 'error');
                    }
                });
            }
        }
    }

    goBack(): void {
        this.router.navigate(['/skill-matrix']);
    }
}
