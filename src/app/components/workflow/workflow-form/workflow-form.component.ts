import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { RoleService } from '../../../services/role.service';
import { EmployeeService } from '../../../services/employee.service';
import { UserService } from '../../../services/user.service';
import { MultiSelectDropdownComponent } from '../../../utility/components/multi-select-dropdown/multi-select-dropdown.component';
import { ConfigService } from '../../../services/config.service';
import { WorkflowService } from '../../../services/workflow.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-workflow-form',
  imports: [CommonModule, ReactiveFormsModule, MultiSelectDropdownComponent],
  templateUrl: './workflow-form.component.html',
  styleUrl: './workflow-form.component.css'
})
export class WorkflowFormComponent implements OnInit {
  workflowForm: FormGroup;
  isViewMode = false;
  isEditMode = false;
  workflowId: number = 0;
  selectedUsers: any[][] = [];

  // Add mock data for dropdowns
  entityTypes = ['Sample', 'Plan', 'Report'];
  users = ['Lab Technician', 'Receptionist', 'Manager'];
  roles = ['Receptionist', 'Quality Manager', 'Lab Supervisor'];
  permissions = ['Approve Sample', 'View Report', 'Edit Plan'];
  actionTypes = ['Next', 'Back', 'Cancel'];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private roleService: RoleService,
    private employeeService: EmployeeService,
    private userService: UserService,
    private configService: ConfigService,
    private workflowService: WorkflowService,
    private route: ActivatedRoute,
    private toast: ToastService
  ) {
    this.workflowForm = this.fb.group({
      id: [0],
      name: ['', Validators.required],
      entityType: ['', Validators.required],
      steps: this.fb.array([], [Validators.required, this.duplicateStepNameValidator]),
    });
  }

  // Custom validator for duplicate step names
  duplicateStepNameValidator(formArray: AbstractControl): ValidationErrors | null {
    const names = (formArray as FormArray).controls.map(ctrl => ctrl.get('name')?.value?.trim().toLowerCase() || '');
    const nameSet = new Set();
    for (const name of names) {
      if (name && nameSet.has(name)) {
        return { duplicateStepName: true };
      }
      nameSet.add(name);
    }
    return null;
  }

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      this.workflowId = Number(params.get('id'));
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

    if (this.workflowId > 0) {
      this.loadWorkflow(this.workflowId);
    }
    this.getEntityTypes();
    // // Example payload
    // const payload = {
    //   name: "Sample Testing Workflow",
    //   entityType: "Sample",
    //   isActive: true,
    //   steps: [
    //     {
    //       id: 1,
    //       name: "Sample Inward",
    //       assignedToType: "Role",
    //       selectedIDs: "Receptionist",
    //       transitions: [
    //         { action: "Next", alias: "Forward to Lab", toStepID: 2 },
    //         { action: "Cancel", alias: "Reject Sample", toStepID: null }
    //       ]
    //     },
    //     {
    //       id: 2,
    //       name: "Lab Testing",
    //       assignedToType: "User",
    //       selectedIDs: "Lab Technician",
    //       transitions: [
    //         { action: "Next", alias: "Send for Review", toStepID: 3 },
    //         { action: "Back", alias: "Send Back to Reception", toStepID: 1 }
    //       ]
    //     },
    //     {
    //       id: 3,
    //       name: "Report Review",
    //       assignedToType: "Role",
    //       selectedIDs: "Quality Manager",
    //       transitions: [
    //         { action: "Next", alias: "Approve Report", toStepID: null },
    //         { action: "Back", alias: "Request Re-test", toStepID: 2 }
    //       ]
    //     }
    //   ]
    // };

    // // Patch form with new structure
    // this.workflowForm.patchValue({
    //   name: payload.name,
    //   entityType: payload.entityType,
    //   isActive: payload.isActive
    // });

    // // Clear steps FormArray
    // this.steps.clear();

    // // Add steps from payload
    // payload.steps.forEach(step => {
    //   const transitionsArray = this.fb.array(
    //     step.transitions.map(tr =>
    //       this.fb.group({
    //         action: [tr.action, Validators.required],
    //         alias: [tr.alias, Validators.required],
    //         toStepID: [tr.toStepID]
    //       })
    //     ),
    //     Validators.required
    //   );

    //   this.steps.push(this.fb.group({
    //     id: [step.id],
    //     name: [step.name, Validators.required],
    //     assignedToType: [step.assignedToType, Validators.required],
    //     selectedIDs: [step.selectedIDs, Validators.required],
    //     transitions: transitionsArray
    //   }));
    // });
  }

  get steps(): FormArray {
    return this.workflowForm.get('steps') as FormArray;
  }

  addStep() {
    this.steps.push(this.fb.group({
      id: [0],
      workflowID: [0],
      orderNo: [this.steps.length + 1],
      name: ['', Validators.required],
      assignedToType: ['User', Validators.required],
      assignedToValue: ['', Validators.required],
      selectedIDs: ['', Validators.required],
      transitions: this.fb.array([], Validators.required)
    }));
  }

  removeStep() {
    this.steps.removeAt(this.steps.length - 1);
  }

  getTransitions(stepIndex: number): FormArray {
    return (this.steps.at(stepIndex).get('transitions') as FormArray);
  }

  addTransition(stepIndex: number) {
    const hasTransitions = this.getTransitions(stepIndex).length > 0;
    this.getTransitions(stepIndex).push(this.fb.group({
      id: [0],
      action: [hasTransitions ? 'Cancel' : 'Next', Validators.required],
      alias: ['', Validators.required],
      toStepID: [null],
      toStepName: [null]
    }));
  }

  removeTransition(stepIndex: number, transitionIndex: number) {
    this.getTransitions(stepIndex).removeAt(transitionIndex);
  }

  submit() {
    if (this.workflowForm.valid) {
      console.log('Workflow Definition:', this.workflowForm.value);
      // TODO: call API
      if (this.workflowId > 0 && this.isEditMode) {
        this.workflowService.updateWorkflow(this.workflowForm.value).subscribe({
          next: (res) => {
            this.toast.show(res.message,'success');
            this.router.navigate(['/workflow']);
          },
          error: (err) => {
             this.toast.show(err.message,'error');
            console.error('Error updating workflow:', err);
          }
        });
      } else {
        this.workflowService.createWorkflow(this.workflowForm.value).subscribe({
          next: (res) => {
            this.toast.show(res.message,'success');
            this.router.navigate(['/workflow']);
          },
          error: (err) => {
            this.toast.show(err.message,'error');
            console.error('Error saving workflow:', err);
          }
        });
      }
    }
  }
  onCancel(): void {
    this.workflowForm.reset();
    this.router.navigate(['/workflow']);
  }

  getEntityTypes = (): any => {
    this.configService.getConfigurationValueBykey('Entity Type').subscribe({
      next: (res) => {
        if (res) {
          this.entityTypes = res;
        }
      },
      error: (err) => {
        console.error('Error fetching entity types:', err);
      }
    });
  }
  getUserDropdown = (searchTerm: string, pageNumber: number, pageSize: number) => {
    return this.employeeService.getEmployeeDropdown(searchTerm, pageNumber, pageSize);
  }
  getRoleDropdown = (searchTerm: string, pageNumber: number, pageSize: number) => {
    return this.roleService.getRoleDropdown(searchTerm, pageNumber, pageSize);
  }

  onUserSelect(item: any, stepIndex: number) {
    this.selectedUsers[stepIndex] = item;
    const selectedIds = item ? item.map((i: any) => i.id) : [];
    const assignedToValue = selectedIds.join(',');
    this.steps.at(stepIndex).get('assignedToValue')?.setValue(assignedToValue);
    this.steps.at(stepIndex).get('selectedIDs')?.setValue(selectedIds);
  }
  onRoleSelect(item: any, stepIndex: number) {

    const selectedIds = item ? item.map((i: any) => i.id) : [];
    this.steps.at(stepIndex).get('selectedIDs')?.setValue(selectedIds);
  }
  loadWorkflow = (id: number): any => {
    this.workflowService.getWorkflowById(id).subscribe({
      next: (res) => {
        if (res) {
          this.workflowForm.patchValue({
            id: res.id,
            name: res.name,
            entityType: res.entityType,
          });
          // Clear steps FormArray
          this.steps.clear();
          // Add steps from response
          res.steps.forEach((step: any) => {
            const transitionsArray = this.fb.array(
              step.transitions.map((tr: any) =>
                this.fb.group({
                  id: [tr.id],
                  action: [tr.action, Validators.required],
                  alias: [tr.alias, Validators.required],
                  toStepID: [tr.toStepID],
                  toStepName: [tr.toStepName]
                })
              ),
              Validators.required
            );
            const selectedIds = step.assignedToValue ? step.assignedToValue.split(',').map((i: any) => +i) : [];
            this.steps.push(this.fb.group({
              id: [step.id],
              workflowID: [step.workflowID],
              orderNo: [step.orderNo],
              name: [step.name, Validators.required],
              assignedToType: [step.assignedToType, Validators.required],
              assignedToValue: [step.assignedToValue, Validators.required],
              selectedIDs: [selectedIds, Validators.required],
              transitions: transitionsArray
            }));

          });
        }
        if (this.isEditMode) {
          this.workflowForm.enable();
        }
        if (this.isViewMode) {
          this.workflowForm.disable();
        }
      },
      error: (err) => {
        console.error('Error fetching workflow details:', err);
      }
    });
  }
}