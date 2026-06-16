import { CommonModule } from '@angular/common';
import { Component, OnInit , HostListener } from '@angular/core';
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
import { YearHelper } from '../../../utility/helper/year.helper';
import { ParameterService } from '../../../services/parameter.service';
import { ParameterUnitService } from '../../../services/parameter-unit.service';
import { HeatTreatmentService } from '../../../services/heat-treatment.service';
import { ProductConditionService } from '../../../services/product-condition.service';
import { SpecimenOrientationService } from '../../../services/specimen-orientation.service';
import { DimensionalFactorService } from '../../../services/dimensional-factor.service';
import { MetalClassificationService } from '../../../services/metal-classification.service';
import { MaterialSpecificationService } from '../../../services/material-specification.service';
import { TestMethodSpecificationService } from '../../../services/test-method-specification.service';
import { ToastService } from '../../../services/toast.service';
import { Observable } from 'rxjs';
import { CanComponentDeactivate } from '../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../services/unsaved-changes.service';
import { noWhitespaceValidator } from '../../../utility/validators/custom-validators';
import { FormValidationHelper } from '../../../utility/helper/form-validation.helper';
import { FormFieldErrorComponent } from '../../../utility/components/form-field-error/form-field-error.component';

@Component({
  selector: 'app-material-specification-form',
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    NumberOnlyDirective,
    SearchableDropdownComponent,
    FormFieldErrorComponent,
  ],
  templateUrl: './material-specification-form.component.html',
  styleUrl: './material-specification-form.component.css',
})
export class MaterialSpecificationFormComponent implements CanComponentDeactivate, OnInit {
  saved = false;
  submitted = false;
  materialSpecificationId: number = 0;
  materialSpecifications: any = null;
  MaterialSpecificationForm!: FormGroup;
  isViewMode: boolean = false;
  isEditMode: boolean = false;
  yearOptions: number[] = YearHelper.standardYears();

  standardOrganizations: any[] = [];
  parameterUnits: any[] = [];
  specimenOriantations: any[] = [];

  selectedStandardOrganization: any = null;
  // NumberType from selected standard organization: 'UNS', 'SteelNumber', or 'None'
  selectedNumberType: string = 'None';
  productConditionsData: any[] = [];
  filteredProductOptions: any[] = [];

  selectedGradeIndex = 0;
  selectedSpecTab: { [gradeIndex: number]: string } = { 0: 'chemical' };


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

  // store per-grade selected metal classification (UI-only state)
  selectedMetalByGrade: any[] = [];

  // Accordion open/close state
  openSections: { [key: string]: boolean } = { header: true };
  openGrades: { [key: number]: boolean } = { 0: true };

  toggleSection(section: string) {
    this.openSections[section] = !this.openSections[section];
  }

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
    private testMethodSpecificationService: TestMethodSpecificationService,
    private toastService: ToastService
  , private unsavedChangesService: UnsavedChangesService) { }

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
    }
  }

  initForm() {
    this.MaterialSpecificationForm = this.fb.group({
      id: [0],
      standardOrganizationID: ['', Validators.required],
      standard: [''],
      part: [''],
      standardYear: ['', Validators.required],
      aliasName: [{ value: '', disabled: true }, [Validators.required, Validators.maxLength(200), noWhitespaceValidator()]],
      isCustom: [false],
      grades: this.fb.array([]),
    });
  }
  get grades() {
    return this.MaterialSpecificationForm.get('grades') as FormArray;
  }
  /** Validator: min value must not be greater than max value */
  private minMaxValidator(group: AbstractControl): { [key: string]: boolean } | null {
    const min = group.get('minValue')?.value;
    const max = group.get('maxValue')?.value;
    if (min != null && max != null && min > max) {
      return { minGreaterThanMax: true };
    }
    return null;
  }

  /** Validator: at least one specification line in chemical or mechanical */
  private atLeastOneSpecLineValidator(group: AbstractControl): { [key: string]: boolean } | null {
    const lines = group.get('specificationLines') as FormGroup;
    if (!lines) return null;
    const chemCount = (lines.get('chemical') as FormArray)?.length || 0;
    const mechCount = (lines.get('mechanical') as FormArray)?.length || 0;
    return (chemCount + mechCount) > 0 ? null : { noSpecLine: true };
  }

  addGrade() {
    const gradeGroup = this.fb.group({
      id: [0],
      specificationHeaderID: [this.MaterialSpecificationForm.get('id')?.value || 0],
      grade: ['', Validators.required],
      isUNS: [false],
      unsSteelNumber: [''],
      metalClassificationID: [null],
      specificationLines: this.fb.group({
        chemical: this.fb.array([]),
        mechanical: this.fb.array([]),
        other: this.fb.array([]),
      }),
    }, { validators: this.atLeastOneSpecLineValidator });
    this.grades.push(gradeGroup);
    this.selectedMetalByGrade.push(null);
    // Apply UNS/Steel validation if numberType is set
    if (this.selectedNumberType !== 'None') {
      const ctrl = gradeGroup.get('unsSteelNumber');
      ctrl?.setValidators(Validators.required);
      ctrl?.updateValueAndValidity();
    }
  }

  /** Toggle required validator on unsSteelNumber for all grades */
  private updateUnsSteelValidation(): void {
    this.grades.controls.forEach(grade => {
      const ctrl = grade.get('unsSteelNumber');
      if (this.selectedNumberType !== 'None') {
        ctrl?.setValidators(Validators.required);
      } else {
        ctrl?.clearValidators();
        ctrl?.setValue('');
      }
      ctrl?.updateValueAndValidity();
    });
  }

  removeGrade(index: number) {
    this.grades.removeAt(index);
    this.selectedMetalByGrade.splice(index, 1);
  }

  getSpecificationLinesByTab(gradeIndex: number, tab: 'chemical' | 'mechanical' | 'other'): FormArray {
    const linesGroup = this.grades.at(gradeIndex).get('specificationLines') as FormGroup;
    return linesGroup.get(tab) as FormArray;
  }

  createSpecificationLineFormGroup(tab: 'chemical' | 'mechanical' | 'other'): FormGroup {
    return this.fb.group({
      id: [0],
      gradeID: [0],
      manualSelection: [false],
      parameterID: ['', Validators.required],
      minValue: [null],
      maxValue: [null],
      notes: [''],
      parameterUnitID: [null],
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
      laboratoryTestIDs: this.fb.control([]),
      type: [tab],
      IsCustom: [false],
      // Parameter metadata from ParameterMaster (not submitted — UI helpers only)
      decimalPrecision: [2],
      parameterSymbol: [''],
      minReportableLimit: [null]
    }, { validators: this.minMaxValidator });
  }

  /** Returns HTML input step attribute based on parameter decimal precision. */
  getStep(group: AbstractControl | null): string {
    const precision = Number(group?.get('decimalPrecision')?.value ?? 2);
    if (precision <= 0) return '1';
    return (1 / Math.pow(10, precision)).toFixed(precision);
  }

  /** Rounds the given numeric control to the parameter's decimal precision on blur. */
  roundToPrecision(group: AbstractControl | null, field: string): void {
    if (!group) return;
    const ctrl = group.get(field);
    const raw = ctrl?.value;
    if (raw === null || raw === '' || raw === undefined) return;
    const num = Number(raw);
    if (isNaN(num)) return;
    const precision = Number(group.get('decimalPrecision')?.value ?? 2);
    const rounded = Number(num.toFixed(precision));
    if (rounded !== num) {
      ctrl?.setValue(rounded, { emitEvent: false });
    }
  }

  addSpecificationLine(gradeIndex: number, tab: 'chemical' | 'mechanical' | 'other') {
    const lines = this.getSpecificationLinesByTab(gradeIndex, tab);
    const specificationLine = this.createSpecificationLineFormGroup(tab);
    lines.push(specificationLine);
  }
  removeSpecificationLine(gradeIndex: number, lineIndex: number, tab: 'chemical' | 'mechanical' | 'other') {
    this.getSpecificationLinesByTab(gradeIndex, tab).removeAt(lineIndex);
  }

  loadMaterialSpecification() {
    this.materialSpecificationService
      .getMaterialSpecificationById(this.materialSpecificationId)
      .subscribe({
        next: (data) => {
          // set header-level fields
          this.MaterialSpecificationForm.patchValue({
            id: data.id,
            standardOrganizationID: data.standardOrganizationID,
            standard: data.standard,
            part: data.part,
            standardYear: data.standardYear,
            aliasName: data.aliasName,
            isCustom: data.isCustom
          });
          this.grades.clear();
          this.selectedMetalByGrade = [];

          data.grades?.forEach((grade: any) => {
            this.addGrade();
            const gradeIndex = this.grades.length - 1;
            const gradeGroup = this.grades.at(gradeIndex);

            gradeGroup.patchValue({
              id: grade.id,
              specificationHeaderID: grade.specificationHeaderID,
              grade: grade.grade,
              isUNS: grade.isUNS,
              unsSteelNumber: grade.unsSteelNumber,
              metalClassificationID: grade.metalClassificationID
            });

            const linesGroup = gradeGroup.get('specificationLines') as FormGroup;

            grade.specificationLines?.forEach((line: any) => {
              const tab = line.type as 'chemical' | 'mechanical' | 'other';
              const formArray = linesGroup.get(tab) as FormArray;
              const lineGroup = this.createSpecificationLineFormGroup(tab);
              lineGroup.patchValue({
                id: line.id,
                gradeID: line.gradeID,
                manualSelection: line.manualSelection,
                parameterID: line.parameterID,
                minValue: line.minValue,
                maxValue: line.maxValue,
                notes: line.notes,
                parameterUnitID: line.parameterUnitID,
                minValueEquation: line.minValueEquation,
                maxValueEquation: line.maxValueEquation,
                minTolerance: line.minTolerance,
                maxTolerance: line.maxTolerance,
                specimenOrientationID: line.specimenOrientationID,
                dimensionalFactorID: line.dimensionalFactorID,
                lowerLimitValue: line.lowerLimitValue,
                upperLimitValue: line.upperLimitValue,
                heatTreatmentID: line.heatTreatmentID,
                productConditionID1: line.productConditionID1,
                productConditionID2: line.productConditionID2,
                laboratoryTestIDs: line.laboratoryTests?.map((lt: any) => lt.laboratoryTestID) || [],
                // Parameter metadata from joined Parameter navigation (for precision/UI only)
                decimalPrecision: line.parameter?.decimalPrecision ?? 2,
                parameterSymbol: line.parameter?.symbol ?? '',
                minReportableLimit: line.parameter?.minReportableLimit ?? null
              });
              // Disable unit if parameter is set (auto-filled, read-only)
              if (line.parameterID) {
                lineGroup.get('parameterUnitID')?.disable();
              }
              formArray.push(lineGroup);
            });
          });

          if (this.selectedStandardOrganization == null) {
            this.selectedStandardOrganization = { id: data.standardOrganizationID, name: data.standard };
            // Fetch numberType for the selected standard organization
            this.standardOrganizationService.getStandardOrganizationById(data.standardOrganizationID).subscribe({
              next: (org) => {
                this.selectedNumberType = org?.numberType || 'None';
                this.updateUnsSteelValidation();
              }
            });
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
      code = standardOrganizationName;
    }
    const part = this.MaterialSpecificationForm.get('part')?.value;
    if (part) {
      code += ` ${part}`;
    }
    const standardYear =
      this.MaterialSpecificationForm.get('standardYear')?.value;
    if (standardYear) {
      code += `:${standardYear}`;
    }

    if (code.length > 0) {
      this.MaterialSpecificationForm.patchValue({ aliasName: code });
    }
  }

  onSubmit() {
    this.submitted = true;
    FormValidationHelper.markAllTouched(this.MaterialSpecificationForm);
    // Mark all grades as touched to trigger spec line validation
    this.grades.controls.forEach(g => g.markAsTouched());
    const formValue = this.MaterialSpecificationForm.getRawValue();
    const formattedData = this.formatedPayload(formValue);
    if (this.MaterialSpecificationForm.valid) {
      this.saveData(formattedData);
    } else {
      this.toastService.show('Please fill all required fields.', 'warning');
    }
  }
  isFieldInvalid(path: string): boolean {
    return FormValidationHelper.isFieldInvalid(this.MaterialSpecificationForm, path, this.submitted);
  }

  formatedPayload(formValue: any): any {
    const formattedData = { ...formValue };

    formattedData.grades = formValue?.grades?.map((grade: any) => {
      const { chemical = [], mechanical = [], other = [] } = grade.specificationLines || {};
      const combinedSpecificationLines = [...chemical, ...mechanical, ...other].map((line: any) => {
        const { laboratoryTestIDs, laboratoryTests, ...rest } = line;
        return {
          ...rest,
          laboratoryTests: (laboratoryTestIDs || []).map((id: number) => ({
            specificationLineID: line.id || 0,
            laboratoryTestID: id
          }))
        };
      });
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
            this.saved = true;
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
            this.saved = true;
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
    // Set numberType from the dropdown's additionalValues
    this.selectedNumberType = item?.additionalValues?.numberType || 'None';
    this.updateUnsSteelValidation();
    this.generateSpecificationName();
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
    const lines = this.getSpecificationLinesByTab(gradeIndex, tab);
    if (!item) {
      const specificationLine = lines.at(index) as FormGroup;
      specificationLine.patchValue({ parameterID: null, parameterUnitID: null });
      specificationLine.get('parameterUnitID')?.enable();
      return;
    }
    // Check for duplicate parameter in the same tab
    // COMMENTED OUT: Allow duplicate parameters with different values
    // const isDuplicate = lines.controls.some((ctrl, i) =>
    //   i !== index && ctrl.get('parameterID')?.value === item.id
    // );
    // if (isDuplicate) {
    //   this.toastService.show(`Parameter "${item.name}" is already added in this section.`, 'warning');
    //   const specificationLine = lines.at(index) as FormGroup;
    //   // Use sentinel then clear to force dropdown ngOnChanges to detect the reset
    //   specificationLine.patchValue({ parameterID: -1, parameterUnitID: null });
    //   setTimeout(() => specificationLine.patchValue({ parameterID: '', parameterUnitID: null }), 0);
    //   return;
    // }

    const specificationLine = lines.at(index) as FormGroup;
    const additional = item?.additionalValues || {};
    const unitID = additional.UnitID || additional.unitID || '';
    const decimalPrecision = Number(additional.DecimalPrecision ?? additional.decimalPrecision ?? 2);
    const parameterSymbol = additional.Symbol || additional.symbol || '';
    const minReportableLimit = additional.MinReportableLimit ?? additional.minReportableLimit ?? null;

    specificationLine.patchValue({
      parameterID: item.id,
      parameterUnitID: unitID,
      decimalPrecision,
      parameterSymbol,
      minReportableLimit
    });

    // Round any existing values to new precision
    ['minValue', 'maxValue', 'minValueEquation', 'maxValueEquation', 'minTolerance', 'maxTolerance']
      .forEach(f => this.roundToPrecision(specificationLine, f));

    // Disable unit dropdown after parameter auto-fills it
    const unitControl = specificationLine.get('parameterUnitID');
    if (unitID) {
      unitControl?.disable();
    } else {
      unitControl?.enable();
    }
  }
  getHeatTreatment = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.heatTreatmentService.getHeatTreatmentDropdown(term, page, pageSize);
  };
  onHeatTreatmentSelected(item: any, gradeIndex: number, index: number, tab: 'chemical' | 'mechanical' | 'other') {
    const specificationLine = this.getSpecificationLinesByTab(gradeIndex, tab).at(index) as FormGroup;
    if (!item) {
      specificationLine.patchValue({ heatTreatmentID: null });
      return;
    }
    specificationLine.patchValue({ heatTreatmentID: item.id });
  }
  getProductCondition = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.productConditionService.getProductConditionDropdown(term, page, pageSize);
  };
  onProductCondition1Selected(item: any, gradeIndex: number, index: number, tab: 'chemical' | 'mechanical' | 'other') {
    const specificationLine = this.getSpecificationLinesByTab(gradeIndex, tab).at(index) as FormGroup;
    if (!item) {
      specificationLine.patchValue({ productConditionID1: null });
      return;
    }
    specificationLine.patchValue({ productConditionID1: item.id });
  }
  onProductCondition2Selected(item: any, gradeIndex: number, index: number, tab: 'chemical' | 'mechanical' | 'other') {
    const specificationLine = this.getSpecificationLinesByTab(gradeIndex, tab).at(index) as FormGroup;
    if (!item) {
      specificationLine.patchValue({ productConditionID2: null });
      return;
    }
    specificationLine.patchValue({ productConditionID2: item.id });
  }

  getDimensionalFactor = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.dimensionalService.getDimensionalFactorDropdown(term, page, pageSize);
  };
  onDimensionalFactorSelected(item: any, gradeIndex: number, index: number, tab: 'chemical' | 'mechanical' | 'other') {
    const specificationLine = this.getSpecificationLinesByTab(gradeIndex, tab).at(index) as FormGroup;
    if (!item) {
      specificationLine.patchValue({ dimensionalFactorID: null });
      return;
    }
    specificationLine.patchValue({ dimensionalFactorID: item.id });
  }

  getMetalClassification = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.metalService.getMetalClassificationDropdown(term, page, pageSize);
  };

  onMetalClassificationSelected(item: any, gradeIndex: number) {
    if (!item) {
      this.selectedMetalByGrade[gradeIndex] = null;
      const grade = this.grades.at(gradeIndex);
      grade.patchValue({ metalClassificationID: null });
      return;
    }
    this.selectedMetalByGrade[gradeIndex] = item;
    const grade = this.grades.at(gradeIndex);
    grade.patchValue({ metalClassificationID: item.id });
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

  selectSpecTab(gradeIndex: number, tab: string) {
    this.selectedSpecTab[gradeIndex] = tab;
  }

  toggleGrade(gradeIndex: number) {
    this.openGrades[gradeIndex] = !this.openGrades[gradeIndex];
    if (this.openGrades[gradeIndex]) {
      this.selectedSpecTab[gradeIndex] = this.selectedSpecTab[gradeIndex] || 'chemical';
    }
  }

  scrollToEnd(gradeIndex: number, tab: string) {
    const container = document.getElementById(`scroll-${tab}-${gradeIndex}`);
    if (container) {
      container.scrollTo({ left: container.scrollWidth, behavior: 'smooth' });
    }
  }

  scrollToStart(gradeIndex: number, tab: string) {
    const container = document.getElementById(`scroll-${tab}-${gradeIndex}`);
    if (container) {
      container.scrollTo({ left: 0, behavior: 'smooth' });
    }
  }

  // ─── Test Method Specification Selection ───
  getTestMethodSpecification = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.testMethodSpecificationService.getTestMethodSpecificationDropdown(term, page, pageSize);
  };

  onTestMethodsSelected(items: any[], gradeIndex: number, lineIndex: number, tab: 'chemical' | 'mechanical' | 'other') {
    const specLine = this.getSpecificationLinesByTab(gradeIndex, tab).at(lineIndex) as FormGroup;
    specLine.patchValue({
      laboratoryTestIDs: items.map((i: any) => i.id)
    });
  }

  openLinkedMaster(route: string): void {
    window.open(route, '_blank');
  }

  canDeactivate(): Observable<boolean> | boolean {
    if (!this.MaterialSpecificationForm.dirty || this.saved) return true;
    return this.unsavedChangesService.confirm();
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent) {
    if (this.MaterialSpecificationForm?.dirty && !this.saved) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
