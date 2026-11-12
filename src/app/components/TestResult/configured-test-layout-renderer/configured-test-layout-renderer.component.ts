import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
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
  readingStats: Record<string, { avg: number | null; min: number | null; max: number | null; stdev: number | null }> = {};

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
    } else if (changes['activeTabSection']) {
      this.hydrateSpecimensFromParameters();
      this.recalculateSpecimens();
    }
  }

  isSectionVisible(s: any): boolean {
    if (!s) return false;
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

  private initLayoutData(): void {
    if (!this.layoutConfig) return;

    // Resolve sections
    if (this.layoutConfig.sections && Array.isArray(this.layoutConfig.sections)) {
      this.sections = this.layoutConfig.sections.filter((s: any) => s.config?.enabled !== false);
    } else if (this.layoutConfig.parsedConfig?.sections) {
      this.sections = this.layoutConfig.parsedConfig.sections.filter((s: any) => s.config?.enabled !== false);
    } else {
      this.sections = [];
    }

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
  }

  private initLocations(): void {
    const locSec = this.sections.find(s => s.type === 'location' || s.type === 'loc');
    if (this.test?.locations && Array.isArray(this.test.locations) && this.test.locations.length > 0) {
      this.locations = this.test.locations.map((loc: any, idx: number) => ({
        id: loc.id,
        locationCode: loc.locationCode || `LOC${idx + 1}`,
        locationName: loc.locationName || `Zone ${idx + 1}`,
        displayOrder: loc.displayOrder || (idx + 1),
        isReportable: loc.isReportable !== false,
        remarks: loc.remarks || ''
      }));
    } else if (locSec?.config?.tableRows && Array.isArray(locSec.config.tableRows) && locSec.config.tableRows.length > 0) {
      this.locations = locSec.config.tableRows.map((r: any, idx: number) => ({
        locationCode: r.key || `LOC${idx + 1}`,
        locationName: r.label,
        displayOrder: idx + 1,
        isReportable: true,
        remarks: ''
      }));
    } else if (this.locations.length === 0) {
      this.locations = [
        { locationCode: 'SURF', locationName: 'Surface Zone', displayOrder: 1, isReportable: true, remarks: '0-2mm depth' },
        { locationCode: 'CORE', locationName: 'Core / Mid-Radius', displayOrder: 2, isReportable: true, remarks: 'Center axis' }
      ];
    }
  }

  private initTraverse(): void {
    const travSec = this.sections.find(s => s.type === 'traverse');
    if (this.test?.traversePoints && Array.isArray(this.test.traversePoints) && this.test.traversePoints.length > 0) {
      this.traversePoints = this.test.traversePoints.map((pt: any) => ({
        distance: pt.distance != null ? pt.distance : pt.depth,
        hardness: pt.hardness != null ? pt.hardness : pt.value
      }));
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
        label: chk.label || chk.inspectionPoint || `Item ${idx + 1}`,
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
        }
        if (extra?.opinionData) {
          this.opinionData = { ...this.opinionData, ...extra.opinionData };
        }
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
    const spmIdx = this.getSpecimenIndexForParam(rowIdx);
    return `S${spmIdx + 1}`;
  }

  isFirstParamOfSpecimen(rowIdx: number): boolean {
    const indexes = this.getRowSpecimenIndexes();
    return rowsOfSpecimen(indexes, indexes[rowIdx] ?? 0)[0] === rowIdx;
  }

  getFilteredParamIndices(): number[] {
    if (!this.parametersFormArray) return [];
    const indexes = this.getRowSpecimenIndexes();
    if (this.selectedSpecimenFilter === 'all') return rowsOrderedBySpecimen(indexes);
    return rowsOfSpecimen(indexes, this.selectedSpecimenFilter - 1);
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
      proofStress: validProof.length ? Math.round(validProof.reduce((a, b) => a + b, 0) / validProof.length) : null,
      uts: validUts.length ? Math.round(validUts.reduce((a, b) => a + b, 0) / validUts.length) : null,
      elongation: validElong.length ? Number((validElong.reduce((a, b) => a + b, 0) / validElong.length).toFixed(1)) : null,
      reductionOfArea: validRA.length ? Number((validRA.reduce((a, b) => a + b, 0) / validRA.length).toFixed(1)) : null,
      area: validArea.length ? Number((validArea.reduce((a, b) => a + b, 0) / validArea.length).toFixed(2)) : null
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
      return String(Math.round(avg));
    }
    return avg.toFixed(2);
  }

  /**
   * Writes each specimen field only into the rows of its own role group (synonyms of one quantity), never into another role's row.
   * A row that already holds the same number is not patched, so the input the user is typing in is left alone.
   * `clearRoles` (from the calculation) empties calculated rows whose result is now null; inputs are never emptied here.
   */
  private syncSpecimenToForm(spm: SpecimenData, clearRoles?: ReadonlySet<SpecimenRole>): void {
    if (!this.parametersFormArray) return;
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
    if (!this.parametersFormArray) return;

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

  setSpecimenCount(targetCount: number): void {
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

  hasSectionOfType(type: string): boolean {
    return (this.sections || []).some(s => s.type === type || (type === 'param' && s.type === 'parameter') || (type === 'parameter' && s.type === 'param'));
  }

  getReadingColumnHeader(s: any, idx: number): string {
    const rawPrefix = s?.config?.readingLabel || s?.config?.readingPrefix;
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

    this.effectiveCaseDepth = ecd;

    if (ecd != null && this.parametersFormArray) {
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
    // Only what was recorded: room values from the environment record, speed and medium from the saved test
    this.conditionValues['Temperature'] = this.test?.roomTemperature ?? this.environmentData?.roomTemperature ?? null;
    this.conditionValues['Relative Humidity'] = this.test?.roomHumidity ?? this.environmentData?.roomHumidity ?? null;
  }

  onConditionChange(key: string, val: any): void {
    this.conditionValues[key] = val;
    if (key === 'Temperature' && this.test) {
      this.test.roomTemperature = val ? parseFloat(val) : null;
    } else if (key === 'Relative Humidity' && this.test) {
      this.test.roomHumidity = val ? parseFloat(val) : null;
    }
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
    if (!ctrl) return;
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
  getStressStrainChartData(): {
    curvePath: string;
    rp: number;
    rm: number;
    el: number;
    ra: number;
    yieldPt: { x: number; y: number };
    peakPt: { x: number; y: number };
    rupturePt: { x: number; y: number };
  } {
    const rp = this.specimenAverages.proofStress || 325;
    const rm = this.specimenAverages.uts || 540;
    const el = this.specimenAverages.elongation || 28.4;
    const ra = this.specimenAverages.reductionOfArea || 58.0;

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
      rp,
      rm,
      el,
      ra,
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
    if (!this.test) return;
    const headerId = this.test.headerId || 0;

    this.test.locations = this.locations.map((loc, idx) => ({
      ...loc,
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

    Object.keys(this.readingValues).forEach(paramName => {
      const vals = this.readingValues[paramName] || [];
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
            specimenCode: `S${idx + 1}`,
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

  getExecutionExtraJson(): string {
    const extra = {
      decisionRule: this.decisionRule,
      classification: this.classification,
      custom: this.customAttributes,
      conditionValues: this.conditionValues,
      opinionData: this.opinionData,
      hiddenRows: Array.from(this.hiddenFixedRoles)
    };
    return JSON.stringify(extra);
  }
}

