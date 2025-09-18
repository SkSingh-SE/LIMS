import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { RoleService } from '../../../services/role.service';
import { EmployeeService } from '../../../services/employee.service';
import { UserService } from '../../../services/user.service';
import { MultiSelectDropdownComponent } from '../../../utility/components/multi-select-dropdown/multi-select-dropdown.component';
import { ConfigService } from '../../../services/config.service';

@Component({
  selector: 'app-workflow-form',
  imports: [CommonModule, ReactiveFormsModule, MultiSelectDropdownComponent],
  templateUrl: './workflow-form.component.html',
  styleUrl: './workflow-form.component.css'
})
export class WorkflowFormComponent implements OnInit {
  workflowForm: FormGroup;
  isViewMode = false;
  selectedUsers: any[][] = [];

  // Add mock data for dropdowns
  entityTypes = ['Sample', 'Plan', 'Report'];
  users = ['Lab Technician', 'Receptionist', 'Manager'];
  roles = ['Receptionist', 'Quality Manager', 'Lab Supervisor'];
  permissions = ['Approve Sample', 'View Report', 'Edit Plan'];
  actionTypes = ['Next', 'Back', 'Cancel'];

  constructor(private fb: FormBuilder, private router: Router, private roleService: RoleService, private employeeService: EmployeeService, private userService: UserService, private configService: ConfigService) {
    this.workflowForm = this.fb.group({
      id: [0],
      name: ['', Validators.required],
      entityType: ['', Validators.required],
      steps: this.fb.array([], Validators.required),
    });
  }



  ngOnInit() {
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

  removeStep(index: number) {
    this.steps.removeAt(index);
  }

  getTransitions(stepIndex: number): FormArray {
    return (this.steps.at(stepIndex).get('transitions') as FormArray);
  }

  addTransition(stepIndex: number) {
    const hasTransitions = this.getTransitions(stepIndex).length > 0;
    this.getTransitions(stepIndex).push(this.fb.group({
      action: [hasTransitions ? 'Cancel' : 'Next', Validators.required],
      alias: ['', Validators.required],
      toStepID: [null]
    }));
  }

  removeTransition(stepIndex: number, transitionIndex: number) {
    this.getTransitions(stepIndex).removeAt(transitionIndex);
  }

  submit() {
    if (this.workflowForm.valid) {
      console.log('Workflow Definition:', this.workflowForm.value);
      // TODO: call API
    }
  }
  onCancel(): void {
    this.workflowForm.reset();
    this.router.navigate(['/sample/plan/inward']);
  }

  getEntityTypes = (): any => {
    this.configService.getConfigurationValueBykey('Entity Type').subscribe({
      next: (res) => {
        if (res ) {
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
}