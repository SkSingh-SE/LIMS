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
import { Observable, forkJoin } from 'rxjs';
import { CanComponentDeactivate } from '../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../services/unsaved-changes.service';
import { noWhitespaceValidator } from '../../../utility/validators/custom-validators';
import { FormValidationHelper } from '../../../utility/helper/form-validation.helper';
import { FormFieldErrorComponent } from '../../../utility/components/form-field-error/form-field-error.component';
import { buildSpecTemplate, parseSpecTemplate, ParsedSpecRow, SpecMasters } from '../spec-template-excel.helper';

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
    row.patchValue({ parameterID: item.id, defaultParameterUnitID: unitID });
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
        });
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

  addGrade(seedFromHeader: boolean = true) {
    const gradeGroup = this.fb.group({
      id: [0],
      specificationHeaderID: [this.MaterialSpecificationForm.get('id')?.value || 0],
      grade: ['', Validators.required],
      isUNS: [false],
      unsSteelNumber: [''],
      metalClassificationID: [null],
      identifierValuesJson: [''],
      specificationLines: this.fb.group({
        chemical: this.fb.array([]),
        mechanical: this.fb.array([]),
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
    this.removeGrade(index);
    if (this.selectedGradeIndex >= this.grades.length) {
      this.selectedGradeIndex = Math.max(0, this.grades.length - 1);
    }
  }

  /** MS-B: legacy UNS/Steel validator no longer applies (field replaced by grade identifiers). */
  private updateUnsSteelValidation(): void {
    this.grades.controls.forEach(grade => {
      const ctrl = grade.get('unsSteelNumber');
      ctrl?.clearValidators();
      ctrl?.updateValueAndValidity();
    });
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
      parameterUnitEquivalentID: [null],
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
      minReportableLimit: [null]
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
                minReportableLimit: line.parameter?.minReportableLimit ?? null
              });
              // MS-E matrix: rebuild test-method spec slots (pad/truncate to exactly 5)
              const tmArray = lineGroup.get('testMethodMapping') as FormArray;
              tmArray.clear();
              const saved = (line.testMethodMappings || [])
                .slice()
                .sort((a: any, b: any) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
              for (let s = 0; s < 5; s++) tmArray.push(this.createTestMethodMappingRow(saved[s]));
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
    const rawUnit = additional.UnitID ?? additional.unitID ?? null;
    const unitID = rawUnit != null && rawUnit !== '' ? Number(rawUnit) : null;
    const decimalPrecision = Number(additional.DecimalPrecision ?? additional.decimalPrecision ?? 2);
    const parameterSymbol = additional.Symbol || additional.symbol || '';
    const minReportableLimit = additional.MinReportableLimit ?? additional.minReportableLimit ?? null;

    specificationLine.patchValue({
      parameterID: item.id,
      decimalPrecision,
      parameterSymbol,
      parameterName: item?.name || item?.text || '',
      minReportableLimit
    });

    // Round any existing values to new precision
    ['minValue', 'maxValue', 'minValueEquation', 'maxValueEquation', 'minTolerance', 'maxTolerance']
      .forEach(f => this.roundToPrecision(specificationLine, f));

    // API call: fetch equivalent units for this parameter's default unit + bind it.
    // Kept enabled so the user can switch among equivalents when there is more than one.
    this.loadEquivalentUnits(specificationLine, unitID, true);
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
    if (!unitId) {
      this.equivalentUnitsByRow.set(group, []);
      if (setSelected) {
        group.get('parameterUnitID')?.setValue(null);
        group.get('parameterUnitEquivalentID')?.setValue(null);
      }
      return;
    }
    // On a fresh parameter pick: base unit = parameterUnitID, equivalent = null (base) by default.
    if (setSelected) {
      group.get('parameterUnitID')?.setValue(Number(unitId));
      group.get('parameterUnitEquivalentID')?.setValue(null);
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
