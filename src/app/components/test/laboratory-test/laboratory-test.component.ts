import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { CanComponentDeactivate } from '../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../services/unsaved-changes.service';
import { LaboratoryTestService } from '../../../services/laboratory-test.service';
import { DisciplineService } from '../../../services/discipline.service';
import { DepartmentService } from '../../../services/department.service';
import { ParameterService } from '../../../services/parameter.service';
import { TestMethodSpecificationService } from '../../../services/test-method-specification.service';
import { ConditionMasterService } from '../../../services/condition-master.service';
import { ToastService } from '../../../services/toast.service';
import { SearchableDropdownComponent } from '../../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { FormFieldErrorComponent } from '../../../utility/components/form-field-error/form-field-error.component';
import { BreadcrumbComponent } from '../../../utility/components/breadcrumb/breadcrumb.component';
import { HasPermissionDirective } from '../../../utility/directives/has-permission.directive';
import {
  LaboratoryTestCreateDto,
  LaboratoryTestDetailDto,
  LaboratoryTestUpdateDto
} from '../../../models/laboratory-test.model';

@Component({
  selector: 'app-laboratory-test',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    SearchableDropdownComponent,
    FormFieldErrorComponent,
    BreadcrumbComponent,
    HasPermissionDirective
  ],
  templateUrl: './laboratory-test.component.html',
  styleUrl: './laboratory-test.component.css'
})
export class LaboratoryTestComponent implements OnInit, CanComponentDeactivate {
  form!: FormGroup;
  labTestId: number = 0;
  isViewMode: boolean = false;
  isEditMode: boolean = false;
  isSaved: boolean = false;
  activeTab: 'header' | 'parameters' | 'methods' | 'conditions' | 'audit' = 'header';

  // Selected dropdown representations
  selectedDiscipline: any = null;
  selectedDepartment: any = null;
  selectedParameters: any[] = [];
  selectedMethods: any[] = [];
  selectedConditions: any[] = [];

  // Audit information
  auditDetails: {
    createdOn?: string;
    createdBy?: number;
    createdByName?: string | null;
    modifiedOn?: string | null;
    modifiedBy?: number | null;
    modifiedByName?: string | null;
    equation?: string | null;
    companyCode?: string;
  } = {};

  // Dropdown fetch functions for SearchableDropdownComponent
  getDisciplineDropdown = (searchTerm: string, pageNo: number, pageSize: number) => {
    return this.disciplineService.getDisciplineDropdown(searchTerm, pageNo, pageSize);
  };

  getDepartmentDropdown = (searchTerm: string, pageNo: number, pageSize: number) => {
    return this.departmentService.getDepartmentDropdown(searchTerm, pageNo, pageSize);
  };

  getParameterDropdown = (searchTerm: string, pageNo: number, pageSize: number) => {
    return this.parameterService.getParameterDropdown(searchTerm, pageNo, pageSize);
  };

  getMethodDropdown = (searchTerm: string, pageNo: number, pageSize: number) => {
    return this.methodService.getTestMethodSpecificationDropdown(searchTerm, pageNo, pageSize);
  };

  getConditionDropdown = (searchTerm: string, pageNo: number, pageSize: number) => {
    return this.conditionService.getConditionMasterDropdown(searchTerm, pageNo, pageSize);
  };

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    public router: Router,
    private labService: LaboratoryTestService,
    private disciplineService: DisciplineService,
    private departmentService: DepartmentService,
    private parameterService: ParameterService,
    private methodService: TestMethodSpecificationService,
    private conditionService: ConditionMasterService,
    private toastService: ToastService,
    private unsavedChangesService: UnsavedChangesService
  ) {}

  get formTitle(): string {
    if (this.isViewMode) return 'View Universal Test Definition';
    if (this.isEditMode) return 'Edit Universal Test Definition';
    return 'Create Universal Test Definition';
  }

  get parameters(): FormArray {
    return this.form.get('parameters') as FormArray;
  }

  get methods(): FormArray {
    return this.form.get('methods') as FormArray;
  }

  get conditions(): FormArray {
    return this.form.get('conditions') as FormArray;
  }

  canDeactivate(): Observable<boolean> | boolean {
    if (!this.form?.dirty || this.isSaved) return true;
    return this.unsavedChangesService.confirm();
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.form?.dirty && !this.isSaved) {
      event.preventDefault();
      event.returnValue = '';
    }
  }

  ngOnInit(): void {
    this.initForm();
    this.resolveRouteMode();
  }

  initForm(): void {
    this.form = this.fb.group({
      id: [0],
      code: [
        '',
        [
          Validators.required,
          Validators.maxLength(50),
          Validators.pattern(/^[A-Z0-9_]+$/)
        ]
      ],
      name: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', [Validators.maxLength(500)]],
      disciplineID: [null],
      labDepartmentID: [null],
      testDuration: [null, [Validators.min(1), Validators.max(365)]],
      isActive: [false],
      parameters: this.fb.array([]),
      methods: this.fb.array([]),
      conditions: this.fb.array([])
    });
  }

  resolveRouteMode(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const state = history.state;

    if (idParam) {
      this.labTestId = Number(idParam);
      this.isViewMode = this.route.snapshot.url.some(s => s.path === 'details') || state?.mode === 'view';
      this.isEditMode = !this.isViewMode;
      if (this.isViewMode) {
        this.form.disable();
      }
      this.loadTestDetails(this.labTestId);
    } else {
      this.isEditMode = false;
      this.isViewMode = false;
    }
  }

  loadTestDetails(id: number): void {
    this.labService.getUniversalTestDetails(id).subscribe({
      next: (data: LaboratoryTestDetailDto) => {
        this.form.patchValue({
          id: data.id,
          code: data.code,
          name: data.name,
          description: data.description,
          disciplineID: data.disciplineID,
          labDepartmentID: data.labDepartmentID,
          testDuration: data.testDuration,
          isActive: data.isActive
        });

        if (this.isViewMode) {
          this.form.disable();
        }

        this.auditDetails = {
          createdOn: data.createdOn,
          createdBy: data.createdBy,
          createdByName: data.createdByName,
          modifiedOn: data.modifiedOn,
          modifiedBy: data.modifiedBy,
          modifiedByName: data.modifiedByName,
          equation: data.equation,
          companyCode: data.companyCode
        };

        // Populate selected discipline representation
        if (data.disciplineID && data.disciplineName) {
          this.selectedDiscipline = { id: data.disciplineID, name: data.disciplineName };
        }

        // Populate selected department representation
        if (data.labDepartmentID && data.departmentName) {
          this.selectedDepartment = { id: data.labDepartmentID, name: data.departmentName };
        }

        // Populate Parameters FormArray
        this.parameters.clear();
        this.selectedParameters = [];
        (data.parameters || []).forEach((p, idx) => {
          this.addParameterRow(p);
          this.selectedParameters[idx] = {
            id: p.parameterID,
            name: p.parameterName,
            code: p.parameterCode,
            unit: p.parameterUnit,
            inputType: p.inputType
          };
        });

        // Populate Methods FormArray
        this.methods.clear();
        this.selectedMethods = [];
        (data.methods || []).forEach((m, idx) => {
          this.addMethodRow(m);
          const methodTitle = m.displayTitle || m.methodName || m.methodCode || ('Method #' + m.testMethodSpecificationID);
          this.selectedMethods[idx] = {
            id: m.testMethodSpecificationID,
            name: methodTitle,
            label: methodTitle,
            code: m.methodCode,
            displayTitle: methodTitle,
            testMethodStandard: m.standardReference,
            technique: m.analysisTechniqueName
          };
        });

        // Populate Conditions FormArray
        this.conditions.clear();
        this.selectedConditions = [];
        (data.conditions || []).forEach((c, idx) => {
          this.addConditionRow(c);
          this.selectedConditions[idx] = {
            id: c.conditionMasterID,
            code: c.conditionCode,
            name: c.conditionName,
            category: c.category,
            valueType: c.valueType,
            unit: c.parameterUnit
          };
        });

        if (this.isViewMode) {
          this.form.disable();
        }
      },
      error: (err) => {
        this.toastService.show(
          err?.error?.message || 'Error loading Laboratory Test details.',
          'error'
        );
      }
    });
  }

  // ── FormArray Operations: Parameters ──

  addParameterRow(data?: any): void {
    const row = this.fb.group({
      id: [data?.id || 0],
      parameterID: [data?.parameterID || null, Validators.required],
      parameterCode: [data?.parameterCode || ''],
      parameterName: [data?.parameterName || ''],
      parameterUnit: [data?.parameterUnit || ''],
      inputType: [data?.inputType || ''],
      isMandatory: [data?.isMandatory ?? true],
      isReportable: [data?.isReportable ?? true],
      displayOrder: [data?.displayOrder || this.parameters.length + 1],
      isActive: [data?.isActive ?? true]
    });
    this.parameters.push(row);
  }

  removeParameterRow(index: number): void {
    this.parameters.removeAt(index);
    this.selectedParameters.splice(index, 1);
    this.reindexParameters();
  }

  reindexParameters(): void {
    this.parameters.controls.forEach((ctrl, idx) => {
      ctrl.patchValue({ displayOrder: idx + 1 });
    });
  }

  onParameterSelected(event: any, index: number): void {
    if (event) {
      const selectedId = event.id || event.ID;
      const alreadyExists = this.parameters.controls.some(
        (ctrl, idx) => idx !== index && ctrl.get('parameterID')?.value === selectedId
      );
      if (alreadyExists) {
        this.toastService.show(`Parameter '${event.name || event.Name || event.code}' is already added to this test.`, 'warning');
        const r = this.parameters.at(index);
        r.patchValue({
          parameterID: null,
          parameterCode: '',
          parameterName: '',
          parameterUnit: '',
          inputType: ''
        });
        this.selectedParameters[index] = null;
        return;
      }
    }
    this.selectedParameters[index] = event || null;
    const row = this.parameters.at(index);
    if (event) {
      row.patchValue({
        parameterID: event.id || event.ID,
        parameterCode: event.code || event.Code || '',
        parameterName: event.name || event.Name || '',
        parameterUnit: event.unit || event.UnitName || event.unitName || '',
        inputType: event.inputType || event.InputType || ''
      });
    } else {
      row.patchValue({
        parameterID: null,
        parameterCode: '',
        parameterName: '',
        parameterUnit: '',
        inputType: ''
      });
    }
  }

  // ── FormArray Operations: Methods ──

  addMethodRow(data?: any): void {
    const isFirst = this.methods.length === 0;
    const row = this.fb.group({
      id: [data?.id || 0],
      testMethodSpecificationID: [data?.testMethodSpecificationID || null, Validators.required],
      methodCode: [data?.methodCode || ''],
      displayTitle: [data?.displayTitle || ''],
      standardReference: [data?.standardReference || ''],
      analysisTechniqueName: [data?.analysisTechniqueName || ''],
      isDefault: [data?.isDefault ?? isFirst],
      displayOrder: [data?.displayOrder || this.methods.length + 1],
      isActive: [data?.isActive ?? true]
    });
    this.methods.push(row);
  }

  removeMethodRow(index: number): void {
    const wasDefault = this.methods.at(index).get('isDefault')?.value;
    this.methods.removeAt(index);
    this.selectedMethods.splice(index, 1);
    this.reindexMethods();

    // If removed method was default, set the first remaining method as default
    if (wasDefault && this.methods.length > 0) {
      this.methods.at(0).patchValue({ isDefault: true });
    }
  }

  reindexMethods(): void {
    this.methods.controls.forEach((ctrl, idx) => {
      ctrl.patchValue({ displayOrder: idx + 1 });
    });
  }

  setDefaultMethod(index: number): void {
    this.methods.controls.forEach((ctrl, idx) => {
      ctrl.patchValue({ isDefault: idx === index });
    });
  }

  onMethodSelected(event: any, index: number): void {
    if (event) {
      const selectedId = event.id || event.ID;
      const alreadyExists = this.methods.controls.some(
        (ctrl, idx) => idx !== index && ctrl.get('testMethodSpecificationID')?.value === selectedId
      );
      if (alreadyExists) {
        this.toastService.show(`Test Method '${event.displayTitle || event.name || event.code}' is already added to this test.`, 'warning');
        const r = this.methods.at(index);
        r.patchValue({
          testMethodSpecificationID: null,
          methodCode: '',
          displayTitle: '',
          standardReference: '',
          analysisTechniqueName: ''
        });
        this.selectedMethods[index] = null;
        return;
      }
    }
    const row = this.methods.at(index);
    if (event) {
      const title = event.name || event.displayTitle || event.DisplayTitle || event.code || event.Code || '';
      this.selectedMethods[index] = {
        ...event,
        id: event.id || event.ID,
        name: title,
        label: title,
        displayTitle: title
      };
      row.patchValue({
        testMethodSpecificationID: event.id || event.ID,
        methodCode: event.code || event.Code || '',
        displayTitle: title,
        standardReference: event.testMethodStandard || event.TestMethodStandard || event.standardReference || '',
        analysisTechniqueName: event.technique || event.analysisTechniqueName || ''
      });
    } else {
      this.selectedMethods[index] = null;
      row.patchValue({
        testMethodSpecificationID: null,
        methodCode: '',
        displayTitle: '',
        standardReference: '',
        analysisTechniqueName: ''
      });
    }
  }

  // ── FormArray Operations: Conditions ──

  addConditionRow(data?: any): void {
    const row = this.fb.group({
      id: [data?.id || 0],
      conditionMasterID: [data?.conditionMasterID || null, Validators.required],
      conditionCode: [data?.conditionCode || ''],
      conditionName: [data?.conditionName || ''],
      category: [data?.category || ''],
      valueType: [data?.valueType || ''],
      parameterUnit: [data?.parameterUnit || ''],
      isMandatory: [data?.isMandatory ?? false],
      displayOrder: [data?.displayOrder || this.conditions.length + 1],
      isActive: [data?.isActive ?? true]
    });
    this.conditions.push(row);
  }

  removeConditionRow(index: number): void {
    this.conditions.removeAt(index);
    this.selectedConditions.splice(index, 1);
    this.reindexConditions();
  }

  reindexConditions(): void {
    this.conditions.controls.forEach((ctrl, idx) => {
      ctrl.patchValue({ displayOrder: idx + 1 });
    });
  }

  onConditionSelected(event: any, index: number): void {
    if (event) {
      const selectedId = event.id || event.ID;
      const alreadyExists = this.conditions.controls.some(
        (ctrl, idx) => idx !== index && ctrl.get('conditionMasterID')?.value === selectedId
      );
      if (alreadyExists) {
        this.toastService.show(`Condition '${event.name || event.Name || event.code}' is already added to this test.`, 'warning');
        const r = this.conditions.at(index);
        r.patchValue({
          conditionMasterID: null,
          conditionCode: '',
          conditionName: '',
          category: '',
          valueType: '',
          parameterUnit: ''
        });
        this.selectedConditions[index] = null;
        return;
      }
    }
    this.selectedConditions[index] = event || null;
    const row = this.conditions.at(index);
    if (event) {
      row.patchValue({
        conditionMasterID: event.id || event.ID,
        conditionCode: event.code || event.Code || '',
        conditionName: event.name || event.Name || '',
        category: event.category || event.Category || '',
        valueType: event.valueType || event.ValueType || '',
        parameterUnit: event.unit || event.parameterUnit || ''
      });
    } else {
      row.patchValue({
        conditionMasterID: null,
        conditionCode: '',
        conditionName: '',
        category: '',
        valueType: '',
        parameterUnit: ''
      });
    }
  }

  // ── Dropdown Selectors for Header ──

  onDisciplineSelected(event: any): void {
    this.selectedDiscipline = event || null;
    this.form.patchValue({ disciplineID: event ? event.id || event.ID : null });
  }

  onDepartmentSelected(event: any): void {
    this.selectedDepartment = event || null;
    this.form.patchValue({ labDepartmentID: event ? event.id || event.ID : null });
  }

  onCodeInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const upper = input.value.toUpperCase().replace(/\s+/g, '_');
    input.value = upper;
    this.form.get('code')?.setValue(upper);
  }

  onCodeBlur(): void {
    const codeCtrl = this.form.get('code');
    if (!codeCtrl || !codeCtrl.value) return;
    const raw = codeCtrl.value.toString().trim();
    const normalized = raw.replace(/[\s\-]+/g, '_').toUpperCase();
    codeCtrl.setValue(normalized);

    if (normalized && !this.isViewMode) {
      this.labService.checkCodeUnique(normalized, this.labTestId).subscribe({
        next: (res: any) => {
          if (res && res.isUnique === false) {
            this.toastService.show(`Test Code '${normalized}' already exists. Please choose a unique code.`, 'warning');
            codeCtrl.setErrors({ notUnique: true });
          }
        }
      });
    }
  }

  openLinkedMaster(routePath: string): void {
    window.open(routePath, '_blank');
  }

  // ── Form Submission ──

  onSave(activate: boolean): void {
    if (this.isViewMode) return;

    const rawVal = this.form.getRawValue();

    // Basic validity
    if (!rawVal.code || !rawVal.name) {
      this.toastService.show('Test Code and Test Name are mandatory.', 'warning');
      this.activeTab = 'header';
      return;
    }

    // If activating, validate the strict Activation Gate
    if (activate) {
      if (!rawVal.disciplineID) {
        this.toastService.show('Discipline is mandatory to activate a Laboratory Test.', 'warning');
        this.activeTab = 'header';
        return;
      }

      const activeParams = (rawVal.parameters || []).filter((p: any) => p.parameterID && p.isActive);
      if (activeParams.length === 0) {
        this.toastService.show('At least one active parameter must be configured before activating.', 'warning');
        this.activeTab = 'parameters';
        return;
      }

      const activeMethods = (rawVal.methods || []).filter((m: any) => m.testMethodSpecificationID && m.isActive);
      if (activeMethods.length === 0) {
        this.toastService.show('At least one active test method must be configured before activating.', 'warning');
        this.activeTab = 'methods';
        return;
      }

      const defaultMethods = activeMethods.filter((m: any) => m.isDefault);
      if (defaultMethods.length !== 1) {
        this.toastService.show('Exactly one test method must be marked as Default.', 'warning');
        this.activeTab = 'methods';
        return;
      }
    }

    // Construct clean payload
    const payload: any = {
      code: rawVal.code.trim().toUpperCase(),
      name: rawVal.name.trim(),
      description: rawVal.description ? rawVal.description.trim() : null,
      disciplineID: rawVal.disciplineID || null,
      labDepartmentID: rawVal.labDepartmentID || null,
      testDuration: rawVal.testDuration ? Number(rawVal.testDuration) : null,
      isActive: activate,
      parameters: (rawVal.parameters || [])
        .filter((p: any) => p.parameterID)
        .map((p: any) => ({
          id: p.id || 0,
          laboratoryTestID: this.labTestId,
          parameterID: p.parameterID,
          isMandatory: p.isMandatory ?? true,
          isReportable: p.isReportable ?? true,
          displayOrder: p.displayOrder || 0,
          isActive: p.isActive ?? true
        })),
      methods: (rawVal.methods || [])
        .filter((m: any) => m.testMethodSpecificationID)
        .map((m: any) => ({
          id: m.id || 0,
          laboratoryTestID: this.labTestId,
          testMethodSpecificationID: m.testMethodSpecificationID,
          isDefault: m.isDefault ?? false,
          displayOrder: m.displayOrder || 0,
          isActive: m.isActive ?? true
        })),
      conditions: (rawVal.conditions || [])
        .filter((c: any) => c.conditionMasterID)
        .map((c: any) => ({
          id: c.id || 0,
          laboratoryTestID: this.labTestId,
          conditionMasterID: c.conditionMasterID,
          isMandatory: c.isMandatory ?? false,
          displayOrder: c.displayOrder || 0,
          isActive: c.isActive ?? true
        }))
    };

    if (this.isEditMode && this.labTestId > 0) {
      payload.id = this.labTestId;
      this.labService.updateUniversalTest(payload as LaboratoryTestUpdateDto).subscribe({
        next: (res) => {
          this.isSaved = true;
          this.toastService.show(res?.message || 'Universal Test updated successfully.', 'success');
          this.router.navigate(['/test']);
        },
        error: (err) => {
          this.toastService.show(
            err?.error?.message || err?.message || 'Error updating Laboratory Test.',
            'error'
          );
        }
      });
    } else {
      this.labService.createUniversalTest(payload as LaboratoryTestCreateDto).subscribe({
        next: (res) => {
          this.isSaved = true;
          this.toastService.show(res?.message || 'Universal Test created successfully.', 'success');
          this.router.navigate(['/test']);
        },
        error: (err) => {
          this.toastService.show(
            err?.error?.message || err?.message || 'Error creating Laboratory Test.',
            'error'
          );
        }
      });
    }
  }
}
