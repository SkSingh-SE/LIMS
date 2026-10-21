import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DecimalOnlyDirective } from '../../../utility/directives/decimal-only.directive';
import { TestStatusBadgeComponent } from '../test-status-badge/test-status-badge.component';
import { formatFormulaDisplay } from '../../../utility/helper/formula.helper';
import { SearchableDropdownComponent } from '../../../utility/components/searchable-dropdown/searchable-dropdown.component';
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
  acceptanceStatus: 'Pass' | 'Fail' | 'Inconclusive' | 'Conditional';
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
  checklistItems: ChecklistItem[] = [
    { id: 1, label: 'Specimen surface free from defects / machining marks', status: 'Pass' },
    { id: 2, label: 'Physical dimensions verified within tolerance', status: 'Pass' },
    { id: 3, label: 'Testing equipment calibration is valid', status: 'Pass' },
    { id: 4, label: 'Standard testing SOP followed strictly', status: 'Pass' }
  ];

  // Custom condition values
  conditionValues: Record<string, any> = {};

  // Hybrid Relational Collections & Extra state
  locations: LocationData[] = [];
  observations: ObservationData[] = [];
  decisionRule: DecisionRuleData = {
    ruleType: 'Simple Acceptance',
    confidenceLevel: 95,
    guardBandMultiplier: 1.0,
    acceptanceStatus: 'Pass',
    statementText: 'Statements of conformity are based on simple acceptance with no guard-banding applied (w = 0).'
  };
  classification: ClassificationData = {
    classificationStandard: 'ASTM E45',
    ratingType: 'Inclusion Rating',
    selectedCategory: 'Type A (Sulfides)',
    severity: 'Thin 1.0 / Heavy 0.5',
    remarks: ''
  };
  customAttributes: CustomAttribute[] = [
    { key: 'Machine Serial', value: 'UTM-500KN-02' },
    { key: 'Calibration Due', value: '2027-03-31' }
  ];

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
    attrs: 'Custom Attributes'
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

    // Initialize Observations
    this.initObservations();

    // Initialize Execution Extra
    this.initExecutionExtra();
  }

  private initLocations(): void {
    if (this.test?.locations && Array.isArray(this.test.locations) && this.test.locations.length > 0) {
      this.locations = this.test.locations.map((loc: any, idx: number) => ({
        id: loc.id,
        locationCode: loc.locationCode || `LOC${idx + 1}`,
        locationName: loc.locationName || `Zone ${idx + 1}`,
        displayOrder: loc.displayOrder || (idx + 1),
        isReportable: loc.isReportable !== false,
        remarks: loc.remarks || ''
      }));
    } else if (this.locations.length === 0) {
      this.locations = [
        { locationCode: 'SURF', locationName: 'Surface Zone', displayOrder: 1, isReportable: true, remarks: '0-2mm depth' },
        { locationCode: 'CORE', locationName: 'Core / Mid-Radius', displayOrder: 2, isReportable: true, remarks: 'Center axis' }
      ];
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
      const defaultCount = parseInt(s.config?.count || s.config?.readingCount || '5', 10) || 5;
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
      conditionValues: this.conditionValues
    };
    return JSON.stringify(extra);
  }
}

