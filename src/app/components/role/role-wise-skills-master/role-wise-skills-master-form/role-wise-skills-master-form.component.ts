import { CommonModule } from '@angular/common';
import { Component, OnInit, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, FormArray, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ToastService } from '../../../../services/toast.service';
import { RoleWiseSkillsMasterService } from '../../../../services/role-wise-skills-master.service';
import { environment } from '../../../../../environments/environment';
import { Observable } from 'rxjs';
import { CanComponentDeactivate } from '../../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../../services/unsaved-changes.service';
import { DepartmentService } from '../../../../services/department.service';
import { SearchableDropdownComponent } from '../../../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { NablFormsHelper } from '../../../../utility/nabl-helpers/nabl-forms.helper';
import { SkillMatrixService } from "../../../../services/skill-matrix.service";
@Component({
    selector: 'app-role-wise-skills-master-form',
    imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, SearchableDropdownComponent],
    templateUrl: './role-wise-skills-master-form.component.html',
    styleUrl: './role-wise-skills-master-form.component.css'
})
export class RoleWiseSkillsMasterFormComponent implements CanComponentDeactivate, OnInit {
    saved = false;
    isSubmitting = false;
    roleWiseSkillsMasterForm!: FormGroup;
    isViewMode: boolean = false;
    isEditMode: boolean = false;
    roleWiseSkillsMasterId: number = 0;
    today: string = new Date().toISOString().split('T')[0];
    constructor(private fb: FormBuilder, private toastService: ToastService, private roleWiseSkillsMasterService: RoleWiseSkillsMasterService,
        private route: ActivatedRoute, private router: Router,
        private unsavedChangesService: UnsavedChangesService,
        private departmentService: DepartmentService,
        private skillMatrixService: SkillMatrixService
    ) { }

    leveltypes = [
        'Level 1 - Beginner',
        'Level 2 - Trained',
        'Level 3 - Competent',
        'Level 4 - Expert'
    ]

    ngOnInit(): void {
        this.route.paramMap.subscribe(params => {
            this.roleWiseSkillsMasterId = Number(params.get('id'));
        });
        const state = history.state as { mode?: string };

        if (state) {
            if (state.mode === 'view') {
                this.isViewMode = true;
            }
            if (state.mode === 'edit') {
                this.isEditMode = true;
            }
        }
        this.initForm();
        if (this.roleWiseSkillsMasterId > 0) {
            this.loadRoleWiseSkillsMaster(this.roleWiseSkillsMasterId);
        }
        if (this.roleWiseSkillsMasterId == 0) {
            this.addSkills();
            this.roleWiseSkillsMasterService.getNextRoleWiseSkillNo().subscribe({
                next: (data) => {
                    this.roleWiseSkillsMasterForm.patchValue({ roleWiseSkillNo: data.roleWiseSkillNo });
                }
            });
        }
    }
    initForm() {
        this.roleWiseSkillsMasterForm = this.fb.group({
            id: [0],
            roleWiseSkillNo: [null, Validators.required],
            // departmentName: [null],
            // departmentId: ['', Validators.required],
            designationName: [null],
            skills: this.fb.array([], Validators.required),
            designationId: ['', Validators.required],
            date: [this.today, Validators.required],
            remarks: [null]
        });
        this.roleWiseSkillsMasterForm.get('roleWiseSkillNo')?.disable();
        this.roleWiseSkillsMasterForm.get('date')?.disable();
    }
    get skills(): FormArray {
        return this.roleWiseSkillsMasterForm.get('skills') as FormArray;
    }
    loadRoleWiseSkillsMaster(id: number) {
        this.roleWiseSkillsMasterService.getRoleWiseSkillsMasterById(id).subscribe(
            (data) => {

                if (data) {
                    this.roleWiseSkillsMasterForm.patchValue(data);
                    this.roleWiseSkillsMasterForm.patchValue({
                        date: NablFormsHelper.formatDateForInput(data.date)
                    });
                    data.skills.forEach((skill: any) => {
                        this.skills.push(this.fb.group({
                            skillName: skill.skillName,
                            leveltype: skill.leveltype, required: skill.required

                        }));
                    });
                    if (this.isViewMode) {
                        this.roleWiseSkillsMasterForm.disable();
                    }
                }
            }

        );
    }
    addSkills() {
        const skills = this.fb.group({
            skillName: ['', Validators.required],
            leveltype: [null, Validators.required],
            required: [false, Validators.required]
        });
        this.skills.push(skills);
    }

    removeSkill(index: number) {
        if (this.skills.length > 1) {
            this.skills.removeAt(index);
        }
    }
    getDesignations = (term: string, page: number, pageSize: number): Observable<any[]> => {
        return this.skillMatrixService.getDesignationDropdown(term, page, pageSize, this.isEditMode ? this.roleWiseSkillsMasterId : null);
    }
    onDesignationSelected(item: any) {
        if (!item) { this.roleWiseSkillsMasterForm.patchValue({ requestById: null }); return; }
        this.roleWiseSkillsMasterForm.patchValue({ designationId: item.id, designationName: item.name });
    }
    onCancel(): void {
        this.router.navigate(['/role-wise-skills-master']);
    }
    onSubmit(): void {

        if (this.roleWiseSkillsMasterForm.invalid) {
            this.roleWiseSkillsMasterForm.markAllAsTouched();
            return;
        }

        const rawData = this.roleWiseSkillsMasterForm.getRawValue();

        const formData = {
            ...rawData,

            skills: (rawData.skills || []).map((skill: any) => ({
                skillName: skill.skillName,
                leveltype: skill.leveltype,
                required: skill.required
            }))
        };


        if (this.isEditMode) {

            this.roleWiseSkillsMasterService
                .update(this.roleWiseSkillsMasterId, formData)
                .subscribe({
                    next: () => {
                        this.saved = true;

                        this.toastService.show(
                            'Role-wise Skills Master updated successfully',
                            'success'
                        );
                        this.router.navigate(['/role-wise-skills-master']);
                    },
                    error: (error: any) => {
                        console.error(
                            'Error updating role-wise skills master:',
                            error
                        );

                        this.toastService.show(
                            error?.error?.message ||
                            'Failed to update Role-wise Skills Master',
                            'error'
                        );

                    }
                });

        } else {

            this.roleWiseSkillsMasterService
                .create(formData)
                .subscribe({
                    next: () => {
                        this.saved = true;

                        this.toastService.show(
                            'Role-wise Skills Master created successfully',
                            'success'
                        );
                        this.router.navigate(['/role-wise-skills-master']);
                    },
                    error: (error: any) => {
                        console.error(
                            'Error creating role-wise skills master:',
                            error
                        );

                        this.toastService.show(
                            error?.error?.message ||
                            'Failed to create Role-wise Skills Master',
                            'error'
                        );
                    }
                });
        }
    }
    canDeactivate(): Observable<boolean> | boolean {
        if (!this.roleWiseSkillsMasterForm.dirty || this.saved) return true;
        return this.unsavedChangesService.confirm();
    }

    @HostListener('window:beforeunload', ['$event'])
    onBeforeUnload(event: BeforeUnloadEvent) {
        if (this.roleWiseSkillsMasterForm?.dirty && !this.saved) {
            event.preventDefault();
            event.returnValue = '';
        }
    }
}
