import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NumberOnlyDirective } from '../../../utility/directives/number-only.directive';
import { SearchableDropdownComponent } from '../../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { StandardOrgnizationService } from '../../../services/standard-orgnization.service';
import { ParameterService } from '../../../services/parameter.service';
import { ParameterUnitService } from '../../../services/parameter-unit.service';
import { HeatTreatmentService } from '../../../services/heat-treatment.service';
import { ProductConditionService } from '../../../services/product-condition.service';
import { SpecimenOrientationService } from '../../../services/specimen-orientation.service';
import { DimensionalFactorService } from '../../../services/dimensional-factor.service';
import { MetalClassificationService } from '../../../services/metal-classification.service';
import { MaterialSpecificationService } from '../../../services/material-specification.service';
import { ToastService } from '../../../services/toast.service';
import { Observable } from 'rxjs';
import { Modal } from 'bootstrap';
import { LaboratoryTestService } from '../../../services/laboratory-test.service';
import { MultiSelectDropdownComponent } from '../../../utility/components/multi-select-dropdown/multi-select-dropdown.component';

@Component({
  selector: 'app-material-specification-form',
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    NumberOnlyDirective,
    SearchableDropdownComponent,
    MultiSelectDropdownComponent
  ],
  templateUrl: './material-specification-form.component.html',
  styleUrl: './material-specification-form.component.css',
})
export class MaterialSpecificationFormComponent implements OnInit {
  @ViewChild('scrollContainer') scrollContainer!: ElementRef;
  @ViewChild('scrollButton') scrollButton!: ElementRef;

  @ViewChild('modalRef') modalElement!: ElementRef;
  private bsModal!: Modal;
  private scrollTimeout: any;

  materialSpecificationId: number = 0;
  materialSpecifications: any = null;
  MaterialSpecificationForm!: FormGroup;
  isViewMode: boolean = false;
  isEditMode: boolean = false;
  isCopyMode: boolean = false;
  standardOrganizations: any[] = [];
  parameterUnits: any[] = [];
  specimenOriantations: any[] = [];

  selectedStandardOrganization: any = null;
  productConditionsData: any[] = [];
  filteredProductOptions: any[] = [];

  selectedGradeIndex = 0;
  selectedSpecTab: { [gradeIndex: number]: string } = { 0: 'chemical' };
  currentTab: 'chemical' | 'mechanical' | 'other' = 'chemical';
  currentGradeIndex: number = 0;
  currentLineIndex: number = 0;
  modalVisible = false;

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

  constructor(
    private fb: FormBuilder,
    private standardOrganizationService: StandardOrgnizationService,
    private parameterService: ParameterService,
    private prameterUnitService: ParameterUnitService,
    private heatTreatmentService: HeatTreatmentService,
    private productConditionService: ProductConditionService,
    private specimenService: SpecimenOrientationService,
    private dimensionalService: DimensionalFactorService,
    private metalService: MetalClassificationService,
    private route: ActivatedRoute,
    private router: Router,
    private materialSpecificationService: MaterialSpecificationService,
    private toastService: ToastService,
    private labTestService: LaboratoryTestService
  ) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.materialSpecificationId = Number(params.get('id'));
    });
    const state = history.state as { mode?: string };

    if (state) {
      if (state.mode === 'view') {
        this.isViewMode = true;
      }
      if (state.mode === 'edit') {
        this.isEditMode = true;
      }
      if (state.mode === 'copy') {
        this.isCopyMode = true;
      }
    }

    this.initForm();
    this.getParameterUnit();
    this.getSpecimenOrientation();

    if (this.isViewMode) {
      this.MaterialSpecificationForm.disable();

    }
    if (this.materialSpecificationId) {
      this.loadMaterialSpecification();
    } else {
      this.addGrade();
      //this.addSpecificationLine(0, 'chemical');
    }
  }

  initForm() {
    this.MaterialSpecificationForm = this.fb.group({
      id: [0],
      standardOrganizationID: ['', Validators.required],
      standard: ['', Validators.required],
      part: [''],
      standardYear: ['', Validators.required],
      aliasName: [{ value: '', disabled: true }, Validators.required],
      isCustom: [false],
      grades: this.fb.array([]),
    });
  }
  get grades() {
    return this.MaterialSpecificationForm.get('grades') as FormArray;
  }
  addGrade() {
    const gradeGroup = this.fb.group({
      id: [0],
      specificationHeaderID: [this.MaterialSpecificationForm.get('id')?.value || 0],
      grade: [''],
      isUNS: [false],
      unsSteelNumber: [''],
      metalClassificationID: [''],
      specificationLines: this.fb.group({
        chemical: this.fb.array([]),
        mechanical: this.fb.array([]),
        other: this.fb.array([]),
      }),
    });
    this.grades.push(gradeGroup);
  }

  removeGrade(index: number) {
    this.grades.removeAt(index);
  }

  getSpecificationLinesByTab(gradeIndex: number, tab: 'chemical' | 'mechanical' | 'other'): FormArray {
    const linesGroup = this.grades.at(gradeIndex).get('specificationLines') as FormGroup;
    return linesGroup.get(tab) as FormArray;
  }


  addSpecificationLine(gradeIndex: number, tab: 'chemical' | 'mechanical' | 'other') {
    const lines = this.getSpecificationLinesByTab(gradeIndex, tab);
    const specificationLine = this.fb.group({
      id: [0],
      gradeID: [0],
      manualSelection: [false],
      parameterID: [''],
      minValue: [null],
      maxValue: [null],
      notes: [''],
      parameterUnitID: [''],
      minValueEquation: [0],
      maxValueEquation: [0],
      minTolerance: [0],
      maxTolerance: [0],
      specimenOrientationID: [null],
      dimensionalFactorID: [null],
      lowerLimitValue: [''],
      upperLimitValue: [''],
      heatTreatmentID: [null],
      productConditionID1: [null],
      productConditionID2: [null],
      laboratoryTests: this.fb.array([]),
      laboratoryTestIDs: this.fb.control([]),
      type: [tab],
      IsCustom:[false]
    });
    lines.push(specificationLine);
  }
  removeSpecificationLine(gradeIndex: number, lineIndex: number, tab: 'chemical' | 'mechanical' | 'other') {
    this.getSpecificationLinesByTab(gradeIndex, tab).removeAt(lineIndex);
  }
  getCurrentSpecificationLineFormGroup(tab: 'chemical' | 'mechanical' | 'other'): FormGroup {
    return this.getSpecificationLinesByTab(this.currentGradeIndex, tab)?.at(this.currentLineIndex) as FormGroup;
  }

  // copySpecificationLine(gradeIndex: number, lineIndex: number, tab: 'chemical' | 'mechanical' | 'other') {
  //   const originalLine = this.getSpecificationLinesByTab(gradeIndex, tab).at(lineIndex) as FormGroup;
  //   const originalValue = originalLine.getRawValue();


  //   // Deep clone laboratoryTests
  //   const clonedLaboratoryTests = (originalValue.laboratoryTests || []).map(
  //     (test: any) =>
  //       this.fb.group({
  //         specificationLineID: [0], // reset ID
  //         laboratoryTestID: [test.laboratoryTestID],
  //         laboratoryTestName: [test.laboratoryTestName],
  //       })
  //   );

  //   // Create new line
  //   const newLine = this.fb.group({
  //     id: [0], // always reset to 0 when copying
  //     specificationHeaderID: [originalValue.specificationHeaderID],
  //     propertyType: [originalValue.propertyType],
  //     manualSelection: [originalValue.manualSelection],
  //     parameterID: [originalValue.parameterID],
  //     minValue: [originalValue.minValue],
  //     maxValue: [originalValue.maxValue],
  //     notes: [originalValue.notes],
  //     parameterUnitID: [originalValue.parameterUnitID],
  //     minValueEquation: [originalValue.minValueEquation],
  //     maxValueEquation: [originalValue.maxValueEquation],
  //     minTolerance: [originalValue.minTolerance],
  //     maxTolerance: [originalValue.maxTolerance],
  //     specimenOrientationID: [originalValue.specimenOrientationID],
  //     dimensionalFactorID: [originalValue.dimensionalFactorID],
  //     lowerLimitValue: [originalValue.lowerLimitValue],
  //     upperLimitValue: [originalValue.upperLimitValue],
  //     heatTreatmentID: [originalValue.heatTreatmentID],
  //     laboratoryTestIDs: this.fb.control([
  //       ...(originalValue.laboratoryTestIDs || []),
  //     ]),
  //     laboratoryTests: this.fb.array(clonedLaboratoryTests),
  //   });

  //   this.getSpecificationLinesByTab(gradeIndex, tab).insert(lineIndex + 1, newLine);
  // }

  loadMaterialSpecification() {
    this.materialSpecificationService
      .getMaterialSpecificationById(this.materialSpecificationId)
      .subscribe({
        next: (data) => {
          this.MaterialSpecificationForm.patchValue({
            id: data.id,
            standardOrganizationID: data.standardOrganizationID,
            standard: data.standard,
            part: data.part,
            standardYear: data.standardYear,
            aliasName: data.aliasName,
            isCustom: data.isCustom
          });
          this.grades.clear(); // Clear existing grades if any

          data.grades?.forEach((grade: any) => {
            this.addGrade(); // Push a blank grade form

            const gradeIndex = this.grades.length - 1;
            const gradeGroup = this.grades.at(gradeIndex);

            gradeGroup.patchValue({
              id: grade.id,
              specificationHeaderID: grade.specificationHeaderID,
              grade: grade.grade,
              isUNS: grade.isUNS,
              unsSteelNumber: grade.unsSteelNumber,
              metalClassificationID: grade.metalClassificationID // typo from backend
            });

            const linesGroup = gradeGroup.get('specificationLines') as FormGroup;

            // Group lines by type and push them into their respective arrays
            grade.specificationLines?.forEach((line: any) => {
              const tab = line.type as 'chemical' | 'mechanical' | 'other';
              const formArray = linesGroup.get(tab) as FormArray;

              formArray.push(this.fb.group({
                id: [line.id],
                gradeID: [line.gradeID],
                manualSelection: [line.manualSelection],
                parameterID: [line.parameterID],
                minValue: [line.minValue],
                maxValue: [line.maxValue],
                notes: [line.notes],
                parameterUnitID: [line.parameterUnitID],
                minValueEquation: [line.minValueEquation],
                maxValueEquation: [line.maxValueEquation],
                minTolerance: [line.minTolerance],
                maxTolerance: [line.maxTolerance],
                specimenOrientationID: [line.specimenOrientationID],
                dimensionalFactorID: [line.dimensionalFactorID],
                lowerLimitValue: [line.lowerLimitValue],
                upperLimitValue: [line.upperLimitValue],
                heatTreatmentID: [line.heatTreatmentID],
                productConditionID1: [line.productConditionID1],
                productConditionID2: [line.productConditionID2],
                laboratoryTests: this.fb.array([line.laboratoryTests]),
                laboratoryTestIDs: this.fb.control(
                  line.laboratoryTests?.map((lt: any) => lt.laboratoryTestID) || []
                ),
                type: [tab]
              }));
            });
          });


          if (this.isViewMode) {
            this.MaterialSpecificationForm.disable();

          } else {
            this.MaterialSpecificationForm.enable();
          }
        },
        error: (error) => {
          console.error('Error fetching material specification:', error);
        },
      });
  }

  generateSpecificationName() {
    let code = '';
    const standardOrganizationName = this.selectedStandardOrganization?.name;
    if (standardOrganizationName) {
      code = `${standardOrganizationName}`;
    }
    const standard = this.MaterialSpecificationForm.get('standard')?.value;
    if (standard) {
      code += `-${standard}`;
    }
    const part = this.MaterialSpecificationForm.get('part')?.value;
    if (part) {
      code += `-${part}`;
    }
    const standardYear =
      this.MaterialSpecificationForm.get('standardYear')?.value;
    if (standardYear) {
      code += `-${standardYear}`;
    }

    if (code.length > 0) {
      this.MaterialSpecificationForm.patchValue({ aliasName: code });
    }
  }

  onSubmit() {
    const formValue = this.MaterialSpecificationForm.getRawValue();
    const formattedData = this.formatedPayload(formValue);
    console.log("formated Data", formattedData);
    if (this.MaterialSpecificationForm.valid) this.saveData(formattedData);
    else {
      this.toastService.show('Please fill all required fields.', 'warning');
      this.MaterialSpecificationForm.markAllAsTouched();
    }
  }
  formatedPayload(formValue: any): any {
    const formattedData = { ...formValue }; // shallow copy

    formattedData.grades = formValue?.grades?.map((grade: any) => {
      const { chemical = [], mechanical = [], other = [] } = grade.specificationLines || {};

      // Combine all specificationLines into one flat array
      const combinedSpecificationLines = [...chemical, ...mechanical, ...other];

      return {
        ...grade,
        specificationLines: combinedSpecificationLines
      };
    });
    return formattedData;
  }

  saveData(formValue: any) {
    if (this.isEditMode) {
      this.materialSpecificationService
        .updateMaterialSpecification(formValue)
        .subscribe({
          next: (response) => {
            this.toastService.show(response.message, 'success');
            this.router.navigate(['/material-specification']);
          },
          error: (error) => {
            this.toastService.show(error.error.message, 'error');
            console.error('Error updating Material Specification:', error);
          },
        });
    } else {
      this.materialSpecificationService
        .createMaterialSpecification(formValue)
        .subscribe({
          next: (response) => {
            this.toastService.show(response.message, 'success');
            this.router.navigate(['/material-specification']);
          },
          error: (error) => {
            this.toastService.show(error.error.message, 'error');
            console.error('Error creating Material Specification:', error);
          },
        });
    }
  }

  getStandardOrganization = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.standardOrganizationService.getStandardOrganizationDropdown(term, page, pageSize);
  };
  onOrganizationSelected(item: any) {
    this.MaterialSpecificationForm.patchValue({
      standardOrganizationID: item.id,
    });
    this.selectedStandardOrganization = item;
  }
  asFormGroup(control: AbstractControl): FormGroup {
    return control as FormGroup;
  }
  getParameter = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.parameterService.getParameterDropdown(term, page, pageSize);
  };
  getChemicalParameter = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.parameterService.getChemicalParameterDropdown(term, page, pageSize);
  };
  getMechanicalParameter = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.parameterService.getMechanicalParameterDropdown(term, page, pageSize);
  };
  onParameterSelected(item: any, gradeIndex: number, index: number, tab: 'chemical' | 'mechanical' | 'other') {
    const specificationLine = this.getSpecificationLinesByTab(gradeIndex, tab).at(index) as FormGroup;
    specificationLine.patchValue({ parameterID: item.id });
  }
  getHeatTreatment = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.heatTreatmentService.getHeatTreatmentDropdown(term, page, pageSize);
  };
  onHeatTreatmentSelected(item: any, gradeIndex: number, index: number, tab: 'chemical' | 'mechanical' | 'other') {
    const specificationLine = this.getSpecificationLinesByTab(gradeIndex, tab).at(index) as FormGroup;
    specificationLine.patchValue({ heatTreatmentID: item.id });
  }
  getProductCondition = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.productConditionService.getProductConditionDropdown(term, page, pageSize);
  };
  onProductCondition1Selected(item: any, gradeIndex: number, index: number, tab: 'chemical' | 'mechanical' | 'other') {
    const specificationLine = this.getSpecificationLinesByTab(gradeIndex, tab).at(index) as FormGroup;
    specificationLine.patchValue({ productConditionID1: item.id });
  }
  onProductCondition2Selected(item: any, gradeIndex: number, index: number, tab: 'chemical' | 'mechanical' | 'other') {
    const specificationLine = this.getSpecificationLinesByTab(gradeIndex, tab).at(index) as FormGroup;
    specificationLine.patchValue({ productConditionID2: item.id });
  }

  getDimensionalFactor = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.dimensionalService.getDimensionalFactorDropdown(term, page, pageSize);
  };
  onDimensionalFactorSelected(item: any, gradeIndex: number, index: number, tab: 'chemical' | 'mechanical' | 'other') {
    const specificationLine = this.getSpecificationLinesByTab(gradeIndex, tab).at(index) as FormGroup;
    specificationLine.patchValue({ dimensionalFactorID: item.id });
  }

  getMetalClassification = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.metalService.getMetalClassificationDropdown(term, page, pageSize);
  };

  getLaboratoryTest = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.labTestService.getLaboratoryTestDropdown(term, page, pageSize);
  }
  onMetalClassificationSelected(item: any, gradeIndex: number) {
    const grade = this.grades.at(gradeIndex);
    grade.patchValue({
      metalClassificationID: item.id,
    });

    // Fetch parameters for the selected metal classification
    this.metalService.getParameterByMetalId(item.id).subscribe({
      next: (data) => {
        // For each parameter, add to the correct tab based on parameterType
        data.forEach((param: any) => {
          const tab = (param.parameterType.toLowerCase() as 'chemical' | 'mechanical' | 'other');
          const linesArray = this.getSpecificationLinesByTab(gradeIndex, tab);

          // Get existing parameterIDs to avoid duplicates in this tab
          const existingParamIds = linesArray.controls.map(ctrl => ctrl.get('parameterID')?.value);

          if (!existingParamIds.includes(param.id)) {
            // Add new line and set parameterID
            const newLine = this.fb.group({
              id: [0],
              gradeID: [0],
              manualSelection: [false],
              parameterID: [param.id],
              minValue: [null],
              maxValue: [null],
              notes: [''],
              parameterUnitID: [''],
              minValueEquation: [0],
              maxValueEquation: [0],
              minTolerance: [0],
              maxTolerance: [0],
              specimenOrientationID: [null],
              dimensionalFactorID: [null],
              lowerLimitValue: [''],
              upperLimitValue: [''],
              heatTreatmentID: [null],
              productConditionID1: [null],
              productConditionID2: [null],
              laboratoryTests: this.fb.array([]),
              laboratoryTestIDs: this.fb.control([]),
              type: [tab],
              IsCustom: [false]
            });
            linesArray.push(newLine);
          }
        });
      },
      error: (error) => {
        console.error('Error fetching parameters by metal ID:', error);
      },
    });
  }


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
  getSpecimenOrientation() {
    this.specimenService.getSpecimenOrientationDropdown('', 0, 100).subscribe({
      next: (data) => {
        this.specimenOriantations = data;
      },
      error: (error) => {
        console.error('Error fetching specimen orientation:', error);
      },
    });
  }

  openModal(gradeIndex: number, index: number, tab: 'chemical' | 'mechanical' | 'other'): void {
    this.currentGradeIndex = gradeIndex;
    this.currentLineIndex = index;
    this.modalVisible = true;
    this.currentTab = tab;
    // Wait for modal DOM to be rendered
    setTimeout(() => {
      this.bsModal = new Modal(this.modalElement.nativeElement);
      this.bsModal.show();
    });

  }

  closeModal(): void {
    if (this.bsModal) {
      this.bsModal.hide();
    }
  }

  onLaboratoryTestChange(selectedItems: any[], tab: 'chemical' | 'mechanical' | 'other') {
    const line = this.getSpecificationLinesByTab(this.currentGradeIndex, tab).at(this.currentLineIndex) as FormGroup;
    const labTestsArray = line.get('laboratoryTests') as FormArray;
    const selectIds: number[] = [];
    // Reset and rebuild array
    labTestsArray.clear();
    selectedItems?.forEach((item) => {
      selectIds.push(item.id);
        labTestsArray.push(
          this.fb.group({
            specificationLineID: [line.get('id')?.value || 0],
            laboratoryTestID: [item.id]
          })
        );
    });
    line.patchValue({laboratoryTestIDs : selectIds})
  }

  copyMaterialSpecification() {
    const raw = this.MaterialSpecificationForm.getRawValue();
    const formatedData = this.formatedPayload(raw);
    this.isEditMode = false;
    this.saveData(formatedData);
  }

  // spinning icon
  spinningIndex: number | null = null;
  rotateOnce(gradeIndex: number, index: number, tab: 'chemical' | 'mechanical' | 'other') {
    this.spinningIndex = index;
    setTimeout(() => {
      if (this.spinningIndex === index) {
        this.spinningIndex = null;
      }
    }, 1000);

    this.openModal(gradeIndex, index, tab); // optional
  }
  selectSpecTab(gradeIndex: number, tab: string) {
    this.selectedSpecTab[gradeIndex] = tab;
  }

  // Add this method to handle accordion expand
  onGradeAccordionExpand(gradeIndex: number) {
    this.selectedSpecTab[gradeIndex] = 'chemical';
  }
}
