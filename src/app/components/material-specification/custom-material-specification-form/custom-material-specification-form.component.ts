import { CommonModule } from '@angular/common';
import { Component, OnInit , HostListener } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
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
import { LaboratoryTestService } from '../../../services/laboratory-test.service';
import { ProductSizeMasterService } from '../../../services/product-size-master.service';
import { ToastService } from '../../../services/toast.service';
import { Observable, forkJoin, of } from 'rxjs';
import { CanComponentDeactivate } from '../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../services/unsaved-changes.service';
import { noWhitespaceValidator } from '../../../utility/validators/custom-validators';
import { FormValidationHelper } from '../../../utility/helper/form-validation.helper';
import { FormFieldErrorComponent } from '../../../utility/components/form-field-error/form-field-error.component';
import { buildSpecTemplate, parseSpecTemplate, ParsedSpecRow, SpecMasters } from '../spec-template-excel.helper';
import { EquationToken } from '../material-specification-form/material-specification-form.component';

@Component({
  selector: 'app-custom-material-specification-form',
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    SearchableDropdownComponent,
    FormFieldErrorComponent,
  ],
  templateUrl: './custom-material-specification-form.component.html',
  styleUrl: './custom-material-specification-form.component.css',
})
export class CustomMaterialSpecificationFormComponent implements CanComponentDeactivate, OnInit {
  saved = false;
  submitted = false;
  materialSpecificationId: number = 0;
  materialSpecifications: any = null;
  MaterialSpecificationForm!: FormGroup;
  isViewMode: boolean = false;
  isEditMode: boolean = false;
  cloneData: any = null;
  yearOptions: number[] = YearHelper.standardYears();

  standardOrganizations: any[] = [];
  parameterUnits: any[] = [];
  // Per-row equivalent-unit options fetched from the API on parameter selection (header params + spec lines).
  equivalentUnitsByRow = new WeakMap<AbstractControl, any[]>();
  specimenOriantations: any[] = [];

  selectedStandardOrganization: any = null;
  productConditionsData: any[] = [];
  filteredProductOptions: any[] = [];
  chemicalParametersCache: any[] = [];
  mechanicalParametersCache: any[] = [];

  selectedGradeIndex = 0;
  selectedSpecTab: { [gradeIndex: number]: string } = { 0: 'chemical' };


  lowerLimitOptions = [
    { label: '≥', value: '≥' },
    { label: '>', value: '>' },
    { label: '=', value: '=' },
    { label: '≥', value: '>=' }
  ];
  upperLimitOptions = [
    { label: '≤', value: '≤' },
    { label: '<', value: '<' },
    { label: '=', value: '=' },
    { label: '≤', value: '<=' }
  ];

  // store per-grade selected metal classification (UI-only state)
  selectedMetalByGrade: any[] = [];

  // Accordion open/close state
  openSections: { [key: string]: boolean } = { header: true, headerParams: true };
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
    private laboratoryTestService: LaboratoryTestService,
    private productSizeMasterService: ProductSizeMasterService,
    private toastService: ToastService
  , private unsavedChangesService: UnsavedChangesService) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.materialSpecificationId = Number(params.get('id'));
    });
    const state = history.state as { mode?: string; cloneData?: any };

    if (state) {
      if (state.mode === 'view') {
        this.isViewMode = true;
      }
      if (state.mode === 'edit') {
        this.isEditMode = true;
      }
      if (state.mode === 'clone' && state.cloneData) {
        this.cloneData = state.cloneData;
      }
    }

    this.initForm();
    this.getParameterUnit();
    this.getSpecimenOrientation();
    this.loadParametersCache();

    if (this.isViewMode) {
      this.MaterialSpecificationForm.disable();

    }
    if (this.materialSpecificationId) {
      this.loadMaterialSpecification();
    } else if (this.cloneData) {
      // MS-A: seed the create form from a cloned spec (IDs already zeroed, Version blank)
      this.bindSpecificationData(this.cloneData);
      this.MaterialSpecificationForm.markAsDirty();
    } else {
      this.addGrade();
    }
  }

  initForm() {
    this.MaterialSpecificationForm = this.fb.group({
      id: [0],
      // Custom spec: no standard organization / part / year — these stay null.
      standardOrganizationID: [null],
      standard: [''],
      part: [''],
      standardYear: [''],
      specificationNo: [''],
      version: [''],
      displayTitle: [{ value: '', disabled: true }],
      title: ['', [Validators.maxLength(300)]],
      identifierConfigJson: [''],
      // Custom spec: name is entered manually (not auto-generated from a standard).
      aliasName: ['', [Validators.required, Validators.maxLength(200), noWhitespaceValidator()]],
      isCustom: [true],
      headerParameters: this.fb.group({
        chemical: this.fb.array([]),
        mechanical: this.fb.array([]),
      }),
      grades: this.fb.array([]),
    });
  }
  get grades() {
    return this.MaterialSpecificationForm.get('grades') as FormArray;
  }

  // ── MS-B: grade identifier tick-box config ──────────────────────────────────
  builtinIdentifiers: Array<{ key: string; label: string }> = [
    { key: 'unsNo', label: 'UNS No' },
    { key: 'steelNo', label: 'Steel No' },
    { key: 'enGrade', label: 'EN Grade' },
    { key: 'alloyNo', label: 'Alloy No' },
  ];
  enabledIdentifiers: { [key: string]: boolean } = {};
  customIdentifiers: Array<{ key: string; label: string }> = [];
  // Per grade only ONE identifier may be selected: { key, value }. Index-aligned with grades.
  gradeIdentifierValues: Array<{ key: string; value: string }> = [];

  /** Label for an identifier key (built-in or custom). */
  getIdentifierLabel(key: string): string {
    return this.getActiveIdentifiers().find(i => i.key === key)?.label ?? key;
  }

  /**
   * Parse stored identifierValuesJson into the single-selection { key, value } shape.
   * Accepts the new shape ({ key, value }) and the legacy multi-key shape
   * ({ unsNo: '...', steelNo: '...' }) → first non-empty entry wins.
   */
  normalizeGradeIdentifier(json?: string): { key: string; value: string } {
    try {
      const obj = JSON.parse(json || '{}') || {};
      if (typeof obj.key === 'string') return { key: obj.key, value: obj.value ?? '' };
      const firstKey = Object.keys(obj).find(k => obj[k] != null && String(obj[k]).trim() !== '');
      return firstKey ? { key: firstKey, value: String(obj[firstKey]) } : { key: '', value: '' };
    } catch {
      return { key: '', value: '' };
    }
  }

  /** Active identifiers (enabled built-ins, in order, + non-empty customs). */
  getActiveIdentifiers(): Array<{ key: string; label: string; isCustom: boolean }> {
    const active = this.builtinIdentifiers
      .filter(b => this.enabledIdentifiers[b.key])
      .map(b => ({ key: b.key, label: b.label, isCustom: false }));
    this.customIdentifiers
      .filter(c => c.label && c.label.trim() !== '')
      .forEach(c => active.push({ key: c.key, label: c.label.trim(), isCustom: true }));
    return active;
  }

  addCustomIdentifier(): void {
    if (this.customIdentifiers.length >= 3) return;
    this.customIdentifiers.push({ key: 'custom' + (this.customIdentifiers.length + 1), label: '' });
  }

  removeCustomIdentifier(index: number): void {
    this.customIdentifiers.splice(index, 1);
    this.customIdentifiers.forEach((c, i) => (c.key = 'custom' + (i + 1)));
  }

  // ── Header-level parameter template (MS-A) — tab-wise Chemical / General ─────
  selectedHeaderTab: 'chemical' | 'mechanical' = 'chemical';

  get headerParametersGroup(): FormGroup {
    return this.MaterialSpecificationForm.get('headerParameters') as FormGroup;
  }

  headerParametersByTab(tab: 'chemical' | 'mechanical'): FormArray {
    return this.headerParametersGroup.get(tab) as FormArray;
  }

  createHeaderParameterGroup(p?: any): FormGroup {
    return this.fb.group({
      id: [p?.id || 0],
      parameterID: [p?.parameterID ?? null, Validators.required],
      parameterUnitID: [p?.parameterUnitID ?? null],
      // chosen equivalent (null = base unit). FK to ParameterUnitEquivalent.
      parameterUnitEquivalentID: [p?.parameterUnitEquivalentID ?? null],
      // base unit used to compute the equivalent-unit options (rebind: default to the saved unit)
      defaultParameterUnitID: [p?.defaultParameterUnitID ?? p?.parameterUnitID ?? null],
      type: [p?.type || 'chemical'],
      displayOrder: [p?.displayOrder ?? null],
      inputType: [p?.inputType ?? 'Decimal'],
    });
  }

  addHeaderParameter(tab: 'chemical' | 'mechanical') {
    this.headerParametersByTab(tab).push(this.createHeaderParameterGroup({ type: tab }));
  }

  removeHeaderParameter(tab: 'chemical' | 'mechanical', index: number) {
    this.headerParametersByTab(tab).removeAt(index);
  }

  /** Parameter selected in header list → auto-fill its default unit (stays changeable for equivalents). */
  onHeaderParameterSelected(item: any, tab: 'chemical' | 'mechanical', index: number) {
    const row = this.headerParametersByTab(tab).at(index) as FormGroup;
    if (!item) {
      row.patchValue({ parameterID: null, parameterUnitID: null });
      return;
    }
    // Duplicate guard: same parameter must not be added twice in this tab's list.
    const isDuplicate = this.headerParametersByTab(tab).controls
      .some((ctrl, i) => i !== index && ctrl.get('parameterID')?.value === item.id);
    if (isDuplicate) {
      this.toastService.show(`"${item.name || item.text || 'Parameter'}" is already added in this list.`, 'warning');
      // Sentinel then clear forces the searchable-dropdown's ngOnChanges to reset its display.
      row.patchValue({ parameterID: -1, parameterUnitID: null, parameterUnitEquivalentID: null, defaultParameterUnitID: null });
      setTimeout(() => row.patchValue({ parameterID: null }), 0);
      this.equivalentUnitsByRow.set(row, []);
      return;
    }
    const additional = item?.additionalValues || {};
    const rawUnit = additional.UnitID ?? additional.unitID ?? null;
    const unitID = rawUnit != null && rawUnit !== '' ? Number(rawUnit) : null;
    row.patchValue({ 
      parameterID: item.id, 
      defaultParameterUnitID: unitID,
      inputType: additional.InputType || additional.inputType || 'Decimal'
    });
    this.loadEquivalentUnits(row, unitID, true);
  }

  /** On Add Grade: copy header parameters into the grade's tabs (routed by type). */
  private copyHeaderParametersIntoGrade(gradeGroup: FormGroup) {
    const linesGroup = gradeGroup.get('specificationLines') as FormGroup;
    (['chemical', 'mechanical'] as const).forEach(tab => {
      this.headerParametersByTab(tab).controls.forEach(hp => {
        const line = this.createSpecificationLineFormGroup(tab);
        const unitId = hp.get('parameterUnitID')?.value;
        line.patchValue({
          parameterID: hp.get('parameterID')?.value,
          parameterUnitID: unitId,
          parameterUnitEquivalentID: hp.get('parameterUnitEquivalentID')?.value ?? null,
          parameterName: hp.get('parameterName')?.value || '',
          inputType: hp.get('inputType')?.value || 'Decimal',
          textValue: hp.get('textValue')?.value || '',
        });
        this.updateRowControlsState(line);
        (linesGroup.get(tab) as FormArray).push(line);
        // Carry over the header param's equivalent options if present, else fetch.
        const hpUnits = this.equivalentUnitsByRow.get(hp);
        if (hpUnits && hpUnits.length) this.equivalentUnitsByRow.set(line, hpUnits);
        else if (unitId) this.loadEquivalentUnits(line, Number(unitId), false);
      });
    });
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

  /** Validator: test method specification IDs must be unique across all rows in a tab */
  private uniqueTestMethodValidator: ValidatorFn = (array: AbstractControl): ValidationErrors | null => {
    const formArray = array as FormArray;
    const seen = new Map<number, number>();
    const duplicateRows = new Set<number>();
    formArray.controls.forEach((group, rowIdx) => {
      const tmArray = (group as FormGroup).get('testMethodMapping') as FormArray;
      if (!tmArray) return;
      tmArray.controls.forEach((tmGroup) => {
        const id = (tmGroup as FormGroup).get('testMethodSpecificationID')?.value;
        if (id != null && id !== '' && id !== 0) {
          if (seen.has(id)) {
            duplicateRows.add(rowIdx);
            duplicateRows.add(seen.get(id)!);
          } else {
            seen.set(id, rowIdx);
          }
        }
      });
    });
    return duplicateRows.size > 0 ? { duplicateTestMethod: [...duplicateRows] } : null;
  };

  addGrade(seedFromHeader: boolean = true) {
    const chemArray = this.fb.array([]);
    const mechArray = this.fb.array([]);
    chemArray.setValidators(this.uniqueTestMethodValidator);
    mechArray.setValidators(this.uniqueTestMethodValidator);
    const gradeGroup = this.fb.group({
      id: [0],
      specificationHeaderID: [this.MaterialSpecificationForm.get('id')?.value || 0],
      grade: ['', Validators.required],
      isUNS: [false],
      unsSteelNumber: [''],
      metalClassificationID: [null],
      identifierValuesJson: [''],
      specificationLines: this.fb.group({
        chemical: chemArray,
        mechanical: mechArray,
        other: this.fb.array([]),
      }),
    }, { validators: this.atLeastOneSpecLineValidator });
    // MS-A: seed a NEW grade's tabs from the header parameter template (not when rebinding on edit).
    if (seedFromHeader) {
      this.copyHeaderParametersIntoGrade(gradeGroup);
    }
    this.grades.push(gradeGroup);
    this.selectedMetalByGrade.push(null);
    this.gradeIdentifierValues.push({ key: '', value: '' });
    const newIndex = this.grades.length - 1;
    this.selectedSpecTab[newIndex] = this.selectedSpecTab[newIndex] || 'chemical';
    if (seedFromHeader) this.selectedGradeIndex = newIndex; // jump to the new grade tab (not on rebind)
    // MS-B: the legacy UNS/Steel single field is replaced by configurable grade identifiers — no required validator.
  }

  /** Switch the active grade tab. */
  selectGrade(index: number): void {
    this.selectedGradeIndex = index;
    this.selectedSpecTab[index] = this.selectedSpecTab[index] || 'chemical';
  }

  /** Remove a grade from its tab (stops tab-click) and keep selectedGradeIndex valid. */
  removeGradeTab(index: number, event: Event): void {
    event.stopPropagation();
    if (confirm('Are you sure you want to remove this grade?')) {
      this.removeGrade(index);
      if (this.selectedGradeIndex >= this.grades.length) {
        this.selectedGradeIndex = Math.max(0, this.grades.length - 1);
      }
    }
  }

  removeGrade(index: number) {
    this.grades.removeAt(index);
    this.selectedMetalByGrade.splice(index, 1);
    this.gradeIdentifierValues.splice(index, 1);
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
      equation: [''],
      minEquation: [''],
      maxEquation: [''],
      parameterUnitID: [null],
      parameterUnitEquivalentID: [{ value: null, disabled: true }],
      minValueEquation: [0],
      maxValueEquation: [0],
      minTolerance: [0],
      maxTolerance: [0],
      specimenOrientationID: [null],
      dimensionalFactorID: [null],
      lowerLimitValue: [''],
      upperLimitValue: [''],
      lowerLimitDecimalValue: [null],
      upperLimitDecimalValue: [null],
      heatTreatmentID: [null],
      productConditionID1: [null],
      productConditionID2: [null],
      // MS-D
      productSizeMasterID: [null],
      testCondition: [''],
      testNote: [''],
      // MS-E matrix: one Laboratory Test per parameter + 5 fixed Test Method Specification slots.
      laboratoryTestID: [null],
      testMethodMapping: this.fb.array([
        this.createTestMethodMappingRow(), this.createTestMethodMappingRow(), this.createTestMethodMappingRow(),
        this.createTestMethodMappingRow(), this.createTestMethodMappingRow(),
      ]),
      laboratoryTestIDs: this.fb.control([]),
      type: [tab],
      IsCustom: [false],
      // Parameter metadata from ParameterMaster (not submitted — UI helpers only)
      decimalPrecision: [2],
      parameterSymbol: [''],
      parameterName: [''],
      minReportableLimit: [null],
      inputType: ['Decimal'],
      textValue: [''],
      isCalculated: [false],
      formula: [''],
      formulaDisplay: [''],
      parameterDropdownOptions: [[]]
    }, { validators: this.minMaxValidator });
  }

  // ── MS-E: test-method mapping rows per parameter line ───────────────────────
  testMethodMappingArray(line: AbstractControl): FormArray {
    return line.get('testMethodMapping') as FormArray;
  }
  createTestMethodMappingRow(m?: any): FormGroup {
    return this.fb.group({
      laboratoryTestID: [m?.laboratoryTestID ?? null],
      testMethodSpecificationID: [m?.testMethodSpecificationID ?? null],
      numberOfTestSpecimen: [m?.numberOfTestSpecimen ?? null],
    });
  }
  addTestMethodMappingRow(line: AbstractControl): void {
    this.testMethodMappingArray(line).push(this.createTestMethodMappingRow());
  }
  removeTestMethodMappingRow(line: AbstractControl, i: number): void {
    this.testMethodMappingArray(line).removeAt(i);
  }

  /** Returns true if the given row (in a chemical/mechanical FormArray) has a duplicate test method. */
  isDuplicateTestMethodRow(gradeIndex: number, tab: 'chemical' | 'mechanical', rowIndex: number): boolean {
    const array = this.getSpecificationLinesByTab(gradeIndex, tab);
    if (!array.errors?.['duplicateTestMethod']) return false;
    return (array.errors['duplicateTestMethod'] as number[]).includes(rowIndex);
  }

  // ── MS-D: custom equation editor ────────────────────────────────────────────
  equationModalVisible = false;
  equationModalLine: FormGroup | null = null;
  equationCurrentGradeIndex = 0;
  minEquationDraft = '';
  maxEquationDraft = '';
  equationActiveField: 'min' | 'max' = 'min'; // which textarea chips/operators insert into
  equationParamChips: Array<{ symbol: string; name: string; display: string; fromMaster?: boolean }> = [];
  equationParamSearch = '';
  equationOperators: string[] = ['+', '-', '*', '/', '(', ')', '>', '<', '>=', '<=', '==', '!=', ','];
  equationFunctions: string[] = ['IF(', 'MIN(', 'MAX(', 'ROUND(', 'ABS(', 'POW(', 'specMax(', 'specMin('];

  minEquationTokens: EquationToken[] = [];
  minEquationErrors: string[] = [];
  minEquationValid = true;
  minCanonicalFormula = '';

  maxEquationTokens: EquationToken[] = [];
  maxEquationErrors: string[] = [];
  maxEquationValid = true;
  maxCanonicalFormula = '';

  // ── Equation Limit Operator Symbols ──────────────────────────────────────
  equationLowerOp = '≥';
  equationUpperOp = '≤';

  // ── Live Formula Simulator / Calculator State ──────────────────────────────
  showCalculator = true;
  calcParamValues: { [key: string]: number } = {};
  calcDetectedParams: Array<{ symbol: string; name: string; key: string }> = [];
  calcResult: number | null = null;
  calcStepPreview = '';
  calcError = '';

  // ── Master Formula 1-Click State ───────────────────────────────────────────
  paramIsCalculated = false;
  paramMasterFormula = '';

  get filteredEquationParamChips(): Array<{ symbol: string; name: string; display: string; fromMaster?: boolean }> {
    if (!this.equationParamSearch?.trim()) return this.equationParamChips;
    const s = this.equationParamSearch.toLowerCase().trim();
    return this.equationParamChips.filter(c => 
      c.name.toLowerCase().includes(s) || (c.symbol && c.symbol.toLowerCase().includes(s))
    );
  }

  get isEquationValidToSave(): boolean {
    const minTrim = this.minEquationDraft?.trim();
    const maxTrim = this.maxEquationDraft?.trim();

    if (!minTrim && !maxTrim) return true;
    if (minTrim && (!this.minEquationValid || this.minEquationErrors.length > 0)) return false;
    if (maxTrim && (!this.maxEquationValid || this.maxEquationErrors.length > 0)) return false;

    return true;
  }

  openEquationModal(group: AbstractControl, gradeIndex: number): void {
    this.equationModalLine = group as FormGroup;
    this.equationCurrentGradeIndex = gradeIndex;
    this.minEquationDraft = group.get('minEquation')?.value || '';
    this.maxEquationDraft = group.get('maxEquation')?.value || '';
    this.equationActiveField = 'min';
    this.equationParamSearch = '';

    // Initialize limit symbols from current line values or sensible defaults
    const currentLower = group.get('lowerLimitValue')?.value;
    this.equationLowerOp = (currentLower === '>' || currentLower === '=' || currentLower === '≥' || currentLower === '>=')
      ? (currentLower === '>=' ? '≥' : currentLower)
      : '≥';

    const currentUpper = group.get('upperLimitValue')?.value;
    this.equationUpperOp = (currentUpper === '<' || currentUpper === '=' || currentUpper === '≤' || currentUpper === '<=')
      ? (currentUpper === '<=' ? '≤' : currentUpper)
      : '≤';

    // Check if the parameter has isCalculated or master formula
    const paramId = group.get('parameterID')?.value;
    let isCalc = group.get('isCalculated')?.value || false;
    let formDisp = (group.get('formulaDisplay')?.value || '').trim();

    if ((!isCalc || !formDisp) && paramId) {
      const found = this.chemicalParametersCache.find(p => p.id === paramId) ||
                    this.mechanicalParametersCache.find(p => p.id === paramId);
      if (found) {
        isCalc = found.additionalValues?.IsCalculated ?? found.isCalculated ?? false;
        formDisp = (found.additionalValues?.FormulaDisplay || found.formulaDisplay || '').trim();
      }
    }

    this.paramIsCalculated = isCalc;
    this.paramMasterFormula = formDisp;

    // 1. Available references: collect all parameters in this grade (both chemical & mechanical tabs)
    const chips: Array<{ symbol: string; name: string; display: string; fromMaster?: boolean }> = [];
    (['chemical', 'mechanical', 'other'] as const).forEach(t => {
      this.getSpecificationLinesByTab(gradeIndex, t)?.controls?.forEach(c => {
        let symbol = (c.get('parameterSymbol')?.value || '').trim();
        let name = (c.get('parameterName')?.value || '').trim();
        const paramId = c.get('parameterID')?.value;
        if (!name && !symbol && paramId) {
          const found = this.chemicalParametersCache.find(p => p.id === paramId) ||
                        this.mechanicalParametersCache.find(p => p.id === paramId);
          if (found) {
            name = (found.name || found.text || '').trim();
            symbol = (found.additionalValues?.Symbol || found.additionalValues?.symbol || '').trim();
          }
        }
        if (name || symbol) {
          const display = symbol ? `${name || symbol} (${symbol})` : name;
          if (!chips.some(x => x.name.toLowerCase() === name.toLowerCase() && x.symbol.toLowerCase() === symbol.toLowerCase())) {
            chips.push({ symbol, name, display, fromMaster: false });
          }
        }
      });
    });

    // 2. Also include all master parameters so formula components like Cr, Mo, V, Ni, Cu are always recognized
    const allMaster = [...(this.chemicalParametersCache || []), ...(this.mechanicalParametersCache || [])];
    allMaster.forEach(p => {
      const name = (p.name || p.text || '').trim();
      const symbol = (p.additionalValues?.Symbol || p.additionalValues?.symbol || '').trim();
      if (name || symbol) {
        const display = symbol ? `${name || symbol} (${symbol})` : name;
        if (!chips.some(x => (x.symbol && symbol && x.symbol.toLowerCase() === symbol.toLowerCase()) || 
                             (x.name && name && x.name.toLowerCase() === name.toLowerCase()))) {
          chips.push({ symbol, name, display, fromMaster: true });
        }
      }
    });
    this.equationParamChips = chips;

    // Validate current draft equations & update calculator
    this.validateEquation('min');
    this.validateEquation('max');
    this.updateCalculatorParameters();

    this.equationModalVisible = true;
  }

  onEquationInput(field: 'min' | 'max'): void {
    this.validateEquation(field);
    this.updateCalculatorParameters();
  }

  insertEquationToken(token: string): void {
    if (this.equationActiveField === 'max') {
      this.maxEquationDraft = (this.maxEquationDraft ? this.maxEquationDraft + ' ' : '') + token;
      this.validateEquation('max');
    } else {
      this.minEquationDraft = (this.minEquationDraft ? this.minEquationDraft + ' ' : '') + token;
      this.validateEquation('min');
    }
    this.updateCalculatorParameters();
  }

  validateEquation(field: 'min' | 'max'): void {
    const rawInput = (field === 'min' ? this.minEquationDraft : this.maxEquationDraft) || '';
    const { tokens, errors, isValid, canonicalFormula } = this.parseEquationString(rawInput);

    if (field === 'min') {
      this.minEquationTokens = tokens;
      this.minEquationErrors = errors;
      this.minEquationValid = isValid;
      this.minCanonicalFormula = canonicalFormula || '';
    } else {
      this.maxEquationTokens = tokens;
      this.maxEquationErrors = errors;
      this.maxEquationValid = isValid;
      this.maxCanonicalFormula = canonicalFormula || '';
    }
  }

  onEquationBlur(field: 'min' | 'max'): void {
    if (field === 'min' && this.minEquationValid && this.minCanonicalFormula) {
      this.minEquationDraft = this.minCanonicalFormula;
    } else if (field === 'max' && this.maxEquationValid && this.maxCanonicalFormula) {
      this.maxEquationDraft = this.maxCanonicalFormula;
    }
    this.updateCalculatorParameters();
  }

  getCanonicalFormula(tokens: EquationToken[]): string {
    const parts: string[] = [];
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      if (t.token && t.token.endsWith('=')) {
        continue;
      }
      if (t.type === 'param') {
        const cleanName = (t.symbol || t.name || t.token).replace(/^%/, '').trim();
        parts.push(cleanName);
      } else if (t.type === 'function') {
        parts.push(t.token.toUpperCase());
      } else {
        parts.push(t.token);
      }
    }

    let result = '';
    for (let i = 0; i < parts.length; i++) {
      const curr = parts[i];
      const prev = i > 0 ? parts[i - 1] : '';

      if (curr === '(') {
        if (prev && ['IF', 'MIN', 'MAX', 'ROUND', 'ABS', 'POW', 'SPECMIN', 'SPECMAX'].includes(prev.toUpperCase())) {
          result = result.trimEnd() + '(';
        } else if (prev && !['+', '-', '*', '/', '(', '>=', '<=', '==', '!=', '>', '<', ','].includes(prev)) {
          result = result.trimEnd() + ' (';
        } else {
          result += '(';
        }
      } else if (curr === ',') {
        result = result.trimEnd() + ', ';
      } else if (curr === ')') {
        result = result.trimEnd() + ')';
      } else if (['+', '-', '*', '/', '>=', '<=', '==', '!=', '>', '<'].includes(curr)) {
        result = result.trimEnd() + ' ' + curr + ' ';
      } else {
        if (result.length > 0 && !result.endsWith(' ') && !result.endsWith('(')) {
          result += ' ';
        }
        result += curr;
      }
    }
    return result.replace(/\s+/g, ' ').trim();
  }

  parseEquationString(rawInput: string): { tokens: EquationToken[]; errors: string[]; isValid: boolean; targetVar?: string; canonicalFormula?: string } {
    const tokens: EquationToken[] = [];
    const errors: string[] = [];
    let input = (rawInput || '').trim();

    if (!input) {
      return { tokens: [], errors: [], isValid: true };
    }

    // Check for target assignment e.g. "CE = %C + %Mn / 6 ..." or "%CE = ..."
    let targetVar = '';
    const assignMatch = input.match(/^%?([a-zA-Z0-9_+ -]+)\s*=\s*([^=].*)$/);
    if (assignMatch && !['>=', '<=', '==', '!='].some(op => input.startsWith(op))) {
      targetVar = assignMatch[1].trim();
      tokens.push({
        token: `${targetVar} =`,
        type: 'operator',
        matched: `Target: ${targetVar}`
      });
      input = assignMatch[2].trim();
    }

    const available = this.equationParamChips;

    // Sort parameters by symbol and name length descending so longer phrases match first
    const sortedParams = [...available].sort((a, b) => {
      const maxLenA = Math.max((a.name || '').length, (a.symbol || '').length);
      const maxLenB = Math.max((b.name || '').length, (b.symbol || '').length);
      return maxLenB - maxLenA;
    });

    const knownFunctions = ['SPECMIN', 'SPECMAX', 'ROUND', 'MEAN', 'SUM', 'POW', 'ABS', 'MAX', 'MIN', 'IF'];
    const twoCharOps = ['>=', '<=', '==', '!='];
    const singleCharOps = ['+', '-', '*', '/', '>', '<'];

    let idx = 0;
    const len = input.length;

    while (idx < len) {
      // Skip whitespace
      if (/\s/.test(input[idx])) {
        idx++;
        continue;
      }

      const remaining = input.slice(idx);

      // Check 2-char operators: >=, <=, ==, !=
      const twoOp = twoCharOps.find(op => remaining.startsWith(op));
      if (twoOp) {
        tokens.push({ token: twoOp, type: 'operator' });
        idx += twoOp.length;
        continue;
      }

      // Check single char operators & punctuation
      const ch = input[idx];
      if (singleCharOps.includes(ch)) {
        tokens.push({ token: ch, type: 'operator' });
        idx++;
        continue;
      }
      if (ch === '(' || ch === ')') {
        tokens.push({ token: ch, type: 'paren' });
        idx++;
        continue;
      }
      if (ch === ',') {
        tokens.push({ token: ',', type: 'comma' });
        idx++;
        continue;
      }

      // Check numbers (e.g. 100, 0.45, .5)
      const numMatch = remaining.match(/^[0-9]+(\.[0-9]+)?|^\.[0-9]+/);
      if (numMatch && numMatch.index === 0) {
        tokens.push({ token: numMatch[0], type: 'number' });
        idx += numMatch[0].length;
        continue;
      }

      // Check known functions
      let matchedFn = false;
      for (const fn of knownFunctions) {
        const fnRegex = new RegExp(`^${fn}\\b`, 'i');
        if (fnRegex.test(remaining)) {
          tokens.push({ token: fn.toUpperCase(), type: 'function' });
          idx += fn.length;
          matchedFn = true;
          break;
        }
      }
      if (matchedFn) continue;

      // Check parameters: DUAL MATCHING by Name OR Symbol, with optional '%' prefix (e.g. %C, %Mn)
      let matchedParam = false;
      const hasPercent = remaining.startsWith('%');
      const testRemaining = hasPercent ? remaining.slice(1) : remaining;

      for (const p of sortedParams) {
        // 1. Check Symbol match (e.g. C, Mn, Cr)
        if (p.symbol) {
          const escapedSymbol = p.symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const symRegex = new RegExp(`^${escapedSymbol}(?=[^a-zA-Z0-9_]|$)`, 'i');
          const m = testRemaining.match(symRegex);
          if (m) {
            const tokenStr = (hasPercent ? '%' : '') + p.symbol;
            tokens.push({
              token: tokenStr,
              type: 'param',
              matched: p.display,
              matchedBy: 'symbol',
              symbol: p.symbol,
              name: p.name
            });
            idx += (hasPercent ? 1 : 0) + m[0].length;
            matchedParam = true;
            break;
          }
        }

        // 2. Check Name match (e.g. Carbon, Manganese)
        if (p.name) {
          const escapedName = p.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const nameRegex = new RegExp(`^${escapedName}(?=[^a-zA-Z0-9_]|$)`, 'i');
          const m = testRemaining.match(nameRegex);
          if (m) {
            const tokenStr = (hasPercent ? '%' : '') + p.name;
            tokens.push({
              token: tokenStr,
              type: 'param',
              matched: p.display,
              matchedBy: 'name',
              symbol: p.symbol,
              name: p.name
            });
            idx += (hasPercent ? 1 : 0) + m[0].length;
            matchedParam = true;
            break;
          }
        }
      }
      if (matchedParam) continue;

      // Check Constants (e.g. PI)
      if (/^pi\b/i.test(remaining)) {
        tokens.push({ token: 'PI', type: 'number', matched: '= 3.14159' });
        idx += 2;
        continue;
      }

      // If we reach here, it is an unknown word or unexpected character
      const wordMatch = remaining.match(/^%?[a-zA-Z_][a-zA-Z0-9_]*/);
      if (wordMatch && wordMatch.index === 0) {
        const unkWord = wordMatch[0];
        tokens.push({ token: unkWord, type: 'unknown' });
        idx += unkWord.length;

        const cleanUnk = unkWord.replace(/^%/, '');
        // Find closest match suggestion
        const partial = available.find(p => 
          (p.name && p.name.toLowerCase().startsWith(cleanUnk.toLowerCase())) || 
          (p.symbol && p.symbol.toLowerCase().startsWith(cleanUnk.toLowerCase()))
        );
        const suggestion = partial ? ` (did you mean "${partial.name}${partial.symbol ? ' [' + partial.symbol + ']' : ''}"?)` : '';
        errors.push(`"${unkWord}" — unrecognized parameter or function${suggestion}`);
        continue;
      }

      // Unknown single character
      const unkChar = input[idx];
      errors.push(`Unexpected character "${unkChar}"`);
      tokens.push({ token: unkChar, type: 'unknown' });
      idx++;
    }

    // Structural validations:
    // 1. Bracket matching
    let bracketDepth = 0;
    for (const t of tokens) {
      if (t.token === '(') bracketDepth++;
      if (t.token === ')') {
        bracketDepth--;
        if (bracketDepth < 0) {
          errors.push('Unmatched closing bracket ")".');
          break;
        }
      }
    }
    if (bracketDepth > 0) {
      errors.push(`${bracketDepth} unclosed bracket(s).`);
    }

    // 2. Trailing operator check
    const contentTokens = tokens.filter(t => !t.token.endsWith('='));
    if (contentTokens.length > 0) {
      const lastToken = contentTokens[contentTokens.length - 1];
      if (lastToken.type === 'operator' || lastToken.token === '(' || lastToken.token === ',') {
        errors.push(`Expression cannot end with an operator or opening bracket ("${lastToken.token}").`);
      }
    }

    // 3. Consecutive operators
    for (let i = 0; i < contentTokens.length - 1; i++) {
      const curr = contentTokens[i];
      const next = contentTokens[i + 1];
      if (curr.type === 'operator' && next.type === 'operator' && curr.token !== '-' && next.token !== '-') {
        errors.push(`Invalid consecutive operators "${curr.token} ${next.token}".`);
      }
    }

    const canonicalFormula = errors.length === 0 ? this.getCanonicalFormula(tokens) : '';

    return {
      tokens,
      errors,
      isValid: errors.length === 0,
      targetVar,
      canonicalFormula
    };
  }

  // ── Live Calculator Simulation Methods ──────────────────────────────────────
  toggleCalculator(): void {
    this.showCalculator = !this.showCalculator;
  }

  updateCalculatorParameters(): void {
    const activeTokens = this.equationActiveField === 'max' ? this.maxEquationTokens : this.minEquationTokens;
    const paramTokens = activeTokens.filter(t => t.type === 'param');

    const uniqueList: Array<{ symbol: string; name: string; key: string }> = [];
    paramTokens.forEach(pt => {
      const cleanKey = (pt.symbol || pt.name || pt.token || '').replace(/^%/, '').trim();
      if (cleanKey && !uniqueList.some(u => u.key.toLowerCase() === cleanKey.toLowerCase())) {
        const chip = this.equationParamChips.find(c => 
          (c.symbol && c.symbol.toLowerCase() === cleanKey.toLowerCase()) ||
          (c.name && c.name.toLowerCase() === cleanKey.toLowerCase())
        );
        uniqueList.push({
          symbol: chip?.symbol || cleanKey,
          name: chip?.name || cleanKey,
          key: cleanKey
        });
      }
    });

    this.calcDetectedParams = uniqueList;

    // Prefill default realistic test values
    uniqueList.forEach(p => {
      if (this.calcParamValues[p.key] === undefined) {
        const k = p.key.toUpperCase();
        if (k === 'C') this.calcParamValues[p.key] = 0.18;
        else if (k === 'MN') this.calcParamValues[p.key] = 0.85;
        else if (k === 'CR') this.calcParamValues[p.key] = 0.20;
        else if (k === 'MO') this.calcParamValues[p.key] = 0.05;
        else if (k === 'V') this.calcParamValues[p.key] = 0.02;
        else if (k === 'NI') this.calcParamValues[p.key] = 0.10;
        else if (k === 'CU') this.calcParamValues[p.key] = 0.15;
        else if (k === 'P') this.calcParamValues[p.key] = 0.025;
        else if (k === 'S') this.calcParamValues[p.key] = 0.020;
        else if (k === 'SI') this.calcParamValues[p.key] = 0.25;
        else this.calcParamValues[p.key] = 0.05;
      }
    });

    this.runLiveCalculation();
  }

  runLiveCalculation(): void {
    const activeTokens = this.equationActiveField === 'max' ? this.maxEquationTokens : this.minEquationTokens;
    if (!activeTokens.length) {
      this.calcResult = null;
      this.calcStepPreview = '';
      this.calcError = '';
      return;
    }

    let jsExpr = '';
    let previewExpr = '';

    for (const t of activeTokens) {
      if (t.token && t.token.endsWith('=')) {
        continue; // skip assignment e.g. "CE ="
      }
      if (t.type === 'param') {
        const cleanKey = (t.symbol || t.name || t.token || '').replace(/^%/, '').trim();
        const matchedKey = Object.keys(this.calcParamValues).find(k => k.toLowerCase() === cleanKey.toLowerCase());
        const val = matchedKey !== undefined ? (Number(this.calcParamValues[matchedKey]) || 0) : 0;
        jsExpr += ` ${val} `;
        previewExpr += ` ${val} `;
      } else if (t.type === 'number' || t.type === 'operator' || t.type === 'comma') {
        jsExpr += ` ${t.token} `;
        previewExpr += ` ${t.token} `;
      } else if (t.type === 'paren') {
        jsExpr += t.token;
        previewExpr += t.token;
      } else if (t.type === 'function') {
        const fn = t.token.toUpperCase();
        if (fn === 'MAX') { jsExpr += 'Math.max'; previewExpr += 'MAX'; }
        else if (fn === 'MIN') { jsExpr += 'Math.min'; previewExpr += 'MIN'; }
        else if (fn === 'ROUND') { jsExpr += 'Math.round'; previewExpr += 'ROUND'; }
        else if (fn === 'ABS') { jsExpr += 'Math.abs'; previewExpr += 'ABS'; }
        else if (fn === 'POW') { jsExpr += 'Math.pow'; previewExpr += 'POW'; }
        else { jsExpr += fn; previewExpr += fn; }
      }
    }

    try {
      const fn = new Function(`return (${jsExpr});`);
      const res = fn();
      if (typeof res === 'number' && isFinite(res)) {
        this.calcResult = Math.round(res * 10000) / 10000;
        this.calcStepPreview = `${previewExpr.trim()} = ${this.calcResult}`;
        this.calcError = '';
      } else {
        this.calcResult = null;
        this.calcError = 'Invalid calculation';
      }
    } catch (err: any) {
      this.calcResult = null;
      this.calcError = err?.message || 'Calculation error';
    }
  }

  copyCalcResultToLimit(limitType: 'lower' | 'upper'): void {
    if (this.calcResult == null || !this.equationModalLine) return;
    if (limitType === 'lower') {
      this.equationModalLine.get('lowerLimitDecimalValue')?.setValue(this.calcResult);
      this.equationModalLine.get('minValue')?.setValue(this.calcResult);
      if (!this.equationModalLine.get('lowerLimitValue')?.value) {
        this.equationModalLine.get('lowerLimitValue')?.setValue('>=');
      }
      this.toastService.show(`Copied ${this.calcResult} to Lower Limit (>=)`, 'success');
    } else {
      this.equationModalLine.get('upperLimitDecimalValue')?.setValue(this.calcResult);
      this.equationModalLine.get('maxValue')?.setValue(this.calcResult);
      if (!this.equationModalLine.get('upperLimitValue')?.value) {
        this.equationModalLine.get('upperLimitValue')?.setValue('<=');
      }
      this.toastService.show(`Copied ${this.calcResult} to Upper Limit (<=)`, 'success');
    }
    this.equationModalLine.markAsDirty();
  }

  resetCalcDefaults(): void {
    this.calcParamValues = {};
    this.calcDetectedParams.forEach(p => {
      const k = p.key.toUpperCase();
      if (k === 'C') this.calcParamValues[p.key] = 0.18;
      else if (k === 'MN') this.calcParamValues[p.key] = 0.85;
      else if (k === 'CR') this.calcParamValues[p.key] = 0.20;
      else if (k === 'MO') this.calcParamValues[p.key] = 0.05;
      else if (k === 'V') this.calcParamValues[p.key] = 0.02;
      else if (k === 'NI') this.calcParamValues[p.key] = 0.10;
      else if (k === 'CU') this.calcParamValues[p.key] = 0.15;
      else if (k === 'P') this.calcParamValues[p.key] = 0.025;
      else if (k === 'S') this.calcParamValues[p.key] = 0.020;
      else if (k === 'SI') this.calcParamValues[p.key] = 0.25;
      else this.calcParamValues[p.key] = 0.05;
    });
    this.runLiveCalculation();
  }

  saveEquation(): void {
    if (!this.isEquationValidToSave) {
      this.toastService.show('Please resolve formula errors before applying.', 'error');
      return;
    }

    // Always sanitize unwanted data (% prefix, CE =, full names) into clean actual formula
    const minEq = (this.minEquationValid && this.minCanonicalFormula) ? this.minCanonicalFormula : (this.minEquationDraft?.trim() || null);
    const maxEq = (this.maxEquationValid && this.maxCanonicalFormula) ? this.maxCanonicalFormula : (this.maxEquationDraft?.trim() || null);

    this.equationModalLine?.get('minEquation')?.setValue(minEq);
    this.equationModalLine?.get('maxEquation')?.setValue(maxEq);

    // Auto-apply to Lower Limit if Min Equation is provided
    if (minEq) {
      const currentLowerOp = this.equationModalLine?.get('lowerLimitValue')?.value;
      if (!currentLowerOp) {
        this.equationModalLine?.get('lowerLimitValue')?.setValue('>=');
      }
    }

    // Auto-apply to Upper Limit if Max Equation is provided
    if (maxEq) {
      const currentUpperOp = this.equationModalLine?.get('upperLimitValue')?.value;
      if (!currentUpperOp) {
        this.equationModalLine?.get('upperLimitValue')?.setValue('<=');
      }
    }

    this.equationModalLine?.markAsDirty();
    this.toastService.show('Actual formula applied to limits successfully!', 'success');
    this.closeEquationModal();
  }

  hasUnwantedFormulaData(field: 'min' | 'max'): boolean {
    const raw = (field === 'min' ? this.minEquationDraft : this.maxEquationDraft) || '';
    const trimmed = raw.trim();
    if (!trimmed) return false;

    // Has % symbol
    if (trimmed.includes('%')) return true;

    // Has target assignment e.g. "CE = " or "Carbon Equivalent = "
    if (/^%?[a-zA-Z0-9_.+ -]+\s*=\s*[^=]/.test(trimmed) && !['>=', '<=', '==', '!='].some(op => trimmed.startsWith(op))) {
      return true;
    }

    // Has canonical formula that differs from trimmed input
    const canonical = field === 'min' ? this.minCanonicalFormula : this.maxCanonicalFormula;
    if (canonical && canonical !== trimmed) {
      return true;
    }

    return false;
  }

  getSuggestedFormula(field: 'min' | 'max'): string {
    return field === 'min' ? this.minCanonicalFormula : this.maxCanonicalFormula;
  }

  applySuggestedFormula(field: 'min' | 'max'): void {
    const canonical = this.getSuggestedFormula(field);
    if (!canonical) return;

    if (field === 'min') {
      this.minEquationDraft = canonical;
      this.validateEquation('min');
    } else {
      this.maxEquationDraft = canonical;
      this.validateEquation('max');
    }

    this.updateCalculatorParameters();
    this.toastService.show(`Unwanted data removed! Actual formula applied: "${canonical}"`, 'success');
  }

  applySuggestedFormulaAndClose(field: 'min' | 'max'): void {
    this.applySuggestedFormula(field);
    this.saveEquation();
  }

  clearEquations(): void {
    this.minEquationDraft = '';
    this.maxEquationDraft = '';
    this.validateEquation('min');
    this.validateEquation('max');
    this.updateCalculatorParameters();
  }

  closeEquationModal(): void {
    this.equationModalVisible = false;
    this.equationModalLine = null;
    this.minEquationDraft = '';
    this.maxEquationDraft = '';
    this.equationParamChips = [];
    this.equationParamSearch = '';
    this.minEquationTokens = [];
    this.minEquationErrors = [];
    this.minEquationValid = true;
    this.minCanonicalFormula = '';
    this.maxEquationTokens = [];
    this.maxEquationErrors = [];
    this.maxEquationValid = true;
    this.maxCanonicalFormula = '';
    this.calcDetectedParams = [];
    this.calcParamValues = {};
    this.calcResult = null;
    this.calcStepPreview = '';
    this.calcError = '';
    this.paramIsCalculated = false;
    this.paramMasterFormula = '';
  }

  getParamMasterFormula(group: AbstractControl): string {
    const stored = (group.get('formulaDisplay')?.value || '').trim();
    if (stored) return stored;
    const paramId = group.get('parameterID')?.value;
    if (paramId) {
      const found = this.chemicalParametersCache.find(p => p.id === paramId) ||
                    this.mechanicalParametersCache.find(p => p.id === paramId);
      if (found) {
        const isCalc = found.additionalValues?.IsCalculated ?? found.isCalculated ?? false;
        const formula = (found.additionalValues?.FormulaDisplay || found.formulaDisplay || '').trim();
        if (isCalc && formula) return formula;
      }
    }
    return '';
  }

  applyMasterFormulaOneClick(target: 'active' | 'min' | 'max' = 'active'): void {
    if (!this.paramMasterFormula?.trim()) {
      this.toastService.show('No master formula defined for this parameter.', 'warning');
      return;
    }

    const raw = this.paramMasterFormula.trim();
    const parsed = this.parseEquationString(raw);
    const formula = (parsed.isValid && parsed.canonicalFormula) ? parsed.canonicalFormula : raw;

    const fieldToSet = target === 'active' ? this.equationActiveField : target;

    if (fieldToSet === 'max') {
      this.maxEquationDraft = formula;
      this.validateEquation('max');
    } else {
      this.minEquationDraft = formula;
      this.validateEquation('min');
    }

    this.updateCalculatorParameters();
    this.toastService.show(`Applied actual formula: "${formula}"`, 'success');
  }

  applyMasterFormulaToRow(group: AbstractControl, gradeIndex: number): void {
    const rawFormula = this.getParamMasterFormula(group);
    if (!rawFormula) {
      this.toastService.show('No master formula found for this parameter.', 'warning');
      return;
    }

    const parsed = this.parseEquationString(rawFormula);
    const formDisp = (parsed.isValid && parsed.canonicalFormula) ? parsed.canonicalFormula : rawFormula;

    const currentMax = group.get('maxEquation')?.value;
    if (currentMax) {
      group.get('maxEquation')?.setValue(formDisp);
      if (!group.get('upperLimitValue')?.value) {
        group.get('upperLimitValue')?.setValue('<=');
      }
    } else {
      group.get('minEquation')?.setValue(formDisp);
      if (!group.get('lowerLimitValue')?.value) {
        group.get('lowerLimitValue')?.setValue('>=');
      }
    }

    group.markAsDirty();
    this.toastService.show(`Applied actual formula "${formDisp}" in 1-click!`, 'success');
  }

  onGridKeydown(event: KeyboardEvent, ri: number, col: 'min' | 'max', tab: string, gradeIndex: number): void {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault();
      
      const linesArray = this.getSpecificationLinesByTab(gradeIndex, tab as any);
      let targetRow = ri;
      let targetCol = col;

      if (event.key === 'ArrowUp') {
        targetRow = Math.max(0, ri - 1);
      } else if (event.key === 'ArrowDown') {
        targetRow = Math.min(linesArray.length - 1, ri + 1);
      } else if (event.key === 'ArrowLeft') {
        if (col === 'max') targetCol = 'min';
      } else if (event.key === 'ArrowRight') {
        if (col === 'min') targetCol = 'max';
      }

      const id = `${targetCol}_${gradeIndex}_${tab}_${targetRow}`;
      const el = document.getElementById(id);
      if (el) {
        el.focus();
        (el as HTMLInputElement).select();
      }
    }
  }

  // ── MS-F: multi-sheet .xlsx template (download) + import with preview ─────────
  importBuilding = false;
  importPreviewVisible = false;
  importPreviewRows: ParsedSpecRow[] = [];

  get importOkCount(): number { return this.importPreviewRows.filter(r => r.status === 'ok').length; }
  get importWarnCount(): number { return this.importPreviewRows.filter(r => r.status === 'warning').length; }
  get importErrorCount(): number { return this.importPreviewRows.filter(r => r.status === 'error').length; }
  get importHasImportable(): boolean { return this.importPreviewRows.some(r => r.status !== 'error'); }

  /** Fetch every master list, then build and download the multi-sheet Excel template. */
  downloadSpecTemplate(): void {
    if (this.importBuilding) return;
    this.importBuilding = true;
    const all = (fn: any) => fn('', 0, 5000);
    forkJoin({
      chemical: all(this.getChemicalParameter),
      mechanical: all(this.getMechanicalParameter),
      units: all(this.getParameterUnitDropdownFn),
      laboratoryTests: all(this.getAllLaboratoryTestFn),
      testMethodSpecs: all(this.getTestMethodSpecification),
      specimenOrientations: all(this.getSpecimenOrientationFn),
      heatTreatments: all(this.getHeatTreatment),
      dimensionalFactors: all(this.getDimensionalFactor),
      productConditions: all(this.getProductCondition),
      productSizes: all(this.getProductSize),
      metalClassifications: all(this.getMetalClassification),
    }).subscribe({
      next: async (m: any) => {
        const tag = (list: any[], section: string) => (list || []).map(x => ({ ...x, section }));
        const masters: SpecMasters = {
          parameters: [...tag(m.chemical, 'Chemical'), ...tag(m.mechanical, 'General')],
          units: m.units || [],
          laboratoryTests: m.laboratoryTests || [],
          testMethodSpecs: m.testMethodSpecs || [],
          specimenOrientations: m.specimenOrientations || [],
          heatTreatments: m.heatTreatments || [],
          dimensionalFactors: m.dimensionalFactors || [],
          productConditions: m.productConditions || [],
          productSizes: m.productSizes || [],
          metalClassifications: m.metalClassifications || [],
        };
        try {
          const blob = await buildSpecTemplate(masters);
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'material-specification-template.xlsx';
          a.click();
          URL.revokeObjectURL(url);
        } catch {
          this.toastService.show('Failed to build template.', 'error');
        } finally {
          this.importBuilding = false;
        }
      },
      error: () => { this.importBuilding = false; this.toastService.show('Failed to load master data for template.', 'error'); },
    });
  }

  onSpecFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const rows = await parseSpecTemplate(reader.result as ArrayBuffer);
        if (!rows.length) { this.toastService.show('No data rows found in the Template sheet.', 'warning'); return; }
        this.importPreviewRows = rows;
        this.importPreviewVisible = true;
      } catch (e: any) {
        this.toastService.show(e?.message || 'Failed to read the Excel file.', 'error');
      } finally {
        input.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  }

  cancelImport(): void {
    this.importPreviewVisible = false;
    this.importPreviewRows = [];
  }

  /** Commit the previewed rows (skipping error rows) into the form, grouped by grade. */
  commitImport(): void {
    const rows = this.importPreviewRows.filter(r => r.status !== 'error');
    if (!rows.length) { this.toastService.show('No importable rows.', 'warning'); return; }

    let added = 0, skipped = 0;
    const byGrade = new Map<string, ParsedSpecRow[]>();
    rows.forEach(r => {
      const key = r.grade.trim().toLowerCase();
      if (!byGrade.has(key)) byGrade.set(key, []);
      byGrade.get(key)!.push(r);
    });

    byGrade.forEach((gradeRows) => {
      const gradeName = gradeRows[0].grade.trim();
      let gIndex = this.grades.controls.findIndex(g => (g.get('grade')?.value || '').trim().toLowerCase() === gradeName.toLowerCase());
      if (gIndex < 0) {
        this.addGrade(false);
        gIndex = this.grades.length - 1;
        const gradeUns = gradeRows[0].unsNo || '';
        this.grades.at(gIndex).patchValue({
          grade: gradeName,
          metalClassificationID: gradeRows[0].metalClassificationID,
          unsSteelNumber: gradeUns,
        });
        if (gradeUns) {
          this.gradeIdentifierValues[gIndex] = { key: 'UNS No', value: gradeUns };
        }
      } else {
        const gradeUns = gradeRows[0].unsNo || '';
        if (gradeUns && !this.grades.at(gIndex).get('unsSteelNumber')?.value) {
          this.grades.at(gIndex).patchValue({ unsSteelNumber: gradeUns });
          if (!this.gradeIdentifierValues[gIndex]?.value) {
            this.gradeIdentifierValues[gIndex] = { key: 'UNS No', value: gradeUns };
          }
        }
      }

      gradeRows.forEach(r => {
        const tab = r.section;
        const lines = this.getSpecificationLinesByTab(gIndex, tab);
        const dup = lines.controls.some(c => c.get('parameterID')?.value === r.parameterID);
        if (dup) { skipped++; return; }
        const group = this.createSpecificationLineFormGroup(tab);
        const lowerOp = r.lowerLimitValue || (r.minEquation ? '≥' : '');
        const upperOp = r.upperLimitValue || (r.maxEquation ? '≤' : '');
        group.patchValue({
          parameterID: r.parameterID,
          parameterName: r.parameterName,
          parameterSymbol: r.parameterSymbol,
          decimalPrecision: r.decimalPrecision,
          parameterUnitID: r.parameterUnitID,
          minValue: r.minValue,
          maxValue: r.maxValue,
          minTolerance: r.minTolerance,
          maxTolerance: r.maxTolerance,
          lowerLimitValue: lowerOp,
          lowerLimitDecimalValue: r.lowerLimitDecimalValue,
          upperLimitValue: upperOp,
          upperLimitDecimalValue: r.upperLimitDecimalValue,
          minEquation: r.minEquation || '',
          maxEquation: r.maxEquation || '',
          notes: r.notes,
          specimenOrientationID: r.specimenOrientationID,
          dimensionalFactorID: r.dimensionalFactorID,
          heatTreatmentID: r.heatTreatmentID,
          productConditionID1: r.productConditionID1,
          productConditionID2: r.productConditionID2,
          productSizeMasterID: r.productSizeMasterID,
          testCondition: r.testCondition,
          testNote: r.testNote,
          laboratoryTestID: r.laboratoryTestID,
        });
        // Test Method Spec matrix → pad to exactly 5 slots.
        const tmArray = group.get('testMethodMapping') as FormArray;
        tmArray.clear();
        for (let s = 0; s < 5; s++) {
          tmArray.push(this.createTestMethodMappingRow(
            r.testMethodSpecIDs[s] != null ? { testMethodSpecificationID: r.testMethodSpecIDs[s] } : undefined
          ));
        }
        this.updateRowControlsState(group);
        lines.push(group);
        if (r.parameterUnitID) this.loadEquivalentUnits(group, Number(r.parameterUnitID), true);
        added++;
      });
    });

    this.grades.markAsDirty();
    if (added) this.selectedGradeIndex = Math.min(this.selectedGradeIndex, this.grades.length - 1);
    let msg = `${added} line(s) imported.`;
    if (skipped) msg += ` ${skipped} duplicate(s) skipped.`;
    this.toastService.show(msg, 'success');
    this.cancelImport();
  }

  // Master dropdown fetchers used to build the template (bound as arrow fns for forkJoin).
  getParameterUnitDropdownFn = (term: string, page: number, pageSize: number): Observable<any[]> =>
    this.prameterUnitService.getGroupedParameterUnitDropdown(term, page, pageSize);
  getSpecimenOrientationFn = (term: string, page: number, pageSize: number): Observable<any[]> =>
    this.specimenService.getSpecimenOrientationDropdown(term, page, pageSize);
  getAllLaboratoryTestFn = (term: string, page: number, pageSize: number): Observable<any[]> =>
    this.laboratoryTestService.getLaboratoryTestDropdown(term, page, pageSize);

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
          this.bindSpecificationData(data);
        },
        error: (error) => {
          console.error('Error fetching material specification:', error);
        },
      });
  }

  /** Binds a specification payload (from load-by-id or clone-template) into the form. */
  bindSpecificationData(data: any) {
          // set header-level fields
          this.MaterialSpecificationForm.patchValue({
            id: data.id,
            standardOrganizationID: data.standardOrganizationID,
            standard: data.standard,
            part: data.part,
            standardYear: data.standardYear,
            specificationNo: data.specificationNo,
            version: data.version,
            displayTitle: data.displayTitle,
            title: data.title,
            aliasName: data.aliasName,
            isCustom: data.isCustom
          });

          // Rebind header parameter template (split by type into Chemical / General tabs)
          this.headerParametersByTab('chemical').clear();
          this.headerParametersByTab('mechanical').clear();
          (data.headerParameters || []).forEach((hp: any) => {
            const tab = hp.type === 'mechanical' ? 'mechanical' : 'chemical';
            const group = this.createHeaderParameterGroup(hp);
            this.headerParametersByTab(tab).push(group);
            // Populate equivalent-unit options for the saved unit (preserve the bound value).
            const savedUnit = hp.defaultParameterUnitID ?? hp.parameterUnitID ?? null;
            if (savedUnit) this.loadEquivalentUnits(group, Number(savedUnit), false);
          });

          // MS-B: rebind identifier config (enabled built-ins + customs)
          this.enabledIdentifiers = {};
          this.customIdentifiers = [];
          try {
            const cfg: Array<{ key: string; label: string; isCustom: boolean }> = JSON.parse(data.identifierConfigJson || '[]');
            cfg.forEach(c => {
              if (c.isCustom) this.customIdentifiers.push({ key: c.key, label: c.label });
              else this.enabledIdentifiers[c.key] = true;
            });
          } catch { /* ignore malformed config */ }

          this.grades.clear();
          this.selectedMetalByGrade = [];
          this.gradeIdentifierValues = [];

          data.grades?.forEach((grade: any) => {
            this.addGrade(false);
            const gradeIndex = this.grades.length - 1;
            const gradeGroup = this.grades.at(gradeIndex);

            this.gradeIdentifierValues[gradeIndex] = this.normalizeGradeIdentifier(grade.identifierValuesJson);

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
                equation: line.equation,
                minEquation: line.minEquation,
                maxEquation: line.maxEquation,
                parameterUnitID: line.parameterUnitID,
                parameterUnitEquivalentID: line.parameterUnitEquivalentID,
                minValueEquation: line.minValueEquation,
                maxValueEquation: line.maxValueEquation,
                minTolerance: line.minTolerance,
                maxTolerance: line.maxTolerance,
                specimenOrientationID: line.specimenOrientationID,
                dimensionalFactorID: line.dimensionalFactorID,
                lowerLimitValue: line.lowerLimitValue,
                upperLimitValue: line.upperLimitValue,
                lowerLimitDecimalValue: line.lowerLimitDecimalValue,
                upperLimitDecimalValue: line.upperLimitDecimalValue,
                heatTreatmentID: line.heatTreatmentID,
                productConditionID1: line.productConditionID1,
                productConditionID2: line.productConditionID2,
                productSizeMasterID: line.productSizeMasterID,
                testCondition: line.testCondition,
                testNote: line.testNote,
                laboratoryTestID: line.laboratoryTestID ?? null,
                laboratoryTestIDs: line.laboratoryTests?.map((lt: any) => lt.laboratoryTestID) || [],
                // Parameter metadata from joined Parameter navigation (for precision/UI only)
                decimalPrecision: line.parameter?.decimalPrecision ?? 2,
                parameterSymbol: line.parameter?.symbol ?? '',
                parameterName: line.parameter?.name ?? '',
                minReportableLimit: line.parameter?.minReportableLimit ?? null,
                inputType: line.parameter?.inputType ?? line.inputType ?? 'Decimal',
                textValue: line.textValue ?? ''
              });
              const paramCache = this.chemicalParametersCache.find((p: any) => p.id === line.parameterID) ||
                                 this.mechanicalParametersCache.find((p: any) => p.id === line.parameterID);
              const dropdownOptions = paramCache?.additionalValues?.DropdownOptions
                || paramCache?.additionalValues?.dropdownOptions
                || line.parameter?.dropdownOptions
                || line.dropdownOptions
                || line.parameterDropdownOptions
                || [];
              lineGroup.patchValue({
                parameterDropdownOptions: dropdownOptions
              });
              // MS-E matrix: rebuild test-method spec slots (pad/truncate to exactly 5)
              const tmArray = lineGroup.get('testMethodMapping') as FormArray;
              tmArray.clear();
              const saved = (line.testMethodMappings || [])
                .slice()
                .sort((a: any, b: any) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
              for (let s = 0; s < 5; s++) tmArray.push(this.createTestMethodMappingRow(saved[s]));
              // Preserve saved textValue before updateRowControlsState (which resets it for numeric types)
              const savedTextValue = line.textValue ?? '';
              this.updateRowControlsState(lineGroup);
              // Restore textValue for non-numeric input types (updateRowControlsState enables the control)
              const resolvedInputType = lineGroup.get('inputType')?.value || 'Decimal';
              if (resolvedInputType !== 'Decimal' && resolvedInputType !== 'Integer' && savedTextValue) {
                lineGroup.get('textValue')?.setValue(savedTextValue, { emitEvent: false });
              }
              formArray.push(lineGroup);
              // Populate equivalent-unit options for the saved unit (preserve the bound value).
              if (line.parameterUnitID) {
                this.loadEquivalentUnits(lineGroup, Number(line.parameterUnitID), false);
              }
            });
          });
  }

  /** Custom spec: Display Title = "{Name} {SpecNo} : {Version}" (no standard organization). */
  generateSpecificationName() {
    const name = this.MaterialSpecificationForm.get('aliasName')?.value || '';
    const specNo = this.MaterialSpecificationForm.get('specificationNo')?.value || '';
    const version = this.MaterialSpecificationForm.get('version')?.value || '';
    const left = `${name} ${specNo}`.trim();
    const display = version ? `${left} : ${version}` : left;
    this.MaterialSpecificationForm.patchValue({ displayTitle: display });
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

    // MS-B: serialize the identifier config (header) + per-grade values
    formattedData.identifierConfigJson = JSON.stringify(this.getActiveIdentifiers());

    // Flatten header parameters {chemical[], mechanical[]} → single list with type set
    const hp = formValue?.headerParameters || { chemical: [], mechanical: [] };
    formattedData.headerParameters = [
      ...(hp.chemical || []).map((p: any) => ({ ...p, type: 'chemical' })),
      ...(hp.mechanical || []).map((p: any) => ({ ...p, type: 'mechanical' })),
    ];

    formattedData.grades = formValue?.grades?.map((grade: any, gi: number) => {
      grade.identifierValuesJson = JSON.stringify(this.gradeIdentifierValues[gi] || {});
      const { chemical = [], mechanical = [], other = [] } = grade.specificationLines || {};
      const combinedSpecificationLines = [...chemical, ...mechanical, ...other].map((line: any) => {
        const { laboratoryTestIDs, laboratoryTests, testMethodMapping, ...rest } = line;
        return {
          ...rest,
          // MS-E matrix: keep only filled Test Method Spec slots; Lab Test lives on the line (laboratoryTestID).
          testMethodMappings: (testMethodMapping || [])
            .map((m: any, idx: number) => ({ testMethodSpecificationID: m.testMethodSpecificationID ?? null, displayOrder: idx + 1 }))
            .filter((m: any) => m.testMethodSpecificationID != null),
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
            this.router.navigate(['/custom-material-specification']);
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
            this.router.navigate(['/custom-material-specification']);
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
    this.generateSpecificationName();
  }
  asFormGroup(control: AbstractControl): FormGroup {
    return control as FormGroup;
  }
  loadParametersCache(): void {
    this.parameterService.getChemicalParameterDropdown('', 1, 5000).subscribe({
      next: (data) => this.chemicalParametersCache = data || []
    });
    this.parameterService.getMechanicalParameterDropdown('', 1, 5000).subscribe({
      next: (data) => this.mechanicalParametersCache = data || []
    });
  }

  @HostListener('window:focus')
  onWindowFocus() {
    this.loadParametersCache();
  }

  getParameter = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.parameterService.getParameterDropdown(term, page, pageSize);
  };
  getChemicalParameter = (term: string, page: number, pageSize: number): Observable<any[]> => {
    const isIdSearch = term && !isNaN(Number(term)) && String(Number(term)) === term.trim();
    if (!this.chemicalParametersCache.length || isIdSearch) {
      return this.parameterService.getChemicalParameterDropdown(term, page, pageSize);
    }
    const filtered = this.chemicalParametersCache.filter(p =>
      (p.name || p.text || '').toLowerCase().includes((term || '').toLowerCase())
    );
    const start = (page - 1) * pageSize;
    return of(filtered.slice(start, start + pageSize));
  };
  getMechanicalParameter = (term: string, page: number, pageSize: number): Observable<any[]> => {
    const isIdSearch = term && !isNaN(Number(term)) && String(Number(term)) === term.trim();
    if (!this.mechanicalParametersCache.length || isIdSearch) {
      return this.parameterService.getMechanicalParameterDropdown(term, page, pageSize);
    }
    const filtered = this.mechanicalParametersCache.filter(p =>
      (p.name || p.text || '').toLowerCase().includes((term || '').toLowerCase())
    );
    const start = (page - 1) * pageSize;
    return of(filtered.slice(start, start + pageSize));
  };
  updateRowControlsState(row: FormGroup): void {
    const inputType = row.get('inputType')?.value || 'Decimal';
    const isNumeric = inputType === 'Decimal' || inputType === 'Integer';

    const numericFields = [
      'minValue',
      'maxValue',
      'minTolerance',
      'maxTolerance',
      'lowerLimitValue',
      'lowerLimitDecimalValue',
      'upperLimitValue',
      'upperLimitDecimalValue',
      'parameterUnitEquivalentID'
    ];

    if (isNumeric) {
      numericFields.forEach(f => {
        row.get(f)?.enable({ emitEvent: false });
      });
      row.get('textValue')?.disable({ emitEvent: false });
      row.get('textValue')?.setValue('', { emitEvent: false });
    } else {
      numericFields.forEach(f => {
        row.get(f)?.disable({ emitEvent: false });
        row.get(f)?.setValue(null, { emitEvent: false });
      });
      row.get('minEquation')?.setValue(null, { emitEvent: false });
      row.get('maxEquation')?.setValue(null, { emitEvent: false });
      row.get('textValue')?.enable({ emitEvent: false });
    }
  }

  onParameterSelected(item: any, gradeIndex: number, index: number, tab: 'chemical' | 'mechanical' | 'other') {
    const lines = this.getSpecificationLinesByTab(gradeIndex, tab);
    if (!item) {
      const specificationLine = lines.at(index) as FormGroup;
      specificationLine.patchValue({ parameterID: null, parameterUnitID: null, parameterUnitEquivalentID: null, inputType: 'Decimal', textValue: '' });
      specificationLine.get('parameterUnitEquivalentID')?.disable();
      return;
    }

    const specificationLine = lines.at(index) as FormGroup;
    const currentParamId = specificationLine.get('parameterID')?.value;
    const isRebind = currentParamId === item.id;

    const additional = item?.additionalValues || {};
    const rawUnit = additional.UnitID ?? additional.unitID ?? null;
    const unitID = rawUnit != null && rawUnit !== '' ? Number(rawUnit) : null;
    const decimalPrecision = Number(additional.DecimalPrecision ?? additional.decimalPrecision ?? 2);
    const parameterSymbol = additional.Symbol || additional.symbol || '';
    const minReportableLimit = additional.MinReportableLimit ?? additional.minReportableLimit ?? null;
    const inputType = additional.InputType || additional.inputType || 'Decimal';

    const dropdownOptions = additional.DropdownOptions || additional.dropdownOptions || [];
    let defaultVal = '';
    if (inputType === 'Dropdown' && dropdownOptions.length > 0) {
      const defaultOption = dropdownOptions.find((o: any) => o.isDefault || o.IsDefault);
      if (defaultOption) {
        defaultVal = defaultOption.value || defaultOption.Value || defaultOption.displayText || defaultOption.DisplayText || '';
      } else {
        defaultVal = dropdownOptions[0].value || dropdownOptions[0].Value || dropdownOptions[0].displayText || dropdownOptions[0].DisplayText || '';
      }
    }

    const isCalculated = additional.IsCalculated ?? additional.isCalculated ?? false;
    const formula = additional.Formula || additional.formula || '';
    const formulaDisplay = additional.FormulaDisplay || additional.formulaDisplay || '';

    const patchPayload: any = {
      parameterID: item.id,
      decimalPrecision,
      parameterSymbol,
      parameterName: item?.name || item?.text || '',
      minReportableLimit,
      inputType,
      isCalculated,
      formula,
      formulaDisplay,
      parameterDropdownOptions: dropdownOptions
    };

    if (!isRebind) {
      patchPayload.textValue = defaultVal;
    }

    specificationLine.patchValue(patchPayload);

    this.updateRowControlsState(specificationLine);

    if (!isRebind) {
      // Round any existing values to new precision
      ['minValue', 'maxValue', 'minValueEquation', 'maxValueEquation', 'minTolerance', 'maxTolerance']
        .forEach(f => this.roundToPrecision(specificationLine, f));
    }

    // API call: fetch equivalent units for this parameter's default unit + bind it.
    // Kept enabled so the user can switch among equivalents when there is more than one.
    this.loadEquivalentUnits(specificationLine, unitID, !isRebind);
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

  /**
   * Fetch equivalent units for a row's unit from the API and cache them per row.
   * @param setSelected when true (fresh parameter pick) also selects the default unit;
   *        when false (load/rebind) preserves the already-bound parameterUnitID.
   */
  loadEquivalentUnits(group: AbstractControl, unitId: number | null, setSelected: boolean): void {
    const isSpecLine = group.get('minValue') !== null;
    if (!unitId) {
      this.equivalentUnitsByRow.set(group, []);
      if (setSelected) {
        group.get('parameterUnitID')?.setValue(null);
        group.get('parameterUnitEquivalentID')?.setValue(null);
      }
      if (isSpecLine) {
        group.get('parameterUnitEquivalentID')?.disable();
      }
      return;
    }
    // On a fresh parameter pick: base unit = parameterUnitID, equivalent = null (base) by default.
    if (setSelected) {
      group.get('parameterUnitID')?.setValue(Number(unitId));
      group.get('parameterUnitEquivalentID')?.setValue(null);
    }
    if (isSpecLine) {
      group.get('parameterUnitEquivalentID')?.enable();
    }
    this.prameterUnitService.getEquivalentUnits(unitId).subscribe({
      next: (units: any[]) => this.equivalentUnitsByRow.set(group, units || []),
      error: () => this.equivalentUnitsByRow.set(group, []),
    });
  }

  /** Equivalent-unit options for a row (API-fetched, cached). */
  getRowEquivalentUnits(group: AbstractControl): any[] {
    return this.equivalentUnitsByRow.get(group) || [];
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

  // ─── MS-E: Laboratory Test dropdowns (chemical vs general) ───
  getChemicalLaboratoryTest = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.laboratoryTestService.getLaboratoryTestDropdownForChemicals(term, page, pageSize);
  };
  getGeneralLaboratoryTest = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.laboratoryTestService.getLaboratoryTestDropdownForGeneral(term, page, pageSize);
  };

  // ─── MS-D: Product Size band dropdown ───
  getProductSize = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.productSizeMasterService.getProductSizeDropdown(term, page, pageSize);
  };
  onProductSizeSelected(item: any, group: AbstractControl): void {
    group.get('productSizeMasterID')?.setValue(item?.id ?? null);
  }

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
