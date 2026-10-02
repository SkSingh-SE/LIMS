import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { SpecificationRequirementService } from '../../../services/specification-requirement.service';
import { ParameterService } from '../../../services/parameter.service';
import { ParameterUnitService } from '../../../services/parameter-unit.service';
import { ProductSizeMasterService } from '../../../services/product-size-master.service';
import { HeatTreatmentService } from '../../../services/heat-treatment.service';
import { SpecimenOrientationService } from '../../../services/specimen-orientation.service';
import { LaboratoryTestService } from '../../../services/laboratory-test.service';
import { TestMethodSpecificationService } from '../../../services/test-method-specification.service';
import { ToastService } from '../../../services/toast.service';
import { SearchableDropdownComponent } from '../../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { SaveSpecificationRequirement } from '../../../models/specification-requirement.model';

import { FormulaBuilderComponent } from '../../../utility/components/formula-builder/formula-builder.component';

@Component({
  selector: 'app-requirement-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SearchableDropdownComponent,
    FormulaBuilderComponent
  ],
  templateUrl: './requirement-modal.component.html',
  styleUrls: ['./requirement-modal.component.css']
})
export class RequirementModalComponent implements OnInit, OnChanges {
  @Input() visible = false;
  @Input() isViewMode = false;
  @Input() requirementId = 0;
  @Input() versionId = 0;
  @Input() gradeId = 0;
  @Input() versionName = '';
  @Input() gradeName = '';
  @Input() isLocked = false;

  @Output() close = new EventEmitter<boolean>();

  form!: FormGroup;
  activeTab: 'definition' | 'limits' | 'equations' | 'conditions' | 'testmethods' | 'instructions' | 'evaluation' = 'definition';
  submitted = false;

  conditionDimensions: any[] = [];
  selectedParameter: any = null;
  selectedUnit: any = null;
  inheritedUnitDisplay = '';
  inheritedInputTypeDisplay = '';
  inheritedLegacyType = '';
  selectedSize: any = null;
  selectedHeatTreatment: any = null;
  selectedOrientation: any = null;
  selectedLabTest: any = null;

  // Formula & Equation State
  showFormulaBuilder = false;
  formulaBuilderTarget: 'equation' | 'minEquation' | 'maxEquation' = 'equation';
  currentFormulaValue = '';
  formulaBuilderParamType = 'Universal';

  masterFormula = '';
  masterFormulaDisplay = '';
  masterIsCalculated = false;

  getParameterDropdown = (term: string, page: number, size: number) =>
    this.parameterService.getParameterDropdown(term, page, size);

  getUnitDropdown = (term: string, page: number, size: number) =>
    this.unitService.getParameterUnitDropdown(term, page, size);

  getSizeDropdown = (term: string, page: number, size: number) =>
    this.sizeService.getProductSizeDropdown(term, page, size);

  getHeatTreatmentDropdown = (term: string, page: number, size: number) =>
    this.htService.getHeatTreatmentDropdown(term, page, size);

  getOrientationDropdown = (term: string, page: number, size: number) =>
    this.orientationService.getSpecimenOrientationDropdown(term, page, size);

  getLabTestDropdown = (term: string, page: number, size: number) =>
    this.labTestService.getLaboratoryTestDropdown(term, page, size);

  getTestMethodDropdown = (term: string, page: number, size: number) =>
    this.testMethodService.getTestMethodSpecificationDropdown(term, page, size);

  constructor(
    private fb: FormBuilder,
    private reqService: SpecificationRequirementService,
    private parameterService: ParameterService,
    private unitService: ParameterUnitService,
    private sizeService: ProductSizeMasterService,
    private htService: HeatTreatmentService,
    private orientationService: SpecimenOrientationService,
    private labTestService: LaboratoryTestService,
    private testMethodService: TestMethodSpecificationService,
    private toast: ToastService
  ) {
    this.buildForm();
  }

  ngOnInit(): void {
    this.loadConditionDimensions();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible) {
      this.activeTab = 'definition';
      this.submitted = false;
      this.buildForm();

      if (this.requirementId > 0) {
        this.loadRequirementDetails();
      } else {
        this.form.patchValue({
          specificationVersionID: this.versionId,
          specificationGradeID: this.gradeId
        });
        if (this.isLocked || this.isViewMode) {
          this.form.disable();
        }
      }
    }
  }

  private buildForm(): void {
    this.form = this.fb.group({
      id: [this.requirementId || 0],
      specificationVersionID: [this.versionId, Validators.required],
      specificationGradeID: [this.gradeId, Validators.required],

      // Section 1: Definition
      parameterID: [null, Validators.required],
      parameterUnitID: [null],
      parameterUnitEquivalentID: [null],
      inputType: ['', Validators.required],
      textValue: [''],
      legacyType: ['general'],

      // Section 2: Limits & Tolerances
      minValue: [null],
      maxValue: [null],
      lowerLimitValue: [''],
      lowerLimitDecimalValue: [null],
      upperLimitValue: [''],
      upperLimitDecimalValue: [null],
      minTolerance: [null],
      maxTolerance: [null],

      // Section 3: Equations
      equation: [''],
      minEquation: [''],
      maxEquation: [''],

      // Section 4: Applicability & Conditions
      productSizeMasterID: [null],
      heatTreatmentID: [null],
      specimenOrientationID: [null],
      dimensionalFactorID: [null],
      productConditionID1: [null],
      productConditionID2: [null],
      conditions: this.fb.array([]),

      // Section 5: Test Method Applicability
      laboratoryTestID: [null],
      testMethods: this.fb.array([]),

      // Section 6: Instructions & Reporting
      testCondition: [''],
      testNote: ['']
    });

    this.selectedParameter = null;
    this.selectedUnit = null;
    this.inheritedUnitDisplay = '';
    this.inheritedInputTypeDisplay = '';
    this.inheritedLegacyType = '';
    this.selectedSize = null;
    this.selectedHeatTreatment = null;
    this.selectedOrientation = null;
    this.selectedLabTest = null;
    this.masterFormula = '';
    this.masterFormulaDisplay = '';
    this.masterIsCalculated = false;
  }

  get conditionsArray(): FormArray {
    return this.form.get('conditions') as FormArray;
  }

  get testMethodsArray(): FormArray {
    return this.form.get('testMethods') as FormArray;
  }

  loadConditionDimensions(): void {
    this.reqService.getConditions().subscribe({
      next: (data) => {
        this.conditionDimensions = data || [];
      },
      error: () => {}
    });
  }

  loadRequirementDetails(): void {
    this.reqService.getDetails(this.requirementId).subscribe({
      next: (data) => {
        this.selectedParameter = { id: data.parameterID, name: data.parameterName, code: data.parameterCode, symbol: data.parameterSymbol };
        if (data.parameterUnitID) {
          this.selectedUnit = { id: data.parameterUnitID, name: data.parameterUnitName };
        }
        if (data.productSizeMasterID) {
          this.selectedSize = { id: data.productSizeMasterID, displayName: data.productSizeName };
        }
        if (data.heatTreatmentID) {
          this.selectedHeatTreatment = { id: data.heatTreatmentID, name: data.heatTreatmentName };
        }
        if (data.specimenOrientationID) {
          this.selectedOrientation = { id: data.specimenOrientationID, name: data.specimenOrientationName };
        }
        if (data.laboratoryTestID) {
          this.selectedLabTest = { id: data.laboratoryTestID, name: data.laboratoryTestName };
        }

        this.masterFormula = data.parameterFormula || '';
        this.masterFormulaDisplay = data.parameterFormulaDisplay || '';
        this.masterIsCalculated = data.parameterIsCalculated ?? false;

        this.formulaBuilderParamType = 'Universal';

        const unitName = data.parameterUnitName || '';
        const unitSym = data.parameterUnitSymbol || '';
        this.inheritedUnitDisplay = unitName ? (unitSym ? `${unitName} (${unitSym})` : unitName) : (data.parameterUnitID ? `Unit #${data.parameterUnitID}` : 'Unitless');
        this.inheritedInputTypeDisplay = data.inputType || '';
        this.inheritedLegacyType = data.legacyType || '';

        this.form.patchValue({
          id: data.id,
          specificationVersionID: data.specificationVersionID,
          specificationGradeID: data.specificationGradeID,
          parameterID: data.parameterID,
          parameterUnitID: data.parameterUnitID,
          inputType: data.inputType || '',
          textValue: data.textValue || null,
          legacyType: data.legacyType || 'general',
          minValue: data.minValue,
          maxValue: data.maxValue,
          lowerLimitValue: data.lowerLimitValue,
          lowerLimitDecimalValue: data.lowerLimitDecimalValue,
          upperLimitValue: data.upperLimitValue,
          upperLimitDecimalValue: data.upperLimitDecimalValue,
          minTolerance: data.minTolerance,
          maxTolerance: data.maxTolerance,
          equation: data.equation || '',
          minEquation: data.minEquation || '',
          maxEquation: data.maxEquation || '',
          productSizeMasterID: data.productSizeMasterID,
          heatTreatmentID: data.heatTreatmentID,
          specimenOrientationID: data.specimenOrientationID,
          dimensionalFactorID: data.dimensionalFactorID,
          productConditionID1: data.productConditionID1,
          productConditionID2: data.productConditionID2,
          laboratoryTestID: data.laboratoryTestID,
          testCondition: data.testCondition,
          testNote: data.testNote
        });

        // Populate conditions
        this.conditionsArray.clear();
        if (data.conditions && data.conditions.length > 0) {
          data.conditions.forEach(c => {
            this.conditionsArray.push(this.fb.group({
              id: [c.id],
              testConditionDimensionID: [c.testConditionDimensionID, Validators.required],
              operator: [c.operator || '=', Validators.required],
              value1: [c.value1, Validators.required],
              value2: [c.value2 || '']
            }));
          });
        }

        // Populate test methods
        this.testMethodsArray.clear();
        if (data.testMethods && data.testMethods.length > 0) {
          data.testMethods.forEach(tm => {
            this.testMethodsArray.push(this.fb.group({
              id: [tm.id],
              laboratoryTestID: [tm.laboratoryTestID || data.laboratoryTestID],
              testMethodSpecificationID: [tm.testMethodSpecificationID],
              testMethodSpecificationName: [tm.testMethodSpecificationName || ''],
              numberOfTestSpecimen: [tm.numberOfTestSpecimen || 1],
              displayOrder: [tm.displayOrder || 1]
            }));
          });
        }

        if (this.isLocked || this.isViewMode) {
          this.form.disable();
        }
      },
      error: (err) => {
        this.toast.show(err?.error?.message || 'Failed to load requirement details', 'error');
      }
    });
  }

  onParameterSelected(param: any): void {
    if (!param) {
      this.selectedParameter = null;
      this.form.patchValue({ parameterID: null, parameterUnitID: null, inputType: '' });
      this.inheritedUnitDisplay = '';
      this.inheritedInputTypeDisplay = '';
      this.inheritedLegacyType = '';
      this.masterFormula = '';
      this.masterFormulaDisplay = '';
      this.masterIsCalculated = false;
      this.selectedUnit = null;
      return;
    }
    this.selectedParameter = param;
    const add = param.additionalValues || {};
    this.masterFormula = add.Formula || param.formula || '';
    this.masterFormulaDisplay = add.FormulaDisplay || param.formulaDisplay || '';
    this.masterIsCalculated = add.IsCalculated ?? param.isCalculated ?? false;

    const unitId = add.UnitID || param.unitID || param.parameterUnitID || null;
    const unitName = add.Unit || param.unitName || param.parameterUnitName || '';
    const unitSymbol = add.Symbol || param.symbol || param.parameterUnitSymbol || '';
    const inputType = add.InputType || param.inputType || '';
    const pType = add.ParameterType || param.parameterType || 'Universal';

    this.inheritedUnitDisplay = unitName ? (unitSymbol ? `${unitName} (${unitSymbol})` : unitName) : (unitId ? `Unit #${unitId}` : 'Unitless');
    this.inheritedInputTypeDisplay = inputType ? inputType : 'Not Configured';
    this.inheritedLegacyType = pType;

    this.formulaBuilderParamType = 'Universal';

    this.form.patchValue({
      parameterID: param.id,
      parameterUnitID: unitId,
      inputType: inputType,
      legacyType: pType.toLowerCase()
    });

    // Auto-populate equation with master formula if equation is currently empty and master formula exists
    if (this.masterFormula && !this.form.get('equation')?.value) {
      this.form.patchValue({ equation: this.masterFormula });
    }

    if (unitId) {
      this.selectedUnit = {
        id: unitId,
        name: unitName,
        symbol: unitSymbol
      };
    } else {
      this.selectedUnit = null;
    }
  }

  onUnitSelected(unit: any): void {
    this.selectedUnit = unit;
    this.form.patchValue({ parameterUnitID: unit ? unit.id : null });
  }

  onSizeSelected(size: any): void {
    this.selectedSize = size;
    this.form.patchValue({ productSizeMasterID: size ? size.id : null });
  }

  onHeatTreatmentSelected(ht: any): void {
    this.selectedHeatTreatment = ht;
    this.form.patchValue({ heatTreatmentID: ht ? ht.id : null });
  }

  onOrientationSelected(orient: any): void {
    this.selectedOrientation = orient;
    this.form.patchValue({ specimenOrientationID: orient ? orient.id : null });
  }

  onLabTestSelected(test: any): void {
    this.selectedLabTest = test;
    this.form.patchValue({ laboratoryTestID: test ? test.id : null });
  }

  addConditionRow(): void {
    if (this.isLocked || this.isViewMode) return;
    const firstDim = this.conditionDimensions.length ? this.conditionDimensions[0] : null;
    let initialOp = '=';
    if (firstDim && firstDim.allowedOperators) {
      try {
        const ops = typeof firstDim.allowedOperators === 'string' ? JSON.parse(firstDim.allowedOperators) : firstDim.allowedOperators;
        if (Array.isArray(ops) && ops.length > 0) initialOp = ops[0];
      } catch {}
    }

    this.conditionsArray.push(this.fb.group({
      id: [0],
      testConditionDimensionID: [firstDim ? firstDim.id : null, Validators.required],
      operator: [initialOp, Validators.required],
      value1: [firstDim?.defaultValue || '', Validators.required],
      value2: ['']
    }));
  }

  getSelectedDimension(dimId: any): any {
    return this.conditionDimensions.find(d => d.id === Number(dimId)) || null;
  }

  getAllowedOperatorsForDimension(dimId: any): string[] {
    const dim = this.getSelectedDimension(dimId);
    if (!dim || !dim.allowedOperators) return ['=', '!=', '>', '>=', '<', '<=', 'BETWEEN'];
    try {
      const ops = typeof dim.allowedOperators === 'string' ? JSON.parse(dim.allowedOperators) : dim.allowedOperators;
      return Array.isArray(ops) && ops.length > 0 ? ops : ['='];
    } catch {
      return ['=', '!=', '>', '>=', '<', '<=', 'BETWEEN'];
    }
  }

  getDiscreteValuesForDimension(dimId: any): string[] {
    const dim = this.getSelectedDimension(dimId);
    if (!dim || !dim.allowedValuesJson) return [];
    try {
      const vals = typeof dim.allowedValuesJson === 'string' ? JSON.parse(dim.allowedValuesJson) : dim.allowedValuesJson;
      return Array.isArray(vals) ? vals : [];
    } catch {
      return [];
    }
  }

  onConditionDimensionChanged(index: number, dimId: any): void {
    const control = this.conditionsArray.at(index);
    const dim = this.getSelectedDimension(dimId);
    if (dim) {
      const ops = this.getAllowedOperatorsForDimension(dimId);
      const currentOp = control.get('operator')?.value;
      if (!ops.includes(currentOp)) {
        control.patchValue({ operator: ops[0] || '=' });
      }
      if (dim.defaultValue && !control.get('value1')?.value) {
        control.patchValue({ value1: dim.defaultValue });
      }
    }
  }

  openLinkedMaster(route: string): void {
    window.open(route, '_blank');
  }

  removeConditionRow(index: number): void {
    if (this.isLocked || this.isViewMode) return;
    this.conditionsArray.removeAt(index);
  }

  addTestMethodRow(): void {
    if (this.isLocked || this.isViewMode) return;
    this.testMethodsArray.push(this.fb.group({
      id: [0],
      laboratoryTestID: [this.form.get('laboratoryTestID')?.value || null],
      testMethodSpecificationID: [null],
      testMethodSpecificationName: [''],
      numberOfTestSpecimen: [1],
      displayOrder: [this.testMethodsArray.length + 1]
    }));
  }

  removeTestMethodRow(index: number): void {
    if (this.isLocked || this.isViewMode) return;
    this.testMethodsArray.removeAt(index);
  }

  onTestMethodSpecificationSelected(row: any, spec: any): void {
    if (spec) {
      const realSpecId = spec.additionalValues?.testMethodSpecificationId || spec.additionalValues?.TestMethodSpecificationId || spec.id;
      const displayName = spec.additionalValues?.displayTitle || spec.additionalValues?.testMethodStandard || spec.name || spec.testMethodStandard;
      row.patchValue({
        testMethodSpecificationID: realSpecId,
        testMethodSpecificationName: displayName
      });
    } else {
      row.patchValue({
        testMethodSpecificationID: null,
        testMethodSpecificationName: ''
      });
    }
  }

  getLiveLimitSummary(): string {
    const min = this.form.get('minValue')?.value;
    const max = this.form.get('maxValue')?.value;
    const lSym = this.form.get('lowerLimitValue')?.value;
    const lVal = this.form.get('lowerLimitDecimalValue')?.value;
    const uSym = this.form.get('upperLimitValue')?.value;
    const uVal = this.form.get('upperLimitDecimalValue')?.value;
    const minEq = this.form.get('minEquation')?.value;
    const maxEq = this.form.get('maxEquation')?.value;
    const txt = this.form.get('textValue')?.value;

    if (txt) return txt;
    if (min !== null && min !== undefined && max !== null && max !== undefined && min !== '' && max !== '') {
      return `${min} - ${max}`;
    }
    if (min !== null && min !== undefined && min !== '') return `>= ${min}`;
    if (max !== null && max !== undefined && max !== '') return `<= ${max}`;
    if (lSym && lVal !== null && lVal !== undefined) return `${lSym} ${lVal}`;
    if (uSym && uVal !== null && uVal !== undefined) return `${uSym} ${uVal}`;
    if (minEq || maxEq) return 'Formula Driven';
    return 'Not Configured';
  }

  onSubmit(): void {
    this.submitted = true;
    if (this.form.invalid) {
      this.toast.show('Please fill all mandatory requirement definition fields correctly.', 'warning');
      this.activeTab = 'definition';
      return;
    }

    if (this.isLocked || this.isViewMode) {
      this.close.emit(false);
      return;
    }

    const val = this.form.getRawValue();

    if (!val.inputType || !val.inputType.trim()) {
      this.toast.show('Selected parameter does not have a configured Input Type. Please configure the Parameter Master before using this parameter.', 'error');
      this.activeTab = 'definition';
      return;
    }

    const payload: SaveSpecificationRequirement = {
      id: val.id || 0,
      specificationVersionID: this.versionId,
      specificationGradeID: this.gradeId,
      parameterID: val.parameterID,
      parameterUnitID: val.parameterUnitID || null,
      parameterUnitEquivalentID: val.parameterUnitEquivalentID || null,
      inputType: val.inputType.trim(),
      textValue: val.inputType === 'Text' ? (val.textValue || null) : null,
      legacyType: val.legacyType || 'general',
      minValue: val.minValue !== '' && val.minValue !== null ? Number(val.minValue) : undefined,
      maxValue: val.maxValue !== '' && val.maxValue !== null ? Number(val.maxValue) : undefined,
      lowerLimitValue: val.lowerLimitValue || null,
      upperLimitValue: val.upperLimitValue || null,
      lowerLimitDecimalValue: val.lowerLimitDecimalValue !== '' && val.lowerLimitDecimalValue !== null ? Number(val.lowerLimitDecimalValue) : undefined,
      upperLimitDecimalValue: val.upperLimitDecimalValue !== '' && val.upperLimitDecimalValue !== null ? Number(val.upperLimitDecimalValue) : undefined,
      minTolerance: val.minTolerance !== '' && val.minTolerance !== null ? Number(val.minTolerance) : undefined,
      maxTolerance: val.maxTolerance !== '' && val.maxTolerance !== null ? Number(val.maxTolerance) : undefined,
      equation: val.equation || null,
      minEquation: val.minEquation || null,
      maxEquation: val.maxEquation || null,
      productSizeMasterID: val.productSizeMasterID || null,
      heatTreatmentID: val.heatTreatmentID || null,
      specimenOrientationID: val.specimenOrientationID || null,
      dimensionalFactorID: val.dimensionalFactorID || null,
      productConditionID1: val.productConditionID1 || null,
      productConditionID2: val.productConditionID2 || null,
      conditions: (val.conditions || []).map((c: any) => ({
        id: c.id || 0,
        conditionMasterID: c.testConditionDimensionID,
        testConditionDimensionID: c.testConditionDimensionID,
        operator: c.operator || '=',
        value1: c.value1,
        value2: c.value2 || null
      })),
      laboratoryTestID: val.laboratoryTestID || null,
      testMethods: (val.testMethods || []).map((tm: any) => ({
        id: tm.id || 0,
        laboratoryTestID: tm.laboratoryTestID || val.laboratoryTestID || null,
        testMethodSpecificationID: tm.testMethodSpecificationID || null,
        numberOfTestSpecimen: tm.numberOfTestSpecimen ? Number(tm.numberOfTestSpecimen) : 1,
        displayOrder: tm.displayOrder ? Number(tm.displayOrder) : 1
      })),
      testCondition: val.testCondition || null,
      testNote: val.testNote || null
    };

    if (payload.id > 0) {
      this.reqService.update(payload.id, payload).subscribe({
        next: (res) => {
          this.toast.show(res.message || 'Requirement updated successfully', 'success');
          this.close.emit(true);
        },
        error: (err) => {
          this.toast.show(err?.error?.message || 'Failed to update requirement', 'error');
        }
      });
    } else {
      this.reqService.create(payload).subscribe({
        next: (res) => {
          this.toast.show(res.message || 'Requirement created successfully', 'success');
          this.close.emit(true);
        },
        error: (err) => {
          this.toast.show(err?.error?.message || 'Failed to create requirement', 'error');
        }
      });
    }
  }

  applyMasterFormula(): void {
    if (this.isLocked || this.isViewMode) return;
    const formula = this.masterFormula || this.masterFormulaDisplay || '';
    if (formula) {
      this.form.patchValue({ equation: formula });
      this.toast.show('Applied parameter master formula', 'info');
    }
  }

  openFormulaBuilder(target: 'equation' | 'minEquation' | 'maxEquation'): void {
    if (this.isLocked || this.isViewMode) return;
    this.formulaBuilderTarget = target;
    this.currentFormulaValue = this.form.get(target)?.value || '';

    this.formulaBuilderParamType = 'Universal';

    this.showFormulaBuilder = true;
  }

  clearFormula(target: 'equation' | 'minEquation' | 'maxEquation'): void {
    if (this.isLocked || this.isViewMode) return;
    this.form.patchValue({ [target]: '' });
  }

  onFormulaSaved(event: { formula: string; formulaDisplay: string }): void {
    const valToUse = event.formula || event.formulaDisplay || '';
    if (this.formulaBuilderTarget) {
      this.form.patchValue({ [this.formulaBuilderTarget]: valToUse });
    }
    this.showFormulaBuilder = false;
  }

  onFormulaCleared(): void {
    if (this.formulaBuilderTarget) {
      this.form.patchValue({ [this.formulaBuilderTarget]: '' });
    }
    this.showFormulaBuilder = false;
  }

  navigateTab(direction: number): void {
    const tabs: ('definition' | 'limits' | 'equations' | 'conditions' | 'testmethods' | 'instructions' | 'evaluation')[] = [
      'definition', 'limits', 'equations', 'conditions', 'testmethods', 'instructions', 'evaluation'
    ];
    const currentIndex = tabs.indexOf(this.activeTab);
    const nextIndex = currentIndex + direction;
    if (nextIndex >= 0 && nextIndex < tabs.length) {
      this.activeTab = tabs[nextIndex];
    }
  }

  onCancel(): void {
    this.close.emit(false);
  }
}
