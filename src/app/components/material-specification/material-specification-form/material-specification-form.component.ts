import { CommonModule } from '@angular/common';
import { Component, OnInit, HostListener, ChangeDetectorRef, signal } from '@angular/core';
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

@Component({
  selector: 'app-material-specification-form',
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
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

  activeLineKey = signal<string | null>(null);
  lineKey(gi: number, tab: string, i: number): string { return `${gi}-${tab}-${i}`; }


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

  /** Base grade name (user-typed part, without displayTitle prefix or identifier suffix). */
  gradeBaseNames: string[] = [];

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
    private toastService: ToastService,
    private unsavedChangesService: UnsavedChangesService,
    private cdr: ChangeDetectorRef) { }

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
    }
    // No auto-grade on create — user adds grades manually after setting up header parameters
  }

  initForm() {
    this.MaterialSpecificationForm = this.fb.group({
      id: [0],
      standardOrganizationID: ['', Validators.required],
      standard: [''],
      part: [''],
      standardYear: ['', Validators.required],
      specificationNo: ['', [Validators.required, Validators.maxLength(100)]],
      version: [''],
      displayTitle: [''],
      title: ['', [Validators.maxLength(300)]],
      identifierConfigJson: [''],
      aliasName: [{ value: '', disabled: true }, [Validators.maxLength(200)]],
      isCustom: [false],
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

  /** Label for an identifier key (built-in or custom). Splits by space and returns only the first word. */
  getIdentifierLabel(key: string): string {
    const fullLabel = this.getActiveIdentifiers().find(i => i.key === key)?.label ?? key;
    return fullLabel.split(' ')[0] || fullLabel;
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
    // API call: fetch equivalent units for this parameter's default unit + bind it.
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
    // Auto-compose initial grade name from display title if user hasn't typed anything yet.
    this.gradeBaseNames[newIndex] = '';
    if (seedFromHeader) {
      this.composeGradeName(newIndex);
    }
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
  // Authors a conditional formula that computes min/max from OTHER parameters'
  // runtime values. The stored expression is evaluated during test-result entry
  // (the runtime evaluator is a separate test-phase task — this only authors it).
  equationModalVisible = false;
  equationModalLine: FormGroup | null = null;
  minEquationDraft = '';
  maxEquationDraft = '';
  equationActiveField: 'min' | 'max' = 'min'; // which textarea chips/operators insert into
  equationParamChips: Array<{ symbol: string; name: string }> = [];
  equationOperators: string[] = ['+', '-', '*', '/', '(', ')', '>', '<', '>=', '<=', '==', ', ', 'IF(', 'MIN(', 'MAX(', 'specMax(', 'specMin('];

  openEquationModal(group: AbstractControl, gradeIndex: number): void {
    this.equationModalLine = group as FormGroup;
    this.minEquationDraft = group.get('minEquation')?.value || '';
    this.maxEquationDraft = group.get('maxEquation')?.value || '';
    this.equationActiveField = 'min';
    // Available references = every other parameter in this grade (both tabs) that has a symbol.
    const chips: Array<{ symbol: string; name: string }> = [];
    (['chemical', 'mechanical'] as const).forEach(t => {
      this.getSpecificationLinesByTab(gradeIndex, t).controls.forEach(c => {
        const symbol = c.get('parameterSymbol')?.value;
        const name = c.get('parameterName')?.value;
        if (symbol && !chips.some(x => x.symbol === symbol)) chips.push({ symbol, name: name || symbol });
      });
    });
    this.equationParamChips = chips;
    this.equationModalVisible = true;
  }
  insertEquationToken(token: string): void {
    if (this.equationActiveField === 'max') this.maxEquationDraft = (this.maxEquationDraft || '') + token;
    else this.minEquationDraft = (this.minEquationDraft || '') + token;
  }
  saveEquation(): void {
    this.equationModalLine?.get('minEquation')?.setValue(this.minEquationDraft?.trim() || null);
    this.equationModalLine?.get('maxEquation')?.setValue(this.maxEquationDraft?.trim() || null);
    this.equationModalLine?.markAsDirty();
    this.closeEquationModal();
  }
  closeEquationModal(): void {
    this.equationModalVisible = false;
    this.equationModalLine = null;
    this.minEquationDraft = '';
    this.maxEquationDraft = '';
    this.equationParamChips = [];
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
          parameters: [...tag(m.chemical, 'chemical'), ...tag(m.mechanical, 'mechanical')],
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
        this.grades.at(gIndex).patchValue({ grade: gradeName, metalClassificationID: gradeRows[0].metalClassificationID });
      }
      gradeRows.forEach(r => {
        const tab = r.section;
        const lines = this.getSpecificationLinesByTab(gIndex, tab);
        const dup = lines.controls.some(c => c.get('parameterID')?.value === r.parameterID);
        if (dup) { skipped++; return; }
        const group = this.createSpecificationLineFormGroup(tab);
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
          lowerLimitValue: r.lowerLimitValue,
          lowerLimitDecimalValue: r.lowerLimitDecimalValue,
          upperLimitValue: r.upperLimitValue,
          upperLimitDecimalValue: r.upperLimitDecimalValue,
          minEquation: r.minEquation,
          maxEquation: r.maxEquation,
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
    this.prameterUnitService.getParameterUnitDropdown(term, page, pageSize);
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
    // Detach CD during bulk rebuild to avoid thousands of change-detection cycles
    this.cdr.detach();

    // ── 1.  Set header-level fields ──────────────────────────────────
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

    // ── 2.  Rebind header parameter template ─────────────────────────
    // Collect { tabIndex, group } for header param rows to map to equivalent units later.
    const headerEquivRows: Array<{ group: AbstractControl; unitId: number }> = [];
    this.headerParametersByTab('chemical').clear();
    this.headerParametersByTab('mechanical').clear();
    (data.headerParameters || []).forEach((hp: any) => {
      const tab = hp.type === 'mechanical' ? 'mechanical' : 'chemical';
      const group = this.createHeaderParameterGroup(hp);
      this.headerParametersByTab(tab).push(group);
      const savedUnit = hp.defaultParameterUnitID ?? hp.parameterUnitID ?? null;
      if (savedUnit) {
        headerEquivRows.push({ group, unitId: Number(savedUnit) });
      }
    });

    // ── 3.  Rebind identifier config ─────────────────────────────────
    this.enabledIdentifiers = {};
    this.customIdentifiers = [];
    try {
      const cfg: Array<{ key: string; label: string; isCustom: boolean }> = JSON.parse(data.identifierConfigJson || '[]');
      cfg.forEach(c => {
        if (c.isCustom) this.customIdentifiers.push({ key: c.key, label: c.label });
        else this.enabledIdentifiers[c.key] = true;
      });
    } catch { /* ignore malformed config */ }

    // ── 4.  Rebind grades + specification lines ──────────────────────
    // Keep a flat list of { group, unitId } pairs for batch equivalent-unit fetch.
    const equivRows: Array<{ group: AbstractControl; unitId: number }> = [...headerEquivRows];

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
          decimalPrecision: line.parameter?.decimalPrecision ?? 2,
          parameterSymbol: line.parameter?.symbol ?? '',
          parameterName: line.parameter?.name ?? '',
          minReportableLimit: line.parameter?.minReportableLimit ?? null,
          inputType: line.parameter?.inputType ?? line.inputType ?? 'Decimal',
          textValue: line.textValue ?? ''
        });
        const paramCache = this.chemicalParametersCache.find(p => p.id === line.parameterID) ||
                           this.mechanicalParametersCache.find(p => p.id === line.parameterID);
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
        this.updateRowControlsState(lineGroup);
        // Ensure textValue is properly bound for non-numeric types after updateRowControlsState
        const inputType = lineGroup.get('inputType')?.value || 'Decimal';
        if (inputType !== 'Decimal' && inputType !== 'Integer' && line.textValue) {
          lineGroup.get('textValue')?.setValue(String(line.textValue), { emitEvent: false });
        }
        formArray.push(lineGroup);
        if (line.parameterUnitID) {
          equivRows.push({ group: lineGroup, unitId: Number(line.parameterUnitID) });
        }
      });
    });

    // Reattach change detection so the form renders the loaded data instantly (removes blank page freeze).
    this.cdr.reattach();
    this.cdr.detectChanges();

    // ── 5.  Batch-fetch equivalent units (deduplicated) ──────────────
    if (equivRows.length) {
      const uniqueUnitIds = [...new Set(equivRows.map(r => r.unitId))];
      const unitObs: { [unitId: number]: Observable<any[]> } = {};
      uniqueUnitIds.forEach(uid => {
        unitObs[uid] = this.prameterUnitService.getEquivalentUnits(uid);
      });
      forkJoin(unitObs).subscribe({
        next: (results: any) => {
          equivRows.forEach(r => {
            const units = results[r.unitId] || [];
            this.equivalentUnitsByRow.set(r.group, units);
          });
          this.cdr.detectChanges();
        },
        error: () => {
          equivRows.forEach(r => this.equivalentUnitsByRow.set(r.group, []));
          this.cdr.detectChanges();
        }
      });
    }

    // ── 6.  Fetch standard org details (fire-and-forget) ──────
    if (this.selectedStandardOrganization == null) {
      this.selectedStandardOrganization = { id: data.standardOrganizationID, name: data.standard };
    }
  }

  generateSpecificationName() {
    const orgName  = this.selectedStandardOrganization?.name || '';
    const specNo   = this.MaterialSpecificationForm.get('specificationNo')?.value || '';
    const part     = this.MaterialSpecificationForm.get('part')?.value || '';
    const version  = this.MaterialSpecificationForm.get('version')?.value || '';

    // aliasName (backend uniqueness key): "{Org} {SpecNo}" + optional part
    let alias = `${orgName} ${specNo}`.trim();
    if (part) alias += ` ${part}`;
    if (alias) this.MaterialSpecificationForm.patchValue({ aliasName: alias });

    // Display Title: "{Org} {SpecNo}-{Part}:{Year} {Version}"  e.g. "IS 1234 1608-1:2020"
    const year = this.MaterialSpecificationForm.get('standardYear')?.value || '';
    let displayTitle = orgName;
    if (part) {
      displayTitle += ` ${specNo}-${part}`;
      const yearVersion = [year, version].filter(v => v.trim() !== '').join(' ');
      if (yearVersion) {
        displayTitle += `:${yearVersion}`;
      }
    } else {
      const parts = [specNo, year, version].filter(v => v.trim() !== '');
      if (parts.length) {
        displayTitle += ' ' + parts.join(' ');
      }
    }
    this.MaterialSpecificationForm.patchValue({ displayTitle: displayTitle.trim() });
  }

  /** Save just the header parameters (partial save — grades optional). Stays on page after save. */
  saveParameterList() {
    this.submitted = true;
    FormValidationHelper.markAllTouched(this.MaterialSpecificationForm);
    const formValue = this.MaterialSpecificationForm.getRawValue();
    const formattedData = this.formatedPayload(formValue);

    const isNew = !this.materialSpecificationId;

    if (!isNew) {
      // Edit mode: update in place
      this.materialSpecificationService.updateMaterialSpecification(formattedData).subscribe({
        next: (response) => {
          this.toastService.show(response.message || 'Parameters saved.', 'success');
          this.MaterialSpecificationForm.markAsPristine();
        },
        error: (error) => this.toastService.show(error?.error?.message || 'Save failed.', 'error'),
      });
    } else {
      // Create mode: save for the first time, then switch to edit mode without redirecting
      this.materialSpecificationService.createMaterialSpecification(formattedData).subscribe({
        next: (response) => {
          this.toastService.show(response.message || 'Parameters saved.', 'success');
          const newId = response.id;
          if (newId) {
            this.materialSpecificationId = Number(newId);
            this.isEditMode = true;
            this.MaterialSpecificationForm.patchValue({ id: this.materialSpecificationId });
            // Update URL to edit route without full navigation (keeps form state)
            this.router.navigate(['/material-specification/edit', this.materialSpecificationId], {
              replaceUrl: true,
              state: { mode: 'edit' },
            });
          }
          this.MaterialSpecificationForm.markAsPristine();
        },
        error: (error) => this.toastService.show(error?.error?.message || 'Save failed.', 'error'),
      });
    }
  }

  /** Returns how many header parameters of a given tab are missing from a grade's spec lines. */
  getMissingHeaderParamsCount(gradeIndex: number, tab: 'chemical' | 'mechanical'): number {
    const headerIds = this.headerParametersByTab(tab).controls
      .map(c => c.get('parameterID')?.value)
      .filter(id => id != null && id !== '' && id !== null);
    if (!headerIds.length) return 0;
    const gradeLineIds = this.getSpecificationLinesByTab(gradeIndex, tab).controls
      .map(c => c.get('parameterID')?.value);
    return headerIds.filter(id => !gradeLineIds.includes(id)).length;
  }

  /** Returns true if the grade is missing any header parameters (either tab). */
  hasMissingHeaderParams(gradeIndex: number): boolean {
    return this.getMissingHeaderParamsCount(gradeIndex, 'chemical') > 0
        || this.getMissingHeaderParamsCount(gradeIndex, 'mechanical') > 0;
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
        defaultVal = String(defaultOption.value ?? defaultOption.Value ?? defaultOption.displayText ?? defaultOption.DisplayText ?? '');
      }
    } else if (inputType === 'Boolean') {
      defaultVal = '';
    }

    const patchPayload: any = {
      parameterID: item.id,
      decimalPrecision,
      parameterSymbol,
      parameterName: item?.name || item?.text || '',
      minReportableLimit,
      inputType,
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

  /**
   * Compose the full grade name for a given grade index:
   *   "{displayTitle} Grade {baseName} {IdentifierLabel} {IdentifierValue}"
   * Stores the user-typed base name separately (gradeBaseNames) so re-composition
   * doesn't overwrite manual edits, only appends/changes the identifier suffix.
   */
  composeGradeName(gi: number): void {
    const displayTitle = this.MaterialSpecificationForm.get('displayTitle')?.value || '';
    const baseName = this.gradeBaseNames[gi] || '';
    const idf = this.gradeIdentifierValues[gi];
    let composed = displayTitle.trim() ? `${displayTitle} Grade` : 'Grade';
    if (baseName.trim()) composed += ` ${baseName.trim()}`;
    if (idf?.key && idf?.value?.trim()) {
      const label = this.getIdentifierLabel(idf.key);
      composed += ` ${label} ${idf.value.trim()}`;
    }
    this.grades.at(gi).patchValue({ grade: composed }, { emitEvent: false });
  }

  /** Called when user types in the grade field — captures the base name, then re-composes. */
  onGradeInput(gi: number, value: string): void {
    const displayTitle = this.MaterialSpecificationForm.get('displayTitle')?.value || '';
    const prefix = displayTitle.trim() ? `${displayTitle} Grade ` : 'Grade ';
    // Extract typed text after the prefix
    let typed = value;
    if (typed.startsWith(prefix)) typed = typed.substring(prefix.length);
    // Strip any identifier suffix at the end (e.g. " UNS K92460")
    const idf = this.gradeIdentifierValues[gi];
    if (idf?.key && idf?.value?.trim()) {
      const idfLabel = this.getIdentifierLabel(idf.key);
      const idfSuffix = ` ${idfLabel} ${idf.value.trim()}`;
      if (typed.endsWith(idfSuffix)) typed = typed.substring(0, typed.length - idfSuffix.length);
    }
    this.gradeBaseNames[gi] = typed.trim();
  }

  /** Called when grade identifier key or value changes — re-compose the grade name. */
  onGradeIdentifierChange(gi: number): void {
    this.composeGradeName(gi);
  }

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

  // Column group scroll offsets: scrollLeft = column_start_px − sticky_width(254px)
  readonly specSections = [
    { label: 'Values',      offset: 0    },
    { label: 'Tolerances',  offset: 680  },
    { label: 'Setup',       offset: 1020 },
    { label: 'Limits',      offset: 1360 },
    { label: 'Conditions',  offset: 1700 },
    { label: 'Product',     offset: 2210 },
  ];

  scrollToSection(gi: number, tab: string, offset: number) {
    const container = document.getElementById(`scroll-${tab}-${gi}`);
    if (container) container.scrollTo({ left: offset, behavior: 'smooth' });
  }

  scrollStep(gi: number, tab: string, dir: 'left' | 'right') {
    const container = document.getElementById(`scroll-${tab}-${gi}`);
    if (container) container.scrollBy({ left: dir === 'right' ? 170 : -170, behavior: 'smooth' });
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
