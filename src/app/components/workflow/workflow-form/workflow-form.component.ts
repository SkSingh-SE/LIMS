import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { noWhitespaceValidator } from '../../../utility/validators/custom-validators';
import { FormValidationHelper } from '../../../utility/helper/form-validation.helper';
import { FormFieldErrorComponent } from '../../../utility/components/form-field-error/form-field-error.component';
import { Observable } from 'rxjs';
import { RoleService } from '../../../services/role.service';
import { EmployeeService } from '../../../services/employee.service';
import { UserService } from '../../../services/user.service';
import { MultiSelectDropdownComponent } from '../../../utility/components/multi-select-dropdown/multi-select-dropdown.component';
import { ConfigService } from '../../../services/config.service';
import { WorkflowService } from '../../../services/workflow.service';
import { ToastService } from '../../../services/toast.service';
import { CanComponentDeactivate } from '../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../services/unsaved-changes.service';

@Component({
  selector: 'app-workflow-form',
  imports: [CommonModule, ReactiveFormsModule, MultiSelectDropdownComponent, FormFieldErrorComponent],
  templateUrl: './workflow-form.component.html',
  styleUrl: './workflow-form.component.css'
})
export class WorkflowFormComponent implements OnInit, CanComponentDeactivate {
  saved = false;
  submitted = false;
  workflowForm!: FormGroup;
  isViewMode = false;
  isEditMode = false;
  workflowId: number = 0;
  selectedUsers: any[][] = [];

  // Add mock data for dropdowns
  entityTypes = ['Request Review', 'Test Result Verification', 'Report Review', 'Report Amendment'];
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
    private toast: ToastService,
    private unsavedChangesService: UnsavedChangesService
  ) {

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
    this.initform();
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
  }

  initform() {
    this.workflowForm = this.fb.group({
      id: [0],
      name: ['', [Validators.required, Validators.maxLength(200), noWhitespaceValidator()]],
      entityType: ['', Validators.required],
      steps: this.fb.array([], [Validators.required, this.duplicateStepNameValidator]),
    });
  }

  get steps(): FormArray {
    return this.workflowForm.get('steps') as FormArray;
  }

  addStep() {
    this.steps.push(this.fb.group({
      id: [0],
      workflowID: [0],
      orderNo: [this.steps.length + 1],
      name: ['', [Validators.required, Validators.maxLength(200), noWhitespaceValidator()]],
      assignedToType: ['User', Validators.required],
      assignedToValue: ['', Validators.required],
      selectedIDs: ['', Validators.required],
      transitions: this.fb.array([])
    }));
  }

  removeStep() {
    this.steps.removeAt(this.steps.length - 1);
  }

  getTransitions(stepIndex: number): FormArray<FormGroup> {
    return this.steps.at(stepIndex).get('transitions') as FormArray<FormGroup>;
  }

  addTransition(stepIndex: number) {
    const transitions = this.getTransitions(stepIndex);
    const hasTransitions = transitions.length > 0;

    const actionValue = hasTransitions ? 'Cancel' : 'Next';

    const group = this.fb.group({
      id: [0],
      action: [actionValue, Validators.required],
      alias: ['', Validators.required],
      toStepID: [null],
      toStepName: [actionValue === 'Cancel' ? 'End' : null]
    });

    // Auto-disable if Cancel
    if (actionValue === 'Cancel') {
      group.get('toStepName')?.disable({ emitEvent: false });
    }

    transitions.push(group);
  }


  removeTransition(stepIndex: number, transitionIndex: number) {
    this.getTransitions(stepIndex).removeAt(transitionIndex);
  }

  toStepValidation(trans: AbstractControl) {
    debugger;
    const action = trans.get('action')?.value;
    const toStepCtrl = trans.get('toStepName');

    if (!toStepCtrl) return;
    if (action === 'Cancel') {
      toStepCtrl.setValue('End');
      toStepCtrl.disable({ emitEvent: false });
    } else {
      toStepCtrl.enable({ emitEvent: false });
    }
  };

  isFieldInvalid(path: string): boolean {
    return FormValidationHelper.isFieldInvalid(this.workflowForm, path, this.submitted);
  }

  submit() {
    this.submitted = true;
    FormValidationHelper.markAllTouched(this.workflowForm);
    if (this.workflowForm.valid) {
      console.log('Workflow Definition:', this.workflowForm.value);
      // TODO: call API
      if (this.workflowId > 0 && this.isEditMode) {
        this.workflowService.updateWorkflow(this.workflowForm.value).subscribe({
          next: (res) => {
            this.saved = true;
            this.toast.show(res.message, 'success');
            this.router.navigate(['/workflow']);
          },
          error: (err) => {
            this.toast.show(err.message, 'error');
            console.error('Error updating workflow:', err);
          }
        });
      } else {
        this.workflowService.createWorkflow(this.workflowForm.value).subscribe({
          next: (res) => {
            this.saved = true;
            this.toast.show(res.message, 'success');
            this.router.navigate(['/workflow']);
          },
          error: (err) => {
            this.toast.show(err.message, 'error');
            console.error('Error saving workflow:', err);
          }
        });
      }
    } else {
      this.toast.show('Please fix validation errors before submitting.', 'warning');
    }
  }

  onCancel(): void {
    this.submitted = false;
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

          res.steps.forEach((step: any) => {

            const transitionsArray: FormArray<FormGroup> = this.fb.array<FormGroup>([]);

            step.transitions.forEach((tr: any) => {
              const isCancel = (tr.action || '').toLowerCase() === 'cancel';

              const group = this.fb.group({
                id: [tr.id],
                action: [tr.action, Validators.required],
                alias: [tr.alias, Validators.required],
                toStepID: [isCancel ? null : tr.toStepID],
                toStepName: [isCancel ? 'End' : tr.toStepName]
              }) as FormGroup;

              transitionsArray.push(group);

              if (isCancel) {
                group.get('toStepName')?.disable({ emitEvent: false });
              }
            });

            const selectedIds = step.assignedToValue
              ? step.assignedToValue.split(',').map((i: any) => +i)
              : [];

            this.steps.push(
              this.fb.group({
                id: [step.id],
                workflowID: [step.workflowID],
                orderNo: [step.orderNo],
                name: [step.name, [Validators.required, Validators.maxLength(200), noWhitespaceValidator()]],
                assignedToType: [step.assignedToType, Validators.required],
                assignedToValue: [step.assignedToValue, Validators.required],
                selectedIDs: [selectedIds, Validators.required],
                transitions: transitionsArray
              })
            );

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

  canDeactivate(): Observable<boolean> | boolean {
    if (!this.workflowForm.dirty || this.saved) return true;
    return this.unsavedChangesService.confirm();
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent) {
    if (this.workflowForm?.dirty && !this.saved) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
