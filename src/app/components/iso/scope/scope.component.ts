import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { SearchableDropdownComponent } from '../../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { LaboratoryTestService } from '../../../services/laboratory-test.service';
import { Observable } from 'rxjs';
import { TestMethodSpecificationService } from '../../../services/test-method-specification.service';
import { ParameterService } from '../../../services/parameter.service';
import { ParameterUnitService } from '../../../services/parameter-unit.service';
import { DisciplineService } from '../../../services/discipline.service';
import { GroupService } from '../../../services/group.service';
import { SubGroupService } from '../../../services/sub-group.service';
import { LabScopeService } from '../../../services/lab-scope.service';
import { ToastService } from '../../../services/toast.service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EquipmentService } from '../../../services/equipment.service';
import { MultiSelectDropdownComponent } from '../../../utility/components/multi-select-dropdown/multi-select-dropdown.component';
@Component({
  selector: 'app-scope',
  imports: [CommonModule, ReactiveFormsModule, FormsModule, SearchableDropdownComponent, RouterLink, MultiSelectDropdownComponent],
  templateUrl: './scope.component.html',
  styleUrl: './scope.component.css'
})

export class ScopeComponent implements OnInit {
  scopeForm!: FormGroup;
  labScopeId: number = 0;
  isViewMode: boolean = false;
  isEditMode: boolean = false;
  parameterUnits: any[] = [];
  disciplineData: any[] = [];
  groupData: any[] = [];
  subGroupData: any[] = [];
  groupOptionsPerParam: { [key: string]: any[] } = {};
  subGroupOptionsPerParam: { [key: string]: any[] } = {};

  lowerLimitOptions = [
    { label: '>', value: '>' },
    { label: '≥', value: '≥' },
    { label: '=', value: '=' }
  ];
  upperLimitOptions = [
    { label: '<', value: '<' },
    { label: '≤', value: '≤' },
    { label: '=', value: '=' }
  ];

  constructor(private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router, private laboratoryTestService: LaboratoryTestService, private testMethodSpecificationService: TestMethodSpecificationService, private parameterService: ParameterService,
    private prameterUnitService: ParameterUnitService, private disciplineService: DisciplineService, private groupService: GroupService, private subGroupService: SubGroupService, private scopeService: LabScopeService, private toastService: ToastService, private equipmentService: EquipmentService) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.labScopeId = Number(params.get('id'));
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
    this.getParameterUnit();

    if (this.labScopeId > 0) {
      this.loadScope(this.labScopeId);
    } else {
      this.addSpecification();
      this.addParameter(0);
    }
  }
  initForm() {
    this.scopeForm = this.fb.group({
      ID: [0],
      laboratoryTestID: ['', Validators.required],
      specifications: this.fb.array([]),
    });
  }

  get specifications(): FormArray {
    return this.scopeForm.get('specifications') as FormArray;
  }

  addSpecification(): void {
    const specGroup = this.fb.group({
      ID: [0],
      labScopeID: [this.scopeForm.get('ID')?.value || 0],
      testMethodSpecification: [''],
      testMethodSpecificationID: ['', Validators.required],
      parameters: this.fb.array([]),
    });
    this.specifications.push(specGroup);
  }

  removeSpecification(index: number): void {
    this.specifications.removeAt(index);
  }

  parameters(specIndex: number): FormArray {
    return this.specifications.at(specIndex).get('parameters') as FormArray;
  }

  addParameter(specIndex: number): void {
    const paramGroup = this.fb.group({
      ID: [0],
      labScopeSpecificationID: [this.specifications.at(specIndex).get('ID')?.value || 0],
      parameterID: ['', Validators.required],
      parameterUnitID: ['', Validators.required],
      qualitativeQuantitative: ['', Validators.required],
      isUnderISO: [false],
      lowerLimit: [''],
      upperLimit: [''],
      disciplineID: [''],
      groupID: [null],
      subGroupID: [null],
      equipmentIDs: [[]],
      equipments: this.fb.array([])
    });

    // Subscribe to qualitativeQuantitative value changes to enable/disable lowerLimit and upperLimit
    paramGroup.get('qualitativeQuantitative')?.valueChanges.subscribe(value => {
      const lowerLimitControl = paramGroup.get('lowerLimit');
      const upperLimitControl = paramGroup.get('upperLimit');
      if (value === 'Quantitative') {
        lowerLimitControl?.enable({ emitEvent: false });
        upperLimitControl?.enable({ emitEvent: false });
      } else {
        paramGroup.patchValue({
          lowerLimit: '',
          upperLimit: '',
        });
        lowerLimitControl?.disable({ emitEvent: false });
        upperLimitControl?.disable({ emitEvent: false });
      }
    });

    this.parameters(specIndex).push(paramGroup);
  }

  removeParameter(specIndex: number, paramIndex: number): void {
    this.parameters(specIndex).removeAt(paramIndex);
  }
  equipments(specIndex: number, paramIndex: number): FormArray {
    return this.parameters(specIndex).at(paramIndex).get('equipments') as FormArray;
  }
  get hasAnyParameter(): boolean {
    return this.specifications.controls.some(spec => {
      const params = spec.get('parameters') as FormArray;
      return params && params.length > 0;
    });
  }

  getLaboratoryTest = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.laboratoryTestService.getLaboratoryTestDropdown(term, page, pageSize);
  };

  onLaboratorySelected(item: any) {
    this.scopeForm.patchValue({ laboratoryTestID: item.id });
  };
  getTestMethodSpecification = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.testMethodSpecificationService.getTestMethodSpecificationDropdown(term, page, pageSize);
  };
  onTestSpecificationSelected(item: any, index: number) {
    this.specifications.at(index).patchValue({ testMethodSpecificationID: item.id });
    this.specifications.at(index).patchValue({ testMethodSpecification: item.name });
  };
  getParameter = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.parameterService.getParameterDropdown(term, page, pageSize);
  };
  onParameterSelected(item: any, specIndex: number, paramIndex: number) {
    const spec = this.parameters(specIndex).at(paramIndex) as FormGroup;
    spec.patchValue({ parameterID: item.id });
  };
  getDiscipline = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.disciplineService.getDisciplineDropdown(term, page, pageSize);
  };
  onDisciplineSelected(item: any, specIndex: number, paramIndex: number) {
    const spec = this.parameters(specIndex).at(paramIndex) as FormGroup;
    spec.patchValue({ disciplineID: item.id });
    this.groupService.getGroupDropdown('', 0, 100, item.id).subscribe({
      next: (data) => {
        const key = `${specIndex}-${paramIndex}`;
        this.groupOptionsPerParam[key] = data;
      },
      error: (error) => {
        console.error('Error fetching group dropdown:', error);
      },
    });
  };
  onGroupSelected(event: any, specIndex: number, paramIndex: number) {
    const selectedGroupId = event.target.value;
    const key = `${specIndex}-${paramIndex}`;

    const paramForm = this.parameters(specIndex).at(paramIndex) as FormGroup;
    paramForm.patchValue({ groupID: +selectedGroupId, subGroupID: null });

    if (selectedGroupId) {
      this.groupService.getGroupById(+selectedGroupId).subscribe({
        next: (data) => {
          this.subGroupOptionsPerParam[key] = data;
        },
        error: (err) => {
          console.error('Error loading sub-groups:', err);
        }
      });
    }
  }

  onSubGroupSelected(item: any, specIndex: number, paramIndex: number) {
    const spec = this.parameters(specIndex).at(paramIndex) as FormGroup;
    spec.patchValue({ subGroupID: item.id });
  };
  getParameterUnit() {
    this.prameterUnitService.getParameterUnitDropdown('', 0, 100).subscribe({
      next: (data) => {
        this.parameterUnits = data;
      },
      error: (error) => {
        console.error('Error fetching parameter units:', error);
      },
    });
  }
  getDisciplineDropdown() {
    this.disciplineService.getDisciplineDropdown('', 0, 100).subscribe({
      next: (data) => {
        this.disciplineData = data;
      },
      error: (error) => {
        console.error('Error fetching discipline dropdown:', error);
      },
    });
  }

  getEquipment = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.equipmentService.getEquipmentDropdown(term, page, pageSize);
  }
  onEquipmentSelect(item: any, specIndex: number, paramIndex: number) {
    const spec = this.parameters(specIndex).at(paramIndex) as FormGroup;
    const equipmentsArray = this.equipments(specIndex, paramIndex);
    equipmentsArray.clear(); // Clear existing equipments
    item.forEach((equipment: any) => {
      const equipmentGroup = this.fb.group({
        ID: [0],
        labScopeSpecificationParameterID: [spec.get('ID')?.value || 0],
        equipmentID: [equipment.id],
        equipmentName: [equipment.name]
      });
      equipmentsArray.push(equipmentGroup);
    });
  }
  onSubmit() {
    if (this.scopeForm.valid) {
      if (this.labScopeId > 0) {
        this.scopeService.updateLabScope(this.scopeForm.value).subscribe({
          next: (data) => {
            this.scopeForm.reset();
            this.toastService.show(data.message, 'success');
            this.router.navigate(['/scope']);
          },
          error: (err) => {
            console.error('Error updating scope', err);
            this.toastService.show(err.error.message, 'error');
          }
        });
      }
      else {
        this.scopeService.createLabScope(this.scopeForm.value).subscribe({
          next: (data) => {
            this.toastService.show(data.message, 'success');
            this.scopeForm.reset();
            this.router.navigate(['/scope']);
          },
          error: (err) => {
            this.toastService.show(err.error.message, 'error');
          }
        });
      }
    }
    else {
      this.scopeForm.markAllAsTouched();
    }

  }
  loadScope(id: number) {
    this.scopeService.getLabScopeById(id).subscribe({
      next: (data) => {
        this.scopeForm.patchValue({
          ID: data.id,
          laboratoryTestID: data.laboratoryTestID
        });
        this.specifications.clear();
        data.specifications.forEach((spec: any) => {
          const specGroup = this.fb.group({
            ID: [spec.id],
            labScopeID: [data.id],
            testMethodSpecification: [spec?.testMethodSpecification || ''],
            testMethodSpecificationID: [spec.testMethodSpecificationID, Validators.required],
            parameters: this.fb.array([]),
          });

          const paramsArray = specGroup.get('parameters') as FormArray;
          spec.parameters.forEach((param: any) => {

            const equipmentIDs = (param.equipments || []).map((e: any) => e.equipmentID);

            const paramGroup = this.fb.group({
              ID: [param.id],
              labScopeSpecificationID: [spec.id],
              parameterID: [param.parameterID, Validators.required],
              parameterUnitID: [param.parameterUnitID, Validators.required],
              qualitativeQuantitative: [param.qualitativeQuantitative, Validators.required],
              isUnderISO: [param.isUnderISO],
              lowerLimit: [param.lowerLimit || ''],
              upperLimit: [param.upperLimit || ''],
              disciplineID: [param.disciplineID],
              groupID: [param.groupID],
              subGroupID: [param.subGroupID || null],
              equipmentIDs: [equipmentIDs || []],
              equipments: this.fb.array(param.equipments || [])
            });


            // Subscribe to qualitativeQuantitative value changes to enable/disable lowerLimit and upperLimit
            paramGroup.get('qualitativeQuantitative')?.valueChanges.subscribe(value => {
              const lowerLimitControl = paramGroup.get('lowerLimit');
              const upperLimitControl = paramGroup.get('upperLimit');
              if (value === 'Quantitative') {
                lowerLimitControl?.enable({ emitEvent: false });
                upperLimitControl?.enable({ emitEvent: false });
              } else {
                lowerLimitControl?.disable({ emitEvent: false });
                upperLimitControl?.disable({ emitEvent: false });
              }
            });

            paramsArray.push(paramGroup);
          });

          this.specifications.push(specGroup);
        });

        if (this.isViewMode) {
          this.scopeForm.disable();
        }

      },
      error: (err) => {
        console.error('Error loading scope', err.error.message);
        this.toastService.show(err.error.message, 'error');
      }
    });
  }

}