import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DecimalOnlyDirective } from '../../../utility/directives/decimal-only.directive';
import { TestStatusBadgeComponent } from '../test-status-badge/test-status-badge.component';
import { formatFormulaDisplay } from '../../../utility/helper/formula.helper';
import { SearchableDropdownComponent } from '../../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { CustomSelectComponent } from '../../../utility/components/custom-select/custom-select.component';
import { ParameterService } from '../../../services/parameter.service';

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
  status: 'Pass' | 'Fail' | 'NA';
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
  acceptanceStatus: 'Pending' | 'Pass' | 'Fail' | 'Inconclusive' | 'Conditional';
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
    RouterModule,
    DecimalOnlyDirective,
    TestStatusBadgeComponent,
    SearchableDropdownComponent,
    CustomSelectComponent
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

  // Case depth traverse state (populated strictly from DB test.traversePoints or DB layout config)
  traversePoints: TraversePoint[] = [];
  effectiveCaseDepth: number | null = null;
  cutoffLimit: number = 550; // HV (hydrated from DB layout config if configured)

  // Checklist state (populated strictly from DB test.checklist or DB layout config)
  checklistItems: ChecklistItem[] = [];

  // Custom condition values
  conditionValues: Record<string, any> = {};

  // Dynamic custom cell values for Parameter Table custom columns/rows (persisted in ExecutionExtraJson)
  customCellValues: Record<string, Record<string, Record<string, any>>> = {};

  // Hybrid Relational Collections & Extra state (populated strictly from DB / ExecutionExtraJson / Layout config)
  locations: LocationData[] = [];
  observations: ObservationData[] = [];
  decisionRule: DecisionRuleData = {
    ruleType: 'Simple Acceptance',
    confidenceLevel: 95,
    guardBandMultiplier: 1.0,
    acceptanceStatus: 'Pending',
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
    private parameterService: ParameterService
  ) {}

  fetchParametersDropdown = (searchTerm: string, page: number, pageSize: number) => {
    return this.parameterService.getParameterDropdown(searchTerm, page, pageSize);
  };

  onMasterParameterSelected(item: any): void {
    if (!item) {
      this.selectedParamDropdownItem = null;
      this.newParamData.parameterID = null;
      this.newParamData.parameterName = '';
      return;
    }
    this.selectedParamDropdownItem = item;
    this.newParamData.parameterID = item.id;
    this.newParamData.parameterName = item.name;

    // Fetch full parameter details to populate unit, inputType, precision, etc.
    this.parameterService.getParameterById(item.id).subscribe({
      next: (res: any) => {
        const details = res?.data || res;
        if (details) {
          if (details.parameterUnit?.name) {
            this.newParamData.unit = details.parameterUnit.name;
          } else if (details.unit) {
            this.newParamData.unit = details.unit;
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
    if (!s || s.config?.enabled === false) return false;
    const t = (s.type || '').toLowerCase();
    const isChemical = this.testPlan?.type === 'Chemical' ||
      this.test?.discipline === 'Chemical' ||
      (this.test?.name || '').toLowerCase().includes('chemical');

    // Chemical tests do not execute physical tensile specimen dimensions/loads or case-depth traverses
    if (isChemical && (t === 'spm' || t === 'specimen' || t === 'traverse' || t === 'case_depth' || t === 'reading')) {
      return false;
    }

    // Group 1 Visibility Condition (Always | Only when data exists | Only when PASS | Only when FAIL)
    const vis = String(s.config?.visibility || 'Always');
    if (vis === 'Only when PASS' || vis === 'Only when FAIL') {
      const verdict = this.getDecisionRuleVerdict();
      if (vis === 'Only when PASS' && !verdict.label.includes('CONFORMING')) return false;
      if (vis === 'Only when FAIL' && !verdict.label.includes('NON-CONFORMING')) return false;
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
    } else {
      this.locations = [];
    }
  }

  private initTraverse(): void {
    const travSec = this.sections.find(s => s.type === 'traverse');
    if (travSec?.config?.cutoffHardness != null) {
      const parsedCutoff = parseFloat(String(travSec.config.cutoffHardness));
      if (!isNaN(parsedCutoff) && parsedCutoff > 0) {
        this.cutoffLimit = parsedCutoff;
      }
    }
    if (this.test?.traversePoints && Array.isArray(this.test.traversePoints) && this.test.traversePoints.length > 0) {
      this.traversePoints = this.test.traversePoints.map((pt: any) => ({
        distance: pt.distance != null ? pt.distance : (pt.distanceMm != null ? pt.distanceMm : pt.depth),
        hardness: pt.hardness != null ? pt.hardness : (pt.hardnessValue != null ? pt.hardnessValue : pt.value)
      }));
    } else if (travSec?.config?.tableRows && Array.isArray(travSec.config.tableRows) && travSec.config.tableRows.length > 0) {
      const visibleRows = travSec.config.tableRows.filter((r: any) => r && r.visible !== false);
      if (visibleRows.length > 0) {
        this.traversePoints = visibleRows.map((r: any, idx: number) => {
          const parsed = parseFloat(String(r.label || ''));
          return {
            distance: !isNaN(parsed) ? parsed : Number(((idx + 1) * 0.1).toFixed(2)),
            hardness: null
          };
        });
      }
    }
    this.recalculateEffectiveCaseDepth();
  }

  private initChecklist(): void {
    const chkSec = this.sections.find(s => s.type === 'checklist');
    if (this.test?.checklist && Array.isArray(this.test.checklist) && this.test.checklist.length > 0) {
      this.checklistItems = this.test.checklist.map((chk: any, idx: number) => ({
        id: chk.id || (idx + 1),
        label: chk.label || chk.inspectionPoint || `Item ${idx + 1}`,
        status: chk.status || 'Pass'
      }));
    } else if (chkSec?.config?.tableRows && Array.isArray(chkSec.config.tableRows) && chkSec.config.tableRows.length > 0) {
      this.checklistItems = chkSec.config.tableRows.map((r: any, idx: number) => ({
        id: idx + 1,
        label: r.label,
        status: 'Pass'
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
    const isMandatory = opSec.config?.sectionStatus === 'Mandatory' || opSec.config?.isOptional === false;
    this.opinionData.isOptional = !isMandatory;
    if (!this.opinionData.overallStatement && opSec.config?.overallStatement) {
      this.opinionData.overallStatement = opSec.config.overallStatement;
    }
    if (this.opinionData.items.length === 0 && opSec.config?.tableRows && Array.isArray(opSec.config.tableRows)) {
      const rows = opSec.config.derivedOnly
        ? opSec.config.tableRows.filter((r: any) => !!(r.formulaDisplay || r.formula || r.isCalculated))
        : opSec.config.tableRows;
      const sourceRows = rows.length > 0 ? rows : opSec.config.tableRows;
      this.opinionData.items = sourceRows.map((r: any) => ({
        label: r.label,
        formulaDisplay: r.formulaDisplay || r.formula || '',
        unit: r.unit || '',
        requirement: r.requirement || '',
        value: r.staticValue || '',
        status: 'Pass'
      }));
    }
  }

  private initExecutionExtra(): void {
    // Hydrate section-configured defaults before applying saved ExecutionExtraJson overrides
    const ruleSec = this.sections.find(s => s.type === 'rule' || s.type === 'decision');
    if (ruleSec?.config) {
      if (ruleSec.config.decisionRule) {
        const dr = String(ruleSec.config.decisionRule).toLowerCase();
        if (dr.includes('guard')) this.decisionRule.ruleType = 'Guard Banded (ILAC-G8)';
        else if (dr.includes('customer') || dr.includes('non-binary')) this.decisionRule.ruleType = 'Non-Binary';
        else this.decisionRule.ruleType = 'Simple Acceptance';
      }
      if (ruleSec.config.confidenceLevel != null) this.decisionRule.confidenceLevel = Number(ruleSec.config.confidenceLevel) || 95;
      if (ruleSec.config.guardBandMultiplier != null) this.decisionRule.guardBandMultiplier = Number(ruleSec.config.guardBandMultiplier);
      if (ruleSec.config.defaultText && !this.decisionRule.statementText) {
        this.decisionRule.statementText = ruleSec.config.defaultText;
      }
    }

    const classSec = this.sections.find(s => s.type === 'classification' || s.type === 'class');
    if (classSec?.config) {
      const stdVal = classSec.config.ratingSystem || classSec.config.standard;
      const methodVal = classSec.config.decision || classSec.config.ratingMethod;
      if (stdVal) this.classification.classificationStandard = stdVal;
      if (methodVal) this.classification.ratingType = methodVal;
    }

    const narrativeSec = this.sections.find(s => s.type === 'narrative' || s.type === 'rem');
    const defaultNarr = narrativeSec?.config?.defaultText || narrativeSec?.config?.extraFields;
    if (defaultNarr && this.testFormGroup && !this.testFormGroup.get('remarks')?.value) {
      this.testFormGroup.get('remarks')?.patchValue(defaultNarr, { emitEvent: false });
    }

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
        if (extra?.customCellValues) {
          this.customCellValues = { ...this.customCellValues, ...extra.customCellValues };
        }
        if (extra?.opinionData) {
          this.opinionData = { ...this.opinionData, ...extra.opinionData };
        }
      } catch (e) {
        console.warn('Could not parse test.executionExtraJson', e);
      }
    }
  }

  // =========================================================================
  // Specimen & Parameter Grouping / Detection
  // =========================================================================

  /**
   * Calculates the number of unique base parameters per specimen.
   * e.g. If 18 total parameters are configured across 3 specimens, returns 6.
   */
  getBaseParameterCount(): number {
    if (!this.parametersFormArray || this.parametersFormArray.length === 0) return 6;
    const names = new Set<string>();
    let count = 0;
    for (let i = 0; i < this.parametersFormArray.length; i++) {
      const ctrl = this.parametersFormArray.at(i);
      if (!ctrl) continue;
      const pName = (ctrl.get('parameterName')?.value || '').trim().toLowerCase();
      if (pName && names.has(pName)) {
        return count; // First duplicate found, this marks the end of specimen 1's parameter group!
      }
      if (pName) {
        names.add(pName);
      }
      count++;
    }
    // If no duplicate was found at all, all parameters in array belong to a single specimen
    if (count > 0) {
      return count;
    }
    // Fallback based on specimen count
    return this.specimens.length > 0
      ? Math.max(1, Math.round(this.parametersFormArray.length / this.specimens.length))
      : 6;
  }

  getSpecimenIndexForParam(rowIdx: number): number {
    const base = this.getBaseParameterCount();
    return Math.floor(rowIdx / base);
  }

  getSpecimenLabelForParam(rowIdx: number): string {
    const spmIdx = this.getSpecimenIndexForParam(rowIdx);
    return `S${spmIdx + 1}`;
  }

  isFirstParamOfSpecimen(rowIdx: number): boolean {
    const base = this.getBaseParameterCount();
    return rowIdx % base === 0;
  }

  getFilteredParamIndices(): number[] {
    if (!this.parametersFormArray) return [];
    const total = this.parametersFormArray.length;
    const indices: number[] = [];

    for (let i = 0; i < total; i++) {
      if (this.selectedSpecimenFilter === 'all') {
        indices.push(i);
      } else {
        const spmIdx = this.getSpecimenIndexForParam(i);
        if (spmIdx === (this.selectedSpecimenFilter - 1)) {
          indices.push(i);
        }
      }
    }
    return indices;
  }

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

  getBaseParameterList(): any[] {
    if (!this.parametersFormArray || this.parametersFormArray.length === 0) return [];
    const base = this.getBaseParameterCount();
    const list: any[] = [];
    for (let i = 0; i < Math.min(base, this.parametersFormArray.length); i++) {
      const ctrl = this.parametersFormArray.at(i);
      if (ctrl) {
        list.push({
          index: i,
          name: ctrl.get('parameterName')?.value || `Parameter ${i + 1}`,
          unit: ctrl.get('unit')?.value || '—',
          requirement: this.formatRequirement(ctrl.value),
          isCalculated: ctrl.get('isCalculated')?.value || !!ctrl.get('formulaExpression')?.value
        });
      }
    }
    return list;
  }

  getParamValueForSpecimen(baseParamIdx: number, spmIdx: number): any {
    const base = this.getBaseParameterCount();
    const targetIdx = spmIdx * base + baseParamIdx;
    return this.parametersFormArray?.at(targetIdx)?.get('value')?.value ?? '';
  }

  onParamValueChangeForSpecimen(baseParamIdx: number, spmIdx: number, newVal: any): void {
    const base = this.getBaseParameterCount();
    const targetIdx = spmIdx * base + baseParamIdx;
    const ctrl = this.parametersFormArray?.at(targetIdx);
    if (ctrl) {
      ctrl.patchValue({ value: newVal });
      this.evaluateLimitForControl(ctrl);
      this.paramValueChanged.emit({ rowIdx: targetIdx, param: ctrl.value });
      this.cdr.markForCheck();
    }
  }

  getBaseParamAverage(baseParamIdx: number): string {
    const base = this.getBaseParameterCount();
    let sum = 0;
    let count = 0;
    for (let s = 0; s < this.specimens.length; s++) {
      const idx = s * base + baseParamIdx;
      const ctrl = this.parametersFormArray?.at(idx);
      const raw = ctrl?.get('value')?.value;
      if (raw !== null && raw !== undefined && raw !== '' && !isNaN(Number(raw))) {
        sum += Number(raw);
        count++;
      }
    }
    return count > 0 ? (sum / count).toFixed(2).replace(/\.00$/, '') : '-';
  }

  getBaseParamStatus(baseParamIdx: number): string {
    const base = this.getBaseParameterCount();
    let hasFail = false;
    let hasPass = false;
    for (let s = 0; s < this.specimens.length; s++) {
      const idx = s * base + baseParamIdx;
      const ctrl = this.parametersFormArray?.at(idx);
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
    const count = Math.max(1, plannedQty);
    const prefix = 'S';

    // Guard: If specimen array already exists with target length and has values, avoid wiping
    if (this.specimens.length === count && this.specimens.some(s => s.yieldLoad != null || s.peakLoad != null || s.proofStress != null || s.uts != null)) {
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

    // Align parametersFormArray with initial count
    if (this.parametersFormArray && this.parametersFormArray.length > 0) {
      const base = this.getBaseParameterCount();
      if (base > 0) {
        const targetLen = count * base;
        if (this.parametersFormArray.length > targetLen) {
          while (this.parametersFormArray.length > targetLen) {
            this.parametersFormArray.removeAt(this.parametersFormArray.length - 1);
          }
        } else if (this.parametersFormArray.length < targetLen) {
          while (this.parametersFormArray.length < targetLen) {
            const templateIdx = this.parametersFormArray.length % base;
            const templateCtrl = this.parametersFormArray.at(templateIdx);
            if (templateCtrl) {
              const cloned = this.createParamControl({
                ...templateCtrl.value,
                id: null,
                value: null,
                resultStatus: null,
                isWithinLimit: null,
                remarks: ''
              });
              this.parametersFormArray.push(cloned);
            }
          }
        }
      }
    }

    // Hydrate specimen data from existing parameter controls (e.g. S1, S2 from database)
    this.hydrateSpecimensFromParameters();

    this.recalculateSpecimens();
    this.cdr.markForCheck();
  }

  private hydrateSpecimensFromParameters(): void {
    if (!this.parametersFormArray || this.parametersFormArray.length === 0) return;
    const base = this.getBaseParameterCount();

    for (let sIdx = 0; sIdx < this.specimens.length; sIdx++) {
      const spm = this.specimens[sIdx];
      const startIdx = sIdx * base;
      const endIdx = Math.min(startIdx + base, this.parametersFormArray.length);

      for (let i = startIdx; i < endIdx; i++) {
        const ctrl = this.parametersFormArray.at(i);
        if (!ctrl) continue;
        const name = (ctrl.get('parameterName')?.value || '').toLowerCase();
        const val = ctrl.get('value')?.value;

        if (val !== null && val !== undefined && val !== '' && !isNaN(Number(val))) {
          const numVal = Number(val);
          if (name.includes('thickness')) {
            spm.thickness = numVal;
          } else if (name.includes('width')) {
            spm.width = numVal;
          } else if (name.includes('diameter')) {
            spm.diameter = numVal;
          } else if (name.includes('cross section') || (name.includes('area') && !name.includes('reduction'))) {
            spm.area = numVal;
          } else if (name.includes('gauge length')) {
            spm.gaugeLength = numVal;
          } else if (name.includes('yield load')) {
            spm.yieldLoad = numVal;
          } else if (name.includes('peak load') || (name.includes('load') && !name.includes('yield'))) {
            spm.peakLoad = numVal;
          } else if (name.includes('final length')) {
            spm.finalLength = numVal;
          } else if (name.includes('proof stress') || name.includes('yield strength')) {
            spm.proofStress = Math.round(numVal);
          } else if (name.includes('tensile strength') || name.includes('uts')) {
            spm.uts = Math.round(numVal);
          } else if (name.includes('elongation')) {
            spm.elongation = Number(numVal.toFixed(1));
          } else if (name.includes('reduction of area')) {
            spm.reductionOfArea = Number(numVal.toFixed(1));
          }
        }
      }

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
    if (d && d > 0) {
      return Number(((Math.PI * d * d) / 4).toFixed(2));
    }
    if (t && w && t > 0 && w > 0) {
      return Number((t * w).toFixed(2));
    }
    return null;
  }

  onSpecimenDimensionChange(spm: SpecimenData): void {
    spm.area = this.calculateArea(spm.thickness || null, spm.width || null, spm.diameter || null);
    this.recalculateSpecimenRow(spm);
    this.recalculateSpecimens();
    this.syncSpecimenToForm(spm);
  }

  onSpecimenLoadChange(spm: SpecimenData): void {
    this.recalculateSpecimenRow(spm);
    this.recalculateSpecimens();
    this.syncSpecimenToForm(spm);
  }

  private recalculateSpecimenRow(spm: SpecimenData): void {
    const s0 = spm.area;
    if (s0 && s0 > 0) {
      // Proof Stress Rp0.2 = Yield Load (kN) * 1000 / S0 (mm2)
      if (spm.yieldLoad && spm.yieldLoad > 0) {
        spm.proofStress = Math.round((spm.yieldLoad * 1000) / s0);
      } else {
        spm.proofStress = null;
      }

      // UTS Rm = Peak Load (kN) * 1000 / S0 (mm2)
      if (spm.peakLoad && spm.peakLoad > 0) {
        spm.uts = Math.round((spm.peakLoad * 1000) / s0);
      } else {
        spm.uts = null;
      }
    }

    // Elongation A% = ((Lu - L0) / L0) * 100
    if (spm.finalLength && spm.gaugeLength && spm.gaugeLength > 0 && spm.finalLength >= spm.gaugeLength) {
      spm.elongation = Number((((spm.finalLength - spm.gaugeLength) / spm.gaugeLength) * 100).toFixed(1));
    } else {
      spm.elongation = null;
    }

    // Reduction of Area Z% = ((S0 - Su) / S0) * 100
    if (spm.finalArea && s0 && s0 > 0 && spm.finalArea <= s0) {
      spm.reductionOfArea = Number((((s0 - spm.finalArea) / s0) * 100).toFixed(1));
    } else {
      spm.reductionOfArea = null;
    }
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

  private syncSpecimenToForm(spm: SpecimenData): void {
    if (!this.parametersFormArray) return;
    const spmIdx = this.specimens.indexOf(spm);
    if (spmIdx < 0) return;

    const base = this.getBaseParameterCount();
    const startIdx = spmIdx * base;
    const endIdx = Math.min(startIdx + base, this.parametersFormArray.length);

    for (let i = startIdx; i < endIdx; i++) {
      const ctrl = this.parametersFormArray.at(i);
      if (!ctrl) continue;
      const name = (ctrl.get('parameterName')?.value || '').toLowerCase();

      if (spm.thickness != null && name.includes('thickness')) {
        ctrl.patchValue({ value: spm.thickness });
        this.evaluateLimitForControl(ctrl);
        this.paramValueChanged.emit({ rowIdx: i, param: ctrl.value });
      } else if (spm.width != null && name.includes('width')) {
        ctrl.patchValue({ value: spm.width });
        this.evaluateLimitForControl(ctrl);
        this.paramValueChanged.emit({ rowIdx: i, param: ctrl.value });
      } else if (spm.diameter != null && name.includes('diameter')) {
        ctrl.patchValue({ value: spm.diameter });
        this.evaluateLimitForControl(ctrl);
        this.paramValueChanged.emit({ rowIdx: i, param: ctrl.value });
      } else if (spm.area != null && (name.includes('cross section') || (name.includes('area') && !name.includes('reduction')))) {
        ctrl.patchValue({ value: spm.area });
        this.evaluateLimitForControl(ctrl);
        this.paramValueChanged.emit({ rowIdx: i, param: ctrl.value });
      } else if (spm.gaugeLength != null && name.includes('gauge length')) {
        ctrl.patchValue({ value: spm.gaugeLength });
        this.evaluateLimitForControl(ctrl);
        this.paramValueChanged.emit({ rowIdx: i, param: ctrl.value });
      } else if (spm.yieldLoad != null && name.includes('yield load')) {
        ctrl.patchValue({ value: spm.yieldLoad });
        this.evaluateLimitForControl(ctrl);
        this.paramValueChanged.emit({ rowIdx: i, param: ctrl.value });
      } else if (spm.peakLoad != null && (name.includes('peak load') || (name.includes('load') && !name.includes('yield')))) {
        ctrl.patchValue({ value: spm.peakLoad });
        this.evaluateLimitForControl(ctrl);
        this.paramValueChanged.emit({ rowIdx: i, param: ctrl.value });
      } else if (spm.finalLength != null && name.includes('final length')) {
        ctrl.patchValue({ value: spm.finalLength });
        this.evaluateLimitForControl(ctrl);
        this.paramValueChanged.emit({ rowIdx: i, param: ctrl.value });
      } else if (spm.proofStress != null && (name.includes('proof') || name.includes('yield strength'))) {
        ctrl.patchValue({ value: spm.proofStress });
        this.evaluateLimitForControl(ctrl);
        this.paramValueChanged.emit({ rowIdx: i, param: ctrl.value });
      } else if (spm.uts != null && (name.includes('tensile strength') || name.includes('uts') || name.includes('ultimate'))) {
        ctrl.patchValue({ value: spm.uts });
        this.evaluateLimitForControl(ctrl);
        this.paramValueChanged.emit({ rowIdx: i, param: ctrl.value });
      } else if (spm.elongation != null && name.includes('elongation')) {
        ctrl.patchValue({ value: spm.elongation });
        this.evaluateLimitForControl(ctrl);
        this.paramValueChanged.emit({ rowIdx: i, param: ctrl.value });
      } else if (spm.reductionOfArea != null && (name.includes('reduction') || name.includes('area'))) {
        ctrl.patchValue({ value: spm.reductionOfArea });
        this.evaluateLimitForControl(ctrl);
        this.paramValueChanged.emit({ rowIdx: i, param: ctrl.value });
      }
    }
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
        const name = (tp.parameterName || '').toLowerCase();
        if (this.specimenAverages.proofStress != null && (name.includes('proof') || name.includes('yield'))) {
          tp.value = this.specimenAverages.proofStress;
        } else if (this.specimenAverages.uts != null && (name.includes('tensile') || name.includes('uts') || name.includes('ultimate'))) {
          tp.value = this.specimenAverages.uts;
        } else if (this.specimenAverages.elongation != null && name.includes('elongation')) {
          tp.value = this.specimenAverages.elongation;
        } else if (this.specimenAverages.reductionOfArea != null && (name.includes('reduction') || name.includes('area'))) {
          tp.value = this.specimenAverages.reductionOfArea;
        }
      });
    }
  }

  // =========================================================================
  // Specimen & Parameter Adjustments (Dynamic Count / Stepper / Add / Remove)
  // =========================================================================

  setSpecimenCount(targetCount: number): void {
    const newCount = Math.max(1, Math.min(20, Math.round(targetCount)));
    const base = this.getBaseParameterCount();

    if (newCount > this.specimens.length) {
      const diff = newCount - this.specimens.length;
      for (let i = 0; i < diff; i++) {
        this.addSpecimen();
      }
    } else if (newCount < this.specimens.length) {
      const diff = this.specimens.length - newCount;
      for (let i = 0; i < diff; i++) {
        this.removeSpecimen();
      }
    }

    // Safety guard: ALWAYS enforce parametersFormArray length matches this.specimens.length * base
    if (this.parametersFormArray && base > 0) {
      const targetLen = this.specimens.length * base;
      while (this.parametersFormArray.length > targetLen) {
        this.parametersFormArray.removeAt(this.parametersFormArray.length - 1);
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
    const base = this.getBaseParameterCount();
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

    // Clone base parameters for the new specimen into the form array
    if (this.parametersFormArray && base > 0) {
      for (let i = 0; i < base; i++) {
        const srcCtrl = this.parametersFormArray.at(i);
        const clonedGroup = this.createParamControl({
          ...srcCtrl.value,
          id: null,
          value: null,
          resultStatus: null,
          isWithinLimit: null,
          remarks: ''
        });
        this.parametersFormArray.push(clonedGroup);
      }
    }

    this.recalculateSpecimens();
    this.parametersAdjusted.emit();
  }

  removeSpecimen(spmIndex?: number): void {
    if (this.isViewMode || this.isLocked || this.specimens.length <= 1) return;
    const targetIdx = spmIndex !== undefined ? spmIndex : this.specimens.length - 1;
    const base = this.getBaseParameterCount();

    // Remove from specimen array
    this.specimens.splice(targetIdx, 1);

    // Re-index remaining specimen IDs
    this.specimens.forEach((s, idx) => {
      s.id = `S${idx + 1}`;
    });

    // Remove corresponding parameter controls
    if (this.parametersFormArray) {
      const startRemove = targetIdx * base;
      for (let i = 0; i < base; i++) {
        if (this.parametersFormArray.length > startRemove) {
          this.parametersFormArray.removeAt(startRemove);
        }
      }
    }

    if (this.selectedSpecimenFilter !== 'all' && (this.selectedSpecimenFilter as number) > this.specimens.length) {
      this.selectedSpecimenFilter = 'all';
    }

    this.recalculateSpecimens();
    this.parametersAdjusted.emit();
  }

  removeParameter(rowIdx: number): void {
    if (this.isViewMode || this.isLocked || !this.parametersFormArray || this.parametersFormArray.length <= 1) return;
    this.parametersFormArray.removeAt(rowIdx);
    this.recalculateSpecimens();
    this.parametersAdjusted.emit();
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
    this.showAddParamModal = true;
  }

  closeAddParamModal(): void {
    this.showAddParamModal = false;
    this.selectedParamDropdownItem = null;
  }

  submitAddParam(): void {
    if (!this.newParamData.parameterName.trim() || !this.parametersFormArray) return;

    const count = this.newParamData.applyTo === 'all' ? this.specimens.length : 1;
    for (let i = 0; i < count; i++) {
      const newCtrl = this.createParamControl({
        parameterID: this.newParamData.parameterID,
        parameterName: this.newParamData.parameterName.trim(),
        unit: this.newParamData.unit.trim(),
        inputType: this.newParamData.inputType,
        minValue: this.newParamData.minValue,
        maxValue: this.newParamData.maxValue,
        acceptanceCriteria: this.newParamData.acceptanceCriteria.trim(),
        testMethodUsed: this.newParamData.testMethodUsed.trim(),
        decimalPrecision: this.newParamData.decimalPrecision ?? 2,
        dropdownOptions: this.newParamData.dropdownOptions || [],
        isReportable: this.newParamData.isReportable,
        isStandalone: true,
        isCalculated: false,
        isBillable: true
      });
      this.parametersFormArray.push(newCtrl);
    }

    this.closeAddParamModal();
    this.recalculateSpecimens();
    this.parametersAdjusted.emit();
  }

  private createParamControl(data: any): FormGroup {
    return this.fb.group({
      id: [data.id || null],
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
    this.conditionValues['Temperature'] = this.test?.roomTemperature ?? this.environmentData?.roomTemperature ?? 23;
    this.conditionValues['Relative Humidity'] = this.test?.roomHumidity ?? this.environmentData?.roomHumidity ?? 50;
    this.conditionValues['Test Speed'] = '2 mm/min';
    this.conditionValues['Medium'] = 'Ambient Air';
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
  }

  onUnitSelect(rowIdx: number): void {
    this.unitChanged.emit({ rowIdx });
  }

  formatRequirement(param: any): string {
    if (!param) return '—';
    if (param.acceptanceCriteria) return param.acceptanceCriteria;
    const min = param.specMinValue != null ? param.specMinValue : param.minValue;
    const max = param.specMaxValue != null ? param.specMaxValue : param.maxValue;
    if (min != null && max != null) return `${min} – ${max}`;
    if (min != null) return `≥ ${min}`;
    if (max != null) return `≤ ${max}`;
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
    return !!(
      param?.isCalculated ||
      (param?.formulaExpression && String(param.formulaExpression).trim().length > 0) ||
      (param?.formula && String(param.formula).trim().length > 0)
    );
  }

  readonly booleanSelectOptions = [
    { value: 'Pass', label: 'Pass' },
    { value: 'Fail', label: 'Fail' },
    { value: 'Satisfactory', label: 'Satisfactory' },
    { value: 'Not Satisfactory', label: 'Not Satisfactory' },
    { value: 'NA', label: 'N/A' }
  ];

  // =========================================================================
  // Dynamic Parameter Table Renderer (Semantic Column Roles + Data Derivation Mode)
  // =========================================================================
  hasConfiguredParameterTable(s: any): boolean {
    return Array.isArray(s?.config?.tableColumns) && s.config.tableColumns.length > 0;
  }

  inferParamColumnRole(col: any): string {
    if (col?.columnRole) return col.columnRole;
    const k = String(col?.key || '').toLowerCase();
    if (k === 'param' || k === 'parameter' || k === 'label' || k === 'name') return 'row_label';
    if (k === 'unit') return 'unit';
    if (k === 'requirement' || k === 'spec' || k === 'limit') return 'spec_requirement';
    if (k === 'spec_min' || k === 'min_limit') return 'spec_min';
    if (k === 'spec_max' || k === 'max_limit') return 'spec_max';
    if (k === 'result' || k === 'value' || k.startsWith('spec_')) return 'observation_value';
    if (k === 'uncertainty') return 'uncertainty';
    if (k === 'scope' || k === 'nabl') return 'nabl_scope';
    if (k === 'dl' || k === 'detection_limit') return 'detection_limit';
    if (k === 'method') return 'test_method';
    if (k === 'avg' || k === 'mean') return 'agg_average';
    if (k === 'min') return 'agg_min';
    if (k === 'max') return 'agg_max';
    if (k === 'status' || k === 'verdict') return 'status_verdict';
    if (k === 'reportable') return 'reportable_toggle';
    if (k === 'remarks') return 'custom_data';
    return 'custom_data';
  }

  getParamTableColumns(s: any): any[] {
    const cols = Array.isArray(s?.config?.tableColumns) ? s.config.tableColumns : [];
    return cols
      .filter((c: any) => c && c.visible !== false)
      .map((c: any) => ({
        ...c,
        resolvedRole: this.inferParamColumnRole(c),
        specimenIndex: this.extractSpecimenIndexFromColKey(c.key)
      }));
  }

  // Header Merge Support for Parameter Table
  hasParamMergedHeader(s: any): boolean {
    const hm = s?.config?.headerMerge;
    if (!hm || !hm.active || !hm.startCol) return false;
    return this.getParamMergedCols(s).length >= 2;
  }

  isParamSubLabelsVisible(s: any): boolean {
    return s?.config?.headerMerge?.showSubLabels !== false;
  }

  getParamMergedHeaderTitle(s: any): string {
    return s?.config?.headerMerge?.title || 'Grouped Observations';
  }

  getParamPreMergedCols(s: any): any[] {
    const cols = this.getParamTableColumns(s);
    const hm = s?.config?.headerMerge;
    if (!hm || !hm.active || !hm.startCol) return cols;
    const startIdx = cols.findIndex((c: any) => c.key === hm.startCol);
    return startIdx > 0 ? cols.slice(0, startIdx) : [];
  }

  getParamMergedCols(s: any): any[] {
    const cols = this.getParamTableColumns(s);
    const hm = s?.config?.headerMerge;
    if (!hm || !hm.active || !hm.startCol) return [];
    const startIdx = cols.findIndex((c: any) => c.key === hm.startCol);
    if (startIdx < 0) return [];
    const span = Math.max(2, Number(hm.colspan) || 2);
    return cols.slice(startIdx, startIdx + span);
  }

  getParamPostMergedCols(s: any): any[] {
    const cols = this.getParamTableColumns(s);
    const hm = s?.config?.headerMerge;
    if (!hm || !hm.active || !hm.startCol) return [];
    const startIdx = cols.findIndex((c: any) => c.key === hm.startCol);
    if (startIdx < 0) return [];
    const span = Math.max(2, Number(hm.colspan) || 2);
    return cols.slice(startIdx + span);
  }

  private extractSpecimenIndexFromColKey(key: string): number | null {
    const m = /^spec_(\d+)$/i.exec(String(key || ''));
    return m ? Math.max(0, parseInt(m[1], 10) - 1) : null;
  }

  getParamTableRows(s: any): {
    rowKey: string;
    label: string;
    unit?: string;
    requirement?: string;
    isCustomRow: boolean;
    paramIdx: number | null;
    specimenIndices: number[];
    templateRow?: any;
  }[] {
    const mode = s?.config?.sectionDataMode
      ? (s.config.sectionDataMode === 'template' ? 'template' : 'runtime')
      : (s?.config?.parameterMode === 'Configured parameter subset' ? 'template' : 'runtime');
    const isMultiSpec = !!s?.config?.enableMultiSpecimen;
    const totalParams = this.parametersFormArray?.length || 0;
    const baseCount = this.getBaseParameterCount() || totalParams;
    const templateRows: any[] = Array.isArray(s?.config?.tableRows)
      ? s.config.tableRows.filter((r: any) => r && r.visible !== false)
      : [];

    const buildSpecimenIndices = (baseIdx: number): number[] => {
      if (baseIdx < 0 || baseIdx >= totalParams) return [];
      if (!isMultiSpec || baseCount <= 0) return [baseIdx];
      const indices: number[] = [];
      for (let i = baseIdx; i < totalParams; i += baseCount) {
        indices.push(i);
      }
      return indices;
    };

    const findMatchingParamIndex = (row: any): number | null => {
      if (!this.parametersFormArray || totalParams === 0) return null;
      const searchLimit = isMultiSpec ? Math.min(baseCount, totalParams) : totalParams;
      if (row?.dbMasterId != null && row.dbMasterId !== '') {
        const targetId = Number(row.dbMasterId);
        for (let i = 0; i < searchLimit; i++) {
          const val = this.parametersFormArray.at(i)?.value;
          if (Number(val?.parameterID) === targetId) return i;
        }
      }
      const targetLabel = String(row?.dbMasterName || row?.label || '').trim().toLowerCase();
      if (targetLabel) {
        for (let i = 0; i < searchLimit; i++) {
          const val = this.parametersFormArray.at(i)?.value;
          if (String(val?.parameterName || '').trim().toLowerCase() === targetLabel) return i;
        }
      }
      return null;
    };

    if (mode === 'template' && templateRows.length > 0) {
      return templateRows.map((tr: any, idx: number) => {
        const matchedIdx = findMatchingParamIndex(tr);
        if (matchedIdx !== null) {
          const ctrlVal = this.parametersFormArray.at(matchedIdx).value;
          return {
            rowKey: tr.key || `tpl_${idx}`,
            label: tr.label || ctrlVal.parameterName || `Row ${idx + 1}`,
            unit: ctrlVal.unit || tr.unit || '',
            requirement: this.formatRequirement(ctrlVal),
            isCustomRow: false,
            paramIdx: matchedIdx,
            specimenIndices: buildSpecimenIndices(matchedIdx),
            templateRow: tr
          };
        }
        return {
          rowKey: tr.key || `custom_${idx}`,
          label: tr.label || `Custom Row ${idx + 1}`,
          unit: tr.unit || '',
          requirement: tr.requirement || '—',
          isCustomRow: true,
          paramIdx: null,
          specimenIndices: [],
          templateRow: tr
        };
      });
    }

    // Runtime Auto-Load Mode
    const rows: any[] = [];
    if (isMultiSpec && baseCount > 0) {
      for (let b = 0; b < Math.min(baseCount, totalParams); b++) {
        const ctrlVal = this.parametersFormArray.at(b).value;
        rows.push({
          rowKey: `rt_${ctrlVal.parameterID || b}`,
          label: ctrlVal.parameterName || `Parameter ${b + 1}`,
          unit: ctrlVal.unit || '',
          requirement: this.formatRequirement(ctrlVal),
          isCustomRow: false,
          paramIdx: b,
          specimenIndices: buildSpecimenIndices(b)
        });
      }
    } else {
      const indices = this.getFilteredParamIndices();
      indices.forEach((rIdx) => {
        const ctrlVal = this.parametersFormArray.at(rIdx)?.value;
        if (!ctrlVal) return;
        rows.push({
          rowKey: `rt_${rIdx}`,
          label: ctrlVal.parameterName || `Parameter ${rIdx + 1}`,
          unit: ctrlVal.unit || '',
          requirement: this.formatRequirement(ctrlVal),
          isCustomRow: false,
          paramIdx: rIdx,
          specimenIndices: [rIdx]
        });
      });
    }

    // Append explicit custom-text template rows (not DB-linked and not dummy placeholders)
    templateRows
      .filter((tr: any) => {
        if (tr.rowOrigin === 'db' || tr.dbMasterId != null) return false;
        const lbl = String(tr.label || '').trim();
        if (!lbl || lbl === 'Runtime Parameter (Auto-bound)' || lbl === 'Observation 1') return false;
        return findMatchingParamIndex(tr) === null;
      })
      .forEach((tr: any, idx: number) => {
        rows.push({
          rowKey: tr.key || `extra_custom_${idx}`,
          label: tr.label || `Custom Row ${idx + 1}`,
          unit: tr.unit || '',
          requirement: tr.requirement || '—',
          isCustomRow: true,
          paramIdx: null,
          specimenIndices: [],
          templateRow: tr
        });
      });

    return rows;
  }

  getRowComplianceStatus(row: any): boolean | null {
    if (row?.isCustomRow || !this.parametersFormArray) return null;
    const indices: number[] = row?.specimenIndices?.length ? row.specimenIndices : (row?.paramIdx != null ? [row.paramIdx] : []);
    if (indices.length === 0) return null;
    let hasPass = false;
    for (const idx of indices) {
      const lim = this.parametersFormArray.at(idx)?.value?.isWithinLimit;
      if (lim === false) return false;
      if (lim === true) hasPass = true;
    }
    return hasPass ? true : null;
  }

  // =========================================================================
  // Dynamic Specimen Matrix Renderer (Semantic Columns + Runtime/Template Mode + Orientation)
  // =========================================================================
  hasConfiguredSpecimenTable(s: any): boolean {
    if (!Array.isArray(s?.config?.tableColumns) || s.config.tableColumns.length === 0) return false;
    // Preserve dedicated Tensile dimensional physics matrix unless explicitly in Template Configured mode
    if (this.isTensileTest() && s?.config?.sectionDataMode !== 'template') return false;
    return true;
  }

  isSpecimenTransposed(s: any): boolean {
    return s?.config?.orientation === 'Specimens × Parameters';
  }

  getSpecimenMatrixColumns(s: any): any[] {
    const baseCols = this.getParamTableColumns(s);
    if (this.isSpecimenTransposed(s) || s?.config?.sectionDataMode === 'template') {
      return baseCols;
    }
    // In Runtime Auto-Load (Parameters × Specimens), dynamically match live specimen count
    const liveSpecCount = this.specimens?.length || 0;
    if (liveSpecCount <= 0) return baseCols;

    const firstSpecPos = baseCols.findIndex((c: any) => c.specimenIndex != null);
    if (firstSpecPos < 0) return baseCols;

    const nonSpecBefore = baseCols.slice(0, firstSpecPos);
    const nonSpecAfter = baseCols.slice(firstSpecPos).filter((c: any) => c.specimenIndex == null);
    const specTemplateCol = baseCols[firstSpecPos];

    const dynamicSpecCols = this.specimens.map((spm, idx) => {
      const existing = baseCols.find((c: any) => c.specimenIndex === idx);
      return {
        ...(existing || specTemplateCol),
        key: `spec_${idx + 1}`,
        label: existing?.label || spm.id || `S${idx + 1}`,
        resolvedRole: existing?.resolvedRole || 'observation_value',
        specimenIndex: idx,
        liveSpecimenId: spm.id
      };
    });

    return [...nonSpecBefore, ...dynamicSpecCols, ...nonSpecAfter];
  }

  getSpecimenMatrixRows(s: any): any[] {
    if (this.isSpecimenTransposed(s)) {
      const mode = s?.config?.sectionDataMode === 'template' ? 'template' : 'runtime';
      const templateRows: any[] = Array.isArray(s?.config?.tableRows)
        ? s.config.tableRows.filter((r: any) => r && r.visible !== false && r.nature !== 'summary')
        : [];
      if (mode === 'template' && templateRows.length > 0) {
        return templateRows.map((tr: any, idx: number) => ({
          rowKey: tr.key || `spm_tr_${idx}`,
          label: tr.label || `S${idx + 1}`,
          specimenIdx: idx,
          isCustomRow: idx >= (this.specimens?.length || 0),
          paramIdx: null,
          specimenIndices: []
        }));
      }
      return (this.specimens || []).map((spm, idx) => ({
        rowKey: `spm_live_${idx}`,
        label: spm.id || `S${idx + 1}`,
        specimenIdx: idx,
        isCustomRow: false,
        paramIdx: null,
        specimenIndices: []
      }));
    }

    // Parameters × Specimens orientation: reuse multi-specimen parameter grouping!
    const virtualSection = {
      ...s,
      config: {
        ...s?.config,
        enableMultiSpecimen: true
      }
    };
    return this.getParamTableRows(virtualSection);
  }

  getTransposedParamIdx(specimenIdx: number, col: any): number | null {
    if (!this.parametersFormArray || specimenIdx < 0) return null;
    const baseCount = this.getBaseParameterCount() || this.parametersFormArray.length;
    if (baseCount <= 0) return null;
    const limit = Math.min(baseCount, this.parametersFormArray.length);
    // 1. Exact DB Parameter ID match when column is Master-Linked
    if (col?.dbMasterId != null && col.dbMasterId !== '' && (!col.dbMasterSource || col.dbMasterSource === 'parameter')) {
      const targetId = Number(col.dbMasterId);
      for (let b = 0; b < limit; b++) {
        if (Number(this.parametersFormArray.at(b)?.value?.parameterID) === targetId) {
          const target = specimenIdx * baseCount + b;
          return target < this.parametersFormArray.length ? target : null;
        }
      }
    }
    // 2. Fallback to Master Name / Header Label / Key match
    const colLabel = String(col?.dbMasterName || col?.label || '').trim().toLowerCase();
    const colKey = String(col?.key || '').trim().toLowerCase();
    for (let b = 0; b < limit; b++) {
      const pName = String(this.parametersFormArray.at(b)?.value?.parameterName || '').trim().toLowerCase();
      if (pName === colLabel || (colKey && pName.includes(colKey))) {
        const target = specimenIdx * baseCount + b;
        return target < this.parametersFormArray.length ? target : null;
      }
    }
    return null;
  }

  // =========================================================================
  // Batch 1 Dynamic Renderers: Multi-Reading (reading), Location (location), Traverse (traverse)
  // =========================================================================
  hasConfiguredReadingTable(s: any): boolean {
    return Array.isArray(s?.config?.tableColumns) && s.config.tableColumns.length > 0;
  }

  getReadingMatrixColumns(s: any): any[] {
    let runningSpot = 0;
    const hideIndividual = s?.config?.showIndividual === false;
    const hideStats = s?.config?.showStatistics === false;
    return this.getParamTableColumns(s)
      .filter((c: any) => {
        if (hideIndividual && c.resolvedRole === 'observation_value') return false;
        if (hideStats && (c.resolvedRole === 'agg_average' || c.resolvedRole === 'agg_min' || c.resolvedRole === 'agg_max')) return false;
        return true;
      })
      .map((c: any) => {
        const m = /^(?:spot|reading)_(\d+)$/i.exec(String(c.key || ''));
        const spotIndex = m ? Math.max(0, parseInt(m[1], 10) - 1) : (c.resolvedRole === 'observation_value' ? runningSpot++ : null);
        return { ...c, spotIndex };
      });
  }

  getReadingAggregatedByConfig(targetParam: string, s: any): string {
    const agg = String(s?.config?.aggregation || 'Average').toLowerCase();
    const vals = (this.readingValues[targetParam] || []).filter((v): v is number => v !== null && v !== undefined && !isNaN(Number(v))).map(Number);
    if (vals.length === 0) return '—';
    if (agg.includes('min')) return Math.min(...vals).toFixed(2);
    if (agg.includes('max')) return Math.max(...vals).toFixed(2);
    if (agg.includes('median')) {
      const sorted = [...vals].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      const med = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
      return med.toFixed(2);
    }
    if (agg.includes('std')) {
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      const variance = vals.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / vals.length;
      return Math.sqrt(variance).toFixed(3);
    }
    return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2);
  }

  getSubstitutedFormulaDisplay(param: any): string {
    const expr = String(param?.formulaExpression || param?.formula || '').trim();
    if (!expr) return '';
    const controls = this.parametersFormArray?.controls || [];
    let substituted = expr;
    controls.forEach((c: any) => {
      const id = c.get('parameterID')?.value;
      const name = String(c.get('parameterName')?.value || '').trim();
      const val = c.get('value')?.value;
      const displayVal = (val !== null && val !== undefined && val !== '') ? String(val) : '?';
      if (id != null) {
        substituted = substituted.replace(new RegExp(`\\{?P${id}\\}?`, 'gi'), displayVal);
      }
      if (name) {
        const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        substituted = substituted.replace(new RegExp(`\\{${escaped}\\}`, 'gi'), displayVal);
      }
    });
    return substituted;
  }

  getReadingMatrixRows(s: any): { rowKey: string; label: string; targetParam: string; isCustomRow: boolean }[] {
    const mode = s?.config?.sectionDataMode === 'template' ? 'template' : 'runtime';
    const templateRows: any[] = Array.isArray(s?.config?.tableRows)
      ? s.config.tableRows.filter((r: any) => r && r.visible !== false)
      : [];

    if (mode === 'template' && templateRows.length > 0) {
      return templateRows.map((tr: any, idx: number) => {
        const matchedParam = this.findReadingTargetNameForRow(tr);
        return {
          rowKey: tr.key || `rd_tpl_${idx}`,
          label: tr.label || matchedParam || `Row ${idx + 1}`,
          targetParam: matchedParam || tr.label || `Row ${idx + 1}`,
          isCustomRow: !matchedParam
        };
      });
    }

    const targets = this.getReadingTargetParameters(s);
    const rows = targets.map((t, idx) => ({
      rowKey: `rd_rt_${idx}_${t}`,
      label: t,
      targetParam: t,
      isCustomRow: false
    }));

    templateRows
      .filter((tr: any) => tr.rowOrigin !== 'db' && tr.dbMasterId == null && !this.findReadingTargetNameForRow(tr))
      .forEach((tr: any, idx: number) => {
        const lbl = String(tr.label || '').trim();
        if (lbl && !rows.some(r => r.label.toLowerCase() === lbl.toLowerCase())) {
          rows.push({
            rowKey: tr.key || `rd_custom_${idx}`,
            label: lbl,
            targetParam: lbl,
            isCustomRow: true
          });
        }
      });

    return rows;
  }

  private findReadingTargetNameForRow(row: any): string | null {
    if (!this.parametersFormArray) return null;
    if (row?.dbMasterId != null && row.dbMasterId !== '') {
      const targetId = Number(row.dbMasterId);
      for (let i = 0; i < this.parametersFormArray.length; i++) {
        const v = this.parametersFormArray.at(i)?.value;
        if (Number(v?.parameterID) === targetId) return v.parameterName;
      }
    }
    const lbl = String(row?.dbMasterName || row?.label || '').trim().toLowerCase();
    if (lbl) {
      for (let i = 0; i < this.parametersFormArray.length; i++) {
        const v = this.parametersFormArray.at(i)?.value;
        if (String(v?.parameterName || '').trim().toLowerCase() === lbl) return v.parameterName;
      }
    }
    return null;
  }

  hasConfiguredLocationTable(s: any): boolean {
    return Array.isArray(s?.config?.tableColumns) && s.config.tableColumns.length > 0;
  }

  getLocationRowAggregate(s: any, locIdx: number, agg: 'avg' | 'min' | 'max'): string {
    const sKey = s?.config?.sectionKey || s?.id || 'location';
    const rowKey = `loc_${locIdx}`;
    const obsCols = this.getParamTableColumns(s).filter((c: any) => c.resolvedRole === 'observation_value');
    const nums: number[] = [];
    obsCols.forEach((c: any) => {
      const raw = this.getCustomCellValue(sKey, rowKey, c.key);
      const n = parseFloat(raw);
      if (!isNaN(n)) nums.push(n);
    });
    if (nums.length === 0) return '—';
    let res = 0;
    if (agg === 'avg') res = nums.reduce((a, b) => a + b, 0) / nums.length;
    else if (agg === 'min') res = Math.min(...nums);
    else res = Math.max(...nums);
    return res.toFixed(2);
  }

  getTraverseExtraColumns(s: any): any[] {
    if (!Array.isArray(s?.config?.tableColumns)) return [];
    return this.getParamTableColumns(s).filter((c: any) => {
      const k = String(c.key || '').toLowerCase();
      return k !== 'x' && k !== 'y' && c.resolvedRole !== 'row_label';
    });
  }

  // =========================================================================
  // Batch 2 & 3 Dynamic Renderer Helpers (condition, rule, classification, custom, checklist, traceability, photo, formula)
  // =========================================================================
  readonly decisionRuleTypeOptions = [
    { value: 'Simple Acceptance', label: 'Simple Acceptance (Binary, w = 0)' },
    { value: 'Guard Banded (ILAC-G8)', label: 'Guard Banded (ILAC-G8, w = 1.0 U)' },
    { value: 'Non-Binary', label: 'Non-Binary Statement (Pass / Inconclusive / Fail)' }
  ];

  readonly classificationStandardOptions = [
    { value: 'ASTM E45', label: 'ASTM E45 (Inclusion Rating)' },
    { value: 'ASTM A247', label: 'ASTM A247 (Graphite in Iron)' },
    { value: 'ASTM E112', label: 'ASTM E112 (Grain Size)' },
    { value: 'ISO 4967', label: 'ISO 4967 (Non-metallic Inclusions)' }
  ];

  readonly opinionStatusOptions = [
    { value: 'Pass', label: 'PASS' },
    { value: 'Fail', label: 'FAIL' },
    { value: 'NA', label: 'N/A' }
  ];

  readonly observationCategoryOptions = [
    { value: 'General', label: 'General' },
    { value: 'Fracture Appearance', label: 'Fracture Appearance' },
    { value: 'Microstructure', label: 'Microstructure' },
    { value: 'Surface Defect', label: 'Surface Defect' },
    { value: 'Dimensional', label: 'Dimensional' },
    { value: 'Non-Conformance', label: 'Non-Conformance' }
  ];

  readonly newParamInputTypeOptions = [
    { value: 'Decimal', label: 'Decimal / Number' },
    { value: 'Text', label: 'Text' },
    { value: 'Boolean', label: 'Pass / Fail' },
    { value: 'Dropdown', label: 'Dropdown' }
  ];

  addGenericSectionRow(s: any): void {
    if (this.isViewMode || this.isLocked || !s?.config) return;
    if (!Array.isArray(s.config.tableRows)) s.config.tableRows = [];
    const nextIdx = s.config.tableRows.length + 1;
    s.config.tableRows.push({
      key: `row_${Date.now()}_${nextIdx}`,
      label: `Row ${nextIdx}`,
      visible: true
    });
    this.syncCollectionsToTest();
    this.cdr.markForCheck();
  }

  removeGenericSectionRow(s: any, idx: number): void {
    if (this.isViewMode || this.isLocked || !Array.isArray(s?.config?.tableRows) || s.config.tableRows.length <= 1) return;
    s.config.tableRows.splice(idx, 1);
    this.syncCollectionsToTest();
    this.cdr.markForCheck();
  }

  hasConfiguredGenericTable(s: any): boolean {
    return Array.isArray(s?.config?.tableColumns) && s.config.tableColumns.length > 0;
  }

  getGenericTableRows(s: any): any[] {
    if (!Array.isArray(s?.config?.tableRows)) return [];
    return s.config.tableRows
      .filter((r: any) => r && r.visible !== false)
      .map((r: any, idx: number) => ({
        rowKey: r.key || `row_${idx}`,
        label: r.label || `Row ${idx + 1}`,
        unit: r.unit || '',
        requirement: r.requirement || '',
        raw: r
      }));
  }

  getTraceabilityFields(s: any): { label: string; value: string }[] {
    const configured: string[] = Array.isArray(s?.config?.fields) && s.config.fields.length > 0
      ? s.config.fields
      : ['Sample No / UID', 'Case / Certificate No', 'Batch / Heat No', 'Material / Grade', 'Test Standard Method', 'Testing Equipment', 'Performer / Analyst', 'Test Discipline'];

    return configured.map((f: string) => ({
      label: f,
      value: this.resolveTraceabilityFieldValue(f)
    }));
  }

  private resolveTraceabilityFieldValue(field: string): string {
    const k = String(field || '').toLowerCase();
    if (k.includes('sample') || k.includes('uid') || k.includes('lab ref')) return this.sample?.sampleNo || '—';
    if (k.includes('case') || k.includes('cert')) return this.inward?.caseNo || '—';
    if (k.includes('batch') || k.includes('heat')) return this.sample?.batchNo || this.sample?.heatNo || '—';
    if (k.includes('material') || k.includes('grade')) return this.sample?.material || this.testPlan?.specification || '—';
    if (k.includes('method') || k.includes('std') || k.includes('standard')) return this.getCleanTestMethod();
    if (k.includes('equip') || k.includes('cal')) {
      return this.selectedEquipment?.length ? (this.selectedEquipment.map((e: any) => e?.name).filter(Boolean).join(', ') || '—') : '—';
    }
    if (k.includes('analyst') || k.includes('performer') || k.includes('tech')) return this.timingData?.performedByName || '—';
    if (k.includes('env') || k.includes('temp') || k.includes('humid')) {
      const t = this.environmentData?.roomTemperature ?? this.conditionValues['Temperature'];
      const h = this.environmentData?.roomHumidity ?? this.conditionValues['Relative Humidity'];
      return (t != null || h != null) ? `${t ?? '—'} °C / ${h ?? '—'} %RH` : '—';
    }
    if (k.includes('date')) {
      const dt = this.timingData?.testStartTime || this.timingData?.startTime;
      return dt ? new Date(dt).toLocaleDateString() : '—';
    }
    if (k.includes('discipline')) return this.testPlan?.discipline || '—';
    return '—';
  }

  getChecklistOptions(s: any): { value: 'Pass' | 'Fail' | 'NA'; label: string; activeClass: string }[] {
    const rt = String(s?.config?.responseType || '').toLowerCase();
    if (rt.includes('yes')) {
      return [
        { value: 'Pass', label: 'Yes', activeClass: 'btn-success' },
        { value: 'Fail', label: 'No', activeClass: 'btn-danger' },
        { value: 'NA', label: 'N/A', activeClass: 'btn-secondary' }
      ];
    }
    if (rt.includes('ok')) {
      return [
        { value: 'Pass', label: 'OK', activeClass: 'btn-success' },
        { value: 'Fail', label: 'Not OK', activeClass: 'btn-danger' },
        { value: 'NA', label: 'N/A', activeClass: 'btn-secondary' }
      ];
    }
    return [
      { value: 'Pass', label: 'Pass', activeClass: 'btn-success' },
      { value: 'Fail', label: 'Fail', activeClass: 'btn-danger' },
      { value: 'NA', label: 'N/A', activeClass: 'btn-secondary' }
    ];
  }

  getPhotoGridColClass(s: any): string {
    const raw = String(s?.config?.gridColumns || '').trim();
    if (raw === '1' || raw.includes('1 Column')) return 'col-12';
    if (raw === '2' || raw.includes('2 Column')) return 'col-md-6';
    if (raw === '3' || raw.includes('3 Column')) return 'col-md-4';
    if (raw === '4' || raw.includes('4 Column')) return 'col-md-3 col-sm-6';
    return 'col-md-6';
  }

  getFormulaSectionParameters(s: any): { param: any; idx: number }[] {
    const all = (this.parametersFormArray?.controls || [])
      .map((c, idx) => ({ param: c.value, idx }))
      .filter(item => this.isParameterCalculated(item.param));
    if (s?.config?.sectionDataMode === 'template' && s?.config?.targetOutput) {
      const target = String(s.config.targetOutput).trim().toLowerCase();
      const filtered = all.filter(item => String(item.param?.parameterName || '').trim().toLowerCase() === target);
      return filtered.length > 0 ? filtered : all;
    }
    return all;
  }

  getTargetParamIndexForCell(row: any, col: any): number | null {
    if (row.isCustomRow) return null;
    if (col?.specimenIndex != null) {
      return row.specimenIndices?.[col.specimenIndex] ?? null;
    }
    return row.paramIdx;
  }

  getParamControlByIdx(idx: number | null): FormGroup | null {
    if (idx === null || idx === undefined || !this.parametersFormArray) return null;
    return (this.parametersFormArray.at(idx) as FormGroup) || null;
  }

  getEffectiveInputType(col: any, param: any): string {
    // ParameterMaster non-numeric types (Text / Boolean / Dropdown / Date / Qualitative)
    // must take precedence over a column's default numeric/decimal inputType (e.g. Location of Fracture = "W.G.L")
    if (param) {
      const pType = String(param.inputType || '').toLowerCase();
      if (pType === 'boolean') return 'boolean';
      if (pType === 'dropdown') return 'dropdown';
      if (pType === 'text' || String(param.parameterType || '').toLowerCase() === 'qualitative') return 'text';
      if (pType === 'date') return 'date';
    }
    if (col?.inputType) return String(col.inputType).toLowerCase();
    const pType = String(param?.inputType || 'Decimal').toLowerCase();
    if (pType === 'integer' || pType === 'number') return 'number';
    return 'decimal';
  }

  getStepForPrecision(precision: any): string {
    const p = Number(precision);
    if (isNaN(p) || p <= 0) return '1';
    return (1 / Math.pow(10, Math.min(6, p))).toString();
  }

  getDropdownOptionsForCell(col: any, param: any): { label: string; value: string }[] {
    if (col?.dropdownOptions && String(col.dropdownOptions).trim().length > 0) {
      return String(col.dropdownOptions)
        .split(',')
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0)
        .map((s: string) => ({ label: s, value: s }));
    }
    if (Array.isArray(param?.dropdownOptions) && param.dropdownOptions.length > 0) {
      return param.dropdownOptions.map((o: any) => ({
        label: o.displayText || o.value,
        value: o.value || o.displayText
      }));
    }
    return [];
  }

  formatUncertainty(param: any): string {
    if (!param) return '—';
    const u = param.expandedUncertainty;
    if (u === null || u === undefined || u === '') return '—';
    return `± ${u}`;
  }

  computeRowAggregate(row: any, agg: 'avg' | 'min' | 'max'): string {
    const indices: number[] = row?.specimenIndices || [];
    if (indices.length === 0 || !this.parametersFormArray) return '—';
    const nums: number[] = [];
    indices.forEach((idx) => {
      const raw = this.parametersFormArray.at(idx)?.get('value')?.value;
      const n = parseFloat(raw);
      if (!isNaN(n)) nums.push(n);
    });
    if (nums.length === 0) return '—';
    let res = 0;
    if (agg === 'avg') res = nums.reduce((a, b) => a + b, 0) / nums.length;
    else if (agg === 'min') res = Math.min(...nums);
    else res = Math.max(...nums);
    const prec = this.parametersFormArray.at(indices[0])?.value?.decimalPrecision ?? 2;
    return res.toFixed(Math.min(4, Math.max(0, Number(prec) || 2)));
  }

  getCustomCellValue(sectionKey: string, rowKey: string, colKey: string): any {
    const sKey = sectionKey || 'param_section';
    return this.customCellValues?.[sKey]?.[rowKey]?.[colKey] ?? '';
  }

  setCustomCellValue(sectionKey: string, rowKey: string, colKey: string, value: any): void {
    const sKey = sectionKey || 'param_section';
    if (!this.customCellValues[sKey]) this.customCellValues[sKey] = {};
    if (!this.customCellValues[sKey][rowKey]) this.customCellValues[sKey][rowKey] = {};
    this.customCellValues[sKey][rowKey][colKey] = value;
  }

  onDynamicParamValueChange(paramIdx: number, newVal: any): void {
    const ctrl = this.getParamControlByIdx(paramIdx);
    if (!ctrl) return;
    // Guard: never allow manual mutation of formula-driven parameter
    if (this.isParameterCalculated(ctrl.value)) return;
    ctrl.get('value')?.setValue(newVal);
    this.onParameterInputChange(paramIdx);
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

  getRuleEvaluationRows(s: any): {
    rowKey: string;
    label: string;
    unit: string;
    requirement: string;
    observed: string;
    uncertainty: string;
    verdict: 'Pass' | 'Fail' | 'Pending';
  }[] {
    const controls = this.parametersFormArray?.controls || [];
    const total = controls.length;
    const baseCount = Math.min(this.getBaseParameterCount() || total, total);
    const mode = s?.config?.sectionDataMode === 'template' ? 'template' : 'runtime';

    const buildRowFromBaseIdx = (baseIdx: number, fallbackLabel?: string, fallbackReq?: string, rowKey?: string) => {
      const ctrlVal = controls[baseIdx]?.value;
      const specVals: string[] = [];
      let hasFail = false;
      let hasPass = false;
      if (baseCount > 0) {
        for (let i = baseIdx; i < total; i += baseCount) {
          const v = controls[i]?.get('value')?.value;
          const st = String(controls[i]?.get('resultStatus')?.value || '').toLowerCase();
          if (v !== null && v !== undefined && v !== '') specVals.push(String(v));
          if (st === 'fail') hasFail = true;
          else if (st === 'pass' || st === 'satisfactory') hasPass = true;
        }
      }
      return {
        rowKey: rowKey || `rule_param_${baseIdx}`,
        label: fallbackLabel || ctrlVal?.parameterName || `Parameter ${baseIdx + 1}`,
        unit: ctrlVal?.unit || '',
        requirement: this.formatRequirement(ctrlVal) !== '—' ? this.formatRequirement(ctrlVal) : (fallbackReq || '—'),
        observed: specVals.length > 0 ? specVals.join(' / ') : '—',
        uncertainty: this.formatUncertainty(ctrlVal),
        verdict: (hasFail ? 'Fail' : (hasPass ? 'Pass' : 'Pending')) as 'Pass' | 'Fail' | 'Pending'
      };
    };

    if (mode === 'template') {
      const tplRows = this.getGenericTableRows(s);
      return tplRows.map((tr: any, idx: number) => {
        let matchIdx = -1;
        const dbId = tr.raw?.dbMasterId;
        if (dbId != null && dbId !== '') {
          for (let i = 0; i < baseCount; i++) {
            if (Number(controls[i]?.value?.parameterID) === Number(dbId)) { matchIdx = i; break; }
          }
        }
        if (matchIdx < 0) {
          const lbl = String(tr.raw?.dbMasterName || tr.label || '').trim().toLowerCase();
          for (let i = 0; i < baseCount; i++) {
            if (String(controls[i]?.value?.parameterName || '').trim().toLowerCase() === lbl) { matchIdx = i; break; }
          }
        }
        if (matchIdx >= 0) {
          return buildRowFromBaseIdx(matchIdx, tr.label, tr.requirement, tr.rowKey);
        }
        return {
          rowKey: tr.rowKey || `rule_tpl_${idx}`,
          label: tr.label,
          unit: tr.unit || '',
          requirement: tr.requirement || '—',
          observed: '—',
          uncertainty: '—',
          verdict: 'Pending' as const
        };
      });
    }

    // Runtime Auto-Load: prefer parameters with specification requirements; fall back to all base parameters
    const withSpec: number[] = [];
    const allBase: number[] = [];
    for (let i = 0; i < baseCount; i++) {
      allBase.push(i);
      const val = controls[i]?.value;
      if (val && (val.specMinValue != null || val.specMaxValue != null || val.minValue != null || val.maxValue != null || (val.acceptanceCriteria && String(val.acceptanceCriteria).trim()))) {
        withSpec.push(i);
      }
    }
    const targetIndices = withSpec.length > 0 ? withSpec : allBase;
    return targetIndices.map(idx => buildRowFromBaseIdx(idx));
  }

  // =========================================================================
  // Live Decision Rule Conformity Evaluator (strictly from DB parameters)
  // =========================================================================
  getDecisionRuleVerdict(): { label: string; badgeClass: string; icon: string; detail: string } {
    const controls = this.parametersFormArray?.controls || [];
    let evaluated = 0;
    let passed = 0;
    let failed = 0;
    for (const c of controls) {
      const st = String(c.get('resultStatus')?.value || '').toLowerCase();
      if (st === 'fail') {
        failed++;
        evaluated++;
      } else if (st === 'pass' || st === 'satisfactory') {
        passed++;
        evaluated++;
      }
    }
    if (failed > 0) {
      return {
        label: 'NON-CONFORMING (FAIL)',
        badgeClass: 'bg-danger text-white',
        icon: 'bi-x-circle',
        detail: `${failed} of ${evaluated} evaluated parameter(s) failed acceptance criteria`
      };
    }
    if (evaluated > 0 && passed === evaluated) {
      return {
        label: 'CONFORMING (PASS)',
        badgeClass: 'bg-success text-white',
        icon: 'bi-check-circle',
        detail: `${passed} evaluated parameter(s) satisfy acceptance criteria`
      };
    }
    return {
      label: 'PENDING EVALUATION',
      badgeClass: 'bg-secondary-subtle text-secondary border',
      icon: 'bi-hourglass-split',
      detail: 'Enter observed results to evaluate conformity against specification limits'
    };
  }

  // =========================================================================
  // Chart Helper (Dynamic Stress-Strain Curve Data — Strictly from DB/Entered Values)
  // =========================================================================
  getStressStrainChartData(): {
    hasData: boolean;
    curvePath: string;
    rp: number | null;
    rm: number | null;
    el: number | null;
    ra: number | null;
    yieldPt: { x: number; y: number };
    peakPt: { x: number; y: number };
    rupturePt: { x: number; y: number };
  } {
    const rp = this.specimenAverages.proofStress ?? null;
    const rm = this.specimenAverages.uts ?? null;
    const el = this.specimenAverages.elongation ?? null;
    const ra = this.specimenAverages.reductionOfArea ?? null;
    const hasData = rp != null || rm != null || el != null || ra != null;

    const rpPlot = rp ?? 0;
    const rmPlot = rm ?? rpPlot;
    const elPlot = el ?? 0;

    // ViewBox: 0 0 760 210
    const x0 = 65; const y0 = 175;
    const xYield = 135;
    const yYield = Math.max(25, Math.round(175 - (Math.min(600, rpPlot) / 600) * 150));

    const xPeak = Math.min(670, Math.round(65 + (16.5 / 35) * 655));
    const yPeak = Math.max(20, Math.round(175 - (Math.min(600, rmPlot) / 600) * 150));

    const xRupture = Math.min(725, Math.round(65 + (Math.min(35, elPlot) / 35) * 655));
    const yRupture = Math.min(170, yPeak + 32);

    const curvePath = hasData
      ? `M ${x0},${y0} L 100,${Math.round((y0 + yYield) / 2)} Q 120,${yYield + 10} ${xYield},${yYield} Q 220,${yPeak + 25} ${xPeak},${yPeak} Q ${Math.round((xPeak + xRupture) / 2)},${yPeak + 12} ${xRupture},${yRupture}`
      : '';

    return {
      hasData,
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
      return '';
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
  addTraversePoint(s?: any): void {
    if (this.isViewMode || this.isLocked) return;
    const stepRaw = parseFloat(String(s?.config?.stepValue || ''));
    const step = (!isNaN(stepRaw) && stepRaw > 0) ? stepRaw : 0.2;
    const lastDist = this.traversePoints.length > 0 ? this.traversePoints[this.traversePoints.length - 1].distance : 0.0;
    const nextDist = Number((lastDist + step).toFixed(3));
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
      status: 'Pass'
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
      customCellValues: this.customCellValues,
      opinionData: this.opinionData
    };
    return JSON.stringify(extra);
  }
}

