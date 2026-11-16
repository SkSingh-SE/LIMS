import { ChangeDetectorRef, Component, EventEmitter, HostBinding, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DecimalOnlyDirective } from '../../../utility/directives/decimal-only.directive';
import { TestStatusBadgeComponent } from '../test-status-badge/test-status-badge.component';
import { formatFormulaDisplay } from '../../../utility/helper/formula.helper';
import { SearchableDropdownComponent } from '../../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { ConfirmDialogComponent } from '../../../utility/components/confirm-dialog/confirm-dialog.component';
import { Observable, of } from 'rxjs';
import { ParameterService } from '../../../services/parameter.service';
import { MaterialSpecificationService } from '../../../services/material-specification.service';
import { formatBand } from '../../../utility/helper/spec-condition.helper';
import { normalizeLayoutConfig } from '../../../utility/helper/test-layout-config.helper';

/** Section types this screen can draw (canonical names, after normalizeLayoutConfig). */
export const SUPPORTED_SECTION_TYPES: ReadonlySet<string> = new Set([
  'parameter', 'specimen', 'reading', 'location', 'condition', 'rule', 'traverse', 'chart', 'photo',
  'formula', 'narrative', 'checklist', 'traceability', 'opinion', 'sign', 'classification', 'custom',
]);
import { ToastService } from '../../../services/toast.service';
import {
  addSpecimenRows,
  insertPositionForSpecimen,
  matchingRowInSpecimen,
  removeParameterRows,
  removeSpecimenRows,
  rowRemovalMessage,
  rowRemovalReason,
  rowsOfSpecimen,
  rowsOrderedBySpecimen,
  rowValuesOf,
  specimenIndexesOf,
  specimenRemovalMessage,
  SpecimenRowStore,
} from './specimen-grouping';
import {
  buildTensileRoleIndex,
  DERIVED_TENSILE_ROLES,
  DIMENSION_ROLES,
  isSpecimenRole,
  parseTensileNumber,
  planTensileWrites,
  readTensileValues,
  recalcTensileSpecimen,
  RECALC_TRIGGER_ROLES,
  resolveTensileRole,
  roleOfRow,
  savedHandTypedRoles,
  SpecimenRole,
  tensileArea,
  tensileDependents,
  TensileRoleIndex,
  TensileValues,
} from './tensile-parameter-roles';

export interface SpecimenData {
  id: string;
  thickness?: number | null;
  width?: number | null;
  diameter?: number | null;
  gaugeLength?: number | null;
  area?: number | null;
  yieldLoad?: number | null;
  peakLoad?: number | null;
  finalLength?: number | null;
  finalArea?: number | null;
  proofStress?: number | null;
  uts?: number | null;
  elongation?: number | null;
  reductionOfArea?: number | null;
}

export interface TraversePoint {
  distance: number;
  hardness: number | null;
}

export interface ChecklistItem {
  id: number;
  label: string;
  /** '' = not answered yet; nothing is pre-ticked for the analyst. */
  status: 'Pass' | 'Fail' | 'NA' | '';
}

export interface LocationData {
  id?: number;
  locationCode: string;
  locationName: string;
  displayOrder: number;
  isReportable: boolean;
  remarks?: string;
}

export interface ObservationData {
  id?: number;
  category: string;
  observationText: string;
  displayOrder: number;
  isReportable: boolean;
}

export interface DecisionRuleData {
  ruleType: string;
  confidenceLevel: number;
  guardBandMultiplier: number;
  acceptanceStatus: 'Pass' | 'Fail' | 'Inconclusive' | 'Conditional' | '';
  statementText: string;
}

export interface ClassificationData {
  classificationStandard: string;
  ratingType: string;
  selectedCategory: string;
  severity: string;
  remarks: string;
}

export interface CustomAttribute {
  key: string;
  value: string;
}

@Component({
  selector: 'app-configured-test-layout-renderer',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ConfirmDialogComponent,
    RouterModule,
    DecimalOnlyDirective,
    TestStatusBadgeComponent,
    SearchableDropdownComponent
  ],
  templateUrl: './configured-test-layout-renderer.component.html',
  styleUrls: ['./configured-test-layout-renderer.component.css']
})
export class ConfiguredTestLayoutRendererComponent implements OnInit, OnChanges {
  @Input() layoutConfig: any = null;
  @Input() testPlan: any = null;
  @Input() test: any = null;
  @Input() testFormGroup!: FormGroup;
  @Input() sample: any = null;
  @Input() inward: any = null;
  @Input() isViewMode: boolean = false;
  @Input() isLocked: boolean = false;
  @Input() environmentData: any = null;
  @Input() timingData: any = null;
  @Input() selectedEquipment: any[] = [];
  @Input() testImages: any[] = [];
  @Input() activeTabSection: 'all' | 'parameters' | 'execution' | 'calculations' | 'info' = 'all';
  /**
   * Raw data sheet: shows the saved test in the same layout, read-only. In this mode the component never writes to the
   * form or to the test object and never emits, so a second instance can sit next to the live result screen.
   */
  @Input() printMode = false;
  @HostBinding('class.print-mode') get printModeClass(): boolean { return this.printMode; }

  @Output() paramValueChanged = new EventEmitter<{ rowIdx: number; param: any }>();
  @Output() unitChanged = new EventEmitter<{ rowIdx: number }>();
  @Output() formulaRequested = new EventEmitter<{ rowIdx: number; param: any }>();
  @Output() environmentRequested = new EventEmitter<void>();
  @Output() equipmentRequested = new EventEmitter<void>();
  @Output() multipleReadingsRequested = new EventEmitter<{ rowIdx: number; param: any }>();
  @Output() photoUploadRequested = new EventEmitter<void>();
  @Output() parametersAdjusted = new EventEmitter<void>();
  @Output() specimenCountChanged = new EventEmitter<number>();

  // Parsed sections array
  sections: any[] = [];

  // Specimen filter state: 'all' or 1, 2, 3...
  selectedSpecimenFilter: number | 'all' = 'all';

  // Specimen matrix state
  specimens: SpecimenData[] = [];
  /** Derived rows (area, stresses, elongation, RA) the user typed into in this session; the calculation never overwrites them. */
  private userTypedDerivedRows = new WeakSet<AbstractControl>();
  specimenAverages: {
    proofStress: number | null;
    uts: number | null;
    elongation: number | null;
    reductionOfArea: number | null;
    area: number | null;
  } = { proofStress: null, uts: null, elongation: null, reductionOfArea: null, area: null };

  // Quick-Add Parameter modal state
  showAddParamModal = false;
  selectedParamDropdownItem: any = null;
  /** Grade the parameter comes from (the test's own grade by default, changeable, may be cleared). */
  paramGrade: { id: number; name: string } | null = null;
  /** The chosen grade's lines for this kind of test: they decide which parameters are offered and their limits. */
  private gradeParamLines: any[] = [];
  /** Spec line the new row's limit comes from (saved with the row), and a hint when no single line fits. */
  private newParamLineId: number | null = null;
  paramLimitHint = '';
  /** Another grade with several limits for one parameter (size band, heat treatment, ...): the user picks the one that applies. */
  paramLineChoices: { id: number; label: string; min: number | null; max: number | null; note: string }[] = [];
  paramLineChoiceItem: { id: number; name: string } | null = null;
  newParamData: {
    parameterID: number | null;
    parameterName: string;
    unit: string;
    inputType: string;
    minValue: number | null;
    maxValue: number | null;
    acceptanceCriteria: string;
    testMethodUsed: string;
    applyTo: 'all' | 'current';
    isReportable: boolean;
    decimalPrecision: number;
    dropdownOptions: any[];
  } = {
    parameterID: null,
    parameterName: '',
    unit: '',
    inputType: 'Decimal',
    minValue: null,
    maxValue: null,
    acceptanceCriteria: '',
    testMethodUsed: '',
    applyTo: 'all',
    isReportable: true,
    decimalPrecision: 2,
    dropdownOptions: []
  };

  // Multi-reading state
  readingValues: Record<string, (number | null)[]> = {};
  readingStats: Record<string, { avg: number | null; min: number | null; max: number | null; stdev: number | null; median?: number | null }> = {};

  // Case depth traverse state
  traversePoints: TraversePoint[] = [
    { distance: 0.1, hardness: null },
    { distance: 0.2, hardness: null },
    { distance: 0.4, hardness: null },
    { distance: 0.6, hardness: null },
    { distance: 0.8, hardness: null },
    { distance: 1.0, hardness: null }
  ];
  effectiveCaseDepth: number | null = null;
  cutoffLimit: number = 550; // HV

  // Checklist state
  // Items come from the layout (tableRows) or the saved test; nothing is pre-filled or pre-ticked
  checklistItems: ChecklistItem[] = [];

  // Custom condition values
  conditionValues: Record<string, any> = {};

  // Hybrid Relational Collections & Extra state
  locations: LocationData[] = [];
  observations: ObservationData[] = [];
  // Empty until the analyst fills them: no demo rule, rating or machine data is saved with a result
  decisionRule: DecisionRuleData = {
    ruleType: '',
    confidenceLevel: 95,
    guardBandMultiplier: 1.0,
    acceptanceStatus: '',
    statementText: ''
  };
  classification: ClassificationData = {
    classificationStandard: '',
    ratingType: '',
    selectedCategory: '',
    severity: '',
    remarks: ''
  };
  customAttributes: CustomAttribute[] = [];

  // Opinion & Interpretation state
  opinionData: {
    items: { label: string; formulaDisplay?: string; unit?: string; requirement?: string; value: string; status?: string }[];
    overallStatement: string;
    isOptional: boolean;
  } = {
    items: [],
    overallStatement: '',
    isOptional: true
  };

  // Active section mapping name
  componentNames: Record<string, string> = {
    parameter: 'Parameters Table',
    param: 'Parameters Table',
    specimen: 'Specimen Matrix',
    spm: 'Specimen Matrix',
    reading: 'Multi-Reading Matrix',
    condition: 'Test Conditions',
    cond: 'Test Conditions',
    traverse: 'Hardness Traverse',
    chart: 'Curve / Chart',
    graph: 'Curve / Chart',
    formula: 'Derived Calculations',
    calc: 'Derived Calculations',
    narrative: 'Remarks & Statements',
    rem: 'Remarks & Statements',
    checklist: 'Quality Checklist',
    photo: 'Micrograph Gallery',
    location: 'Location Survey',
    loc: 'Location Survey',
    traceability: 'Context & Traceability',
    hdr: 'Context Header',
    sign: 'Sign-off Block',
    rule: 'Decision Rule',
    decision: 'Decision Rule',
    classification: 'Material Classification',
    class: 'Material Classification',
    custom: 'Custom Attributes',
    attrs: 'Custom Attributes',
    opinion: 'Opinion & Interpretation'
  };

  constructor(
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private parameterService: ParameterService,
    private materialSpecService: MaterialSpecificationService,
    private toastService: ToastService
  ) {}

  fetchGradeDropdown = (searchTerm: string, page: number, pageSize: number) => {
    return this.materialSpecService.getGradeDropdown(searchTerm, page, pageSize);
  };

  /** With a grade: only the parameters that grade defines for this test. Without: the whole parameter master. */
  fetchParametersDropdown = (searchTerm: string, page: number, pageSize: number): Observable<any[]> => {
    if (!this.paramGrade) return this.parameterService.getParameterDropdown(searchTerm, page, pageSize);
    const term = (searchTerm || '').toLowerCase().trim();
    const seen = new Set<number>();
    const items: any[] = [];
    for (const l of this.gradeParamLines) {
      const id = Number(l.parameterID);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      if (!term || String(l.parameterName || '').toLowerCase().includes(term)) items.push({ id, name: l.parameterName || `Parameter #${id}` });
    }
    return of(items.slice(page * pageSize, (page + 1) * pageSize));
  };

  private limitLabel(min: number | null | undefined, max: number | null | undefined): string {
    if (min != null && max != null) return `${min} – ${max}`;
    if (min != null) return `≥ ${min}`;
    if (max != null) return `≤ ${max}`;
    return '';
  }

  /** A parameter with several limits in another grade cannot be added before one is chosen. */
  get paramNeedsLineChoice(): boolean {
    return this.paramLineChoices.length > 0 && !this.newParamLineId;
  }

  private get paramTestKind(): 'chemical' | 'general' {
    return this.testPlan?.type === 'Chemical' ? 'chemical' : 'general';
  }

  private loadGradeParamLines(gradeId: number | null): void {
    this.gradeParamLines = [];
    if (!gradeId) { this.cdr.markForCheck(); return; }
    this.materialSpecService.getConditionOptions(gradeId, null, null, null, this.paramTestKind).subscribe({
      next: (lines: any[]) => { this.gradeParamLines = lines || []; this.cdr.markForCheck(); },
      error: () => { this.gradeParamLines = []; this.toastService.show('Could not load the parameters of this grade', 'error'); this.cdr.markForCheck(); }
    });
  }

  onParamGradeSelected(item: any): void {
    this.paramGrade = item && item.id ? { id: Number(item.id), name: item.name } : null;
    // another grade means another parameter list: start the parameter choice again
    this.onMasterParameterSelected(null);
    this.loadGradeParamLines(this.paramGrade?.id ?? null);
  }

  fetchParamLineChoices = (searchTerm: string, page: number, pageSize: number): Observable<any[]> => {
    const term = (searchTerm || '').toLowerCase().trim();
    const items = this.paramLineChoices.filter(c => !term || c.label.toLowerCase().includes(term)).map(c => ({ id: c.id, name: c.label }));
    return of(items.slice(page * pageSize, (page + 1) * pageSize));
  };

  /** Conditions a grade line is written for, e.g. "Nominal Thickness ≥ 20 ≤ 40 mm · As-Rolled", or "Grade default". */
  private lineConditionLabel(l: any): string {
    const parts: string[] = [];
    if (l.dimensionalFactorID) {
      const band = formatBand({ lowerSymbol: l.lowerLimitValue ?? null, lowerValue: l.lowerLimitDecimalValue ?? null, upperSymbol: l.upperLimitValue ?? null, upperValue: l.upperLimitDecimalValue ?? null });
      parts.push([l.dimensionalFactorName, band, l.dimensionalFactorUnit].filter(x => !!x).join(' '));
    }
    if (l.heatTreatmentName) parts.push(l.heatTreatmentName);
    const pc = [l.productConditionName1, l.productConditionName2].filter(x => !!x).join(' + ');
    if (pc) parts.push(pc);
    if ((l.testCondition || '').trim()) parts.push(String(l.testCondition).trim());
    if (l.productSizeName) parts.push(l.productSizeName);
    if (l.specimenOrientationName) parts.push(l.specimenOrientationName);
    return parts.join(' · ') || 'Grade default';
  }

  onParamLineChoice(item: any): void {
    const choice = item?.id ? this.paramLineChoices.find(c => c.id === Number(item.id)) : null;
    this.paramLineChoiceItem = choice ? { id: choice.id, name: choice.label } : null;
    this.newParamLineId = choice?.id ?? null;
    this.newParamData.minValue = choice?.min ?? null;
    this.newParamData.maxValue = choice?.max ?? null;
    this.newParamData.acceptanceCriteria = choice?.note ?? '';
  }

  /** Limit, note and unit of the chosen parameter from the grade's lines. */
  private applyGradeLine(parameterId: number): void {
    this.newParamLineId = null;
    this.paramLimitHint = '';
    this.paramLineChoices = [];
    this.paramLineChoiceItem = null;
    if (!this.paramGrade) return;
    const lines = this.gradeParamLines.filter(l => Number(l.parameterID) === parameterId);
    const hasNoCondition = (l: any) => !l.dimensionalFactorID && !l.heatTreatmentID && !l.productConditionID1 && !l.productConditionID2
      && !(l.testCondition || '').trim() && !l.productSizeMasterID && !l.specimenOrientationID;
    const pick = lines.find(hasNoCondition) ?? (lines.length === 1 ? lines[0] : null);
    if (lines[0]?.unitName) this.newParamData.unit = lines[0].unitName;
    if (!pick) {
      if (lines.length > 1) {
        const ownGradeId = Number(this.testPlan?.specSelected?.id || 0);
        // several limits for one parameter (size band, heat treatment, ...): the user picks the line that applies and the limit follows
        this.paramLineChoices = lines.map(l => ({
          id: Number(l.specificationLineID),
          label: `${this.lineConditionLabel(l)}  (${this.limitLabel(l.minValue, l.maxValue) || 'no numeric limit'})`,
          min: l.minValue ?? null,
          max: l.maxValue ?? null,
          note: l.acceptanceCriteria || ''
        }));
        this.paramLimitHint = this.paramGrade.id === ownGradeId
          ? 'This grade gives more than one limit for this parameter. Choose the one that applies; the conditions selected on the screen can change it later.'
          : 'This grade gives more than one limit for this parameter. Choose the one that applies.';
      }
      return;
    }
    this.newParamLineId = pick.specificationLineID ?? null;
    this.newParamData.minValue = pick.minValue ?? null;
    this.newParamData.maxValue = pick.maxValue ?? null;
    this.newParamData.acceptanceCriteria = pick.acceptanceCriteria || '';
  }

  onMasterParameterSelected(item: any): void {
    if (!item) {
      this.selectedParamDropdownItem = null;
      this.newParamData.parameterID = null;
      this.newParamData.parameterName = '';
      this.newParamData.unit = '';
      this.newParamData.minValue = null;
      this.newParamData.maxValue = null;
      this.newParamData.acceptanceCriteria = '';
      this.newParamLineId = null;
      this.paramLimitHint = '';
      this.paramLineChoices = [];
      this.paramLineChoiceItem = null;
      return;
    }
    this.selectedParamDropdownItem = item;
    this.newParamData.parameterID = item.id;
    this.newParamData.parameterName = item.name;
    this.newParamData.unit = '';
    this.newParamData.minValue = null;
    this.newParamData.maxValue = null;
    this.newParamData.acceptanceCriteria = '';
    // limits, note and unit of the grade first; the parameter master fills what the grade does not say
    this.applyGradeLine(Number(item.id));

    // Fetch full parameter details to populate unit, inputType, precision, etc.
    this.parameterService.getParameterById(item.id).subscribe({
      next: (res: any) => {
        const details = res?.data || res;
        if (details) {
          // The dropdown label carries the type ("Yield Strength - (Reported)"); the row keeps the master name
          if (details.name && this.newParamData.parameterID === item.id) {
            this.newParamData.parameterName = details.name;
          }
          if (!this.newParamData.unit) {
            if (details.parameterUnit?.name) {
              this.newParamData.unit = details.parameterUnit.name;
            } else if (details.unit) {
              this.newParamData.unit = details.unit;
            }
          }
          if (details.inputType) {
            this.newParamData.inputType = details.inputType;
          }
          if (details.decimalPrecision != null) {
            this.newParamData.decimalPrecision = details.decimalPrecision;
          }
          if (details.dropdownOptions && Array.isArray(details.dropdownOptions)) {
            this.newParamData.dropdownOptions = details.dropdownOptions.map((o: any) => ({
              id: o.id || o.ID,
              displayText: o.displayText || o.DisplayText,
              value: o.value || o.Value
            }));
          }
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.cdr.markForCheck();
      }
    });
  }

  ngOnInit(): void {
    this.initLayoutData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['layoutConfig'] || changes['test'] || changes['testPlan']) {
      this.initLayoutData();
    } else if (changes['environmentData']) {
      this.applyRoomConditions();
    } else if (changes['activeTabSection']) {
      this.hydrateSpecimensFromParameters();
      this.recalculateSpecimens();
    }
  }

  // ---------------------------------------------------------------------------
  // Sections the user hides on this screen (Note, witness, sign ...). Screen only:
  // nothing is saved, the layout keeps the section, the sheet / report still follow the layout.
  // One result section always stays visible.
  // ---------------------------------------------------------------------------
  private static readonly RESULT_TYPES = new Set(['spm', 'specimen', 'reading', 'location', 'loc', 'param', 'parameter', 'custom', 'attrs', 'traverse', 'case_depth']);
  hiddenSectionKeys = new Set<string>();

  sectionUiKey(s: any): string {
    const i = this.sections.indexOf(s);
    return String(s?.id ?? s?.config?.sectionKey ?? '') + '#' + i;
  }

  isResultSection(s: any): boolean {
    return ConfiguredTestLayoutRendererComponent.RESULT_TYPES.has(String(s?.type || '').toLowerCase());
  }

  canHideSection(s: any): boolean {
    if (this.printMode || !s) return false;
    if (!this.isResultSection(s)) return true;
    // the last visible result section cannot be hidden
    return this.sections.filter(x => this.isResultSection(x) && !this.isUnsupportedSection(x) && this.isSectionVisible(x)).length > 1;
  }

  hideSection(s: any): void {
    if (!this.canHideSection(s)) return;
    this.hiddenSectionKeys = new Set(this.hiddenSectionKeys).add(this.sectionUiKey(s));
  }

  showSection(key: string): void {
    const next = new Set(this.hiddenSectionKeys);
    next.delete(key);
    this.hiddenSectionKeys = next;
  }

  get userHiddenSections(): { key: string; title: string }[] {
    if (!this.hiddenSectionKeys.size) return [];
    return this.sections.filter(s => this.hiddenSectionKeys.has(this.sectionUiKey(s))).map(s => ({ key: this.sectionUiKey(s), title: this.getSectionTitle(s) }));
  }

  isSectionVisible(s: any): boolean {
    if (!s) return false;
    if (!this.printMode && this.hiddenSectionKeys.size && this.hiddenSectionKeys.has(this.sectionUiKey(s))) return false;
    const t = (s.type || '').toLowerCase();
    const isChemical = this.testPlan?.type === 'Chemical' ||
      this.test?.discipline === 'Chemical' ||
      (this.test?.name || '').toLowerCase().includes('chemical');

    // Chemical tests do not execute physical tensile specimen dimensions/loads or case-depth traverses
    if (isChemical && (t === 'spm' || t === 'specimen' || t === 'traverse' || t === 'case_depth' || t === 'reading')) {
      return false;
    }

    // In Execution tab or 'all' mode, all configured layout sections are rendered together in order
    if (this.activeTabSection === 'all' || this.activeTabSection === 'execution') return true;

    if (this.activeTabSection === 'parameters') {
      return t === 'param' || t === 'parameter';
    }
    if (this.activeTabSection === 'calculations') {
      return t === 'formula' || t === 'calc';
    }
    if (this.activeTabSection === 'info') {
      return t === 'hdr' || t === 'traceability';
    }
    return true;
  }

  getSectionIcon(type: string): string {
    const t = (type || '').toLowerCase();
    switch (t) {
      case 'spm':
      case 'specimen':
        return 'bi bi-grid-3x3-gap-fill text-danger';
      case 'param':
      case 'parameter':
        return 'bi bi-card-checklist text-danger';
      case 'cond':
      case 'condition':
        return 'bi bi-thermometer-half text-danger';
      case 'formula':
      case 'calc':
        return 'bi bi-calculator text-danger';
      case 'chart':
      case 'graph':
        return 'bi bi-graph-up text-danger';
      case 'rem':
      case 'remarks':
      case 'narrative':
        return 'bi bi-chat-left-text text-danger';
      case 'chk':
      case 'checklist':
        return 'bi bi-check2-square text-danger';
      case 'traverse':
        return 'bi bi-diagram-2 text-danger';
      case 'reading':
        return 'bi bi-bullseye text-danger';
      case 'photo':
        return 'bi bi-camera text-danger';
      case 'location':
      case 'loc':
        return 'bi bi-geo-alt text-danger';
      case 'sign':
        return 'bi bi-pen text-danger';
      case 'rule':
      case 'decision':
        return 'bi bi-shield-check text-danger';
      case 'classification':
      case 'class':
        return 'bi bi-tags text-danger';
      case 'custom':
      case 'attrs':
        return 'bi bi-sliders2 text-danger';
      case 'opinion':
        return 'bi bi-chat-square-quote text-danger';
      default:
        return 'bi bi-sliders text-danger';
    }
  }

  hasVisibleSections(): boolean {
    return this.sections.some(s => this.isSectionVisible(s));
  }

  get parametersFormArray(): FormArray {
    return this.testFormGroup?.get('parameters') as FormArray;
  }

  /**
   * Verdict of this test from the entered values and the limits of the plan / specification (never a fixed text).
   * No value yet: pending. Values but no limit: not assessed. Any value outside its limit: non conforming.
   */
  get conformityVerdict(): { status: 'PASS' | 'FAIL' | 'PENDING' | 'NO_LIMIT'; label: string; detail: string } {
    const rows = (this.parametersFormArray?.controls || []).map(c => (c as FormGroup).getRawValue());
    const num = (v: any): number | null => (v === null || v === undefined || v === '' || isNaN(Number(v)) ? null : Number(v));
    let withValue = 0;
    let judged = 0;
    const failed: string[] = [];
    const judge = (name: string, v: number, min: number | null, max: number | null) => {
      withValue++;
      if (min === null && max === null) return;
      judged++;
      if ((min !== null && v < min) || (max !== null && v > max)) failed.push(name || 'Parameter');
    };
    // every reading of a reading / location grid is a result of its own (Charpy: each impact value against min 35 J)
    const withReadings = new Set<string>();
    Object.keys(this.readingValues).forEach(key => {
      const sep = key.lastIndexOf('|');
      const paramName = sep >= 0 ? key.slice(0, sep) : key;
      const ctrl = this.locParamControl(paramName)?.value;
      const min = num(ctrl?.minValue ?? ctrl?.specMinValue);
      const max = num(ctrl?.maxValue ?? ctrl?.specMaxValue);
      (this.readingValues[key] || []).forEach(raw => {
        const v = num(raw);
        if (v === null) return;
        withReadings.add(this.normKey(paramName));
        judge(ctrl?.parameterName || paramName, v, min, max);
      });
    });
    // parameter rows; a row that only holds the average of its readings is not counted twice
    for (const r of rows) {
      const v = num(r.value);
      if (v === null || withReadings.has(this.normKey(r.parameterName))) continue;
      judge(r.parameterName, v, num(r.minValue ?? r.specMinValue), num(r.maxValue ?? r.specMaxValue));
    }
    const rule = String(this.decisionRule?.ruleType || '');
    const ruleNote = rule && !/simple/i.test(rule) ? ' (no measurement uncertainty entered: judged without guard band)' : '';
    if (withValue === 0) return { status: 'PENDING', label: 'RESULTS PENDING', detail: 'No result entered yet' };
    if (judged === 0) return { status: 'NO_LIMIT', label: 'NOT ASSESSED', detail: 'No specification limit applies to the entered results (select the grade / conditions)' };
    if (failed.length) return { status: 'FAIL', label: 'NON-CONFORMING (FAIL)', detail: `${failed.length} of ${judged} result(s) outside the limit: ${Array.from(new Set(failed)).join(', ')}${ruleNote}` };
    return { status: 'PASS', label: 'CONFORMING (PASS)', detail: `${judged} of ${withValue} result(s) judged, all within the specification limits${ruleNote}` };
  }

  private initLayoutData(): void {
    if (!this.layoutConfig) return;
    if (this.printMode) {
      this.isViewMode = true;
      this.isLocked = true;
    }

    // Resolve sections: legacy / shorthand type names (spm, loc, chk, note ...) become the studio's canonical names
    const rawSections: any[] = Array.isArray(this.layoutConfig.sections)
      ? this.layoutConfig.sections
      : Array.isArray(this.layoutConfig.parsedConfig?.sections) ? this.layoutConfig.parsedConfig.sections : [];
    // a layout saved with the literal "spm" type has always hidden the plain parameter table: keep that
    this.hasLegacySpmSection = rawSections.some((s: any) => s?.type === 'spm' && s?.config?.enabled !== false);
    this.sections = normalizeLayoutConfig({ sections: rawSections }).sections.filter((s: any) => s.config?.enabled !== false);
    // Every test needs a place to enter its results: a layout without a result section gets the parameter table
    if (!this.sections.some((s: any) => this.isResultSection(s) && !this.isUnsupportedSection(s))) {
      this.sections = [...this.sections, { id: 'auto-results', type: 'parameter', title: 'Test Results', config: {} }];
    }
    this.hiddenSectionKeys = new Set();

    // Initialize Specimen Matrix
    this.initSpecimens();

    // Initialize Multi-Readings
    this.initReadings();

    // Initialize Conditions
    this.initConditions();

    // Initialize Locations
    this.initLocations();

    // Initialize Traverse Points from Layout Config
    this.initTraverse();

    // Initialize Checklist Items from Layout Config
    this.initChecklist();

    // Initialize Observations
    this.initObservations();

    // Initialize Opinion & Interpretation
    this.initOpinion();

    // Initialize Execution Extra
    this.initExecutionExtra();

    // A test that has not started takes its specimen count from the layout
    this.scheduleLayoutSpecimenCount();
  }

  private initLocations(): void {
    const locSec = this.sections.find(s => s.type === 'location' || s.type === 'loc');
    const layoutLabels = this.layoutLocationLabels(locSec);
    if (this.test?.locations && Array.isArray(this.test.locations) && this.test.locations.length > 0) {
      // the server names them displayName / sequenceNo; the names this component writes back are accepted too
      this.locations = this.test.locations.map((loc: any, idx: number) => ({
        id: loc.id,
        locationCode: loc.locationCode || `LOC${idx + 1}`,
        locationName: loc.displayName || loc.locationName || `Zone ${idx + 1}`,
        displayOrder: loc.sequenceNo || loc.displayOrder || (idx + 1),
        isReportable: loc.isReportable !== false,
        remarks: loc.remarks || ''
      }));
    } else if (layoutLabels.length) {
      this.locations = layoutLabels.map((label, idx) => ({
        locationCode: `LOC${idx + 1}`,
        locationName: label,
        displayOrder: idx + 1,
        isReportable: true,
        remarks: ''
      }));
    }
    // no invented list: a layout that lists no location starts without one, the technician adds them
    this.initLocationGrids();
  }

  private initTraverse(): void {
    const travSec = this.sections.find(s => s.type === 'traverse');
    if (this.test?.traversePoints && Array.isArray(this.test.traversePoints) && this.test.traversePoints.length > 0) {
      // Also reads the names this component writes back to the test (distanceMm, hardnessValue)
      this.traversePoints = this.test.traversePoints.map((pt: any) => ({
        distance: pt.distance != null ? pt.distance : (pt.distanceMm != null ? pt.distanceMm : pt.depth),
        hardness: pt.hardness != null ? pt.hardness : (pt.hardnessValue != null ? pt.hardnessValue : pt.value)
      }));
      // Shown again after a reload; the parameter row is only written when the user edits a point
      this.effectiveCaseDepth = this.computeEffectiveCaseDepth();
    } else if (travSec?.config?.tableRows && Array.isArray(travSec.config.tableRows) && travSec.config.tableRows.length > 0) {
      this.traversePoints = travSec.config.tableRows.map((r: any) => ({
        distance: parseFloat(r.label) || 0.1,
        hardness: null
      }));
    }
  }

  private initChecklist(): void {
    const chkSec = this.sections.find(s => s.type === 'checklist');
    if (this.test?.checklist && Array.isArray(this.test.checklist) && this.test.checklist.length > 0) {
      this.checklistItems = this.test.checklist.map((chk: any, idx: number) => ({
        id: chk.id || (idx + 1),
        label: chk.label || chk.itemLabel || chk.inspectionPoint || `Item ${idx + 1}`,
        status: chk.status || ''
      }));
    } else if (chkSec?.config?.tableRows && Array.isArray(chkSec.config.tableRows) && chkSec.config.tableRows.length > 0) {
      this.checklistItems = chkSec.config.tableRows.map((r: any, idx: number) => ({
        id: idx + 1,
        label: r.label,
        status: ''
      }));
    }
  }

  private initObservations(): void {
    if (this.test?.observations && Array.isArray(this.test.observations) && this.test.observations.length > 0) {
      this.observations = this.test.observations.map((obs: any, idx: number) => ({
        id: obs.id,
        category: obs.category || 'General',
        observationText: obs.observationText || '',
        displayOrder: obs.displayOrder || (idx + 1),
        isReportable: obs.isReportable !== false
      }));
    }
  }

  private initOpinion(): void {
    const opSec = this.sections.find(s => s.type === 'opinion');
    if (!opSec) return;
    if (this.opinionData.items.length === 0 && opSec.config?.tableRows && Array.isArray(opSec.config.tableRows)) {
      this.opinionData.items = opSec.config.tableRows.map((r: any) => ({
        label: r.label,
        formulaDisplay: r.formulaDisplay || r.formula || '',
        unit: r.unit || '',
        requirement: r.requirement || '',
        value: r.staticValue || '',
        status: 'Pass'
      }));
      this.opinionData.overallStatement = opSec.config.overallStatement || '';
      this.opinionData.isOptional = opSec.config.isOptional !== false;
    }
  }

  private initExecutionExtra(): void {
    if (this.test?.executionExtraJson) {
      try {
        const extra = typeof this.test.executionExtraJson === 'string'
          ? JSON.parse(this.test.executionExtraJson)
          : this.test.executionExtraJson;
        if (extra?.decisionRule) {
          this.decisionRule = { ...this.decisionRule, ...extra.decisionRule };
        }
        if (extra?.classification) {
          this.classification = { ...this.classification, ...extra.classification };
        }
        if (Array.isArray(extra?.custom) && extra.custom.length > 0) {
          this.customAttributes = extra.custom;
        }
        if (extra?.conditionValues) {
          this.conditionValues = { ...this.conditionValues, ...extra.conditionValues };
          this.applyRoomConditions();
        }
        if (extra?.opinionData) {
          this.opinionData = { ...this.opinionData, ...extra.opinionData };
        }
        if (extra?.conditionFields && typeof extra.conditionFields === 'object') {
          this.runtimeConditionFields = { ...extra.conditionFields };
        }
        if (extra?.narratives && typeof extra.narratives === 'object') {
          this.narratives = { ...extra.narratives };
        }
        if (extra?.specimenCountApplied === true) this.specimenCountApplied = true;
        if (Array.isArray(extra?.hiddenRows)) {
          this.hiddenFixedRoles = new Set(extra.hiddenRows.filter((r: string) => ConfiguredTestLayoutRendererComponent.FIXED_TENSILE_ROWS.includes(r as SpecimenRole)) as SpecimenRole[]);
        }
      } catch (e) {
        console.warn('Could not parse test.executionExtraJson', e);
      }
    }
  }

  // =========================================================================
  // Specimen & Parameter Grouping / Detection
  // =========================================================================

  /** Specimen index of every row (each row carries its own; see specimen-grouping.ts). */
  private getRowSpecimenIndexes(): number[] {
    return specimenIndexesOf(this.parametersFormArray);
  }

  /** Number of rows that belong to one specimen. */
  getSpecimenRowCount(spmIdx: number): number {
    return rowsOfSpecimen(this.getRowSpecimenIndexes(), spmIdx).length;
  }

  getSpecimenIndexForParam(rowIdx: number): number {
    return this.getRowSpecimenIndexes()[rowIdx] ?? 0;
  }

  getSpecimenLabelForParam(rowIdx: number): string {
    return this.specimenLabel(this.getSpecimenIndexForParam(rowIdx));
  }

  isFirstParamOfSpecimen(rowIdx: number): boolean {
    const indexes = this.getRowSpecimenIndexes();
    return rowsOfSpecimen(indexes, indexes[rowIdx] ?? 0)[0] === rowIdx;
  }

  getFilteredParamIndices(): number[] {
    if (!this.parametersFormArray) return [];
    const indexes = this.getRowSpecimenIndexes();
    const rows = this.selectedSpecimenFilter === 'all' ? rowsOrderedBySpecimen(indexes) : rowsOfSpecimen(indexes, this.selectedSpecimenFilter - 1);
    return rows.filter(i => !this.isGridTargetRow(i));
  }

  /** Shared store on the test object for rows taken out of the table (see SpecimenRowStore). */
  private get rowStore(): SpecimenRowStore {
    if (!this.test) this.test = {};
    return this.test as SpecimenRowStore;
  }

  /** Empty copy of a row for another specimen. */
  private cloneRowForSpecimen = (source: any, specimen: number): FormGroup =>
    this.createParamControl({
      ...source,
      id: null,
      value: null,
      convertedValue: null,
      resultStatus: null,
      isWithinLimit: null,
      remarks: '',
      specimenIndex: specimen
    });

  setSpecimenFilter(filter: number | 'all'): void {
    this.selectedSpecimenFilter = filter;
  }

  // =========================================================================
  // Parameter Source Classification & Test Method Sanitization
  // =========================================================================

  getParameterSource(param: any): { label: string; badgeClass: string; icon: string; tooltip: string } {
    if (!param) {
      return { label: 'Laboratory Test', badgeClass: 'bg-info-subtle text-info border border-info-subtle', icon: 'bi-flask', tooltip: 'Default Laboratory Test Parameter' };
    }
    if (param.isStandalone) {
      return { label: 'Test Method', badgeClass: 'bg-secondary-subtle text-secondary border border-secondary-subtle', icon: 'bi-book', tooltip: 'Manually Added Parameter' };
    }
    if (param.isCalculated || param.formulaExpression) {
      return { label: 'Formula', badgeClass: 'bg-primary-subtle text-primary border border-primary-subtle', icon: 'bi-calculator', tooltip: 'Derived via Formula Calculation' };
    }
    if (param.specMinValue != null || param.specMaxValue != null || param.specificationLineID) {
      return { label: 'Specification', badgeClass: 'bg-purple-subtle text-purple border border-purple-subtle', icon: 'bi-file-earmark-ruled', tooltip: 'Material Specification Requirement' };
    }
    return { label: 'Laboratory Test', badgeClass: 'bg-info-subtle text-info border border-info-subtle', icon: 'bi-flask', tooltip: 'Default Laboratory Test Parameter' };
  }

  getCleanTestMethod(param?: any): string {
    let str = (param?.testMethodUsed || '').trim();
    if (!str || str.toLowerCase() === 'tensile test' || str.toLowerCase() === 'general test') {
      str = (this.testPlan?.methodName || this.testPlan?.methodSelected?.name || this.test?.name || '').trim();
    }
    // Clean up duplicated prefixes like "IS IS" or double years "2022 2022" or "(Part 1) - (Part 1)"
    str = str
      .replace(/\bIS\s+IS\b/gi, 'IS')
      .replace(/\bASTM\s+ASTM\b/gi, 'ASTM')
      .replace(/\bISO\s+ISO\b/gi, 'ISO')
      .replace(/\(Part\s+(\d+)\)\s*[-–:]\s*\(Part\s+\1\)/gi, '(Part $1)')
      .replace(/(\b\d{4}\b)\s+\1/g, '$1')
      .trim();
    return str || 'Standard Method';
  }

  isTensileTest(): boolean {
    const name = (this.test?.name || this.testPlan?.type || '').toLowerCase();
    return name.includes('tensile') || name.includes('tension');
  }

  /** S1 rows; the specimen matrix shows one line per S1 row and finds the matching row of every other specimen. */
  getBaseParameterList(): any[] {
    if (!this.parametersFormArray || this.parametersFormArray.length === 0) return [];
    const list: any[] = [];
    for (const i of rowsOfSpecimen(this.getRowSpecimenIndexes(), 0)) {
      const ctrl = this.parametersFormArray.at(i);
      if (ctrl) {
        list.push({
          index: i,
          name: ctrl.get('parameterName')?.value || `Parameter ${i + 1}`,
          unit: ctrl.get('unit')?.value || '—',
          requirement: this.formatRequirement(ctrl.value),
          inputType: ctrl.get('inputType')?.value || 'Decimal',
          isCalculated: ctrl.get('isCalculated')?.value || !!ctrl.get('formulaExpression')?.value
        });
      }
    }
    return list;
  }

  /** Form row of `spmIdx` that matches S1 row `baseParamIdx` (same parameter, same occurrence), or -1. */
  private getMatchingRow(baseParamIdx: number, spmIdx: number): number {
    if (!this.parametersFormArray) return -1;
    return matchingRowInSpecimen(rowValuesOf(this.parametersFormArray), this.getRowSpecimenIndexes(), baseParamIdx, spmIdx);
  }

  getParamValueForSpecimen(baseParamIdx: number, spmIdx: number): any {
    const targetIdx = this.getMatchingRow(baseParamIdx, spmIdx);
    if (targetIdx < 0) return '';
    return this.parametersFormArray?.at(targetIdx)?.get('value')?.value ?? '';
  }

  /** Text parameters (input type Text) keep their result in Remarks. */
  getParamTextForSpecimen(baseParamIdx: number, spmIdx: number): string {
    const targetIdx = this.getMatchingRow(baseParamIdx, spmIdx);
    if (targetIdx < 0) return '';
    return this.parametersFormArray?.at(targetIdx)?.get('remarks')?.value ?? '';
  }

  onParamTextChangeForSpecimen(baseParamIdx: number, spmIdx: number, text: string): void {
    const targetIdx = this.getMatchingRow(baseParamIdx, spmIdx);
    const ctrl = targetIdx >= 0 ? this.parametersFormArray?.at(targetIdx) : null;
    if (ctrl) {
      ctrl.patchValue({ remarks: text });
      this.paramValueChanged.emit({ rowIdx: targetIdx, param: ctrl.value });
      this.cdr.markForCheck();
    }
  }

  onParamValueChangeForSpecimen(baseParamIdx: number, spmIdx: number, newVal: any): void {
    const targetIdx = this.getMatchingRow(baseParamIdx, spmIdx);
    const ctrl = targetIdx >= 0 ? this.parametersFormArray?.at(targetIdx) : null;
    if (ctrl) {
      ctrl.patchValue({ value: newVal });
      this.evaluateLimitForControl(ctrl);
      this.paramValueChanged.emit({ rowIdx: targetIdx, param: ctrl.value });
      this.applyTableEdit(targetIdx, newVal);
      this.cdr.markForCheck();
    }
  }

  getBaseParamAverage(baseParamIdx: number): string {
    let sum = 0;
    let count = 0;
    for (let s = 0; s < this.specimens.length; s++) {
      const idx = this.getMatchingRow(baseParamIdx, s);
      const ctrl = idx >= 0 ? this.parametersFormArray?.at(idx) : null;
      const raw = ctrl?.get('value')?.value;
      if (raw !== null && raw !== undefined && raw !== '' && !isNaN(Number(raw))) {
        sum += Number(raw);
        count++;
      }
    }
    return count > 0 ? (sum / count).toFixed(2).replace(/\.00$/, '') : '-';
  }

  getBaseParamStatus(baseParamIdx: number): string {
    let hasFail = false;
    let hasPass = false;
    for (let s = 0; s < this.specimens.length; s++) {
      const idx = this.getMatchingRow(baseParamIdx, s);
      const ctrl = idx >= 0 ? this.parametersFormArray?.at(idx) : null;
      const st = ctrl?.get('resultStatus')?.value;
      if (st === 'Fail') hasFail = true;
      if (st === 'Pass') hasPass = true;
    }
    if (hasFail) return 'Fail';
    if (hasPass) return 'Pass';
    return 'Pending';
  }

  // =========================================================================
  // Specimen Matrix Operations
  // =========================================================================
  private initSpecimens(): void {
    const plannedQty = Number(
      this.testPlan?.totalSpecimens ||
      this.test?.totalSpecimens ||
      this.testPlan?.plannedQuantity ||
      this.testPlan?.quantity ||
      this.test?.plannedQuantity ||
      this.test?.quantity ||
      1
    );
    // Never fewer specimens than the rows hold, so no saved row is hidden or trimmed
    const rowIndexes = this.getRowSpecimenIndexes();
    const maxRowSpecimen = rowIndexes.length ? Math.max(...rowIndexes) : 0;
    const count = Math.max(1, plannedQty, maxRowSpecimen + 1);
    const prefix = 'S';

    // Guard: If specimen array already exists with target length and has values, avoid wiping
    if (this.specimens.length === count && this.specimens.some(s => s.yieldLoad != null || s.peakLoad != null || s.proofStress != null || s.uts != null)) {
      this.ensureRowsForSpecimens();
      this.hydrateSpecimensFromParameters();
      this.recalculateSpecimens();
      this.cdr.markForCheck();
      return;
    }

    this.specimens = [];
    const t = this.sample?.thickness != null ? Number(this.sample.thickness) : null;
    const w = this.sample?.width != null ? Number(this.sample.width) : null;
    const d = this.sample?.diameter != null ? Number(this.sample.diameter) : null;
    const l0 = this.sample?.gaugeLength != null ? Number(this.sample.gaugeLength) : 50;

    for (let i = 1; i <= count; i++) {
      const initialArea = this.calculateArea(t, w, d);
      this.specimens.push({
        id: `${prefix}${i}`,
        thickness: t,
        width: w,
        diameter: d,
        gaugeLength: l0,
        area: initialArea,
        yieldLoad: null,
        peakLoad: null,
        finalLength: null,
        finalArea: null,
        proofStress: null,
        uts: null,
        elongation: null,
        reductionOfArea: null
      });
    }

    // Every specimen gets its rows (saved rows are kept as they are; nothing is trimmed)
    this.ensureRowsForSpecimens();

    // Hydrate specimen data from existing parameter controls (e.g. S1, S2 from database)
    this.hydrateSpecimensFromParameters();

    this.recalculateSpecimens();
    this.cdr.markForCheck();
  }

  /**
   * Role -> FormArray row indexes for one specimen's parameter slice (exact name match, see tensile-parameter-roles.ts).
   * Rows whose name has no role (or an ambiguous one) are not in the map, so nothing is read from or written to them.
   */
  private getSpecimenRoleIndex(spmIdx: number): TensileRoleIndex {
    if (!this.parametersFormArray || spmIdx < 0) return new Map();
    const rows = rowsOfSpecimen(this.getRowSpecimenIndexes(), spmIdx);
    const names = rows.map(r => this.parametersFormArray.at(r)?.get('parameterName')?.value || '');
    // Positions inside the specimen -> form row indexes
    const index: TensileRoleIndex = new Map();
    buildTensileRoleIndex(names).forEach((list, role) => index.set(role, list.map(i => rows[i])));
    return index;
  }

  /** Adds rows for every specimen that has none (saved rows removed earlier come back first, else copies of S1). */
  private ensureRowsForSpecimens(): void {
    if (this.printMode) return; // the sheet shows the saved rows only
    if (!this.parametersFormArray || this.parametersFormArray.length === 0) return;
    for (let s = 0; s < this.specimens.length; s++) {
      addSpecimenRows(this.parametersFormArray, s, this.rowStore, this.cloneRowForSpecimen);
    }
  }

  /** Values the user typed in this session into derived rows (area, stresses, elongation, RA) of one specimen. */
  private getLockedDerivedValues(spmIdx: number): TensileValues {
    const locked: TensileValues = {};
    this.getSpecimenRoleIndex(spmIdx).forEach((rows, role) => {
      if (!isSpecimenRole(role) || !DERIVED_TENSILE_ROLES.has(role)) return;
      for (const r of rows) {
        const ctrl = this.parametersFormArray.at(r);
        if (ctrl && this.userTypedDerivedRows.has(ctrl)) {
          const v = parseTensileNumber(ctrl.get('value')?.value);
          if (v != null) {
            locked[role] = v;
            return;
          }
        }
      }
    });
    return locked;
  }

  /**
   * A value typed in a parameter-table row: update that specimen field (clearing clears it),
   * remember user-typed derived rows, and re-run the specimen calculation when an input changed.
   */
  private applyTableEdit(rowIdx: number, rawVal: any): void {
    const spmIdx = this.getSpecimenIndexForParam(rowIdx);
    const spm = this.specimens[spmIdx];
    if (!spm) return;
    const role = roleOfRow(this.getSpecimenRoleIndex(spmIdx), rowIdx);
    // Unknown and read-only quantities (ReH, ReL, Rp0.5) never feed the specimen model
    if (!isSpecimenRole(role)) return;

    const value = parseTensileNumber(rawVal);
    spm[role] = value;

    if (DERIVED_TENSILE_ROLES.has(role)) {
      const ctrl = this.parametersFormArray.at(rowIdx);
      if (value == null) this.userTypedDerivedRows.delete(ctrl);
      else this.userTypedDerivedRows.add(ctrl);
    }

    let clearRoles: Set<SpecimenRole> | undefined;
    if (RECALC_TRIGGER_ROLES.has(role)) {
      // A dimension edit, or clearing S0 by hand, recalculates S0 from the dimensions (null when they give none)
      const recomputeArea = DIMENSION_ROLES.has(role) || (role === 'area' && value == null);
      clearRoles = recalcTensileSpecimen(spm, { recomputeArea, locked: this.getLockedDerivedValues(spmIdx) });
    }
    this.recalculateSpecimens();
    if (clearRoles?.size) this.syncSpecimenToForm(spm, clearRoles);
    this.cdr.markForCheck();
  }

  private hydrateSpecimensFromParameters(): void {
    if (!this.parametersFormArray || this.parametersFormArray.length === 0) return;

    for (let sIdx = 0; sIdx < this.specimens.length; sIdx++) {
      const spm = this.specimens[sIdx];

      // Read fallback for saved rows: each role reads only its own row group (exact name, never substring)
      const roleIndex = this.getSpecimenRoleIndex(sIdx);
      const values = readTensileValues(roleIndex, r => this.parametersFormArray.at(r)?.get('value')?.value);
      Object.assign(spm, values);

      // Reload rule (see savedHandTypedRoles): a saved S0 / Rp / Rm / A% that does not match its saved inputs was
      // typed by hand, so it is locked like a value typed in this session and the calculation never replaces it.
      savedHandTypedRoles(values).forEach(role => {
        (roleIndex.get(role) || []).forEach(r => {
          const ctrl = this.parametersFormArray.at(r);
          if (ctrl && parseTensileNumber(ctrl.get('value')?.value) != null) this.userTypedDerivedRows.add(ctrl);
        });
      });

      if (!spm.area) {
        spm.area = this.calculateArea(spm.thickness || null, spm.width || null, spm.diameter || null);
      }
    }
  }

  getSpecimenCount(section: any): number[] {
    const count = section?.config?.count || this.specimens.length || 3;
    return Array.from({ length: count }, (_, i) => i + 1);
  }

  private calculateArea(t: number | null, w: number | null, d: number | null): number | null {
    return tensileArea(t, w, d);
  }

  onSpecimenDimensionChange(spm: SpecimenData): void {
    // S0 follows the dimensions unless it was typed by hand; no area from the dimensions clears a calculated S0
    const clearRoles = this.recalculateSpecimenRow(spm, true);
    this.recalculateSpecimens();
    this.syncSpecimenToForm(spm, clearRoles);
  }

  onSpecimenLoadChange(spm: SpecimenData): void {
    const clearRoles = this.recalculateSpecimenRow(spm);
    this.recalculateSpecimens();
    this.syncSpecimenToForm(spm, clearRoles);
  }

  /**
   * Rp, Rm, A%, Z% for one specimen (formulas in tensile-parameter-roles.ts); values the user typed into derived rows win.
   * Returns the calculated roles whose result is now empty, so their rows are cleared instead of keeping an old value.
   */
  private recalculateSpecimenRow(spm: SpecimenData, recomputeArea = false): Set<SpecimenRole> {
    return recalcTensileSpecimen(spm, { recomputeArea, locked: this.getLockedDerivedValues(this.specimens.indexOf(spm)) });
  }

  private recalculateSpecimens(): void {
    const validProof = this.specimens.map(s => s.proofStress).filter((v): v is number => v != null && v > 0);
    const validUts = this.specimens.map(s => s.uts).filter((v): v is number => v != null && v > 0);
    const validElong = this.specimens.map(s => s.elongation).filter((v): v is number => v != null && v > 0);
    const validRA = this.specimens.map(s => s.reductionOfArea).filter((v): v is number => v != null && v > 0);
    const validArea = this.specimens.map(s => s.area).filter((v): v is number => v != null && v > 0);

    this.specimenAverages = {
      proofStress: validProof.length ? Number((validProof.reduce((a, b) => a + b, 0) / validProof.length).toFixed(3)) : null,
      uts: validUts.length ? Number((validUts.reduce((a, b) => a + b, 0) / validUts.length).toFixed(3)) : null,
      elongation: validElong.length ? Number((validElong.reduce((a, b) => a + b, 0) / validElong.length).toFixed(3)) : null,
      reductionOfArea: validRA.length ? Number((validRA.reduce((a, b) => a + b, 0) / validRA.length).toFixed(1)) : null,
      area: validArea.length ? Number((validArea.reduce((a, b) => a + b, 0) / validArea.length).toFixed(3)) : null
    };

    // Auto-sync calculated specimen values with parameters FormArray!
    this.syncSpecimenValuesToForm();
  }

  /**
   * Computes the dynamic arithmetic average across all active specimens for any measurement/dimension.
   */
  getDimensionAverage(field: keyof SpecimenData): string {
    const vals = this.specimens
      .map(s => s[field])
      .filter((v): v is number => v !== null && v !== undefined && !isNaN(v as number) && (v as number) > 0);
    if (vals.length === 0) return '-';

    const sum = vals.reduce((a, b) => a + (b as number), 0);
    const avg = sum / vals.length;

    if (field === 'thickness' || field === 'width' || field === 'diameter' || field === 'area' || field === 'yieldLoad' || field === 'peakLoad') {
      return avg.toFixed(2);
    }
    if (field === 'gaugeLength' || field === 'finalLength' || field === 'elongation' || field === 'reductionOfArea') {
      return avg.toFixed(1);
    }
    if (field === 'proofStress' || field === 'uts') {
      return avg.toFixed(3);
    }
    return avg.toFixed(2);
  }

  /**
   * Writes each specimen field only into the rows of its own role group (synonyms of one quantity), never into another role's row.
   * A row that already holds the same number is not patched, so the input the user is typing in is left alone.
   * `clearRoles` (from the calculation) empties calculated rows whose result is now null; inputs are never emptied here.
   */
  private syncSpecimenToForm(spm: SpecimenData, clearRoles?: ReadonlySet<SpecimenRole>): void {
    if (this.printMode || !this.parametersFormArray) return;
    const spmIdx = this.specimens.indexOf(spm);
    if (spmIdx < 0) return;

    planTensileWrites(this.getSpecimenRoleIndex(spmIdx), spm, clearRoles).forEach(({ rowIdx, value }) => {
      const ctrl = this.parametersFormArray.at(rowIdx);
      if (!ctrl) return;
      const raw = ctrl.get('value')?.value;
      const current = parseTensileNumber(raw);
      if (current === value && (value != null || raw === null || raw === undefined || raw === '')) {
        this.evaluateLimitForControl(ctrl);
        return;
      }
      ctrl.patchValue({ value });
      this.evaluateLimitForControl(ctrl);
      this.paramValueChanged.emit({ rowIdx, param: ctrl.value });
    });
  }

  private syncSpecimenValuesToForm(): void {
    if (this.printMode || !this.parametersFormArray) return;

    // Sync each specimen's calculated values to the corresponding FormArray slice
    this.specimens.forEach(spm => {
      this.syncSpecimenToForm(spm);
    });

    // Also update test.parameters in-memory if available so cards reflect values
    if (this.test?.parameters && Array.isArray(this.test.parameters)) {
      this.test.parameters.forEach((tp: any) => {
        const role = resolveTensileRole(tp.parameterName);
        if (role === 'proofStress' || role === 'uts' || role === 'elongation' || role === 'reductionOfArea') {
          const avg = this.specimenAverages[role];
          if (avg != null) tp.value = avg;
        }
      });
    }
  }

  // =========================================================================
  // Specimen & Parameter Adjustments (Dynamic Count / Stepper / Add / Remove)
  // =========================================================================

  setSpecimenCount(targetCount: number, fromLayout = false): void {
    if (this.printMode) return;
    const sec = this.specimenSection;
    if (!fromLayout && sec && !this.canAdjustCount(sec)) {
      this.toastService.show('The layout fixes the number of specimens.', 'warning');
      this.specimenCountChanged.emit(this.specimens.length); // the toolbar shows the real count again
      return;
    }
    this.hydrateSpecimensFromParameters(); // table values are the source of truth before rows/specimens change
    const newCount = Math.max(1, Math.min(20, Math.round(targetCount)));

    if (newCount > this.specimens.length) {
      const diff = newCount - this.specimens.length;
      for (let i = 0; i < diff; i++) {
        this.addSpecimen();
      }
    } else if (newCount < this.specimens.length) {
      const diff = this.specimens.length - newCount;
      for (let i = 0; i < diff; i++) {
        // Stops at the first specimen that holds results (removeSpecimen shows why)
        if (!this.removeSpecimen()) break;
      }
    }

    this.recalculateSpecimens();
    this.specimenCountApplied = true; // from now on the count is the user's (or the layout's) choice
    this.parametersAdjusted.emit();
    this.specimenCountChanged.emit(this.specimens.length);
  }

  adjustSpecimenCount(delta: number): void {
    if (this.isViewMode || this.isLocked) return;
    this.setSpecimenCount(this.specimens.length + delta);
  }

  onSpecimenCountInputChange(event: Event): void {
    if (this.isViewMode || this.isLocked) return;
    const input = event.target as HTMLInputElement;
    const val = Number(input.value);
    if (!isNaN(val) && val >= 1) {
      this.setSpecimenCount(val);
    } else {
      input.value = String(this.specimens.length);
    }
  }

  addSpecimen(): void {
    if (this.isViewMode || this.isLocked) return;
    this.hydrateSpecimensFromParameters(); // table values are the source of truth before rows/specimens change
    const nextNum = this.specimens.length + 1;
    const refSpm = this.specimens[0];

    const newSpm: SpecimenData = {
      id: `S${nextNum}`,
      thickness: refSpm?.thickness || (this.sample?.thickness != null ? Number(this.sample.thickness) : null),
      width: refSpm?.width || (this.sample?.width != null ? Number(this.sample.width) : null),
      diameter: refSpm?.diameter || (this.sample?.diameter != null ? Number(this.sample.diameter) : null),
      gaugeLength: refSpm?.gaugeLength || 50,
      area: refSpm?.area || null,
      yieldLoad: null,
      peakLoad: null,
      finalLength: null,
      finalArea: null,
      proofStress: null,
      uts: null,
      elongation: null,
      reductionOfArea: null
    };
    this.specimens.push(newSpm);

    // Rows for the new specimen: saved rows removed earlier come back with their IDs, otherwise empty copies of S1
    if (this.parametersFormArray && this.parametersFormArray.length > 0) {
      addSpecimenRows(this.parametersFormArray, this.specimens.length - 1, this.rowStore, this.cloneRowForSpecimen);
    }

    this.recalculateSpecimens();
    this.parametersAdjusted.emit();
  }

  /**
   * Removes a specimen only when none of its rows holds a value or remark; otherwise nothing is removed and a
   * message says which row to clear first. Saved empty rows are deleted on the next save. Returns true when removed.
   */
  removeSpecimen(spmIndex?: number): boolean {
    if (this.isViewMode || this.isLocked || this.specimens.length <= 1) return false;
    this.hydrateSpecimensFromParameters(); // table values are the source of truth before rows/specimens change
    const targetIdx = spmIndex !== undefined ? spmIndex : this.specimens.length - 1;

    if (this.parametersFormArray) {
      const block = removeSpecimenRows(this.parametersFormArray, targetIdx, this.rowStore);
      if (block) {
        this.toastService.show(specimenRemovalMessage(`S${targetIdx + 1}`, block), 'warning');
        return false;
      }
    }

    // Remove from specimen array
    this.specimens.splice(targetIdx, 1);

    // Re-index remaining specimen IDs
    this.specimens.forEach((s, idx) => {
      s.id = `S${idx + 1}`;
    });

    if (this.selectedSpecimenFilter !== 'all' && (this.selectedSpecimenFilter as number) > this.specimens.length) {
      this.selectedSpecimenFilter = 'all';
    }

    this.recalculateSpecimens();
    this.parametersAdjusted.emit();
    return true;
  }

  /**
   * Removes one row (by its FormArray index; other rows keep their own controls, IDs and specimen index).
   * A row with a value or remark is kept (clear it first). A row cleared on screen whose value is still saved is kept
   * until Save Draft stores the cleared value. A saved empty row is deleted on the next save.
   */
  removeParameter(rowIdx: number, discardResult = false): void {
    if (this.isViewMode || this.isLocked || !this.parametersFormArray || this.parametersFormArray.length <= 1) return;
    const ctrl = this.parametersFormArray.at(rowIdx);
    if (!ctrl) return;
    const row = (ctrl as FormGroup).getRawValue();
    const savedId = Number(row?.id) || 0;
    const reason = rowRemovalReason(row, this.rowStore);
    if (reason && !discardResult) {
      this.askRemoveWithResult(row.parameterName || `Row ${rowIdx + 1}`, () => this.removeParameter(rowIdx, true));
      return;
    }
    if (reason && savedId > 0) this.rowStore.discardedParameterIds = [...(this.rowStore.discardedParameterIds || []), savedId];
    this.hydrateSpecimensFromParameters(); // table values are the source of truth before rows/specimens change
    this.parametersFormArray.removeAt(rowIdx);
    if (savedId > 0) {
      const store = this.rowStore;
      store.removedParameterIds = [...(store.removedParameterIds || []), savedId];
    }
    this.recalculateSpecimens();
    this.parametersAdjusted.emit();
  }

  /**
   * Multi-specimen tables: takes one parameter out of EVERY specimen (S1, S2, ...). Refused, with the reason, when any
   * specimen has a value for it; saved rows are deleted on the next save.
   */
  removeBaseParameter(baseRowIdx: number, opts: { discard?: boolean; after?: () => void } = {}): boolean {
    if (this.isViewMode || this.isLocked || !this.parametersFormArray) return false;
    const blockers = this.baseRowBlockers(baseRowIdx);
    if (blockers.length) {
      this.toastService.show(`This parameter is used to calculate ${blockers.join(', ')}. Remove ${blockers.length > 1 ? 'those' : 'it'} first.`, 'warning');
      return false;
    }
    const rows: number[] = [];
    for (let s = 0; s < Math.max(1, this.specimens.length); s++) {
      const idx = this.getMatchingRow(baseRowIdx, s);
      if (idx >= 0) rows.push(idx);
    }
    if (rows.length === 0) return false;
    if (this.parametersFormArray.length - rows.length < 1) {
      this.toastService.show('A test needs at least one parameter.', 'warning');
      return false;
    }
    this.hydrateSpecimensFromParameters(); // table values are the source of truth before rows change
    const block = removeParameterRows(this.parametersFormArray, rows, this.rowStore, !!opts.discard);
    if (block) {
      // the row holds a result: ask, then remove it with the old value recorded in the audit trail
      this.askRemoveWithResult(block.name, () => this.removeBaseParameter(baseRowIdx, { discard: true, after: opts.after }));
      return false;
    }
    this.recalculateSpecimens();
    this.parametersAdjusted.emit();
    opts.after?.();
    return true;
  }

  // ---- Confirmation before a parameter that holds a result is removed ----
  removeConfirm = { visible: false, message: '' };
  private removeConfirmRun: (() => void) | null = null;

  private askRemoveWithResult(name: string, run: () => void): void {
    this.removeConfirm = { visible: true, message: `"${name}" has a result. Remove it anyway? The removal and the old value are recorded in the audit trail.` };
    this.removeConfirmRun = run;
    this.cdr.markForCheck();
  }

  onRemoveConfirmed(): void {
    const run = this.removeConfirmRun;
    this.removeConfirm = { visible: false, message: '' };
    this.removeConfirmRun = null;
    run?.();
    this.cdr.markForCheck();
  }

  onRemoveCancelled(): void {
    this.removeConfirm = { visible: false, message: '' };
    this.removeConfirmRun = null;
    this.cdr.markForCheck();
  }

  // ---- Tensile matrix: every row can be removed, but not while another shown row is calculated from it ----

  /** Rows of the tensile matrix that come from the specimen model (they exist even when the test has no parameter row for them). */
  private static readonly FIXED_TENSILE_ROWS: readonly SpecimenRole[] = ['diameter', 'thickness', 'width', 'gaugeLength', 'area', 'yieldLoad', 'peakLoad', 'finalLength'];

  private static readonly TENSILE_ROW_LABELS: Readonly<Partial<Record<SpecimenRole, string>>> = {
    diameter: 'Diameter (D)',
    thickness: 'Thickness (T)',
    width: 'Width (W)',
    gaugeLength: 'Gauge Length (L₀)',
    area: 'Cross Section Area (S₀)',
    yieldLoad: '0.2% Yield Load (F_p0.2)',
    peakLoad: 'Maximum / Peak Load (F_m)',
    finalLength: 'Final Length (L_u)',
    proofStress: 'Yield Strength',
    uts: 'Ultimate Tensile Strength',
    elongation: '% Elongation',
  };

  /** Fixed rows the user took off the screen (saved with the test, so a reload keeps them off). */
  hiddenFixedRoles = new Set<SpecimenRole>();

  /** Whether a tensile matrix row is on the screen. */
  isTensileRowShown(role: SpecimenRole): boolean {
    if (!this.tensileRowOn(this.specimenSection, role)) return false;
    if (ConfiguredTestLayoutRendererComponent.FIXED_TENSILE_ROWS.includes(role)) {
      if (this.hiddenFixedRoles.has(role)) return false;
      const round = !!this.sample?.diameter;
      if (role === 'diameter') return round || this.sample?.productForm === 'Round' || this.sample?.productForm === 'Bar';
      if (role === 'thickness' || role === 'width') return !round;
      return true;
    }
    return this.hasParameterRole(role);
  }

  /** Names of the shown rows that are calculated from this one; the row can be removed only when there are none. */
  removalBlockers(role: SpecimenRole): string[] {
    const shown = new Set<SpecimenRole>((Object.keys(ConfiguredTestLayoutRendererComponent.TENSILE_ROW_LABELS) as SpecimenRole[]).filter(r => this.isTensileRowShown(r)));
    return tensileDependents(role, shown).map(r => ConfiguredTestLayoutRendererComponent.TENSILE_ROW_LABELS[r] || r);
  }

  /** Tooltip of the remove button: the reason when the row is still needed. */
  removeTitle(role: SpecimenRole): string {
    const blockers = this.removalBlockers(role);
    return blockers.length ? `Needed to calculate ${blockers.join(', ')}. Remove ${blockers.length > 1 ? 'those' : 'it'} first.` : 'Remove this parameter from all specimens';
  }

  /** Removes one tensile matrix row (every specimen). Refused while a shown row is calculated from it. */
  removeTensileRow(role: SpecimenRole): void {
    if (this.isViewMode || this.isLocked) return;
    const blockers = this.removalBlockers(role);
    if (blockers.length) {
      this.toastService.show(`${ConfiguredTestLayoutRendererComponent.TENSILE_ROW_LABELS[role] || role} is used to calculate ${blockers.join(', ')}. Remove ${blockers.length > 1 ? 'those' : 'it'} first.`, 'warning');
      return;
    }
    // a test parameter behind the row is deleted by the usual rules (a value blocks it); a model-only row is just taken off the screen
    const base = this.getBaseParameterList().find(p => resolveTensileRole(p.name) === role);
    const hideRow = () => {
      if (ConfiguredTestLayoutRendererComponent.FIXED_TENSILE_ROWS.includes(role)) {
        this.hiddenFixedRoles = new Set([...this.hiddenFixedRoles, role]);
        this.syncCollectionsToTest(); // keeps the choice in the saved test data
        this.parametersAdjusted.emit();
      }
      this.cdr.markForCheck();
    };
    if (base) this.removeBaseParameter(base.index, { after: hideRow });
    else hideRow();
  }

  /** Row index (S1) of the test parameter behind a tensile role, or -1 when the row only comes from the specimen model. */
  roleParamIndex(role: SpecimenRole): number {
    return this.getBaseParameterList().find(p => resolveTensileRole(p.name) === role)?.index ?? -1;
  }

  /** Unit of the parameter behind a tensile result row (the unit that is saved and printed); the default when the row has none. */
  roleUnit(role: SpecimenRole, fallback: string): string {
    const idx = this.roleParamIndex(role);
    const unit = idx >= 0 ? String(this.parametersFormArray.at(idx)?.get('unit')?.value || '').trim() : '';
    return unit || fallback;
  }

  /** Formula details of the parameter behind a tensile result row. */
  openRoleFormula(role: SpecimenRole): void {
    const idx = this.roleParamIndex(role);
    if (idx >= 0) this.formulaRequested.emit({ rowIdx: idx, param: this.parametersFormArray.at(idx).value });
  }

  /** Formula details of an extra parameter row. */
  openRowFormula(rowIdx: number): void {
    this.formulaRequested.emit({ rowIdx, param: this.parametersFormArray.at(rowIdx).value });
  }

  /** Labels of the fixed rows taken off the screen that the matrix can show again. */
  get restorableTensileRows(): { role: SpecimenRole; label: string }[] {
    return Array.from(this.hiddenFixedRoles).map(role => ({ role, label: ConfiguredTestLayoutRendererComponent.TENSILE_ROW_LABELS[role] || role }));
  }

  restoreTensileRow(role: SpecimenRole): void {
    const next = new Set(this.hiddenFixedRoles);
    next.delete(role);
    this.hiddenFixedRoles = next;
    this.syncCollectionsToTest();
    this.cdr.markForCheck();
  }

  /** Other parameters of the test whose formula uses this row's parameter (generic tables); they must be removed first. */
  baseRowBlockers(baseRowIdx: number): string[] {
    if (!this.parametersFormArray) return [];
    const id = Number(this.parametersFormArray.at(baseRowIdx)?.get('parameterID')?.value) || 0;
    if (!id) return [];
    const token = new RegExp(`\\{?\\bP${id}\\b\\}?`, 'i');
    return this.getBaseParameterList()
      .filter(p => p.index !== baseRowIdx && token.test(String(this.parametersFormArray.at(p.index)?.get('formulaExpression')?.value || '')))
      .map(p => p.name);
  }

  /** True when the test has a parameter row for this role, so the tensile matrix shows the matching result row. */
  hasParameterRole(role: SpecimenRole): boolean {
    return this.getBaseParameterList().some(p => resolveTensileRole(p.name) === role);
  }

  /** The list is rebuilt on every check; tracking by row index keeps the DOM rows (and the focus inside an input). */
  trackByBaseRow = (_: number, p: { index: number }) => p.index;

  /** The location grid builds its parameter and group lists on every check; these keep the rows (and the inputs in them) alive. */
  trackByLocParam = (_: number, p: { name: string }) => p.name;
  trackByPosition = (i: number) => i;

  /** Tensile matrix: parameters that are not one of its fixed rows (e.g. Bend Diameter, added parameters). */
  getExtraBaseParameterList(): any[] {
    return this.getBaseParameterList().filter(p => !isSpecimenRole(resolveTensileRole(p.name)));
  }

  openAddParamModal(): void {
    if (this.isViewMode || this.isLocked) return;
    this.selectedParamDropdownItem = null;
    this.newParamData = {
      parameterID: null,
      parameterName: '',
      unit: '',
      inputType: 'Decimal',
      minValue: null,
      maxValue: null,
      acceptanceCriteria: '',
      testMethodUsed: this.getCleanTestMethod(),
      applyTo: 'all',
      isReportable: true,
      decimalPrecision: 2,
      dropdownOptions: []
    };
    // the test's own grade is the starting point
    const own = this.testPlan?.specSelected;
    this.paramGrade = own?.id ? { id: Number(own.id), name: own.name || `Grade #${own.id}` } : null;
    this.newParamLineId = null;
    this.paramLimitHint = '';
    this.loadGradeParamLines(this.paramGrade?.id ?? null);
    this.showAddParamModal = true;
  }

  closeAddParamModal(): void {
    this.showAddParamModal = false;
    this.selectedParamDropdownItem = null;
    this.newParamLineId = null;
    this.paramLimitHint = '';
    this.paramLineChoices = [];
    this.paramLineChoiceItem = null;
  }

  submitAddParam(): void {
    if (!this.newParamData.parameterName.trim() || !this.parametersFormArray) return;
    if (this.paramNeedsLineChoice) {
      this.toastService.show('Choose which limit of this grade applies.', 'warning');
      return;
    }
    this.hydrateSpecimensFromParameters(); // table values are the source of truth before rows/specimens change

    // "All specimens": one row per specimen. "Single specimen": the specimen in view (S1 in the all-specimens view).
    const targetSpecimens = this.newParamData.applyTo === 'all'
      ? Array.from({ length: Math.max(1, this.specimens.length) }, (_, s) => s)
      : [this.selectedSpecimenFilter === 'all' ? 0 : Math.max(0, this.selectedSpecimenFilter - 1)];

    // One result per parameter and specimen: a parameter the test already has is not added a second time
    // (a second row would also give the parameter two limits). Remove the old row first to replace it.
    const wantedName = this.newParamData.parameterName.trim().toLowerCase();
    const indexes = this.getRowSpecimenIndexes();
    const duplicateIn = targetSpecimens.find(sp => rowsOfSpecimen(indexes, sp).some(i => {
      const c = this.parametersFormArray.at(i);
      return Number(c.get('parameterID')?.value) === Number(this.newParamData.parameterID)
        || String(c.get('parameterName')?.value || '').trim().toLowerCase() === wantedName;
    }));
    if (duplicateIn !== undefined) {
      const where = targetSpecimens.length > 1 ? '' : ` (S${duplicateIn + 1})`;
      this.toastService.show(`"${this.newParamData.parameterName.trim()}" is already in this test${where}. Remove it first to replace it.`, 'warning');
      return;
    }

    for (const specimen of targetSpecimens) {
      const newCtrl = this.createParamControl({
        specimenIndex: specimen,
        parameterID: this.newParamData.parameterID,
        parameterName: this.newParamData.parameterName.trim(),
        unit: this.newParamData.unit.trim(),
        inputType: this.newParamData.inputType,
        minValue: this.paramGrade ? this.newParamData.minValue : null,
        maxValue: this.paramGrade ? this.newParamData.maxValue : null,
        // the limit of a grade line keeps its source for traceability; without a grade there is no limit
        specMinValue: this.paramGrade ? this.newParamData.minValue : null,
        specMaxValue: this.paramGrade ? this.newParamData.maxValue : null,
        specificationLineID: this.paramGrade ? this.newParamLineId : null,
        acceptanceCriteria: this.paramGrade ? this.newParamData.acceptanceCriteria.trim() : '',
        testMethodUsed: this.newParamData.testMethodUsed.trim(),
        decimalPrecision: this.newParamData.decimalPrecision ?? 2,
        dropdownOptions: this.newParamData.dropdownOptions || [],
        isReportable: this.newParamData.isReportable,
        isStandalone: true,
        isAdditional: true,
        isCalculated: false,
        isBillable: true
      });
      // Placed after that specimen's last row so each specimen's rows stay together
      this.parametersFormArray.insert(insertPositionForSpecimen(this.parametersFormArray, specimen), newCtrl);
    }

    this.closeAddParamModal();
    this.recalculateSpecimens();
    this.parametersAdjusted.emit();
  }

  private createParamControl(data: any): FormGroup {
    return this.fb.group({
      // 0 = new row (not saved yet); the API inserts rows with id 0 and the reload brings the new id back
      id: [data.id || 0],
      // Specimen this row belongs to (0 = S1), saved with the row
      specimenIndex: [Number(data.specimenIndex) > 0 ? Math.floor(Number(data.specimenIndex)) : 0],
      parameterID: [data.parameterID || null],
      parameterName: [data.parameterName || '', Validators.required],
      unit: [data.unit || ''],
      value: [data.value ?? null],
      remarks: [data.remarks || ''],
      minValue: [data.minValue ?? null],
      maxValue: [data.maxValue ?? null],
      isWithinLimit: [data.isWithinLimit ?? null],
      formulaExpression: [data.formulaExpression || ''],
      formulaDisplay: [data.formulaDisplay || ''],
      specMinValue: [data.specMinValue ?? null],
      specMaxValue: [data.specMaxValue ?? null],
      acceptanceCriteria: [data.acceptanceCriteria || ''],
      specificationLineID: [data.specificationLineID ?? null],
      isAdditional: [data.isAdditional ?? false],
      specSource: [data.specSource || ''],
      isCalculated: [data.isCalculated || false],
      isStandalone: [data.isStandalone || false],
      sourceTestMethodId: [data.sourceTestMethodId ?? null],
      resultStatus: [data.resultStatus || null],
      parameterType: [data.parameterType || 'Quantitative'],
      testMethodUsed: [data.testMethodUsed || this.getCleanTestMethod()],
      decimalPrecision: [data.decimalPrecision ?? 2],
      conversionFactor: [data.conversionFactor ?? 1],
      convertedValue: [data.convertedValue ?? null],
      selectedUnit: [data.selectedUnit || data.unit || ''],
      unitOptions: [data.unitOptions || []],
      isBillable: [data.isBillable ?? true],
      inputType: [data.inputType || 'Decimal'],
      dropdownOptions: [data.dropdownOptions || []]
    });
  }

  // =========================================================================
  // Multi-Reading Matrix Operations (Adjustable Spots & Template Defaults)
  // =========================================================================
  private initReadings(): void {
    const readingSections = this.sections.filter(s => s.type === 'reading');
    if (readingSections.length === 0) return;

    readingSections.forEach(s => {
      if (this.isReadingGrid(s)) {
        this.initReadingGrid(s);
        return;
      }
      const tableReadingCols = s.config?.tableColumns?.filter((c: any) => c.key && c.key.startsWith('reading_'))?.length;
      const defaultCount = tableReadingCols || parseInt(s.config?.count || s.config?.readingCount || '5', 10) || 5;
      const targets = this.getReadingTargetParameters(s);

      targets.forEach(targetName => {
        if (!this.readingValues[targetName] || this.readingValues[targetName].length === 0) {
          this.readingValues[targetName] = Array(defaultCount).fill(null);
          this.loadSavedReadingsFromForm(targetName, defaultCount);
          this.recalculateReadingStats(targetName);
        }
      });
    });
  }

  private loadSavedReadingsFromForm(targetName: string, count: number): void {
    // 1. Check if this.test?.readings contains persisted readings from database
    if (this.test?.readings && Array.isArray(this.test.readings) && this.test.readings.length > 0) {
      const testReadings = this.test.readings.filter((r: any) => {
        const pName = (r.parameterName || r.parameterCode || '').trim().toLowerCase();
        return pName === targetName.trim().toLowerCase() ||
               (targetName.toLowerCase().includes('hardness') && pName.includes('hardness')) ||
               (targetName.toLowerCase().includes('impact') && pName.includes('impact'));
      });
      if (testReadings.length > 0) {
        const maxSeq = Math.max(...testReadings.map((r: any) => r.readingNumber || r.sequenceNo || 1));
        const actualCount = Math.max(count, maxSeq);
        this.readingValues[targetName] = Array(actualCount).fill(null);
        testReadings.forEach((r: any) => {
          const idx = (r.readingNumber || r.sequenceNo || 1) - 1;
          const val = r.readingValue != null ? r.readingValue : r.value;
          if (idx >= 0 && val != null && !isNaN(Number(val))) {
            this.readingValues[targetName][idx] = Number(val);
          }
        });
        return;
      }
    }

    // 2. Check form array remarks (where serialized readings JSON was stored)
    if (!this.parametersFormArray) return;
    for (let i = 0; i < this.parametersFormArray.length; i++) {
      const ctrl = this.parametersFormArray.at(i);
      const name = ctrl.get('parameterName')?.value || '';
      if (name === targetName || (targetName.includes('Hardness') && name.includes('Hardness')) || (targetName.includes('Impact') && name.includes('Impact'))) {
        const remarks = ctrl.get('remarks')?.value;
        if (remarks && typeof remarks === 'string' && remarks.startsWith('[') && remarks.endsWith(']')) {
          try {
            const parsed = JSON.parse(remarks);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const actualCount = Math.max(count, parsed.length);
              this.readingValues[targetName] = Array(actualCount).fill(null);
              for (let r = 0; r < parsed.length; r++) {
                this.readingValues[targetName][r] = parsed[r] != null && !isNaN(Number(parsed[r])) ? Number(parsed[r]) : null;
              }
              return;
            }
          } catch (e) {
            // Ignore parse error and proceed to fallback
          }
        }
        // Fallback: If no remarks JSON, but value exists, pre-seed first slot
        const savedVal = ctrl.get('value')?.value;
        if (savedVal !== null && savedVal !== undefined && savedVal !== '' && !isNaN(Number(savedVal))) {
          this.readingValues[targetName][0] = Number(savedVal);
        }
        break;
      }
    }
  }

  // =========================================================================
  // Reading grid (A2): ONE target parameter, a row per sample / location, the readings across or down.
  // Used when the layout names the parameter (studio: Target Parameter). Without it the section lists the
  // parameters of the test as before.
  // =========================================================================
  readingRowsState: Record<string, { code: string; label: string }[]> = {};
  readingGridCount: Record<string, number> = {};
  private readingGridSignature: Record<string, string> = {};

  private readingSecKey(s: any): string {
    return String(s?.config?.sectionKey ?? s?.id ?? 'reading');
  }

  private normKey(v: any): string {
    return String(v ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  /** The parameter the layout set for a reading section ('' = the section lists the test's parameters). */
  readingGridTarget(s: any): string {
    return String(s?.config?.targetParamName ?? '').trim();
  }

  isReadingGrid(s: any): boolean {
    return s?.type === 'reading' && !!this.readingGridTarget(s);
  }

  readingsAsRows(s: any): boolean {
    return String(s?.config?.readingsAs ?? '').toLowerCase() === 'rows';
  }

  private gridParamControl(s: any): AbstractControl | null {
    const want = this.normKey(this.readingGridTarget(s));
    const fa = this.parametersFormArray;
    for (let i = 0; fa && i < fa.length; i++) {
      if (this.normKey(fa.at(i).get('parameterName')?.value) === want) return fa.at(i);
    }
    return null;
  }

  /** True when the test has the parameter the layout names. */
  gridParamFound(s: any): boolean {
    return !!this.gridParamControl(s);
  }

  /** Name of the target parameter as the test spells it (the layout's spelling when the test has none). */
  readingGridParam(s: any): string {
    return String(this.gridParamControl(s)?.get('parameterName')?.value ?? '').trim() || this.readingGridTarget(s);
  }

  readingGridRows(s: any): { code: string; label: string }[] {
    return this.readingRowsState[this.readingSecKey(s)] || [];
  }

  readingGridKey(s: any, code: string): string {
    return `${this.readingGridParam(s)}|${code}`;
  }

  /** Row names the layout lists: its sample rows, else its specimen names, else one row. */
  private configuredReadingRows(s: any): string[] {
    const cfg = s?.config || {};
    const fromRows = (Array.isArray(cfg.tableRows) ? cfg.tableRows : [])
      .filter((r: any) => String(r?.key ?? '').startsWith('spec_') && r.visible !== false)
      .map((r: any) => String(r.label ?? '').trim()).filter(Boolean);
    if (fromRows.length) return fromRows;
    const fromList = (Array.isArray(cfg.specimenRows) ? cfg.specimenRows : []).map((n: any) => String(n ?? '').trim()).filter(Boolean);
    return fromList.length ? fromList : [this.readingGridTarget(s)];
  }

  private configuredReadingCount(s: any): number {
    const n = Number(s?.config?.count) || Number(s?.config?.spotCount) || 5;
    return Math.min(25, Math.max(1, Math.round(n)));
  }

  /** Readings of the target parameter held by the test, by sample code (database rows first, else the saved remarks). */
  private savedGridReadings(s: any): Map<string, (number | null)[]> {
    const out = new Map<string, (number | null)[]>();
    const want = this.normKey(this.readingGridTarget(s));
    const put = (code: string, seq: number, v: any) => {
      if (v == null || v === '' || isNaN(Number(v)) || seq < 1) return;
      const arr = out.get(code) || [];
      while (arr.length < seq) arr.push(null);
      arr[seq - 1] = Number(v);
      out.set(code, arr);
    };
    const stored: any[] = Array.isArray(this.test?.readings) ? this.test.readings : [];
    stored.filter(r => this.normKey(r.parameterName || r.parameterCode) === want && r.isVoided !== true)
      .forEach(r => put(String(r.specimenCode || 'S1'), Number(r.readingNumber || r.sequenceNo || 1), r.readingValue ?? r.value));
    if (out.size) return out;
    // older saves kept the readings only in the remarks of the parameter row
    const raw = this.gridParamControl(s)?.get('remarks')?.value;
    if (typeof raw === 'string' && /^[\[{]/.test(raw.trim())) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) parsed.forEach((v, i) => put('S1', i + 1, v));
        else if (parsed && typeof parsed === 'object') Object.keys(parsed).forEach(code => (parsed[code] || []).forEach((v: any, i: number) => put(code, i + 1, v)));
      } catch {
        // not readings
      }
    }
    return out;
  }

  private initReadingGrid(s: any): void {
    const key = this.readingSecKey(s);
    const labels = this.configuredReadingRows(s);
    const count = this.configuredReadingCount(s);
    const signature = JSON.stringify([this.readingGridParam(s), labels, count, this.test?.headerId]);
    if (this.readingGridSignature[key] === signature) return; // nothing about the layout changed: keep what was typed
    this.readingGridSignature[key] = signature;

    const rows = labels.map((label, i) => ({ code: `S${i + 1}`, label }));
    const saved = this.savedGridReadings(s);
    saved.forEach((_vals, code) => {
      if (!rows.some(r => r.code === code)) rows.push({ code, label: code }); // saved, though the layout does not list it
    });
    let n = count;
    saved.forEach(vals => (n = Math.max(n, vals.length)));
    n = Math.min(25, n);
    this.readingRowsState[key] = rows;
    this.readingGridCount[key] = n;
    rows.forEach(r => {
      const arr: (number | null)[] = Array(n).fill(null);
      (saved.get(r.code) || []).forEach((v, i) => { if (i < n) arr[i] = v; });
      this.readingValues[this.readingGridKey(s, r.code)] = arr;
      this.recalcGridStats(s, r.code);
    });
  }

  private gridDecimals(s: any): number {
    const d = Number(this.gridParamControl(s)?.get('decimalPrecision')?.value);
    return Number.isFinite(d) && d >= 0 && d <= 6 ? d : 2;
  }

  private recalcGridStats(s: any, code: string): void {
    const key = this.readingGridKey(s, code);
    const vals = (this.readingValues[key] || []).filter((v): v is number => v != null && !isNaN(v));
    if (!vals.length) {
      this.readingStats[key] = { avg: null, min: null, max: null, stdev: null, median: null };
      return;
    }
    const dec = this.gridDecimals(s);
    const round = (v: number) => Number(v.toFixed(dec));
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const sorted = [...vals].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    const stdev = vals.length > 1 ? Math.sqrt(vals.reduce((a, v) => a + Math.pow(v - mean, 2), 0) / (vals.length - 1)) : null;
    this.readingStats[key] = { avg: round(mean), min: Math.min(...vals), max: Math.max(...vals), stdev: stdev == null ? null : round(stdev), median: round(median) };
  }

  getGridReading(s: any, code: string, idx: number): number | null | undefined {
    return this.readingValues[this.readingGridKey(s, code)]?.[idx];
  }

  /** Individual readings are shown while entering; a layout can leave them out of the finished record. */
  showGridReadings(s: any): boolean {
    return s?.config?.showIndividual !== false || (!this.isViewMode && !this.isLocked);
  }

  gridUnit(s: any): string {
    return String(s?.config?.targetUnit ?? '').trim() || String(this.gridParamControl(s)?.get('unit')?.value ?? '').trim();
  }

  gridAggregateLabel(s: any): string {
    return this.columnLabel(s, 'agg', String(s?.config?.aggregation ?? '').trim() || 'Average');
  }

  gridAggregate(s: any, code: string): number | null {
    const st = this.readingStats[this.readingGridKey(s, code)];
    if (!st) return null;
    const a = String(s?.config?.aggregation ?? 'Average').toLowerCase();
    if (a.startsWith('min')) return st.min;
    if (a.startsWith('max')) return st.max;
    if (a.startsWith('median')) return st.median ?? null;
    if (a.startsWith('standard')) return st.stdev;
    return st.avg;
  }

  gridStat(s: any, code: string, field: 'min' | 'max'): number | null {
    return this.readingStats[this.readingGridKey(s, code)]?.[field] ?? null;
  }

  gridFmt(s: any, v: number | null | undefined): string {
    return v == null ? '—' : v.toFixed(this.gridDecimals(s));
  }

  private gridLimits(s: any): { min: number | null; max: number | null } {
    const num = (v: any) => (v === null || v === undefined || v === '' || isNaN(Number(v)) ? null : Number(v));
    const cfgMin = num(s?.config?.targetMin);
    const cfgMax = num(s?.config?.targetMax);
    if (cfgMin != null || cfgMax != null) return { min: cfgMin, max: cfgMax };
    const c = this.gridParamControl(s);
    return { min: num(c?.get('specMinValue')?.value ?? c?.get('minValue')?.value), max: num(c?.get('specMaxValue')?.value ?? c?.get('maxValue')?.value) };
  }

  /** The requirement text: the layout's own, else the limits of the specification. */
  gridRequirement(s: any): string {
    const own = String(s?.config?.targetRequirement ?? '').trim();
    if (own) return own;
    const { min, max } = this.gridLimits(s);
    if (min != null && max != null) return `${min} – ${max}`;
    if (min != null) return `≥ ${min}`;
    if (max != null) return `≤ ${max}`;
    return this.formatSpecRange(this.gridParamControl(s)?.value);
  }

  gridStatus(s: any, code: string): 'PASS' | 'FAIL' | 'PENDING' {
    const v = this.gridAggregate(s, code);
    const { min, max } = this.gridLimits(s);
    if (v == null || (min == null && max == null)) return 'PENDING';
    return (min != null && v < min) || (max != null && v > max) ? 'FAIL' : 'PASS';
  }

  gridBadge(status: string): string {
    return status === 'PASS' ? 'bg-success text-white' : status === 'FAIL' ? 'bg-danger text-white' : 'bg-light text-muted border';
  }

  private gridAllValues(s: any): number[] {
    const all: number[] = [];
    this.readingGridRows(s).forEach(r => (this.readingValues[this.readingGridKey(s, r.code)] || []).forEach(v => { if (v != null && !isNaN(v)) all.push(v); }));
    return all;
  }

  /** Average of every reading of the section (the value the parameter row carries). */
  gridOverallAverage(s: any): number | null {
    const all = this.gridAllValues(s);
    return all.length ? Number((all.reduce((a, b) => a + b, 0) / all.length).toFixed(this.gridDecimals(s))) : null;
  }

  /** Largest minus smallest reading of the section; null with fewer than two readings. */
  gridSpread(s: any): number | null {
    const all = this.gridAllValues(s);
    return all.length > 1 ? Number((Math.max(...all) - Math.min(...all)).toFixed(this.gridDecimals(s))) : null;
  }

  gridSpreadExceeded(s: any): boolean {
    const limit = Number(s?.config?.outlierSpreadLimit);
    const spread = this.gridSpread(s);
    return Number.isFinite(limit) && limit > 0 && spread != null && spread > limit;
  }

  gridColumnCount(s: any): number {
    const cfg = s?.config || {};
    let n = 1;
    if (this.specimenShow(s, 'unit')) n++;
    if (this.showGridReadings(s)) n += this.getReadingCount(s);
    if (this.columnVisible(s, 'agg')) n++;
    if (this.gridStatsShown(s)) n += 2;
    if (this.columnVisible(s, 'requirement') && !cfg.requirementRow) n++;
    if (this.columnVisible(s, 'status')) n++;
    return n;
  }

  /** Writes the average of all readings (and the readings themselves) into the parameter row, like the legacy table. */
  private updateGridParameter(s: any): void {
    const ctrl = this.gridParamControl(s);
    const fa = this.parametersFormArray;
    if (!ctrl || !fa) return;
    const rows = this.readingGridRows(s);
    const remarks = rows.length === 1
      ? JSON.stringify(this.readingValues[this.readingGridKey(s, rows[0].code)] || [])
      : JSON.stringify(Object.fromEntries(rows.map(r => [r.code, this.readingValues[this.readingGridKey(s, r.code)] || []])));
    ctrl.patchValue({ value: this.gridOverallAverage(s), remarks });
    this.evaluateLimitForControl(ctrl);
    this.paramValueChanged.emit({ rowIdx: fa.controls.indexOf(ctrl as any), param: ctrl.value });
  }

  onGridReadingChange(s: any, code: string, rIdx: number, val: any): void {
    if (this.printMode) return;
    const key = this.readingGridKey(s, code);
    const parsed = val !== null && val !== '' && !isNaN(Number(val)) ? parseFloat(val) : null;
    const arr = this.readingValues[key] || (this.readingValues[key] = []);
    while (arr.length <= rIdx) arr.push(null);
    arr[rIdx] = parsed;
    this.recalcGridStats(s, code);
    this.updateGridParameter(s);
    this.syncCollectionsToTest();
  }

  private setGridCount(s: any, n: number): void {
    this.readingGridCount[this.readingSecKey(s)] = n;
    this.readingGridRows(s).forEach(r => {
      const arr = this.readingValues[this.readingGridKey(s, r.code)] || (this.readingValues[this.readingGridKey(s, r.code)] = []);
      while (arr.length < n) arr.push(null);
      arr.length = n;
      this.recalcGridStats(s, r.code);
    });
    this.updateGridParameter(s);
    this.syncCollectionsToTest();
    this.cdr.markForCheck();
  }

  addReadingRow(s: any): void {
    if (this.isViewMode || this.isLocked || !this.canAddRemoveRows(s)) return;
    const key = this.readingSecKey(s);
    const rows = this.readingRowsState[key] || (this.readingRowsState[key] = []);
    if (rows.length >= 30) return;
    const code = `S${rows.length + 1}`;
    rows.push({ code, label: code });
    this.readingValues[this.readingGridKey(s, code)] = Array(this.getReadingCount(s)).fill(null);
    this.recalcGridStats(s, code);
    this.cdr.markForCheck();
  }

  /** Removes the last row; refused while it holds a reading (clear it first). */
  removeReadingRow(s: any): void {
    if (this.isViewMode || this.isLocked || !this.canAddRemoveRows(s)) return;
    const key = this.readingSecKey(s);
    const rows = this.readingRowsState[key] || [];
    if (rows.length <= 1) return;
    const last = rows[rows.length - 1];
    const vkey = this.readingGridKey(s, last.code);
    if ((this.readingValues[vkey] || []).some(v => v != null)) {
      this.toastService.show(`${last.label} holds readings. Clear them before removing the row.`, 'warning');
      return;
    }
    rows.pop();
    delete this.readingValues[vkey];
    delete this.readingStats[vkey];
    this.updateGridParameter(s);
    this.syncCollectionsToTest();
    this.cdr.markForCheck();
  }

  // =========================================================================
  // Location grid (A3): the layout lists the parameters measured at each location; every location holds the
  // readings of each of them (saved with the location code).
  // =========================================================================
  /** A location section the layout gave parameters to. Without them it is the plain list of locations. */
  isLocationGrid(s: any): boolean {
    return (s?.type === 'location' || s?.type === 'loc') && Array.isArray(s?.config?.locationParams) && s.config.locationParams.length > 0;
  }

  /** How the parameters of a location are laid out: under the location, as columns, or as rows (locations across). */
  locationLayout(s: any): 'under' | 'columns' | 'rows' {
    const o = String(s?.config?.orientation ?? '').trim().toLowerCase();
    if (o.startsWith('parameters under')) return 'under';
    if (o.startsWith('parameters')) return 'rows';
    return 'columns';
  }

  private locParamControl(name: string): AbstractControl | null {
    const want = this.normKey(name);
    const fa = this.parametersFormArray;
    for (let i = 0; fa && i < fa.length; i++) {
      if (this.normKey(fa.at(i).get('parameterName')?.value) === want) return fa.at(i);
    }
    return null;
  }

  /** The parameters the layout lists for each location, as the test names them. */
  locationParamsOf(s: any): { name: string; displayName: string; unit: string; average: boolean; found: boolean }[] {
    const avgList: string[] | null = Array.isArray(s?.config?.locationAverageParams) ? s.config.locationAverageParams : null;
    return (s?.config?.locationParams || []).map((layoutName: string) => {
      const ctrl = this.locParamControl(layoutName);
      const name = String(ctrl?.get('parameterName')?.value ?? '').trim() || layoutName;
      return {
        name,
        displayName: name,
        unit: String(ctrl?.get('unit')?.value ?? '').trim(),
        average: this.locAvgOverride[this.readingSecKey(s)]?.[this.normKey(name)]
          ?? (s?.config?.showAverage !== false && (!avgList || avgList.some(n => this.normKey(n) === this.normKey(layoutName)))),
        found: !!ctrl,
      };
    });
  }

  /** Average shown for one location parameter: the layout decides, the user can switch it per section on this screen. */
  private locAvgOverride: Record<string, Record<string, boolean>> = {};

  toggleLocationAverage(s: any, paramName: string): void {
    const sec = this.readingSecKey(s);
    const cur = this.locationParamsOf(s).find(p => this.normKey(p.name) === this.normKey(paramName))?.average ?? false;
    this.locAvgOverride[sec] = { ...(this.locAvgOverride[sec] || {}), [this.normKey(paramName)]: !cur };
  }

  /** Readings per location (R1..Rn) changed on this screen; within the configured range 1..10. */
  adjustLocationReadings(s: any, delta: number): void {
    if (this.isViewMode || this.isLocked || !this.canAdjustCount(s)) return;
    const sec = this.readingSecKey(s);
    const n = Math.min(10, Math.max(1, (this.locReadingCount[sec] ?? this.configuredLocationReadings(s)) + delta));
    // a reading already entered is never cut off
    const params = this.locationParamsOf(s).filter(p => p.found);
    const used = Math.max(0, ...params.flatMap(p => this.locations.map(loc => {
      const arr = this.readingValues[this.locKey(p.name, loc.locationCode)] || [];
      let last = 0; arr.forEach((v, i) => { if (v != null && (v as any) !== '') last = i + 1; });
      return last;
    })));
    if (n < used) return;
    this.locReadingCount[sec] = n;
    params.forEach(p => this.locations.forEach(loc => {
      const key = this.locKey(p.name, loc.locationCode);
      const arr = [...(this.readingValues[key] || [])];
      while (arr.length < n) arr.push(null);
      arr.length = n;
      this.readingValues[key] = arr;
    }));
    this.syncCollectionsToTest();
  }

  locationReadingCount(s: any): number {
    return this.locReadingCount[this.readingSecKey(s)] ?? this.configuredLocationReadings(s);
  }

  locAnyAverage(s: any): boolean {
    return this.locationParamsOf(s).some(p => p.average);
  }

  locationReadingIndices(s: any): number[] {
    return Array.from({ length: this.locReadingCount[this.readingSecKey(s)] ?? this.configuredLocationReadings(s) }, (_, i) => i);
  }

  private configuredLocationReadings(s: any): number {
    return Math.min(10, Math.max(1, Math.round(Number(s?.config?.locationReadings) || 3)));
  }

  private locReadingCount: Record<string, number> = {};

  private locKey(paramName: string, code: string): string {
    return `${paramName}|loc:${code}`;
  }

  /** Locations the layout lists (its rows, else its names); a saved test keeps its own list. */
  private layoutLocationLabels(locSec: any): string[] {
    const cfg = locSec?.config || {};
    const fromRows = (Array.isArray(cfg.locationRows) ? cfg.locationRows : []).map((n: any) => String(n ?? '').trim()).filter(Boolean);
    if (fromRows.length) return fromRows;
    const fromTable = (Array.isArray(cfg.tableRows) ? cfg.tableRows : [])
      .filter((r: any) => r?.visible !== false).map((r: any) => String(r?.label ?? '').trim()).filter(Boolean);
    if (fromTable.length) return fromTable;
    return String(cfg.locationNames ?? '').split(',').map(n => n.trim()).filter(Boolean);
  }

  /** Readings the test holds for a parameter at a location, in order of their number. */
  private savedLocationReadings(paramName: string, code: string): (number | null)[] {
    const want = this.normKey(paramName);
    const arr: (number | null)[] = [];
    const stored: any[] = Array.isArray(this.test?.readings) ? this.test.readings : [];
    stored
      .filter(r => this.normKey(r.parameterName || r.parameterCode) === want && this.normKey(r.locationCode) === this.normKey(code) && r.isVoided !== true)
      .forEach(r => {
        const seq = Number(r.readingNumber || r.sequenceNo || 1);
        const v = r.readingValue ?? r.value;
        if (seq < 1 || v == null || v === '' || isNaN(Number(v))) return;
        while (arr.length < seq) arr.push(null);
        arr[seq - 1] = Number(v);
      });
    return arr;
  }

  private initLocationGrids(): void {
    (this.sections || []).filter(sec => this.isLocationGrid(sec)).forEach(sec => this.initLocationGrid(sec));
  }

  /**
   * Readings saved under a location the list does not hold (an older list) bring that location back, named by its
   * code, so the next save does not drop them.
   */
  private restoreLocationsOfSavedReadings(paramNames: string[]): void {
    const wanted = new Set(paramNames.map(n => this.normKey(n)));
    const stored: any[] = Array.isArray(this.test?.readings) ? this.test.readings : [];
    stored.forEach(r => {
      const code = String(r.locationCode ?? '').trim();
      if (!code || r.isVoided === true || !wanted.has(this.normKey(r.parameterName || r.parameterCode))) return;
      if (this.locations.some(l => this.normKey(l.locationCode) === this.normKey(code))) return;
      this.locations.push({ locationCode: code, locationName: code, displayOrder: this.locations.length + 1, isReportable: true, remarks: '' });
    });
  }

  private initLocationGrid(s: any): void {
    const params = this.locationParamsOf(s).filter(p => p.found);
    this.restoreLocationsOfSavedReadings(params.map(p => p.name));
    let n = this.configuredLocationReadings(s);
    params.forEach(p => this.locations.forEach(loc => (n = Math.max(n, this.savedLocationReadings(p.name, loc.locationCode).length))));
    n = Math.min(10, n);
    this.locReadingCount[this.readingSecKey(s)] = n;
    params.forEach(p => this.locations.forEach(loc => {
      const key = this.locKey(p.name, loc.locationCode);
      // what was typed in this session stays; a missing list is built from the saved readings
      const arr: (number | null)[] = this.readingValues[key] ? [...this.readingValues[key]] : [...this.savedLocationReadings(p.name, loc.locationCode)];
      while (arr.length < n) arr.push(null);
      arr.length = n;
      this.readingValues[key] = arr;
    }));
  }

  getLocReading(paramName: string, code: string, idx: number): number | null | undefined {
    return this.readingValues[this.locKey(paramName, code)]?.[idx];
  }

  private locDecimals(paramName: string): number {
    const d = Number(this.locParamControl(paramName)?.get('decimalPrecision')?.value);
    return Number.isFinite(d) && d >= 0 && d <= 6 ? d : 2;
  }

  /** Average of the readings of one parameter at one location (null without a reading). */
  locAverage(paramName: string, code: string): number | null {
    const vals = (this.readingValues[this.locKey(paramName, code)] || []).filter((v): v is number => v != null && !isNaN(v));
    return vals.length ? Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(this.locDecimals(paramName))) : null;
  }

  locFmt(paramName: string, v: number | null | undefined): string {
    return v == null ? '' : v.toFixed(this.locDecimals(paramName));
  }

  /** The readings of a cell as one list ("163,163,162"). */
  locJoined(paramName: string, code: string): string {
    return (this.readingValues[this.locKey(paramName, code)] || []).filter(v => v != null && !isNaN(v as number)).join(',');
  }

  /** Readings are shown as one list in the finished record when the layout asks for it. */
  locJoinedView(s: any): boolean {
    return !!s?.config?.readingsJoined && (this.isViewMode || this.isLocked || this.printMode);
  }

  /** Locations split into the column groups of the layout (the first group takes `locationGroupRows` rows). */
  locationGroups(s: any): LocationData[][] {
    const groups = Math.min(3, Math.max(1, Math.round(Number(s?.config?.locationColumns) || 1)));
    const all = this.locations;
    if (groups === 1) return [all];
    const size = Math.max(1, Math.round(Number(s?.config?.locationGroupRows) || Math.ceil(all.length / groups)));
    return Array.from({ length: groups }, (_, g) => all.slice(g * size, (g + 1) * size));
  }

  locationRowIndices(s: any): number[] {
    const longest = Math.max(0, ...this.locationGroups(s).map(g => g.length));
    return Array.from({ length: longest }, (_, i) => i);
  }

  /** Columns of one group of the "locations as rows" table: the name and a cell per parameter (plus its average). */
  locGroupColumns(s: any): number {
    return 1 + this.locationParamsOf(s).reduce((n, p) => n + 1 + (p.average ? 1 : 0), 0);
  }

  locTotalColumns(s: any): number {
    return this.locationGroups(s).length * this.locGroupColumns(s);
  }

  /** Requirement of the parameters of the section (one text per parameter when there are several). */
  locRequirement(s: any): string {
    const params = this.locationParamsOf(s);
    const text = (p: { name: string }) => this.formatSpecRange(this.locParamControl(p.name)?.value);
    return params.length === 1 ? text(params[0]) : params.map(p => `${p.displayName}: ${text(p)}`).join(' · ');
  }

  /**
   * Readings entered / expected over the reading and location grids of this layout (the counter of the screen),
   * and whether a parameter is measured in such a grid (its parameter row then only holds the average).
   */
  readingProgress(): { entered: number; expected: number } {
    let entered = 0;
    let expected = 0;
    const count = (arr: any[] | undefined) => (arr || []).filter(v => v !== null && v !== undefined && v !== '').length;
    this.sections.forEach(s => {
      if (!this.isSectionVisible(s)) return;
      if (this.isLocationGrid(s)) {
        const n = this.locationReadingCount(s);
        this.locationParamsOf(s).filter(p => p.found).forEach(p => this.locations.forEach(loc => {
          expected += n;
          entered += count(this.readingValues[this.locKey(p.name, loc.locationCode)]);
        }));
      } else if (this.isReadingGrid(s)) {
        const n = this.getReadingCount(s);
        this.readingGridRows(s).forEach(r => {
          expected += n;
          entered += count(this.readingValues[this.readingGridKey(s, r.code)]);
        });
      }
    });
    return { entered, expected };
  }

  isGridParameter(name: string): boolean {
    const want = this.normKey(name);
    return this.sections.some(s =>
      (this.isLocationGrid(s) && this.locationParamsOf(s).some(p => this.normKey(p.name) === want)) ||
      (this.isReadingGrid(s) && this.normKey(this.readingGridParam(s)) === want));
  }

  /** Requirement column / row of a location grid: the layout decides, the user can switch it per section on this screen. */
  private locReqOverride: Record<string, boolean> = {};

  locShowRequirement(s: any): boolean {
    return this.locReqOverride[this.readingSecKey(s)] ?? !!s?.config?.showRequirement;
  }

  toggleLocationRequirement(s: any): void {
    this.locReqOverride = { ...this.locReqOverride, [this.readingSecKey(s)]: !this.locShowRequirement(s) };
  }

  /** Requirement of one location parameter, from its parameter row (plan / specification limit); '' when none. */
  locParamRequirement(paramName: string): string {
    const v = this.locParamControl(paramName)?.value;
    const min = this.toNum(v?.minValue ?? v?.specMinValue);
    const max = this.toNum(v?.maxValue ?? v?.specMaxValue);
    return min !== null && max !== null ? `${min} – ${max}` : min !== null ? `≥ ${min}` : max !== null ? `≤ ${max}` : '';
  }

  /** True when an entered reading lies outside the limit of its parameter (the cell turns red). */
  locReadingOutOfLimit(paramName: string, value: any): boolean {
    const n = this.toNum(value);
    if (n === null) return false;
    const v = this.locParamControl(paramName)?.value;
    const min = this.toNum(v?.minValue ?? v?.specMinValue);
    const max = this.toNum(v?.maxValue ?? v?.specMaxValue);
    return (min !== null && n < min) || (max !== null && n > max);
  }

  private toNum(v: any): number | null {
    return v === null || v === undefined || v === '' || isNaN(Number(v)) ? null : Number(v);
  }

  /** Writes the average of all readings of the parameter (and the readings by location) into its parameter row. */
  private updateLocationParameter(paramName: string): void {
    const ctrl = this.locParamControl(paramName);
    const fa = this.parametersFormArray;
    if (!ctrl || !fa) return;
    const byLocation: Record<string, (number | null)[]> = {};
    const all: number[] = [];
    this.locations.forEach(loc => {
      const arr = this.readingValues[this.locKey(paramName, loc.locationCode)] || [];
      byLocation[loc.locationCode] = arr;
      arr.forEach(v => { if (v != null && !isNaN(v)) all.push(v); });
    });
    const avg = all.length ? Number((all.reduce((a, b) => a + b, 0) / all.length).toFixed(this.locDecimals(paramName))) : null;
    ctrl.patchValue({ value: avg, remarks: JSON.stringify(byLocation) });
    this.evaluateLimitForControl(ctrl);
    this.paramValueChanged.emit({ rowIdx: fa.controls.indexOf(ctrl as any), param: ctrl.value });
  }

  onLocationReadingChange(paramName: string, code: string, idx: number, val: any): void {
    if (this.printMode) return;
    const key = this.locKey(paramName, code);
    const parsed = val !== null && val !== '' && !isNaN(Number(val)) ? parseFloat(val) : null;
    const arr = this.readingValues[key] || (this.readingValues[key] = []);
    while (arr.length <= idx) arr.push(null);
    arr[idx] = parsed;
    this.updateLocationParameter(paramName);
    this.syncCollectionsToTest();
  }

  /** Removes the last location of a grid; refused while it holds a reading (clear it first). */
  removeLastLocation(s: any): void {
    if (this.isViewMode || this.isLocked || !this.canAddRemoveRows(s) || this.locations.length <= 1) return;
    const last = this.locations[this.locations.length - 1];
    const params = this.locationParamsOf(s);
    if (params.some(p => (this.readingValues[this.locKey(p.name, last.locationCode)] || []).some(v => v != null))) {
      this.toastService.show(`${last.locationName} holds readings. Clear them before removing the location.`, 'warning');
      return;
    }
    params.forEach(p => delete this.readingValues[this.locKey(p.name, last.locationCode)]);
    this.locations.pop();
    params.forEach(p => this.updateLocationParameter(p.name));
    this.syncCollectionsToTest();
    this.cdr.markForCheck();
  }

  getReadingTargetParameters(s: any): string[] {
    if (s?.config?.parameters && Array.isArray(s.config.parameters) && s.config.parameters.length > 0) {
      return s.config.parameters;
    }
    const specified = s?.config?.targetParameter;
    const names: string[] = [];

    if (this.parametersFormArray && this.parametersFormArray.length > 0) {
      for (let i = 0; i < this.parametersFormArray.length; i++) {
        const pName = (this.parametersFormArray.at(i).get('parameterName')?.value || '').trim();
        if (!pName) continue;
        const lower = pName.toLowerCase();
        // Skip auxiliary pseudo-parameters that are not indentation readings
        if (lower.includes('scale') || lower.includes('test point') || lower.includes('average hardness')) {
          continue;
        }
        if (!names.includes(pName)) {
          names.push(pName);
        }
      }
    }

    if (names.length > 0) {
      return names;
    }
    if (specified) {
      return [specified];
    }
    return [this.getTargetParamName()];
  }

  getTargetParamName(): string {
    if (!this.parametersFormArray || this.parametersFormArray.length === 0) return 'Test Parameter';
    const first = this.parametersFormArray.at(0).value;
    return first.parameterName || 'Test Parameter';
  }

  getReadingIndices(s: any): number[] {
    const count = this.getReadingCount(s);
    return Array.from({ length: count }, (_, i) => i);
  }

  getReadingCount(s: any): number {
    if (this.isReadingGrid(s)) return this.readingGridCount[this.readingSecKey(s)] ?? this.configuredReadingCount(s);
    const targets = this.getReadingTargetParameters(s);
    const primary = targets[0] || this.getTargetParamName();
    if (this.readingValues[primary] && this.readingValues[primary].length > 0) {
      return this.readingValues[primary].length;
    }
    return parseInt(s?.config?.count || s?.config?.readingCount || '5', 10) || 5;
  }

  getDefaultReadingCount(s: any): number {
    return parseInt(s?.config?.count || s?.config?.readingCount || '5', 10) || 5;
  }

  getParamControl(targetName: string): AbstractControl | null {
    if (!this.parametersFormArray) return null;
    for (let i = 0; i < this.parametersFormArray.length; i++) {
      const ctrl = this.parametersFormArray.at(i);
      const name = (ctrl.get('parameterName')?.value || '').trim();
      if (name.toLowerCase() === targetName.trim().toLowerCase() ||
         (targetName.toLowerCase().includes('hardness') && name.toLowerCase().includes('hardness')) ||
         (targetName.toLowerCase().includes('impact') && name.toLowerCase().includes('impact'))) {
        return ctrl;
      }
    }
    return null;
  }

  formatSpecRange(param: any): string {
    if (!param) return '—';
    const min = param.specMinValue != null ? param.specMinValue : param.minValue;
    const max = param.specMaxValue != null ? param.specMaxValue : param.maxValue;
    if (min != null && max != null) return `${min} – ${max}`;
    if (min != null) return `≥ ${min}`;
    if (max != null) return `≤ ${max}`;
    return param.acceptanceCriteria || '—';
  }

  getParamStatusLabel(targetName: string): string {
    const ctrl = this.getParamControl(targetName);
    if (!ctrl) return 'PENDING';
    const val = ctrl.get('value')?.value;
    if (val === null || val === undefined || val === '') return 'PENDING';
    const isWithin = ctrl.get('isWithinLimit')?.value;
    if (isWithin === true) return 'PASS';
    if (isWithin === false) return 'FAIL';
    const status = ctrl.get('resultStatus')?.value;
    if (status) return String(status).toUpperCase();
    return 'PENDING';
  }

  getParamStatusBadgeClass(targetName: string): string {
    const status = this.getParamStatusLabel(targetName);
    if (status === 'PASS' || status === 'WITHIN RANGE') return 'bg-success text-white';
    if (status === 'FAIL' || status === 'OUT OF RANGE') return 'bg-danger text-white';
    return 'bg-light text-muted border';
  }

  getReadingRowClass(targetName: string): string {
    const status = this.getParamStatusLabel(targetName);
    if (status === 'FAIL') return 'table-danger bg-danger-subtle';
    if (status === 'PASS') return 'table-success bg-success-subtle';
    return '';
  }

  // ---- Specimen matrix follows the layout (A1) --------------------------------------------------------------

  /** First specimen-matrix section of the layout. */
  get specimenSection(): any {
    return (this.sections || []).find(sec => sec.type === 'specimen') || null;
  }

  /** Header text of specimen i: the layout's own name, else its prefix + number, else S{n}. */
  specimenLabel(spmIdx: number, sec?: any): string {
    const s = sec ?? this.specimenSection;
    const named = s?.config?.specimenRows?.[spmIdx];
    const text = typeof named === 'string' ? named.trim() : '';
    if (text) return text;
    const prefix = String(s?.config?.prefix ?? '').trim();
    return prefix ? `${prefix}${spmIdx + 1}` : `S${spmIdx + 1}`;
  }

  private columnDef(sec: any, key: string): any {
    return (Array.isArray(sec?.config?.tableColumns) ? sec.config.tableColumns : []).find((c: any) => c?.key === key);
  }

  /** A column the layout lists as hidden is not drawn; a column it does not list follows the section's own switches. */
  columnVisible(sec: any, key: string): boolean {
    const ov = this.columnOverride[this.sectionUiKey(sec)]?.[key];
    if (ov !== undefined) return ov;
    const c = this.columnDef(sec, key);
    return !c || c.visible !== false;
  }

  /** The layout's own heading; a heading it left empty on purpose stays empty, one it does not list gets the default. */
  columnLabel(sec: any, key: string, fallback: string): string {
    const def = this.columnDef(sec, key);
    return def && typeof def.label === 'string' ? def.label.trim() : fallback;
  }

  // ---------------------------------------------------------------------------
  // Column switches a user can change per section on this screen (not saved; the layout gives the default).
  // ---------------------------------------------------------------------------
  private columnOverride: Record<string, Record<string, boolean>> = {};

  gridStatsShown(s: any): boolean {
    const ov = this.columnOverride[this.sectionUiKey(s)]?.['stats'];
    return ov !== undefined ? ov : s?.config?.showStatistics !== false;
  }

  /** The columns the Adjust menu of a section offers, by section type. */
  adjustableColumns(s: any): { key: string; label: string }[] {
    const t = String(s?.type || '').toLowerCase();
    if (t === 'spm' || t === 'specimen') {
      return [{ key: 'avg', label: 'Average' }, { key: 'requirement', label: 'Requirement' }, { key: 'unit', label: 'Unit' }, { key: 'status', label: 'Status' }];
    }
    if (t === 'reading' && this.isReadingGrid(s)) {
      return [{ key: 'agg', label: this.gridAggregateLabel(s) || 'Average' }, { key: 'stats', label: 'Min / Max' }, { key: 'requirement', label: 'Requirement' }, { key: 'status', label: 'Status' }, { key: 'unit', label: 'Unit' }];
    }
    return [];
  }

  isColumnShown(s: any, key: string): boolean {
    if (key === 'stats') return this.gridStatsShown(s);
    if (['avg', 'requirement', 'status', 'unit'].includes(key) && !this.isReadingGrid(s)) return this.specimenShow(s, key as any);
    if (key === 'unit') return this.specimenShow(s, 'unit');
    return this.columnVisible(s, key);
  }

  toggleColumn(s: any, key: string): void {
    const sec = this.sectionUiKey(s);
    this.columnOverride = { ...this.columnOverride, [sec]: { ...(this.columnOverride[sec] || {}), [key]: !this.isColumnShown(s, key) } };
  }

  /** Average / Requirement / Status / Unit column switches of the specimen matrix. */
  specimenShow(sec: any, what: 'avg' | 'requirement' | 'status' | 'unit'): boolean {
    const cfg = sec?.config || {};
    const ov = this.columnOverride[this.sectionUiKey(sec)]?.[what];
    if (ov !== undefined) return ov;
    switch (what) {
      case 'avg': return cfg.showAverage !== false && this.columnVisible(sec, 'avg');
      case 'requirement': return cfg.showRequirement !== false && this.columnVisible(sec, 'requirement');
      case 'status': return cfg.showStatus !== false && this.columnVisible(sec, 'status');
      case 'unit': return cfg.showUnit !== false && this.columnVisible(sec, 'unit');
    }
  }

  /** The layout asks for specimens as rows and parameters as columns (the tensile matrix always keeps its own shape). */
  isTransposed(sec: any): boolean {
    return !this.isTensileTest() && String(sec?.config?.orientation ?? '').trim().toLowerCase().startsWith('specimens');
  }

  /** The layout asks for its structure exactly as designed (studio: "Structure on result screen: Fixed (as designed)"). */
  isFixedStructure(sec: any): boolean {
    const c = sec?.config || {};
    return c.renderMode === 'fixed' || (c.allowRuntimeAdd === false && c.runtimeAdjust === false);
  }

  /** Add / remove parameter rows (studio: "Add / remove rows"). */
  canAddRemoveRows(sec: any): boolean {
    return !this.isFixedStructure(sec) && sec?.config?.allowRuntimeAdd !== false;
  }

  /** Change the specimen count (studio: "Change counts"). */
  canAdjustCount(sec: any): boolean {
    const mode = sec?.type === 'reading' ? sec?.config?.readingExecutionMode : sec?.config?.specimenExecutionMode;
    return !this.isFixedStructure(sec) && sec?.config?.runtimeAdjust !== false && mode !== 'fixed';
  }

  /**
   * Parameter rows the specimen matrix shows.
   * - Technician can adjust: the test's own parameters, under the layout's names.
   * - Fixed (as designed): the layout's rows in its order (a row with a value written in the layout is shown as
   *   that value); the checklist counts when the layout has no rows. A test parameter the layout does not list is
   *   still entered, in a separate "Other parameters of this test" group, so it can never block Complete unseen.
   * A layout that names none of the test's parameters restricts nothing.
   */
  specimenParams(sec: any): any[] {
    const norm = (v: any) => String(v ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const base = this.getBaseParameterList();
    const rows: any[] = (Array.isArray(sec?.config?.tableRows) ? sec.config.tableRows : []).filter((r: any) => !String(r?.key ?? '').startsWith('tensile_'));
    const isStaticRow = (r: any) => r?.bindingMode === 'static' && !r.sourceName && !String(r.key ?? '').startsWith('param_');
    const nameOfRow = (r: any) => norm(r?.sourceName || r?.label);
    const named = (p: any) => {
      const row = rows.find(r => !isStaticRow(r) && nameOfRow(r) === norm(p.name));
      return { ...p, displayName: String(row?.label ?? '').trim() || p.name };
    };
    if (!this.isFixedStructure(sec)) return base.map(named);

    const picked: string[] = Array.isArray(sec?.config?.specimenColumns) ? sec.config.specimenColumns : [];
    const layoutRows = rows.filter(r => r?.visible !== false);
    const main: any[] = [];
    const used = new Set<number>();
    if (layoutRows.some(r => isStaticRow(r) || base.some(p => nameOfRow(r) === norm(p.name)))) {
      let statics = 0;
      for (const r of layoutRows) {
        if (isStaticRow(r)) {
          main.push({ index: -(1000 + statics++), name: r.label, displayName: String(r.label ?? ''), unit: r.unit || '', requirement: r.requirement || '', inputType: 'Text', isCalculated: false, isStatic: true, staticValue: String(r.staticValue ?? '') });
          continue;
        }
        const p = base.find(x => nameOfRow(r) === norm(x.name) && !used.has(x.index));
        if (p) {
          used.add(p.index);
          main.push({ ...p, displayName: String(r.label ?? '').trim() || p.name });
        }
      }
    } else if (picked.length > 0 && base.some(p => picked.some(n => norm(n) === norm(p.name)))) {
      for (const p of base) {
        if (!picked.some(n => norm(n) === norm(p.name))) continue;
        used.add(p.index);
        main.push(named(p));
      }
    } else {
      return base.map(named);
    }
    const others = base.filter(p => !used.has(p.index)).map(p => ({ ...named(p), isOther: true }));
    return others.length && main.length ? [...main, { index: -1, isDivider: true, name: '', displayName: '' }, ...others] : [...main, ...others];
  }

  /** The parameters as columns of the transposed matrix (no group divider). */
  specimenColumnList(sec: any): any[] {
    return this.specimenParams(sec).filter(p => !p.isDivider);
  }

  private tensileRowDef(sec: any, role: string): any {
    return (Array.isArray(sec?.config?.tableRows) ? sec.config.tableRows : []).find((r: any) => r?.key === `tensile_${role}`);
  }

  /** A layout that fixes its structure lists the tensile rows it wants; a row it does not list (or hides) is not drawn. */
  tensileRowOn(sec: any, role: string): boolean {
    if (!sec || !this.isFixedStructure(sec)) return true;
    const rows: any[] = Array.isArray(sec.config?.tableRows) ? sec.config.tableRows : [];
    if (!rows.some(r => String(r?.key ?? '').startsWith('tensile_'))) return true;
    const def = this.tensileRowDef(sec, role);
    return !!def && def.visible !== false;
  }

  /** Label of a tensile row: the layout's own name when it set one. */
  tensileLabel(sec: any, role: string, fallback: string): string {
    return String(this.tensileRowDef(sec, role)?.label ?? '').trim() || fallback;
  }

  /** The specimen count the layout asks for (its specimen names, else its count); 0 when it asks for none. */
  private layoutSpecimenCount(): number {
    const cfg = this.specimenSection?.config;
    if (!cfg) return 0;
    const named = Array.isArray(cfg.specimenRows) ? cfg.specimenRows.filter((n: any) => String(n ?? '').trim() !== '').length : 0;
    return Math.min(20, named || Number(cfg.count) || 0);
  }

  /** Set once the specimen count was fixed (from the layout, or by the user); saved with the test. */
  private specimenCountApplied = false;

  /**
   * A test that has not started takes its specimen count from the layout, once. The plan's quantity is only the
   * starting value; the user can still change it afterwards and that choice is kept.
   */
  private scheduleLayoutSpecimenCount(): void {
    if (this.printMode || this.isViewMode || this.isLocked || this.specimenCountApplied) return;
    const status = String(this.test?.status ?? 'Pending').toLowerCase();
    if (status && status !== 'pending') return;
    const wanted = this.layoutSpecimenCount();
    if (wanted < 1) return;
    // after the current change detection: the parent reacts to the new count
    Promise.resolve().then(() => {
      if (this.printMode || this.isViewMode || this.isLocked || this.specimenCountApplied) return;
      if (wanted !== this.specimens.length) this.setSpecimenCount(wanted, true);
      this.specimenCountApplied = true;
      this.cdr.markForCheck();
    });
  }

  /** True when the saved layout used the literal legacy type "spm" (see initLayoutData). */
  private hasLegacySpmSection = false;

  hasSectionOfType(type: string): boolean {
    if (type === 'spm' && this.hasLegacySpmSection) return true;
    return (this.sections || []).some(s => s.type === type || (type === 'param' && s.type === 'parameter') || (type === 'parameter' && s.type === 'param'));
  }

  /** A reading section that lists the test's parameters itself (no target parameter): the plain parameter table is then not drawn. */
  hasLegacyReadingSection(): boolean {
    return (this.sections || []).some(sec => sec.type === 'reading' && !this.isReadingGrid(sec));
  }

  /** Parameters a reading grid already shows are left out of the plain parameter table. */
  private isGridTargetRow(rowIdx: number): boolean {
    const name = this.normKey(this.parametersFormArray?.at(rowIdx)?.get('parameterName')?.value);
    return !!name && (this.sections || []).some(sec =>
      (this.isReadingGrid(sec) && this.normKey(this.readingGridTarget(sec)) === name) ||
      (this.isLocationGrid(sec) && (sec.config.locationParams as string[]).some(n => this.normKey(n) === name)));
  }

  /** A section whose type this screen cannot draw (it would otherwise vanish without a trace). */
  isUnsupportedSection(s: any): boolean {
    return !!s && !SUPPORTED_SECTION_TYPES.has(String(s.type || '').trim().toLowerCase());
  }

  /** The warning card is for the person editing the result; it is not part of the printed record. */
  showUnsupportedCard(s: any): boolean {
    return !this.printMode && this.isUnsupportedSection(s) && (this.activeTabSection === 'all' || this.activeTabSection === 'execution');
  }

  getReadingColumnHeader(s: any, idx: number): string {
    const rawPrefix = s?.config?.readingLabel || s?.config?.readingPrefix;
    // a label the layout cleared on purpose (empty text, not missing) numbers the readings 1, 2, 3 ...
    if (typeof s?.config?.readingLabel === 'string' && s.config.readingLabel.trim() === '' && !s?.config?.readingPrefix) return String(idx + 1);
    let prefix = 'R';
    if (rawPrefix && typeof rawPrefix === 'string') {
      const trimmed = rawPrefix.trim();
      if (!trimmed.includes('to') && !trimmed.includes('/')) {
        prefix = trimmed.endsWith(' ') ? trimmed : `${trimmed} `;
      } else if (trimmed.toLowerCase().startsWith('spot')) {
        prefix = 'Spot ';
      }
    }
    return `${prefix}${idx + 1}`;
  }

  getSectionTitle(s: any): string {
    if (s?.type === 'reading') {
      const count = this.getReadingCount(s);
      const title = s.title || 'Indentation Spot Readings';
      if (/\(\d+\s*Spots?\)/i.test(title)) {
        return title.replace(/\(\d+\s*Spots?\)/i, `(${count} Spots)`);
      }
      if (/\(\d+\s*Readings?\)/i.test(title)) {
        return title.replace(/\(\d+\s*Readings?\)/i, `(${count} Readings)`);
      }
    }
    return s?.title || '';
  }

  adjustReadingCount(s: any, delta: number): void {
    if (this.isViewMode || this.isLocked) return;
    const current = this.getReadingCount(s);
    const newCount = Math.min(25, Math.max(1, current + delta));
    if (newCount !== current) {
      this.setReadingCount(s, newCount);
    }
  }

  onReadingCountInputChange(s: any, event: Event): void {
    if (this.isViewMode || this.isLocked) return;
    const input = event.target as HTMLInputElement;
    const val = parseInt(input.value, 10);
    if (isNaN(val)) return;
    const count = Math.min(25, Math.max(1, val));
    input.value = String(count);
    this.setReadingCount(s, count);
  }

  setReadingCount(s: any, count: number): void {
    if (this.isViewMode || this.isLocked) return;
    const validCount = Math.min(25, Math.max(1, count));
    if (this.isReadingGrid(s)) {
      this.setGridCount(s, validCount);
      return;
    }
    const targets = this.getReadingTargetParameters(s);

    targets.forEach(targetName => {
      if (!this.readingValues[targetName]) {
        this.readingValues[targetName] = [];
      }
      const arr = this.readingValues[targetName];
      while (arr.length < validCount) {
        arr.push(null);
      }
      while (arr.length > validCount) {
        arr.pop();
      }
      this.recalculateReadingStats(targetName);

      const avg = this.readingStats[targetName]?.avg;
      const readingsJson = JSON.stringify(arr);
      if (this.parametersFormArray) {
        this.parametersFormArray.controls.forEach((ctrl, idx) => {
          const name = (ctrl.get('parameterName')?.value || '').trim();
          if (name.toLowerCase() === targetName.toLowerCase() ||
             (targetName.toLowerCase().includes('hardness') && name.toLowerCase().includes('hardness')) ||
             (targetName.toLowerCase().includes('impact') && name.toLowerCase().includes('impact'))) {
            ctrl.patchValue({ value: avg, remarks: readingsJson });
            this.evaluateLimitForControl(ctrl);
            this.paramValueChanged.emit({ rowIdx: idx, param: ctrl.value });
          }
        });
      }
    });

    this.syncCollectionsToTest();
    this.cdr.markForCheck();
  }

  resetReadingCountToTemplate(s: any): void {
    if (this.isViewMode || this.isLocked) return;
    const defaultCount = this.getDefaultReadingCount(s);
    this.setReadingCount(s, defaultCount);
  }

  onReadingChange(targetName: string, rIdx: number, val: any): void {
    const parsed = val !== null && val !== '' && !isNaN(Number(val)) ? parseFloat(val) : null;
    if (!this.readingValues[targetName]) {
      this.readingValues[targetName] = [];
    }
    while (this.readingValues[targetName].length <= rIdx) {
      this.readingValues[targetName].push(null);
    }
    this.readingValues[targetName][rIdx] = parsed;
    this.recalculateReadingStats(targetName);

    // Update target parameter form control with average and serialize readings in remarks
    const avg = this.readingStats[targetName]?.avg;
    const readingsJson = JSON.stringify(this.readingValues[targetName]);
    if (this.parametersFormArray) {
      this.parametersFormArray.controls.forEach((ctrl, idx) => {
        const name = (ctrl.get('parameterName')?.value || '').trim();
        if (name.toLowerCase() === targetName.toLowerCase() ||
           (targetName.toLowerCase().includes('hardness') && name.toLowerCase().includes('hardness')) ||
           (targetName.toLowerCase().includes('impact') && name.toLowerCase().includes('impact'))) {
          ctrl.patchValue({ value: avg, remarks: readingsJson });
          this.evaluateLimitForControl(ctrl);
          this.paramValueChanged.emit({ rowIdx: idx, param: ctrl.value });
        }
      });
    }

    this.syncCollectionsToTest();
  }

  private recalculateReadingStats(targetName: string): void {
    const arr = (this.readingValues[targetName] || []).filter((v): v is number => v != null && !isNaN(v) && v !== ('' as any));
    if (arr.length === 0) {
      this.readingStats[targetName] = { avg: null, min: null, max: null, stdev: null };
      return;
    }

    const numVals = arr.map(Number);
    const sum = numVals.reduce((a, b) => a + b, 0);
    const avg = Number((sum / numVals.length).toFixed(1));
    const min = Math.min(...numVals);
    const max = Math.max(...numVals);

    let stdev: number | null = null;
    if (numVals.length > 1) {
      const sqDiffs = numVals.map(v => Math.pow(v - avg, 2));
      const variance = sqDiffs.reduce((a, b) => a + b, 0) / (numVals.length - 1);
      stdev = Number(Math.sqrt(variance).toFixed(2));
    }

    this.readingStats[targetName] = { avg, min, max, stdev };
  }

  getReadingVal(targetName: string, rIdx: number): number | null | undefined {
    return this.readingValues[targetName]?.[rIdx];
  }

  getReadingStat(targetName: string, field: 'avg' | 'min' | 'max' | 'stdev'): string {
    const s = this.readingStats[targetName];
    if (!s || s[field] == null) return '—';
    return String(s[field]);
  }

  // =========================================================================
  // Case Depth Traverse Operations
  // =========================================================================
  onTraverseChange(idx: number, val: any): void {
    const parsed = val !== null && val !== '' ? parseFloat(val) : null;
    this.traversePoints[idx].hardness = parsed;
    this.recalculateEffectiveCaseDepth();
  }

  private recalculateEffectiveCaseDepth(): void {
    const ecd = this.computeEffectiveCaseDepth();
    this.effectiveCaseDepth = ecd;
    this.writeEffectiveCaseDepthToForm(ecd);
  }

  /** Depth where the hardness falls to the cut-off (linear between the two points around it). */
  private computeEffectiveCaseDepth(): number | null {
    const cutoff = this.cutoffLimit || 550;
    let ecd: number | null = null;

    for (let i = 0; i < this.traversePoints.length; i++) {
      const pt = this.traversePoints[i];
      if (pt.hardness != null && pt.hardness <= cutoff) {
        if (i === 0) {
          ecd = pt.distance;
        } else {
          const pPrev = this.traversePoints[i - 1];
          if (pPrev.hardness != null && pPrev.hardness !== pt.hardness) {
            const ratio = (pPrev.hardness - cutoff) / (pPrev.hardness - pt.hardness);
            ecd = Number((pPrev.distance + ratio * (pt.distance - pPrev.distance)).toFixed(2));
          } else {
            ecd = pt.distance;
          }
        }
        break;
      }
    }

    return ecd;
  }

  private writeEffectiveCaseDepthToForm(ecd: number | null): void {
    if (ecd != null && this.parametersFormArray && !this.printMode) {
      this.parametersFormArray.controls.forEach((ctrl, idx) => {
        const name = (ctrl.get('parameterName')?.value || '').toLowerCase();
        if (name.includes('case depth') || name.includes('effective case')) {
          ctrl.patchValue({ value: ecd });
          this.evaluateLimitForControl(ctrl);
          this.paramValueChanged.emit({ rowIdx: idx, param: ctrl.value });
        }
      });
    }
  }

  // =========================================================================
  // Conditions & Environment
  // =========================================================================
  private initConditions(): void {
    this.applyRoomConditions();
  }

  /**
   * Room temperature and humidity come from the environment record only (Record Ambient); a value kept in the saved
   * extra data never replaces it, so this section and the traceability block always show the same.
   */
  private applyRoomConditions(): void {
    this.conditionValues['Temperature'] = this.environmentData?.roomTemperature ?? this.test?.roomTemperature ?? null;
    this.conditionValues['Relative Humidity'] = this.environmentData?.roomHumidity ?? this.test?.roomHumidity ?? null;
  }

  onConditionChange(key: string, val: any): void {
    this.conditionValues[key] = val;
    if (key === 'Temperature' && this.test) {
      this.test.roomTemperature = val ? parseFloat(val) : null;
    } else if (key === 'Relative Humidity' && this.test) {
      this.test.roomHumidity = val ? parseFloat(val) : null;
    }
    this.syncCollectionsToTest();
  }

  // =========================================================================
  // Checklist Operations
  // =========================================================================
  setChecklistStatus(item: ChecklistItem, status: 'Pass' | 'Fail' | 'NA'): void {
    if (this.isViewMode || this.isLocked) return;
    item.status = status;
  }

  // =========================================================================
  // Parameter Row Operations & Limit Evaluation
  // =========================================================================
  onParameterInputChange(rowIdx: number): void {
    const ctrl = this.parametersFormArray?.at(rowIdx);
    if (!ctrl) return;
    this.evaluateLimitForControl(ctrl);
    this.paramValueChanged.emit({ rowIdx, param: ctrl.value });
    // Keep the specimen model in step with the table so a later recalculation never writes an older value back
    this.applyTableEdit(rowIdx, ctrl.get('value')?.value);
  }

  onUnitSelect(rowIdx: number): void {
    this.unitChanged.emit({ rowIdx });
  }

  formatRequirement(param: any): string {
    if (!param) return '—';
    const min = param.specMinValue != null ? param.specMinValue : param.minValue;
    const max = param.specMaxValue != null ? param.specMaxValue : param.maxValue;
    if (min != null && max != null) return `${min} – ${max}`;
    if (min != null) return `≥ ${min}`;
    if (max != null) return `≤ ${max}`;
    if (param.acceptanceCriteria) return param.acceptanceCriteria;
    return '—';
  }

  getParamRequirementByName(nameSearch: string): string {
    if (!this.parametersFormArray || this.parametersFormArray.length === 0) return '—';
    for (let i = 0; i < this.parametersFormArray.length; i++) {
      const ctrl = this.parametersFormArray.at(i);
      const pName = (ctrl.get('parameterName')?.value || '').toLowerCase();
      if (pName.includes(nameSearch.toLowerCase())) {
        return this.formatRequirement(ctrl.value);
      }
    }
    return '—';
  }

  private evaluateLimitForControl(ctrl: any): void {
    if (!ctrl || this.printMode) return;
    const val = ctrl.get('value')?.value;
    if (val === null || val === undefined || val === '') {
      ctrl.patchValue({ isWithinLimit: null, resultStatus: null }, { emitEvent: false });
      return;
    }

    const min = ctrl.get('specMinValue')?.value ?? ctrl.get('minValue')?.value;
    const max = ctrl.get('specMaxValue')?.value ?? ctrl.get('maxValue')?.value;
    const num = parseFloat(val);

    if (isNaN(num)) {
      if (typeof val === 'string') {
        const lower = val.trim().toLowerCase();
        const pass = lower === 'pass' || lower === 'satisfactory' || lower === 'yes';
        ctrl.patchValue({ isWithinLimit: pass, resultStatus: pass ? 'Pass' : 'Fail' }, { emitEvent: false });
      }
      return;
    }

    let isWithin = true;
    if (min != null && !isNaN(parseFloat(min)) && num < parseFloat(min)) {
      isWithin = false;
    }
    if (max != null && !isNaN(parseFloat(max)) && num > parseFloat(max)) {
      isWithin = false;
    }

    ctrl.patchValue({ isWithinLimit: isWithin, resultStatus: isWithin ? 'Pass' : 'Fail' }, { emitEvent: false });
  }

  /** The formula section lists calculated parameters; without any it shows a note instead of an empty box. */
  hasCalculatedParameters(): boolean {
    return (this.test?.parameters || []).some((p: any) => p.isCalculated || p.formulaExpression);
  }

  isParameterCalculated(param: any): boolean {
    return param?.isCalculated || !!param?.formulaExpression;
  }

  getFormulaDisplay(param: any): string {
    if (!param) return '';
    if (param.formulaDisplay && !/\{?P\d+\}?/i.test(param.formulaDisplay)) {
      return param.formulaDisplay;
    }
    const expr = param.formulaExpression || param.formula || '';
    const lookup = [...(this.test?.parameters || []), ...(this.parametersFormArray?.value || [])];
    return formatFormulaDisplay(expr, lookup);
  }

  // =========================================================================
  // Chart Helper (Dynamic Stress-Strain Curve Data & Markers)
  // =========================================================================
  /** Sketch of the curve from the averaged Rp, Rm and A%. Null until Rp or Rm exists: nothing is drawn from made-up numbers. */
  getStressStrainChartData(): {
    curvePath: string;
    rp: number | null;
    rm: number | null;
    el: number | null;
    ra: number | null;
    yieldPt: { x: number; y: number };
    peakPt: { x: number; y: number };
    rupturePt: { x: number; y: number };
  } | null {
    const avg = this.specimenAverages;
    if (!avg.proofStress && !avg.uts) return null;
    // Geometry only: a missing value takes the other one (or a mid position) so the line can be drawn; the labels show the real values
    const rp = avg.proofStress || avg.uts || 0;
    const rm = avg.uts || avg.proofStress || 0;
    const el = avg.elongation || 20;

    // ViewBox: 0 0 760 210
    // X axis: 65 to 720 (range 0% to 35% strain)
    // Y axis: 175 (0 MPa) down to 25 (600 MPa)
    const x0 = 65; const y0 = 175;
    const xYield = 135;
    const yYield = Math.max(25, Math.round(175 - (Math.min(600, rp) / 600) * 150));

    const xPeak = Math.min(670, Math.round(65 + (16.5 / 35) * 655)); // ~374
    const yPeak = Math.max(20, Math.round(175 - (Math.min(600, rm) / 600) * 150));

    const xRupture = Math.min(725, Math.round(65 + (Math.min(35, el) / 35) * 655)); // ~596
    const yRupture = Math.min(170, yPeak + 32);

    // Smooth cubic & quadratic bezier path
    const curvePath = `M ${x0},${y0} L 100,${Math.round((y0 + yYield) / 2)} Q 120,${yYield + 10} ${xYield},${yYield} Q 220,${yPeak + 25} ${xPeak},${yPeak} Q ${Math.round((xPeak + xRupture) / 2)},${yPeak + 12} ${xRupture},${yRupture}`;

    return {
      curvePath,
      rp: avg.proofStress || null,
      rm: avg.uts || null,
      el: avg.elongation || null,
      ra: avg.reductionOfArea || null,
      yieldPt: { x: xYield, y: yYield },
      peakPt: { x: xPeak, y: yPeak },
      rupturePt: { x: xRupture, y: yRupture }
    };
  }

  getTraversePolyline(): string {
    const points: string[] = [];
    const valid = this.traversePoints.filter(p => p.hardness != null);
    if (valid.length === 0) {
      return "35,25 90,38 150,55 220,78 300,98 370,105";
    }

    valid.forEach(p => {
      const x = 30 + (p.distance / 1.2) * 340;
      const y = 110 - ((p.hardness! - 200) / 600) * 90;
      points.push(`${Math.round(x)},${Math.round(y)}`);
    });

    return points.join(' ');
  }

  // =========================================================================
  // Location Section Operations (Gap 1)
  // =========================================================================
  addLocation(): void {
    if (this.isViewMode || this.isLocked) return;
    const nextIdx = this.locations.length + 1;
    this.locations.push({
      locationCode: `LOC${nextIdx}`,
      locationName: `Zone ${nextIdx}`,
      displayOrder: nextIdx,
      isReportable: true,
      remarks: ''
    });
    this.initLocationGrids(); // the new location gets its reading lists
    this.syncCollectionsToTest();
    this.cdr.markForCheck();
  }

  removeLocation(idx: number): void {
    if (this.isViewMode || this.isLocked || this.locations.length <= 1) return;
    this.locations.splice(idx, 1);
    this.syncCollectionsToTest();
    this.cdr.markForCheck();
  }

  toggleLocationReportable(idx: number): void {
    if (this.isViewMode || this.isLocked) return;
    this.locations[idx].isReportable = !this.locations[idx].isReportable;
    this.syncCollectionsToTest();
    this.cdr.markForCheck();
  }

  // =========================================================================
  // Traverse Point Operations (Gap 2)
  // =========================================================================
  addTraversePoint(): void {
    if (this.isViewMode || this.isLocked) return;
    const lastDist = this.traversePoints.length > 0 ? this.traversePoints[this.traversePoints.length - 1].distance : 0.0;
    const nextDist = Number((lastDist + 0.2).toFixed(2));
    this.traversePoints.push({ distance: nextDist, hardness: null });
    this.recalculateEffectiveCaseDepth();
    this.syncCollectionsToTest();
    this.cdr.markForCheck();
  }

  removeTraversePoint(idx: number): void {
    if (this.isViewMode || this.isLocked || this.traversePoints.length <= 1) return;
    this.traversePoints.splice(idx, 1);
    this.recalculateEffectiveCaseDepth();
    this.syncCollectionsToTest();
    this.cdr.markForCheck();
  }

  // =========================================================================
  // Checklist Item Operations (Gap 3)
  // =========================================================================
  addChecklistItem(): void {
    if (this.isViewMode || this.isLocked) return;
    const nextId = this.checklistItems.length + 1;
    this.checklistItems.push({
      id: nextId,
      label: `Inspection check #${nextId}`,
      status: ''
    });
    this.syncCollectionsToTest();
    this.cdr.markForCheck();
  }

  removeChecklistItem(idx: number): void {
    if (this.isViewMode || this.isLocked || this.checklistItems.length <= 1) return;
    this.checklistItems.splice(idx, 1);
    this.syncCollectionsToTest();
    this.cdr.markForCheck();
  }

  // =========================================================================
  // Structured Observation Operations (Gap 4)
  // =========================================================================
  addObservation(): void {
    if (this.isViewMode || this.isLocked) return;
    const nextOrder = this.observations.length + 1;
    this.observations.push({
      category: 'General',
      observationText: '',
      displayOrder: nextOrder,
      isReportable: true
    });
    this.syncCollectionsToTest();
    this.cdr.markForCheck();
  }

  removeObservation(idx: number): void {
    if (this.isViewMode || this.isLocked) return;
    this.observations.splice(idx, 1);
    this.syncCollectionsToTest();
    this.cdr.markForCheck();
  }

  toggleObservationReportable(idx: number): void {
    if (this.isViewMode || this.isLocked) return;
    this.observations[idx].isReportable = !this.observations[idx].isReportable;
    this.syncCollectionsToTest();
    this.cdr.markForCheck();
  }

  // =========================================================================
  // Custom Lab Attribute Operations (Gap 7)
  // =========================================================================
  addCustomAttribute(): void {
    if (this.isViewMode || this.isLocked) return;
    this.customAttributes.push({ key: '', value: '' });
    this.syncCollectionsToTest();
    this.cdr.markForCheck();
  }

  removeCustomAttribute(idx: number): void {
    if (this.isViewMode || this.isLocked) return;
    this.customAttributes.splice(idx, 1);
    this.syncCollectionsToTest();
    this.cdr.markForCheck();
  }

  // =========================================================================
  // Decision Rule & Classification Operations (Gaps 5 & 6)
  // =========================================================================
  onDecisionRuleTypeChange(type: string): void {
    this.decisionRule.ruleType = type;
    if (type === 'Simple Acceptance') {
      this.decisionRule.statementText = 'Statements of conformity are based on simple acceptance with no guard-banding applied (w = 0).';
    } else if (type === 'Guard Banded (ILAC-G8)') {
      this.decisionRule.statementText = 'Statements of conformity apply ILAC-G8:09/2019 binary decision rule with guard band w = 1.0 U (95% coverage probability).';
    } else {
      this.decisionRule.statementText = 'Non-binary acceptance criteria evaluated with conditional pass / inconclusive zone.';
    }
    this.syncCollectionsToTest();
  }

  onClassificationChange(): void {
    this.syncCollectionsToTest();
  }

  // =========================================================================
  // Parameter Reportability Toggle (Gap 10)
  // =========================================================================
  isParamReportable(rowIdx: number): boolean {
    const ctrl = this.parametersFormArray?.at(rowIdx);
    if (!ctrl) return true;
    return ctrl.get('isReportable')?.value !== false;
  }

  toggleParamReportable(rowIdx: number): void {
    if (this.isViewMode || this.isLocked) return;
    const ctrl = this.parametersFormArray?.at(rowIdx);
    if (!ctrl) return;
    const current = ctrl.get('isReportable')?.value !== false;
    ctrl.patchValue({ isReportable: !current });
    this.paramValueChanged.emit({ rowIdx, param: ctrl.value });
    this.cdr.markForCheck();
  }

  // =========================================================================
  // Sync Collections to Test Object & Extra JSON Serialization
  // =========================================================================
  syncCollectionsToTest(): void {
    if (!this.test || this.printMode) return;
    const headerId = this.test.headerId || 0;

    this.test.locations = this.locations.map((loc, idx) => ({
      ...loc,
      displayName: loc.locationName,
      sequenceNo: idx + 1,
      displayOrder: idx + 1,
      testResultHeaderId: headerId
    }));

    this.test.traversePoints = this.traversePoints.map((pt, idx) => ({
      pointSequence: idx + 1,
      distanceMm: pt.distance,
      hardnessValue: pt.hardness,
      testResultHeaderId: headerId,
      isBelowCutoff: pt.hardness != null ? pt.hardness < this.cutoffLimit : null,
      isReportable: true
    }));

    this.test.checklist = this.checklistItems.map((chk, idx) => ({
      checklistCode: `CHK-${idx + 1}`,
      itemLabel: chk.label,
      status: chk.status,
      testResultHeaderId: headerId,
      isMandatory: true
    }));

    this.test.observations = this.observations.map((obs, idx) => ({
      ...obs,
      displayOrder: idx + 1,
      testResultHeaderId: headerId
    }));

    this.test.readings = this.buildReadingsArray();
    this.test.executionExtraJson = this.getExecutionExtraJson();
  }

  buildReadingsArray(): any[] {
    const readings: any[] = [];
    const headerId = this.test?.headerId || 0;

    Object.keys(this.readingValues).forEach(key => {
      const vals = this.readingValues[key] || [];
      // a grid key is "<parameter>|<sample code>"; the legacy key is the parameter name
      const sep = key.lastIndexOf('|');
      const paramName = sep >= 0 ? key.slice(0, sep) : key;
      let specimenCode = sep >= 0 ? key.slice(sep + 1) : 'S1';
      // a location reading is keyed "<parameter>|loc:<location code>"
      let locationCode: string | null = null;
      if (specimenCode.startsWith('loc:')) {
        locationCode = specimenCode.slice(4);
        specimenCode = 'S1';
      }
      let paramId: number | null = null;
      let paramCode = '';
      if (this.parametersFormArray) {
        for (let i = 0; i < this.parametersFormArray.length; i++) {
          const ctrl = this.parametersFormArray.at(i);
          if ((ctrl.get('parameterName')?.value || '').trim().toLowerCase() === paramName.trim().toLowerCase()) {
            const rawId = ctrl.get('id')?.value;
            paramId = (rawId && Number(rawId) > 0) ? Number(rawId) : null;
            paramCode = ctrl.get('parameterCode')?.value || ctrl.get('parameterName')?.value || '';
            break;
          }
        }
      }

      vals.forEach((v, idx) => {
        if (v !== null && v !== undefined && (v as any) !== '') {
          readings.push({
            id: 0,
            testResultHeaderId: headerId,
            testResultParameterId: paramId,
            parameterCode: paramCode || paramName,
            parameterName: paramName,
            specimenCode,
            locationCode,
            sequenceNo: idx + 1,
            readingNumber: idx + 1,
            value: Number(v),
            readingValue: Number(v),
            displayOrder: idx + 1,
            isExcluded: false,
            isVoided: false,
            unit: '',
            remarks: '',
            voidReason: null
          });
        }
      });
    });

    return readings;
  }

  // ---------------------------------------------------------------------------
  // Condition section: the layout's `fields` (test temperature, specimen size ...) plus fields added on the
  // screen (kept per section in executionExtraJson.conditionFields); values live in conditionValues.
  // ---------------------------------------------------------------------------
  runtimeConditionFields: Record<string, string[]> = {};

  private configuredConditionFields(s: any): string[] {
    const list = Array.isArray(s?.config?.fields) ? s.config.fields : [];
    return list.map((f: any) => String(typeof f === 'string' ? f : f?.label ?? f?.name ?? '').trim()).filter(Boolean);
  }

  conditionFields(s: any): string[] {
    const cfg = this.configuredConditionFields(s);
    const extra = (this.runtimeConditionFields[this.readingSecKey(s)] || []).filter(f => !cfg.includes(f));
    return extra.length ? [...cfg, ...extra] : cfg;
  }

  isRuntimeConditionField(s: any, name: string): boolean {
    return !this.configuredConditionFields(s).includes(name);
  }

  addConditionField(s: any, raw: string): void {
    const name = String(raw ?? '').trim();
    if (!name || this.isViewMode || this.isLocked) return;
    if (this.conditionFields(s).some(f => f.toLowerCase() === name.toLowerCase())) return;
    const key = this.readingSecKey(s);
    this.runtimeConditionFields = { ...this.runtimeConditionFields, [key]: [...(this.runtimeConditionFields[key] || []), name] };
    this.syncCollectionsToTest();
  }

  removeConditionField(s: any, name: string): void {
    if (!this.isRuntimeConditionField(s, name) || this.isViewMode || this.isLocked) return;
    const key = this.readingSecKey(s);
    this.runtimeConditionFields = { ...this.runtimeConditionFields, [key]: (this.runtimeConditionFields[key] || []).filter(f => f !== name) };
    const next = { ...this.conditionValues };
    delete next[name];
    this.conditionValues = next;
    this.syncCollectionsToTest();
  }

  // ---------------------------------------------------------------------------
  // Narrative sections: the first note keeps the test remarks (and observations); every other note and the
  // witness line keep their own text, saved in executionExtraJson.narratives by section key.
  // ---------------------------------------------------------------------------
  narratives: Record<string, string> = {};

  narrativeKey(s: any): string {
    return String(s?.config?.sectionKey || `narrative-${this.sections.indexOf(s)}`);
  }

  isWitnessSection(s: any): boolean {
    return String(s?.config?.sectionKey || '').toLowerCase() === 'witness' || /witness/i.test(String(s?.title || s?.config?.label || ''));
  }

  isPrimaryNarrative(s: any): boolean {
    const first = this.sections.find(x => ['narrative', 'rem'].includes(String(x?.type || '').toLowerCase()) && !this.isWitnessSection(x));
    return first === s;
  }

  onNarrativeChange(s: any, value: string): void {
    this.narratives = { ...this.narratives, [this.narrativeKey(s)]: value };
    this.syncCollectionsToTest();
  }

  getExecutionExtraJson(): string {
    const extra = {
      narratives: this.narratives,
      conditionFields: this.runtimeConditionFields,
      decisionRule: this.decisionRule,
      classification: this.classification,
      custom: this.customAttributes,
      conditionValues: this.conditionValues,
      opinionData: this.opinionData,
      hiddenRows: Array.from(this.hiddenFixedRoles),
      specimenCountApplied: this.specimenCountApplied
    };
    return JSON.stringify(extra);
  }
}

