import { Component, OnInit, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { ToastService } from '../../../services/toast.service';
import { LaboratoryTestService } from '../../../services/laboratory-test.service';
import { TestMethodSpecificationService } from '../../../services/test-method-specification.service';
import { ParameterService } from '../../../services/parameter.service';
import { SearchableDropdownComponent } from '../../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { CustomSelectComponent } from '../../../utility/components/custom-select/custom-select.component';
import { TestLayoutService, TestLayoutTemplateDto } from '../../../services/test-layout.service';
import { formatFormulaDisplay } from '../../../utility/helper/formula.helper';

export interface HeaderMergeConfig {
  title?: string;
  startCol?: string;
  colspan?: number;
  showSubLabels?: boolean;
  isMerged?: boolean;
}

export interface SectionColumnsConfig {
  unit?: boolean;
  requirement?: boolean;
  result?: boolean;
  status?: boolean;
  method?: boolean;
  remarks?: boolean;
  uncertainty?: boolean;
  dl?: boolean;
  scope?: boolean;
  mergedHeader?: string;
  mergedStartCol?: string;
  mergedColspan?: number;
  showSubLabels?: boolean;
  isMerged?: boolean;
}

export interface DatasetParameter {
  id?: number;
  name: string;
  symbol: string;
  unit: string;
  requirement: string;
  demoValue: string;
  type: 'numeric' | 'text' | 'rating';
  isCalculated?: boolean;
  formula?: string;
  formulaDisplay?: string;
}

export interface DatasetCondition {
  field: string;
  label: string;
  unit?: string;
  demoValue: string;
  selected?: boolean;
  isCustom?: boolean;
}

export interface DatasetDimension {
  field: string;
  label: string;
  unit: string;
  demoValue: string;
  selected?: boolean;
  isCustom?: boolean;
}

export interface DatasetCalculation {
  id?: number;
  field: string;
  label: string;
  formula: string;
  unit?: string;
  targetParam?: string;
  isCalculated?: boolean;
  isFromDb?: boolean;
}

export interface TestDatasetPool {
  testKey: string;
  testName: string;
  parameters: DatasetParameter[];
  conditions: DatasetCondition[];
  dimensions: DatasetDimension[];
  calculations: DatasetCalculation[];
}

export interface SectionConfig {
  sectionKey?: string;
  width?: string;
  visibility?: string;
  enabled?: boolean;
  runtimeAdjust?: boolean;
  showUnit?: boolean;
  showLabels?: boolean;
  highlightStatus?: boolean;
  keepHeader?: boolean;
  reportable?: boolean;
  printCertificate?: boolean;
  showRaw?: boolean;
  reportProjection?: string;
  pageBreak?: string;
  density?: string;
  alignment?: string;
  reportLabel?: string;

  // Parameter
  dataSource?: string;
  parameterMode?: string;
  resultMode?: string;
  requirement?: string;
  status?: string;
  decimals?: string;
  subset?: string[];
  columns?: SectionColumnsConfig;
  headerMerge?: HeaderMergeConfig;

  // Specimen
  specimenSource?: string;
  countMode?: string;
  count?: number;
  prefix?: string;
  orientation?: string;
  showAverage?: boolean;
  showMinMax?: boolean;
  showRequirement?: boolean;
  editable?: boolean;
  showIdentity?: boolean;
  ident?: string[];
  specimenColumns?: string[];
  dimensionSubset?: string[];
  specimenRows?: string[];
  specimenNames?: string;
  specimenColHeader?: string;

  // Reading
  readingSource?: string;
  readingCount?: string;
  aggregation?: string;
  showIndividual?: boolean;
  showStatistics?: boolean;
  readingLabel?: string;
  targetParameter?: string;
  unit?: string;

  // Location
  locationSource?: string;
  locationMode?: string;
  locationNames?: string;
  locationRows?: string[];
  locationColHeader?: string;
  allowRuntimeAdd?: boolean;

  // Condition & Traceability
  fields?: string[];
  extraFields?: string;
  layout?: string;
  source?: string;
  allowRuntimeEdit?: boolean;
  showMissing?: string;

  // Rule
  parameter?: string;
  operator?: string;
  valueSource?: string;
  evaluation?: string;
  failAction?: string;
  decisionRule?: string;
  conformity?: boolean;
  showRule?: boolean;

  // Traverse
  xField?: string;
  yField?: string;
  xUnit?: string;
  yUnit?: string;
  stepMode?: string;
  stepValue?: string;
  cutoffMode?: string;
  cutoffHardness?: number | string;
  showTable?: boolean;
  showCurve?: boolean;

  // Chart
  chartType?: string;
  xSource?: string;
  ySource?: string;
  xLabel?: string;
  yLabel?: string;
  showPoints?: boolean;
  showLegend?: boolean;
  showGrid?: boolean;
  showLimit?: boolean;
  xMin?: string;
  xMax?: string;
  yMin?: string;
  yMax?: string;

  // Classification
  ratingSystem?: string;
  observedSource?: string;
  decision?: string;
  showCriteria?: boolean;

  // Custom
  rows?: string;
  allowRuntimeRows?: boolean;
  showHeader?: boolean;

  // Photo
  caption?: string;
  showMagnification?: boolean;
  showDateTime?: boolean;
  showScale?: boolean;
  showSpecimenId?: boolean;
  showLocation?: boolean;
  showEtchant?: boolean;

  // Formula
  formulaSource?: string;
  inputs?: string;
  resultLabel?: string;
  precision?: string;
  showFormula?: boolean;
  showInputs?: boolean;
  rounding?: string;
  showMU?: boolean;
  targetOutput?: string;
  inputFields?: string[];
  formulaExpression?: string;

  // Narrative
  inputType?: string;
  label?: string;
  maxLength?: string;
  required?: boolean;
  category?: string;

  // Checklist
  items?: string;
  responseType?: string;
  requireAll?: boolean;

  // Report tab extras
  showMUReport?: boolean;
  showConformity?: boolean;
  showScopeMark?: boolean;
  showEquipment?: boolean;

  // Corner Technical Annotations
  topLeft?: string;
  topRight?: string;
  bottomLeft?: string;
  bottomRight?: string;

  // Universal Data Binding & Row/Column Configuration
  dataBindingMode?: DataBindingMode;
  tableColumns?: LayoutColumnItem[];
  tableRows?: LayoutRowItem[];
  activeBindingTab?: 'rows' | 'columns' | 'merge';

  // Custom Columns & Rows Structure
  customColumns?: Array<{ label: string; type: string; unit?: string; default?: string }>;
  customRows?: string[];
}

export type DataBindingMode = 'runtime' | 'static' | 'manual';

export interface LayoutColumnItem {
  id?: string;
  key: string;
  label: string;
  bindingMode: DataBindingMode;
  staticValue?: string;
  width?: string;
  visible: boolean;
  align?: 'left' | 'center' | 'right';
  removable?: boolean;
}

export interface LayoutRowItem {
  id?: string;
  key: string;
  label: string;
  bindingMode: DataBindingMode;
  staticValue?: string;
  requirement?: string;
  unit?: string;
  visible: boolean;
  isCalculated?: boolean;
  formula?: string;
  values?: { [colKey: string]: string };
  removable?: boolean;
}

export interface ExecutionSection {
  id: number;
  type: string;
  title: string;
  config: SectionConfig;
  rt?: number; // runtime specimen/reading count override for preview
}

export interface TestParam {
  id?: number;
  name: string;
  unit: string;
  requirement: string;
  isCalculated?: boolean;
  formula?: string;
  formulaDisplay?: string;
}

export interface TestDef {
  key: string;
  label: string;
  leaf: string;
  sub: string;
  params: TestParam[];
  demo: string[];
  dbTestId?: number;
  isChemical?: boolean;
  subGroupId?: number;
  analysisTypeId?: number;
}

@Component({
  selector: 'app-test-layout-archetype-designer',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, SearchableDropdownComponent, CustomSelectComponent],
  templateUrl: './test-layout-archetype-designer.component.html',
  styleUrls: ['./test-layout-archetype-designer.component.css']
})
export class TestLayoutArchetypeDesignerComponent implements OnInit {
  private toastService = inject(ToastService);
  private labService = inject(LaboratoryTestService);
  private testLayoutService = inject(TestLayoutService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  /** Standard options for row/column data binding selection (CustomSelectComponent) */
  readonly bindingModeSelectOptions = [
    {
      value: 'runtime',
      label: 'Runtime',
      shortLabel: 'Run',
      icon: 'bi-lightning-charge-fill text-theme',
      triggerClass: 'binding-pill-runtime',
    },
    {
      value: 'static',
      label: 'Static',
      shortLabel: 'Static',
      icon: 'bi-pin-angle-fill text-warning-emphasis',
      triggerClass: 'binding-pill-static',
    },
    {
      value: 'manual',
      label: 'Manual',
      shortLabel: 'Manual',
      icon: 'bi-pencil-square text-success',
      triggerClass: 'binding-pill-manual',
    },
  ];

  /** Standard dropdown option definitions for studio CustomSelectComponent instances */
  readonly selectOptions = {
    width: [
      { value: 'Full Width', label: 'Full Width' },
      { value: 'Half Width', label: 'Half Width' },
      { value: 'Auto', label: 'Auto' },
    ],
    visibility: [
      { value: 'Always', label: 'Always' },
      { value: 'Only when data exists', label: 'Only when data exists' },
      { value: 'Only when PASS', label: 'Only when PASS' },
      { value: 'Only when FAIL', label: 'Only when FAIL' },
    ],
    parameterMode: [
      { value: 'All runtime parameters', label: 'All runtime parameters' },
      { value: 'Configured parameter subset', label: 'Configured parameter subset' },
      { value: 'Runtime parameters by leaf node', label: 'Runtime parameters by leaf node' },
    ],
    resultMode: [
      { value: 'Observed Result', label: 'Observed Result' },
      { value: 'Observed + Calculated Result', label: 'Observed + Calculated Result' },
      { value: 'Calculated Result only', label: 'Calculated Result only' },
    ],
    requirement: [
      { value: 'Runtime Requirement', label: 'Runtime Requirement' },
      { value: 'Hide Requirement', label: 'Hide Requirement' },
      { value: 'Show only when available', label: 'Show only when available' },
    ],
    orientation: [
      { value: 'Parameters × Specimens', label: 'Parameters × Specimens' },
      { value: 'Specimens × Parameters', label: 'Specimens × Parameters' },
    ],
    specimenSource: [
      { value: 'Execution Specimens', label: 'Execution Specimens' },
      { value: 'Runtime specimen list', label: 'Runtime specimen list' },
      { value: 'Sample preparation specimens', label: 'Sample preparation specimens' },
    ],
    layout: [
      { value: 'Compact cards', label: 'Compact cards' },
      { value: 'Two-column cards', label: 'Two-column cards' },
      { value: 'Table', label: 'Table' },
    ],
    aggregation: [
      { value: 'Average', label: 'Average' },
      { value: 'Minimum', label: 'Minimum' },
      { value: 'Maximum', label: 'Maximum' },
      { value: 'Median', label: 'Median' },
      { value: 'Standard Deviation', label: 'Standard Deviation' },
    ],
    chartType: [
      { value: 'line', label: 'Line Chart' },
      { value: 'scatter', label: 'Scatter Plot' },
      { value: 'bar', label: 'Bar Chart' },
    ],
    operator: [
      { value: '≥', label: '≥ (Greater than or equal)' },
      { value: '≤', label: '≤ (Less than or equal)' },
      { value: '=', label: '= (Equal)' },
      { value: 'Within Range', label: 'Within Range' },
    ],
    decisionRule: [
      { value: 'Simple acceptance (no guard band)', label: 'Simple acceptance (no guard band)' },
      { value: 'Guard band (uncertainty considered)', label: 'Guard band (uncertainty considered)' },
      { value: 'Customer specified rule', label: 'Customer specified rule' },
    ],
    inputType: [
      { value: 'Multi-line', label: 'Multi-line' },
      { value: 'Single line', label: 'Single line' },
    ],
    responseType: [
      { value: 'Pass / Fail / NA', label: 'Pass / Fail / NA' },
      { value: 'Yes / No', label: 'Yes / No' },
    ],
    checklistResponse: [
      { value: 'PASS', label: 'Pass / Acceptable' },
      { value: 'FAIL', label: 'Fail / Non-Conforming' },
      { value: 'NA', label: 'Not Applicable' },
    ],
  };

  /** Dynamic options for dataset parameters */
  get datasetParameterSelectOptions(): Array<{ value: string; label: string }> {
    return (this.currentDataset?.parameters || []).map(p => ({
      value: p.name,
      label: `${p.name}${p.unit ? ' (' + p.unit + ')' : ''}`,
    }));
  }

  /** Dynamic options for traverse X-axis */
  get traverseXSelectOptions(): Array<{ value: string; label: string }> {
    const dimOptions = (this.currentDataset?.dimensions || []).map(d => ({
      value: d.label,
      label: `${d.label} (${d.unit})`,
    }));
    return [
      ...dimOptions,
      { value: 'Depth from Surface', label: 'Depth from Surface (mm)' },
      { value: 'Distance from Centerline', label: 'Distance from Centerline (mm)' },
      { value: 'Exposure Time', label: 'Exposure Time (Hours)' },
    ];
  }

  /** Dynamic options for chart X-axis */
  get chartXSelectOptions(): Array<{ value: string; label: string }> {
    const dims = (this.currentDataset?.dimensions || []).map(d => ({
      value: d.label,
      label: `[Dim] ${d.label} (${d.unit})`,
    }));
    const params = (this.currentDataset?.parameters || []).map(p => ({
      value: p.name,
      label: `[Param] ${p.name} (${p.unit})`,
    }));
    return [...dims, ...params];
  }

  /** Dynamic options for formula target output parameter */
  get formulaTargetSelectOptions(): Array<{ value: string; label: string }> {
    const calcs = (this.currentDataset?.calculations || []).map(c => ({
      value: c.targetParam || c.field,
      label: `${c.label} (${c.formula})`,
    }));
    const params = (this.currentDataset?.parameters || []).map(p => ({
      value: p.name,
      label: `${p.name} (${p.unit})`,
    }));
    return [...calcs, ...params];
  }


  // Layout View Mode & Source Tracking
  isViewMode: boolean = false;
  isGlobalDefault: boolean = false;
  loadedSource: 'db' | 'preset' = 'preset';
  additionalMappedTestIds: number[] = [];
  additionalMappedLeafKeys: string[] = [];
  availableAllTests: any[] = [];
  showMultiTestModal: boolean = false;
  multiTestSearchTerm: string = '';

  // Database Layout State
  currentLayoutId: number | null = null;
  layoutCode: string = '';
  layoutStatus: string = 'Published';
  isDefaultLayout: boolean = true;
  currentVersion: number = 1;

  // Actual Laboratory Test (Unified Searchable Selection from Database)
  selectedUnifiedTestId: number | string | null = null;
  selectedUnifiedTestItem: any = null;
  selectedLabTestId: number = 0;
  actualLabTests: Array<{
    id: number;
    name: string;
    isChemicalTest?: boolean;
    code?: string;
    department?: string;
  }> = [];
  subGroups: Array<{ id: number; name: string }> = [];
  selectedSubGroupId: number | null = null;
  analysisTypes: Array<{ id: number; name: string }> = [];
  selectedAnalysisTypeId: number | null = null;

  // Resolved Hierarchy details (Leaf, SubGroup & Group Test)
  resolvedHierarchy: {
    groupId: number | null;
    groupName: string;
    subGroupId: number | null;
    subGroupName: string;
    analysisTypeId: number | null;
    leafName: string;
    fullDisplayName: string;
    isChemical: boolean;
  } = {
    groupId: null,
    groupName: 'All Tests (Global)',
    subGroupId: null,
    subGroupName: '',
    analysisTypeId: null,
    leafName: 'Global Runtime Standard',
    fullDisplayName: 'Global Standard Runtime Format',
    isChemical: false
  };

  private testMethodSpecService = inject(TestMethodSpecificationService);
  private parameterService = inject(ParameterService);

  fetchMasterParameterDropdown = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.parameterService.getParameterDropdown(term, page, pageSize);
  };

  // Dual-Key Test Mapping (Key 1: Laboratory Test, Key 2: Test Method Specification)
  selectedTestMethodId: number | null = null;
  selectedTestMethodName: string = '';

  // JSON Export & Inspection Modal
  showExportJsonModal: boolean = false;
  exportedJsonContent: string = '';

  fetchUnifiedLabTestFn = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.labService.getUnifiedTestMethodDropdown(term, page, pageSize);
  };

  fetchTestMethodSpecFn = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.testMethodSpecService.getTestMethodSpecificationDropdown(term, page, pageSize);
  };

  onTestMethodSpecSelected(item: any): void {
    if (!item) {
      this.selectedTestMethodId = null;
      this.selectedTestMethodName = '';
    } else {
      this.selectedTestMethodId = Number(item.id || item.ID);
      this.selectedTestMethodName = item.name || item.TestStandard || item.testStandard || '';
    }
    // Refresh 3-tier cascade resolution with Test Method included
    this.loadDatabaseLayoutForHierarchy(
      this.selectedLabTestId,
      this.selectedSubGroupId,
      this.selectedAnalysisTypeId,
      this.leafNode,
      this.selectedArchetypeKey
    );
  }

  openExportJsonModal(): void {
    this.exportedJsonContent = this.getJsonPayloadPreview();
    this.showExportJsonModal = true;
  }

  closeExportJsonModal(): void {
    this.showExportJsonModal = false;
  }

  copyExportJsonContent(): void {
    if (this.exportedJsonContent) {
      navigator.clipboard.writeText(this.exportedJsonContent);
      this.toastService.show('Format JSON copied to clipboard', 'success');
    }
  }

  // Layout Structure Archetype (Center Canvas Top Bar Selection)
  selectedArchetypeKey: string = 'generic';
  selectedTestKey: string = 'generic';
  selectedPresetToLoad: string = '';
  leafNode: string = 'Global / All Tests';
  paperSub: string = 'Standard Test Execution Format';
  layoutName: string = 'Global Standard Test Execution Layout';
  layoutRev: string = '1.0';
  applyToLeaf: boolean = true;
  isMapped: boolean = false;
  demoMode: boolean = false;
  zoomLevel: number = 1;
  activeConfigTab: 'basic' | 'data_binding' | 'field_structure' | 'entry_rules' = 'basic';

  // Data Source Pool Management & Custom Additions
  readonly STORAGE_KEY_CUSTOM_CONDITIONS = 'lims_designer_custom_conditions';
  readonly STORAGE_KEY_CUSTOM_DIMENSIONS = 'lims_designer_custom_dimensions';
  readonly STORAGE_KEY_DESELECTED_CONDITIONS = 'lims_designer_deselected_conditions';
  readonly STORAGE_KEY_DESELECTED_DIMENSIONS = 'lims_designer_deselected_dimensions';

  customConditionsMap: Record<string, DatasetCondition[]> = {};
  customDimensionsMap: Record<string, DatasetDimension[]> = {};
  deselectedConditionsMap: Record<string, string[]> = {};
  deselectedDimensionsMap: Record<string, string[]> = {};

  showAddConditionForm: boolean = false;
  newConditionInput: { label: string; unit: string; demoValue: string } = { label: '', unit: '', demoValue: '' };

  showAddDimensionForm: boolean = false;
  newDimensionInput: { label: string; unit: string; demoValue: string } = { label: '', unit: 'mm', demoValue: '10.0' };

  dataSourceViewMode: 'relevant' | 'all' = 'relevant';

  // Layout Structure Archetypes (Structural Recipes to map to Actual Laboratory Tests)
  readonly layoutArchetypeList = [
    { key: 'generic', label: 'Default Generic Runtime Structure (Conditions + Runtime Parameters + Statement)', icon: '▦' },
    { key: 'blank', label: 'Blank Canvas (Empty Layout - Build from Scratch)', icon: '◻' },
    { key: 'tensile', label: 'Tensile Structure (Specimen Matrix + Stress-Strain Curve)', icon: '▦' },
    { key: 'rockwell', label: 'Multi-Reading Indentation Structure (5-Spot Readings + Statistics)', icon: '◫' },
    { key: 'impact', label: 'Charpy Impact Structure (Multi-Notch Readings + Limit Rule)', icon: '▤' },
    { key: 'izod', label: 'Izod Impact Structure (Multi-Specimen Matrix + Break Type)', icon: '▤' },
    { key: 'micro_vickers', label: 'Micro Vickers Structure (d1/d2 Diagonals + Micrograph)', icon: '◫' },
    { key: 'hardness_multiloc', label: 'Hardness Multi-Location Survey (BM / HAZ / WM Zones)', icon: '⌖' },
    { key: 'case_depth_hardness', label: 'Effective Case Depth Structure (Depth Traverse & Curve)', icon: '↗' },
    { key: 'case_depth_micro', label: 'Case Depth Microscopic Structure (Compound Layer + Micrograph)', icon: '↗' },
    { key: 'oes', label: 'Spectro OES Composition Structure (%wt Elements + Carbon Eq)', icon: '▦' },
    { key: 'metallography', label: 'Microstructure Structure (Matrix Phase Rating + Photo Plate)', icon: '▧' },
    { key: 'grain_size', label: 'Grain Size Analysis Structure (Field Readings + ASTM Chart)', icon: '◫' },
    { key: 'ferrite_content', label: 'Ferrite Phase Analysis Structure (5-Field Matrix + 95% CI)', icon: '◫' },
    { key: 'macro_weld', label: 'Macroscopic Weld Examination (Dimensions + Defect Checklist)', icon: '▧' },
    { key: 'corrosion_sst', label: 'Salt Spray Corrosion Structure (Periodic Inspection Intervals)', icon: '↗' }
  ];

  // Left Panel Dynamic Resizing & Responsive State
  leftPanelWidth: number = 270;
  leftPanelCollapsed: boolean = false;
  isResizingLeft: boolean = false;
  private startX: number = 0;
  private startWidth: number = 270;
  private readonly STORAGE_KEY_LEFT_WIDTH = 'lims_studio_left_panel_width';
  private readonly STORAGE_KEY_LEFT_COLLAPSED = 'lims_studio_left_panel_collapsed';

  // Right Panel Dynamic Resizing & Responsive State
  rightPanelWidth: number = 380;
  rightPanelCollapsed: boolean = false;
  isResizingRight: boolean = false;
  private startRightX: number = 0;
  private startRightWidth: number = 380;
  private readonly STORAGE_KEY_RIGHT_WIDTH = 'lims_studio_right_panel_width';
  private readonly STORAGE_KEY_RIGHT_COLLAPSED = 'lims_studio_right_panel_collapsed';

  // Section Selection
  selectedSectionId: number | null = null;
  sections: ExecutionSection[] = [];

  // Modals state
  previewModalOpen: boolean = false;
  payloadPreviewModalOpen: boolean = false;

  // Component Name Dictionary
  readonly componentNames: Record<string, string> = {
    parameter: 'Parameter Table',
    specimen: 'Multi Specimen',
    reading: 'Multi Reading',
    location: 'Location / Zone',
    condition: 'Condition / Environment',
    rule: 'Parameter Rule',
    traverse: 'Traverse / Sequence',
    chart: 'Curve / Chart',
    classification: 'Rating / Classification',
    custom: 'Custom Table',
    photo: 'Photo / Attachment',
    formula: 'Formula / Derived',
    narrative: 'Narrative / Statement',
    checklist: 'Checklist',
    traceability: 'Traceability / Technical Record'
  };

  readonly componentIcons: Record<string, string> = {
    parameter: '▦',
    specimen: '▤',
    reading: '◫',
    location: '⌖',
    condition: '◌',
    rule: '✓',
    traverse: '↗',
    chart: '⌁',
    classification: '▥',
    custom: '⊞',
    photo: '▧',
    formula: 'ƒx',
    narrative: '¶',
    checklist: '☑',
    traceability: '🧾'
  };

  // Master Test Database (All Report Format Presets)
  testDatabase: Record<string, TestDef> = {
    generic: {
      key: 'generic',
      label: 'Standard Execution Format',
      leaf: 'Global / Standard / Runtime',
      sub: 'Generic Test Execution Standard',
      dbTestId: 0,
      isChemical: false,
      params: [
        { name: 'Yield Strength', unit: 'MPa', requirement: '≥ 250', isCalculated: true, formulaDisplay: 'YS = Yield Load / S0' },
        { name: 'Ultimate Tensile Strength', unit: 'MPa', requirement: '≥ 410', isCalculated: true, formulaDisplay: 'UTS = Peak Load / S0' },
        { name: 'Elongation', unit: '%', requirement: '≥ 20', isCalculated: true, formulaDisplay: 'EL% = ((Lu - L0) / L0) * 100' },
        { name: 'Reduction of Area', unit: '%', requirement: '≥ 40', isCalculated: true, formulaDisplay: 'RA% = ((S0 - Su) / S0) * 100' },
        { name: 'Hardness (HV / HRC)', unit: 'HRC', requirement: '28 - 34', isCalculated: false },
        { name: 'Runtime Parameter (Auto-bound)', unit: '—', requirement: 'Runtime Limit' }
      ],
      demo: ['450', '620', '25.5', '55.0', '32.0', '—']
    },
    blank: {
      key: 'blank',
      label: 'Blank Canvas',
      leaf: 'Custom / Scratch',
      sub: 'Blank Test Structure',
      dbTestId: 0,
      isChemical: false,
      params: [],
      demo: []
    },
    tensile: {
      key: 'tensile',
      label: 'Tensile Test',
      leaf: 'General / Strength / Tensile',
      sub: 'Tensile Test • ASTM E8 / IS 1608',
      dbTestId: 1,
      isChemical: false,
      params: [
        { name: 'Yield Strength', unit: 'MPa', requirement: '≥ 250', isCalculated: true, formula: 'YS = YieldLoad / Area_S0', formulaDisplay: 'YS = Yield Load / S0' },
        { name: 'Ultimate Tensile Strength', unit: 'MPa', requirement: '≥ 410', isCalculated: true, formula: 'UTS = PeakLoad / Area_S0', formulaDisplay: 'UTS = Peak Load / S0' },
        { name: 'Elongation', unit: '%', requirement: '≥ 20', isCalculated: true, formula: 'EL = ((Lu - L0) / L0) * 100', formulaDisplay: 'EL% = ((Lu - L0) / L0) * 100' },
        { name: 'Reduction of Area', unit: '%', requirement: 'Runtime', isCalculated: true, formula: 'RA = ((S0 - Su) / S0) * 100', formulaDisplay: 'RA% = ((S0 - Su) / S0) * 100' }
      ],
      demo: ['420', '535', '24.5', '61']
    },
    impact: {
      key: 'impact',
      label: 'Charpy Impact',
      leaf: 'General / Impact / Charpy',
      sub: 'Charpy Impact • ASTM E23 / IS 1757',
      dbTestId: 8,
      isChemical: false,
      params: [
        { name: 'Impact Energy', unit: 'J', requirement: '≥ 27' },
        { name: 'Lateral Expansion', unit: 'mm', requirement: '≥ 0.38' },
        { name: 'Shear Area', unit: '%', requirement: '≥ 50' }
      ],
      demo: ['42', '1.1', '78']
    },
    izod: {
      key: 'izod',
      label: 'Izod Impact Test',
      leaf: 'General / Impact / Izod',
      sub: 'Izod Impact • IS 1598 / ASTM D256',
      dbTestId: 9,
      isChemical: false,
      params: [
        { name: 'Absorbed Energy', unit: 'J', requirement: '≥ 20' },
        { name: 'Notch Impact Strength', unit: 'J/m', requirement: 'Runtime' }
      ],
      demo: ['35', '350']
    },
    rockwell: {
      key: 'rockwell',
      label: 'Rockwell Hardness',
      leaf: 'General / Hardness / Rockwell',
      sub: 'Rockwell Hardness • ASTM E18 / IS 1586',
      dbTestId: 7,
      isChemical: false,
      params: [
        { name: 'Hardness (HRC)', unit: 'HRC', requirement: '28 – 34' },
        { name: 'Equivalent Tensile', unit: 'MPa', requirement: 'Runtime' },
        { name: 'Equivalent Vickers', unit: 'HV', requirement: 'Runtime' }
      ],
      demo: ['31.5', '980', '310']
    },
    micro_vickers: {
      key: 'micro_vickers',
      label: 'Micro Vickers Hardness',
      leaf: 'General / Hardness / Micro-Vickers',
      sub: 'Micro Vickers • ASTM E384 / ISO 6507',
      dbTestId: 10,
      isChemical: false,
      params: [
        { name: 'Micro Hardness HV 0.5', unit: 'HV 0.5', requirement: '≥ 550' },
        { name: 'Indentation Diagonal d1', unit: 'µm', requirement: 'Runtime' },
        { name: 'Indentation Diagonal d2', unit: 'µm', requirement: 'Runtime' }
      ],
      demo: ['580', '39.8', '40.2']
    },
    hardness_multiloc: {
      key: 'hardness_multiloc',
      label: 'Hardness Multi-Location (Weld Survey)',
      leaf: 'General / Hardness / Weld-Survey',
      sub: 'Hardness Survey • ISO 9015 / ASTM E92',
      dbTestId: 11,
      isChemical: false,
      params: [
        { name: 'Base Metal Hardness', unit: 'HV 10', requirement: '≤ 250' },
        { name: 'HAZ Hardness', unit: 'HV 10', requirement: '≤ 250' },
        { name: 'Weld Metal Hardness', unit: 'HV 10', requirement: '≤ 250' }
      ],
      demo: ['215', '238', '245']
    },
    case_depth_hardness: {
      key: 'case_depth_hardness',
      label: 'Effective Case Depth (Hardness)',
      leaf: 'General / Case-Depth / Micro-Hardness',
      sub: 'Effective Case Depth • IS 6416 / ISO 2639',
      dbTestId: 12,
      isChemical: false,
      params: [
        { name: 'Effective Case Depth', unit: 'mm', requirement: '0.80 – 1.20' },
        { name: 'Surface Hardness', unit: 'HV', requirement: '≥ 650' },
        { name: 'Core Hardness', unit: 'HV', requirement: '300 – 400' }
      ],
      demo: ['0.95', '685', '340']
    },
    case_depth_micro: {
      key: 'case_depth_micro',
      label: 'Case Depth by Microscopic',
      leaf: 'Metallography / Case-Depth / Microscopic',
      sub: 'Case Depth • IS 6416',
      dbTestId: 12,
      isChemical: false,
      params: [
        { name: 'Total Case Depth', unit: 'mm', requirement: '0.70 – 1.00' },
        { name: 'Compound Layer Depth', unit: 'µm', requirement: '10 – 25' }
      ],
      demo: ['0.85', '18']
    },
    oes: {
      key: 'oes',
      label: 'OES Chemical Analysis',
      leaf: 'Chemical / Spectro / OES',
      sub: 'OES Chemical • ASTM E415 / ASTM E1086',
      dbTestId: 5,
      isChemical: true,
      params: [
        { name: 'Carbon (C)', unit: '%', requirement: '0.05–0.25' },
        { name: 'Silicon (Si)', unit: '%', requirement: '0.15–0.35' },
        { name: 'Manganese (Mn)', unit: '%', requirement: '0.60–1.20' },
        { name: 'Phosphorus (P)', unit: '%', requirement: '≤ 0.035' },
        { name: 'Sulphur (S)', unit: '%', requirement: '≤ 0.035' },
        { name: 'Chromium (Cr)', unit: '%', requirement: '16.0–18.0' },
        { name: 'Nickel (Ni)', unit: '%', requirement: '10.0–14.0' },
        { name: 'Molybdenum (Mo)', unit: '%', requirement: '2.0–3.0' },
        { name: 'Carbon Equivalent', unit: '%', requirement: '≤ 0.45', isCalculated: true, formula: 'CE = C + Mn/6 + (Cr+Mo+V)/5 + (Ni+Cu)/15', formulaDisplay: '%C + %Mn / 6 + (%Cr + %Mo + %V) / 5 + (%Ni + %Cu) / 15' }
      ],
      demo: ['0.18', '0.28', '0.92', '0.021', '0.015', '17.2', '12.1', '2.4', '0.38']
    },
    metallography: {
      key: 'metallography',
      label: 'Metallography Microstructure',
      leaf: 'Metallography / Microstructure / Phase Rating',
      sub: 'Microstructure • ASTM E3 / ASTM E407',
      dbTestId: 13,
      isChemical: false,
      params: [
        { name: 'Matrix Structure', unit: 'Phase', requirement: 'Tempered Martensite' },
        { name: 'Decarburization', unit: 'mm', requirement: 'Nil' }
      ],
      demo: ['Tempered Martensite with uniform carbides', '0.00']
    },
    grain_size: {
      key: 'grain_size',
      label: 'Grain Size Analysis',
      leaf: 'Metallography / Grain-Size / Optical',
      sub: 'Grain Size • ASTM E112 / ISO 643',
      dbTestId: 14,
      isChemical: false,
      params: [
        { name: 'ASTM Grain Size No.', unit: 'ASTM No.', requirement: '≥ 6.0' },
        { name: 'Average Grain Diameter', unit: 'µm', requirement: 'Runtime' }
      ],
      demo: ['7.5', '31.8']
    },
    ferrite_content: {
      key: 'ferrite_content',
      label: 'Ferrite Content Phase Analysis',
      leaf: 'Metallography / Phase-Analysis / Ferrite',
      sub: 'Ferrite Content (5-Field) • ASTM E562',
      dbTestId: 15,
      isChemical: false,
      params: [
        { name: 'Mean Ferrite Content', unit: '%', requirement: '40.0 – 60.0' },
        { name: 'Standard Deviation', unit: '%', requirement: '≤ 3.5' }
      ],
      demo: ['47.3', '1.8']
    },
    macro_weld: {
      key: 'macro_weld',
      label: 'Macroscopic Examination (Weld)',
      leaf: 'Metallography / Macro / Weldment',
      sub: 'Macro Etch • ASME Sec IX / ISO 17639',
      dbTestId: 16,
      isChemical: false,
      params: [
        { name: 'Visual Weld Integrity', unit: 'Rating', requirement: 'Satisfactory' },
        { name: 'Throat Thickness', unit: 'mm', requirement: '≥ 8.0' },
        { name: 'Leg Length 1', unit: 'mm', requirement: '≥ 10.0' },
        { name: 'Leg Length 2', unit: 'mm', requirement: '≥ 10.0' }
      ],
      demo: ['Satisfactory (Defect Free)', '8.6', '10.8', '11.2']
    },
    corrosion_sst: {
      key: 'corrosion_sst',
      label: 'Salt Spray Corrosion Test (SST)',
      leaf: 'Corrosion / Environmental / Salt-Spray',
      sub: 'Salt Spray SST • ASTM B117 / ISO 9227',
      dbTestId: 17,
      isChemical: false,
      params: [
        { name: 'White Rust Observed', unit: 'Hours', requirement: '≥ 24' },
        { name: 'Red Rust Observed', unit: 'Hours', requirement: '≥ 96' },
        { name: 'Corrosion Rating', unit: 'Rating', requirement: 'Grade 10' }
      ],
      demo: ['No white rust up to 48 hrs', 'No red rust up to 120 hrs', 'Grade 10 (0% rust)']
    }
  };

  // Preview interactive data-entry state
  previewEntries: Record<string, string> = {};
  previewStatus: Record<string, boolean | null> = {};
  previewStats: Record<string, { avg: string; min: string; max: string; agg: string }> = {};

  // Traceability field master options
  readonly traceMasterFields = [
    'Analyst / Tester',
    'Reviewer / Authorised Signatory',
    'Test Date',
    'Date of Receipt',
    'Sample / Lab ID',
    'Equipment ID',
    'Calibration Due',
    'Method / Standard',
    'Deviation from Method',
    'Environmental Reference'
  ];

  readonly conditionMasterFields = [
    'Temperature',
    'Relative Humidity',
    'Test Speed',
    'Load Rate',
    'Pressure',
    'Medium',
    'Duration',
    'Equipment'
  ];

  readonly specimenIdentFields = [
    'Specimen ID',
    'Dimensions',
    'Orientation / Location',
    'Heat / Lot No.',
    'Condition (as received / treated)'
  ];

  readonly locationIdentFields = [
    'Location Description',
    'Depth from Surface',
    'Zone Type'
  ];

  ngOnInit(): void {
    this.initResponsiveLeftPanel();
    this.initResponsiveRightPanel();
    this.loadCustomPoolsFromStorage();
    this.initDefaultSections();
    this.loadDatabaseTests();
    this.loadAllAvailableTests();
    this.ensureSectionKeys();

    this.route.queryParams.subscribe(params => {
      if (params['id']) {
        this.loadLayoutById(+params['id']);
      } else {
        this.loadDatabaseLayoutForHierarchy(
          this.selectedLabTestId,
          this.selectedSubGroupId,
          this.selectedAnalysisTypeId,
          this.leafNode,
          this.selectedArchetypeKey
        );
      }

      if (params['mode'] === 'view') {
        this.isViewMode = true;
      }
    });
  }

  // -------------------------------------------------------------------------
  // Left Panel Resizing & Responsive Helpers
  // -------------------------------------------------------------------------
  initResponsiveLeftPanel(): void {
    const savedCollapsed = localStorage.getItem(this.STORAGE_KEY_LEFT_COLLAPSED);
    if (savedCollapsed !== null) {
      this.leftPanelCollapsed = savedCollapsed === 'true';
    }

    const savedWidth = localStorage.getItem(this.STORAGE_KEY_LEFT_WIDTH);
    if (savedWidth) {
      const parsed = parseInt(savedWidth, 10);
      if (!isNaN(parsed) && parsed >= 190 && parsed <= 550) {
        this.leftPanelWidth = parsed;
        return;
      }
    }

    // Adaptive default based on viewport width
    const winWidth = window.innerWidth;
    if (winWidth >= 1800) {
      this.leftPanelWidth = 310;
    } else if (winWidth >= 1440) {
      this.leftPanelWidth = 280;
    } else if (winWidth <= 1200) {
      this.leftPanelWidth = 230;
    } else {
      this.leftPanelWidth = 270;
    }
  }

  startResizeLeft(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isResizingLeft = true;
    this.startX = event.clientX;
    this.startWidth = this.leftPanelWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!this.isResizingLeft) return;
      const delta = moveEvent.clientX - this.startX;
      let newWidth = this.startWidth + delta;

      // Smart limits: min 190px, max 45% of viewport width or 550px
      const minWidth = 190;
      const maxWidth = Math.min(550, Math.floor(window.innerWidth * 0.45));

      if (newWidth < minWidth) newWidth = minWidth;
      if (newWidth > maxWidth) newWidth = maxWidth;

      this.leftPanelWidth = newWidth;
      if (this.leftPanelCollapsed) {
        this.leftPanelCollapsed = false;
      }
    };

    const onMouseUp = () => {
      if (this.isResizingLeft) {
        this.isResizingLeft = false;
        localStorage.setItem(this.STORAGE_KEY_LEFT_WIDTH, this.leftPanelWidth.toString());
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  toggleLeftPanel(): void {
    this.leftPanelCollapsed = !this.leftPanelCollapsed;
    localStorage.setItem(this.STORAGE_KEY_LEFT_COLLAPSED, this.leftPanelCollapsed.toString());
  }

  resetLeftWidth(): void {
    const winWidth = window.innerWidth;
    if (winWidth >= 1800) {
      this.leftPanelWidth = 310;
    } else if (winWidth >= 1440) {
      this.leftPanelWidth = 280;
    } else if (winWidth <= 1200) {
      this.leftPanelWidth = 230;
    } else {
      this.leftPanelWidth = 270;
    }
    this.leftPanelCollapsed = false;
    localStorage.setItem(this.STORAGE_KEY_LEFT_WIDTH, this.leftPanelWidth.toString());
    localStorage.setItem(this.STORAGE_KEY_LEFT_COLLAPSED, 'false');
    this.toastService.show(`Left panel width reset to default (${this.leftPanelWidth}px)`, 'info');
  }

  setLeftPreset(width: number): void {
    this.leftPanelWidth = width;
    this.leftPanelCollapsed = false;
    localStorage.setItem(this.STORAGE_KEY_LEFT_WIDTH, this.leftPanelWidth.toString());
    localStorage.setItem(this.STORAGE_KEY_LEFT_COLLAPSED, 'false');
  }

  // -------------------------------------------------------------------------
  // Right Panel Resizing & Responsive Helpers
  // -------------------------------------------------------------------------
  initResponsiveRightPanel(): void {
    const savedCollapsed = localStorage.getItem(this.STORAGE_KEY_RIGHT_COLLAPSED);
    if (savedCollapsed !== null) {
      this.rightPanelCollapsed = savedCollapsed === 'true';
    }

    const savedWidth = localStorage.getItem(this.STORAGE_KEY_RIGHT_WIDTH);
    if (savedWidth) {
      const parsed = parseInt(savedWidth, 10);
      if (!isNaN(parsed) && parsed >= 260 && parsed <= 650) {
        this.rightPanelWidth = parsed;
        return;
      }
    }

    // Adaptive default based on viewport width
    const winWidth = window.innerWidth;
    if (winWidth >= 1800) {
      this.rightPanelWidth = 440;
    } else if (winWidth >= 1440) {
      this.rightPanelWidth = 380;
    } else if (winWidth <= 1200) {
      this.rightPanelWidth = 320;
    } else {
      this.rightPanelWidth = 360;
    }
  }

  startResizeRight(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isResizingRight = true;
    this.startRightX = event.clientX;
    this.startRightWidth = this.rightPanelWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!this.isResizingRight) return;
      // Dragging left makes the right panel wider
      const delta = this.startRightX - moveEvent.clientX;
      let newWidth = this.startRightWidth + delta;

      // Limits: min 260px, max 55% of viewport width or 650px
      const minWidth = 260;
      const maxWidth = Math.min(650, Math.floor(window.innerWidth * 0.55));

      if (newWidth < minWidth) newWidth = minWidth;
      if (newWidth > maxWidth) newWidth = maxWidth;

      this.rightPanelWidth = newWidth;
      if (this.rightPanelCollapsed) {
        this.rightPanelCollapsed = false;
      }
    };

    const onMouseUp = () => {
      if (this.isResizingRight) {
        this.isResizingRight = false;
        localStorage.setItem(this.STORAGE_KEY_RIGHT_WIDTH, this.rightPanelWidth.toString());
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  toggleRightPanel(): void {
    this.rightPanelCollapsed = !this.rightPanelCollapsed;
    localStorage.setItem(this.STORAGE_KEY_RIGHT_COLLAPSED, this.rightPanelCollapsed.toString());
  }

  resetRightWidth(): void {
    const winWidth = window.innerWidth;
    if (winWidth >= 1800) {
      this.rightPanelWidth = 440;
    } else if (winWidth >= 1440) {
      this.rightPanelWidth = 380;
    } else if (winWidth <= 1200) {
      this.rightPanelWidth = 320;
    } else {
      this.rightPanelWidth = 360;
    }
    this.rightPanelCollapsed = false;
    localStorage.setItem(this.STORAGE_KEY_RIGHT_WIDTH, this.rightPanelWidth.toString());
    localStorage.setItem(this.STORAGE_KEY_RIGHT_COLLAPSED, 'false');
    this.toastService.show(`Section Inspector width reset to default (${this.rightPanelWidth}px)`, 'info');
  }

  setRightPreset(width: number): void {
    this.rightPanelWidth = width;
    this.rightPanelCollapsed = false;
    localStorage.setItem(this.STORAGE_KEY_RIGHT_WIDTH, this.rightPanelWidth.toString());
    localStorage.setItem(this.STORAGE_KEY_RIGHT_COLLAPSED, 'false');
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    const maxAllowed = Math.min(550, Math.floor(window.innerWidth * 0.45));
    if (this.leftPanelWidth > maxAllowed && maxAllowed >= 190) {
      this.leftPanelWidth = maxAllowed;
    }
    const maxAllowedRight = Math.min(650, Math.floor(window.innerWidth * 0.55));
    if (this.rightPanelWidth > maxAllowedRight && maxAllowedRight >= 260) {
      this.rightPanelWidth = maxAllowedRight;
    }
  }

  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.altKey) && event.key === '[') {
      event.preventDefault();
      this.toggleLeftPanel();
    }
    if ((event.ctrlKey || event.altKey) && event.key === ']') {
      event.preventDefault();
      this.toggleRightPanel();
    }
  }

  get actualLabTestList(): any[] {
    return this.actualLabTests;
  }

  get currentLabTest(): any {
    return this.actualLabTests.find(t => t.id === this.selectedLabTestId) || this.actualLabTests[0] || null;
  }

  get currentLabTestName(): string {
    return this.resolvedHierarchy?.fullDisplayName || this.resolvedHierarchy?.groupName || this.currentLabTest?.name || this.currentTest.label;
  }

  get dataSourceLabel(): string {
    const target = this.resolvedHierarchy?.fullDisplayName || this.currentLabTestName;
    return `Live parameters mapped from ${target}`;
  }

  get testList(): TestDef[] {
    return Object.values(this.testDatabase);
  }

  get currentTest(): TestDef {
    return this.testDatabase[this.selectedArchetypeKey] || this.testDatabase[this.selectedTestKey] || this.testDatabase['generic'];
  }

  get selectedSection(): ExecutionSection | null {
    return this.sections.find(s => s.id === this.selectedSectionId) || null;
  }

  // Initial Section Stack
  initDefaultSections(): void {
    this.sections = this.getDefaultSectionsForTest(this.selectedTestKey);
    if (this.sections.length > 0) {
      this.selectedSectionId = this.sections[0].id;
    }
  }

  createSectionObject(type: string, customTitle?: string): ExecutionSection {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    const title = customTitle || this.componentNames[type] || 'Section';
    const cleanTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    const config: SectionConfig = {
      sectionKey: `${cleanTitle}_${id}`,
      width: 'Full Width',
      visibility: 'Always',
      enabled: true,
      runtimeAdjust: true,
      showUnit: true,
      showLabels: true,
      highlightStatus: true,
      keepHeader: true,
      reportable: true,
      printCertificate: true,
      showRaw: false,
      reportProjection: 'Same execution structure',
      pageBreak: 'Auto',
      density: 'Normal',
      alignment: 'Standard',
      reportLabel: title
    };

    switch (type) {
      case 'parameter':
        config.dataSource = 'Selected Test → Leaf Node → Parameters';
        config.parameterMode = 'All runtime parameters';
        config.resultMode = 'Observed Result';
        config.requirement = 'Runtime Requirement';
        config.status = 'Runtime PASS / FAIL';
        config.decimals = 'Auto';
        config.columns = {
          unit: true,
          requirement: true,
          result: true,
          status: true,
          method: true,
          remarks: true,
          uncertainty: true,
          dl: false,
          scope: false
        };
        break;

      case 'specimen':
        config.specimenSource = 'Execution Specimens';
        config.countMode = 'Fixed count';
        config.count = 3;
        config.prefix = 'S';
        config.orientation = 'Parameters × Specimens';
        config.showAverage = true;
        config.showMinMax = false;
        config.showRequirement = true;
        config.editable = true;
        config.showIdentity = true;
        config.ident = this.specimenIdentFields.slice(0, 3);
        break;

      case 'reading':
        config.readingSource = 'Runtime readings';
        config.readingCount = 'Fixed count';
        config.count = 3;
        config.aggregation = 'Average';
        config.showIndividual = true;
        config.showStatistics = true;
        config.readingLabel = 'R1 / R2 / R3';
        break;

      case 'location':
        config.locationSource = 'Execution Locations / Zones';
        config.locationMode = 'Named locations';
        config.locationNames = 'Weld Metal, HAZ, Base Metal';
        config.count = 3;
        config.prefix = 'Zone';
        config.orientation = 'Locations × Parameters';
        config.showAverage = true;
        config.showRequirement = true;
        config.allowRuntimeAdd = false;
        config.showIdentity = false;
        config.ident = this.locationIdentFields.slice(0, 2);
        break;

      case 'condition':
        config.fields = ['Temperature', 'Relative Humidity', 'Test Speed', 'Load Rate'];
        config.layout = 'Compact cards';
        config.source = 'Execution Header / Runtime Conditions';
        config.allowRuntimeEdit = true;
        config.showMissing = 'Show Not Recorded';
        break;

      case 'rule':
        config.parameter = 'Runtime Parameter';
        config.operator = '≥';
        config.valueSource = 'Runtime Requirement';
        config.evaluation = 'Runtime PASS / FAIL';
        config.failAction = 'Mark parameter FAIL';
        config.decisionRule = 'Simple acceptance (no guard band)';
        config.conformity = true;
        config.showRule = true;
        break;

      case 'traverse':
        config.xField = 'Depth / Distance';
        config.yField = 'Runtime Parameter Result';
        config.xUnit = 'mm';
        config.yUnit = 'HV';
        config.stepMode = 'Runtime readings';
        config.stepValue = '0.1';
        config.cutoffMode = 'Runtime requirement';
        config.showTable = true;
        config.showCurve = true;
        break;

      case 'chart':
        config.chartType = 'line';
        config.xSource = 'Parameter';
        config.xField = 'Auto – Parameter 1';
        config.xLabel = 'Runtime X';
        config.xUnit = 'mm';
        config.ySource = 'Parameter Result';
        config.yField = 'Auto – Parameter 2';
        config.yLabel = 'Runtime Result';
        config.yUnit = 'MPa';
        config.showPoints = true;
        config.showLabels = false;
        config.showLegend = true;
        config.showGrid = true;
        config.showLimit = false;
        break;

      case 'classification':
        config.ratingSystem = 'ASTM / Method-defined rating';
        config.observedSource = 'Runtime result';
        config.decision = 'Runtime classification';
        config.showCriteria = true;
        break;

      case 'custom':
        config.rows = 'Runtime rows';
        config.source = 'Runtime transaction data';
        config.allowRuntimeRows = true;
        config.showHeader = true;
        break;

      case 'photo':
        config.source = 'Execution Attachments';
        config.columns = { unit: true }; // dummy placeholder if needed
        config.caption = 'Runtime attachment caption';
        config.showMagnification = true;
        config.showDateTime = false;
        config.showScale = true;
        config.showSpecimenId = true;
        config.showLocation = true;
        config.showEtchant = true;
        config.pageBreak = 'Auto';
        break;

      case 'formula':
        config.formulaSource = 'Formula Master / Runtime mapping';
        config.inputs = 'Mapped runtime parameters';
        config.resultLabel = 'Calculated Result';
        config.precision = 'Auto';
        config.showFormula = false;
        config.showInputs = true;
        config.rounding = 'Round half up';
        config.showMU = false;
        break;

      case 'narrative':
        config.source = 'Analyst Runtime Input';
        config.inputType = 'Multi-line text';
        config.label = 'Remarks / Statement';
        config.maxLength = '2000';
        config.required = false;
        config.reportable = true;
        config.category = 'Remarks';
        break;

      case 'checklist':
        config.source = 'Execution Checklist';
        config.items = 'Visual condition, Dimensions verified, Equipment calibrated';
        config.responseType = 'Pass / Fail / NA';
        config.failAction = 'Block completion';
        config.showCriteria = true;
        config.requireAll = true;
        break;

      case 'traceability':
        config.fields = ['Analyst / Tester', 'Test Date', 'Equipment ID', 'Calibration Due', 'Method / Standard', 'Deviation from Method'];
        config.layout = 'Two-column cards';
        config.source = 'Execution Record';
        config.allowRuntimeEdit = true;
        break;
    }

    return { id, type, title, config };
  }

  // Master Default Atomic Stacks for all 14 Reference Report Formats
  getDefaultSectionsForTest(testKey: string): ExecutionSection[] {
    switch (testKey) {
      case 'blank': {
        return [];
      }

      case 'generic':
      case 'standard': {
        const cond = this.createSectionObject('condition', 'Test Conditions & Environment');
        cond.config.fields = ['Temperature', 'Relative Humidity', 'Equipment Used', 'Test Speed'];
        const param = this.createSectionObject('parameter', 'Parameters & Runtime Requirements');
        param.config.dataSource = 'Runtime Laboratory Test → Parameters';
        param.config.parameterMode = 'All runtime parameters';
        param.config.requirement = 'Runtime Requirement';
        param.config.status = 'Runtime PASS / FAIL';
        const form = this.createSectionObject('formula', 'Derived Result & Calculations');
        const narr = this.createSectionObject('narrative', 'Observations & Conformance Remarks');
        const trace = this.createSectionObject('traceability', 'Traceability & Technical Record');
        return [cond, param, form, narr, trace];
      }

      case 'tensile': {
        const cond = this.createSectionObject('condition', 'Tensile Test Environment & Grip Conditions');
        cond.config.fields = ['Temperature', 'Relative Humidity', 'Test Speed', 'Load Rate'];
        const param = this.createSectionObject('parameter', 'Tensile Parameters & Runtime Requirements');
        const spec = this.createSectionObject('specimen', 'Multi-Specimen Tensile Matrix (S1 / S2 / S3)');
        spec.config.count = 3;
        spec.config.prefix = 'S';
        spec.config.showAverage = true;
        spec.config.showMinMax = true;
        const form = this.createSectionObject('formula', 'Yield / UTS / Elongation Formula Derivations');
        form.config.inputs = 'Original Gauge Length, Final Length, Cross-Section Area, Yield Load, Peak Load';
        form.config.resultLabel = 'Calculated UTS & Elongation';
        const chart = this.createSectionObject('chart', 'Stress vs Strain Engineering Curve');
        chart.config.xLabel = 'Strain (mm/mm)';
        chart.config.xUnit = 'mm/mm';
        chart.config.yLabel = 'Stress (MPa)';
        chart.config.yUnit = 'MPa';
        const narr = this.createSectionObject('narrative', 'Tensile Fracture Observations & Remarks');
        narr.config.label = 'Fracture Type & Cup-and-Cone Appearance';
        return [cond, param, spec, form, chart, narr];
      }

      case 'impact': {
        const cond = this.createSectionObject('condition', 'Impact Temperature & Machine Calibration');
        cond.config.fields = ['Temperature', 'Striker Radius', 'Impact Velocity', 'Anvil Span'];
        const spec = this.createSectionObject('specimen', 'Charpy Notch Specimen Results (3 Specimens)');
        spec.config.count = 3;
        spec.config.prefix = 'Notch';
        spec.config.showAverage = true;
        spec.config.showMinMax = true;
        const param = this.createSectionObject('parameter', 'Absorbed Energy & Lateral Expansion');
        const rule = this.createSectionObject('rule', 'Minimum Absorbed Energy Acceptance Rule');
        rule.config.parameter = 'Impact Energy';
        rule.config.operator = '≥';
        rule.config.valueSource = '27 J (Avg) / 20 J (Indiv)';
        const narr = this.createSectionObject('narrative', 'Fracture Surface Appearance (% Shear)');
        narr.config.label = 'Appearance & Shear Fracture %';
        return [cond, spec, param, rule, narr];
      }

      case 'izod': {
        const cond = this.createSectionObject('condition', 'Izod Testing Conditions');
        cond.config.fields = ['Temperature', 'Striker Type', 'Clamping Pressure', 'Specimen Notch'];
        const spec = this.createSectionObject('specimen', 'Izod Test Specimens (S1 / S2 / S3)');
        spec.config.count = 3;
        spec.config.prefix = 'S';
        spec.config.showAverage = true;
        const param = this.createSectionObject('parameter', 'Izod Absorbed Energy & Impact Strength');
        const rule = this.createSectionObject('rule', 'Izod Acceptance Criteria');
        rule.config.parameter = 'Absorbed Energy';
        rule.config.operator = '≥';
        rule.config.valueSource = '20 J';
        const narr = this.createSectionObject('narrative', 'Observations & Break Type');
        narr.config.label = 'Complete / Partial Break';
        return [cond, spec, param, rule, narr];
      }

      case 'rockwell': {
        const cond = this.createSectionObject('condition', 'Rockwell Test Conditions (Scale & Load)');
        cond.config.fields = ['Temperature', 'Scale (HRC)', 'Major Load (150 kgf)', 'Indenter (Diamond Cone)'];
        const read = this.createSectionObject('reading', 'Indentation Spot Readings (5 Spots)');
        read.config.count = 5;
        read.config.aggregation = 'Average';
        read.config.readingLabel = 'Spot 1 to 5';
        read.config.showStatistics = true;
        const param = this.createSectionObject('parameter', 'Observed Hardness & Tensile Equivalent');
        const rule = this.createSectionObject('rule', 'Hardness Range Acceptance');
        rule.config.parameter = 'Hardness (HRC)';
        rule.config.operator = 'Within Range';
        rule.config.valueSource = '28 – 34 HRC';
        const narr = this.createSectionObject('narrative', 'Surface Preparation & Impression Quality');
        narr.config.label = 'Test Surface Quality & Calibration Check';
        return [cond, read, param, rule, narr];
      }

      case 'micro_vickers': {
        const cond = this.createSectionObject('condition', 'Micro-Indentation Parameters (Load & Dwell)');
        cond.config.fields = ['Test Load (HV 0.5)', 'Dwell Time (15s)', 'Objective Magnification (400x)'];
        const read = this.createSectionObject('reading', 'Indentation Diagonals & Calculated HV');
        read.config.count = 3;
        read.config.aggregation = 'Average';
        read.config.readingLabel = 'd1 / d2 / HV';
        const param = this.createSectionObject('parameter', 'Micro Vickers Hardness Parameters');
        const photo = this.createSectionObject('photo', 'Vickers Indentation Micrograph');
        photo.config.caption = 'Micro-hardness indentation geometry at 400x';
        photo.config.showMagnification = true;
        photo.config.showScale = true;
        const narr = this.createSectionObject('narrative', 'Metallographic Preparation & Indenter Inspection');
        narr.config.label = 'Polishing Quality & Optical Inspection';
        return [cond, read, param, photo, narr];
      }

      case 'hardness_multiloc': {
        const cond = this.createSectionObject('condition', 'Weld Joint Geometry & Test Standard');
        cond.config.fields = ['Method / Standard (ISO 9015)', 'Load (HV 10)', 'Joint Type', 'Welding Process'];
        const loc = this.createSectionObject('location', 'Zone Multi-Location Matrix (Base Metal / HAZ / Weld Metal)');
        loc.config.locationNames = 'Base Metal (BM), Heat Affected Zone (HAZ), Weld Metal (WM)';
        loc.config.count = 3;
        loc.config.orientation = 'Locations × Parameters';
        loc.config.showAverage = true;
        const trav = this.createSectionObject('traverse', 'Cross-Weld Hardness Traverse (Survey Across Joint)');
        trav.config.xField = 'Distance from Centerline';
        trav.config.xUnit = 'mm';
        trav.config.yField = 'Hardness';
        trav.config.yUnit = 'HV 10';
        trav.config.stepValue = '0.5';
        const chart = this.createSectionObject('chart', 'Hardness Distribution Profile Across Weld');
        chart.config.xLabel = 'Distance from Center (mm)';
        chart.config.yLabel = 'Hardness (HV 10)';
        const param = this.createSectionObject('parameter', 'Peak Zone Hardness & Acceptance Values');
        const narr = this.createSectionObject('narrative', 'Survey Compliance Statement');
        narr.config.label = 'Weld Zone Hardness Conformance';
        return [cond, loc, trav, chart, param, narr];
      }

      case 'case_depth_hardness': {
        const cond = this.createSectionObject('condition', 'Case Depth Test Parameters');
        cond.config.fields = ['Load (HV 0.5)', 'Limiting / Cutoff Hardness (550 HV)', 'Surface Condition'];
        const trav = this.createSectionObject('traverse', 'Microhardness Traverse from Surface to Core');
        trav.config.xField = 'Depth from Surface';
        trav.config.xUnit = 'mm';
        trav.config.yField = 'Microhardness';
        trav.config.yUnit = 'HV 0.5';
        trav.config.stepValue = '0.05';
        trav.config.showTable = true;
        trav.config.showCurve = true;
        const chart = this.createSectionObject('chart', 'Hardness Traverse Curve vs Distance');
        chart.config.xLabel = 'Depth from Surface (mm)';
        chart.config.yLabel = 'Microhardness (HV 0.5)';
        chart.config.showLimit = true;
        const param = this.createSectionObject('parameter', 'Effective Case Depth & Core Hardness');
        const rule = this.createSectionObject('rule', 'Case Depth Tolerance Rule');
        rule.config.parameter = 'Effective Case Depth';
        rule.config.operator = 'Within Range';
        rule.config.valueSource = '0.80 – 1.20 mm';
        const narr = this.createSectionObject('narrative', 'Heat Treatment & Case Structure Remarks');
        narr.config.label = 'Effective Case Depth Verification Statement';
        return [cond, trav, chart, param, rule, narr];
      }

      case 'case_depth_micro': {
        const cond = this.createSectionObject('condition', 'Microscopic Preparation & Etchant');
        cond.config.fields = ['Etchant (2% Nital)', 'Magnification (100x)', 'Microscope Calibration'];
        const param = this.createSectionObject('parameter', 'Total Case Depth & Compound Layer Depth');
        const photo = this.createSectionObject('photo', 'Microscopic Case Depth Cross-Section');
        photo.config.caption = 'Case-to-Core Transition boundary at 100x';
        photo.config.showMagnification = true;
        photo.config.showScale = true;
        photo.config.showEtchant = true;
        const narr = this.createSectionObject('narrative', 'Microstructural Boundary Observations');
        narr.config.label = 'Optical Case Depth Statement';
        return [cond, param, photo, narr];
      }

      case 'oes': {
        const cond = this.createSectionObject('condition', 'Spectrometer Operating Environment');
        cond.config.fields = ['Instrument ID', 'Argon Purity (99.999%)', 'Flush Pressure', 'Electrode Gap'];
        const param = this.createSectionObject('parameter', 'Chemical Composition (% by Weight)');
        const spec = this.createSectionObject('specimen', 'Multi-Spark Results (Burn 1 / Burn 2 / Burn 3 / Mean)');
        spec.config.count = 3;
        spec.config.prefix = 'Burn';
        spec.config.showAverage = true;
        const form = this.createSectionObject('formula', 'Carbon Equivalent (CE) / Pcm Calculation');
        form.config.inputs = 'C, Mn, Cr, Mo, V, Ni, Cu';
        form.config.resultLabel = 'Carbon Equivalent CE = C + Mn/6 + (Cr+Mo+V)/5 + (Ni+Cu)/15';
        const rule = this.createSectionObject('rule', 'Standard Grade Chemical Conformity Rule');
        rule.config.parameter = 'Chemical Elements';
        rule.config.operator = 'Within Range';
        rule.config.valueSource = 'Grade Specification';
        const narr = this.createSectionObject('narrative', 'Chemical Analysis Certification Statement');
        narr.config.label = 'Compliance with Material Specification';
        return [cond, param, spec, form, rule, narr];
      }

      case 'metallography': {
        const cond = this.createSectionObject('condition', 'Specimen Preparation & Etching');
        cond.config.fields = ['Etchant (2% Nital)', 'Magnification (100x / 500x)', 'Inclusion Rating Standard'];
        const param = this.createSectionObject('parameter', 'Microstructural Parameters & Decarburization');
        const clas = this.createSectionObject('classification', 'Microstructure Phase Classification');
        clas.config.ratingSystem = 'ASTM E3 / E407 Microstructural Rating';
        const photo = this.createSectionObject('photo', 'Representative Micrographs (100x & 500x)');
        photo.config.caption = 'Microstructure showing matrix structure, carbides, and grain boundaries';
        photo.config.showMagnification = true;
        photo.config.showScale = true;
        photo.config.showEtchant = true;
        const chk = this.createSectionObject('checklist', 'Metallographic Evaluation Checklist');
        chk.config.items = 'Uniform Grain Distribution, Banding Absence, Decarburization Checked, Inclusions within Limit';
        const narr = this.createSectionObject('narrative', 'Metallurgical Opinion & Detailed Findings');
        narr.config.label = 'Summary Opinion & Grain Flow Remarks';
        return [cond, param, clas, photo, chk, narr];
      }

      case 'grain_size': {
        const cond = this.createSectionObject('condition', 'Optical Examination Conditions');
        cond.config.fields = ['Etchant', 'Magnification (100x)', 'Fields Examined (5 Fields)'];
        const read = this.createSectionObject('reading', 'Field-by-Field Grain Size Readings');
        read.config.count = 5;
        read.config.readingLabel = 'Field 1 to 5';
        read.config.aggregation = 'Average';
        read.config.showStatistics = true;
        const param = this.createSectionObject('parameter', 'ASTM Grain Size Number & Mean Diameter');
        const clas = this.createSectionObject('classification', 'ASTM E112 Comparison Chart Rating');
        clas.config.ratingSystem = 'ASTM E112 Plate I (Untwinned Grains)';
        const photo = this.createSectionObject('photo', 'Representative Grain Size Field (100x)');
        photo.config.caption = 'Grain boundaries at 100x magnification';
        photo.config.showMagnification = true;
        photo.config.showScale = true;
        const narr = this.createSectionObject('narrative', 'Grain Structure Summary Statement');
        narr.config.label = 'Grain Size ASTM E112 Compliance';
        return [cond, read, param, clas, photo, narr];
      }

      case 'ferrite_content': {
        const cond = this.createSectionObject('condition', 'Point Count / E562 Settings');
        cond.config.fields = ['Etchant (10% KOH / Murakami)', 'Grid Points (25 Points)', 'Magnification (500x)'];
        const read = this.createSectionObject('reading', 'Field Percentage Ferrite Readings (5 Fields)');
        read.config.count = 5;
        read.config.readingLabel = 'Field 1 to 5';
        read.config.aggregation = 'Average';
        read.config.showStatistics = true;
        const form = this.createSectionObject('formula', 'Mean Ferrite Content & 95% Confidence Interval');
        form.config.inputs = 'Field 1..5 values';
        form.config.resultLabel = 'Mean Ferrite % ± 95% CI';
        const param = this.createSectionObject('parameter', 'Phase Quantification Summary');
        const photo = this.createSectionObject('photo', 'Dual-Phase Microstructure with Point Grid');
        photo.config.caption = 'Ferrite / Austenite phase contrast under 500x';
        photo.config.showMagnification = true;
        photo.config.showScale = true;
        const narr = this.createSectionObject('narrative', 'Ferrite / Austenite Balance Statement');
        narr.config.label = 'Duplex Ferrite-Austenite Ratio Statement';
        return [cond, read, form, param, photo, narr];
      }

      case 'macro_weld': {
        const cond = this.createSectionObject('condition', 'Macroetch Conditions');
        cond.config.fields = ['Etchant (10% Ammonium Persulphate)', 'Polishing Finish (600 Grit)', 'Magnification (1x - 10x)'];
        const param = this.createSectionObject('parameter', 'Weld Dimensions (Throat & Leg Lengths)');
        const photo = this.createSectionObject('photo', 'Macroetched Weld Cross-Section Image');
        photo.config.caption = 'Full-penetration weld cross section showing fusion zones and weld beads';
        photo.config.showMagnification = true;
        photo.config.showScale = true;
        photo.config.showLocation = true;
        const chk = this.createSectionObject('checklist', 'ASME IX / ISO 17639 Defect Acceptance Checklist');
        chk.config.items = 'Complete Fusion into Root, Freedom from Cracks, Undercut within Spec, Porosity within Limits';
        chk.config.responseType = 'Pass / Fail / NA';
        const narr = this.createSectionObject('narrative', 'Macroscopic Examination Conformance Remarks');
        narr.config.label = 'Weldment Soundness Statement';
        return [cond, param, photo, chk, narr];
      }

      case 'corrosion_sst': {
        const cond = this.createSectionObject('condition', 'Salt Spray Chamber Environmental Parameters');
        cond.config.fields = ['Chamber Temp (35 ± 2°C)', 'Salt Solution (5% NaCl)', 'Solution pH (6.5 - 7.2)', 'Collection Rate (1.5 ml/hr/80cm²)'];
        const trav = this.createSectionObject('traverse', 'Periodic Visual Inspection Intervals');
        trav.config.xField = 'Exposure Time';
        trav.config.xUnit = 'Hours';
        trav.config.yField = 'Corrosion Observation';
        trav.config.yUnit = 'Rating';
        trav.config.stepValue = '24';
        trav.config.showTable = true;
        trav.config.showCurve = false;
        const param = this.createSectionObject('parameter', 'Rust Onset Durations & Rating');
        const rule = this.createSectionObject('rule', 'Corrosion Resistance Duration Rule');
        rule.config.parameter = 'Red Rust Observed';
        rule.config.operator = '≥';
        rule.config.valueSource = '96 Hours';
        const photo = this.createSectionObject('photo', 'Test Panel Surface Condition (Pre-test & Post-test)');
        photo.config.caption = 'Coated test panel appearance after salt spray exposure';
        photo.config.showDateTime = true;
        photo.config.showSpecimenId = true;
        const narr = this.createSectionObject('narrative', 'Corrosion Performance Evaluation & ASTM B117 Statement');
        narr.config.label = 'Salt Spray Resistance Compliance';
        return [cond, trav, param, rule, photo, narr];
      }

      default: {
        return [
          this.createSectionObject('condition', 'Test Conditions / Environment'),
          this.createSectionObject('parameter', 'Parameters & Runtime Requirement'),
          this.createSectionObject('specimen', 'Multi-Specimen Result Matrix'),
          this.createSectionObject('formula', 'Derived Result / Calculation'),
          this.createSectionObject('chart', 'Curve / Chart'),
          this.createSectionObject('narrative', 'Remarks / Statement')
        ];
      }
    }
  }

  // -------------------------------------------------------------------------
  // Actual Laboratory Test (Left Panel) & Layout Structure Mapping (Center Top)
  // -------------------------------------------------------------------------

  onUnifiedTestSelected(item: any): void {
    if (!item) return;

    const addVals = item.additionalValues || {};
    const masterTestId = addVals.masterTestId ? Number(addVals.masterTestId) : (item.nodeType === 'TestGroup' ? Number(item.id) : this.selectedLabTestId);
    const masterTestName = addVals.masterTestName || (item.nodeType === 'TestGroup' ? item.name : '') || this.currentLabTestName;
    const subGroupId = addVals.subGroupId ? Number(addVals.subGroupId) : (item.nodeType === 'SubGroup' ? Number(item.id) : null);
    const subGroupName = addVals.subGroupName || (item.nodeType === 'SubGroup' ? item.name : '');
    const analysisTypeId = addVals.analysisTypeId ? Number(addVals.analysisTypeId) : (item.nodeType === 'AnalysisType' ? Number(item.id) : null);
    const isChemical = !!addVals.isChemical || !!item.isChemical ||
      (masterTestName && (masterTestName.toLowerCase().includes('spectro') || masterTestName.toLowerCase().includes('chem'))) ||
      (item.name && (item.name.toLowerCase().includes('spectro') || item.name.toLowerCase().includes('oes') || item.name.toLowerCase().includes('chem')));
    const leafName = item.name || '';
    const fullDisplayName = addVals.fullDisplayName || `${masterTestName}${subGroupName ? ' - ' + subGroupName : ''}`;

    this.selectedUnifiedTestId = item.id;
    this.selectedUnifiedTestItem = item;
    this.selectedLabTestId = masterTestId;
    this.selectedSubGroupId = subGroupId;
    this.selectedAnalysisTypeId = analysisTypeId;

    this.resolvedHierarchy = {
      groupId: masterTestId,
      groupName: masterTestName,
      subGroupId,
      subGroupName,
      analysisTypeId,
      leafName,
      fullDisplayName,
      isChemical
    };

    // Construct hierarchical leaf node path (Discipline, Group, SubGroup & Leaf)
    const discipline = isChemical ? 'Chemical' : 'General';
    if (analysisTypeId && subGroupName) {
      this.leafNode = `${discipline} / ${masterTestName} / ${subGroupName} / ${leafName}`;
      this.paperSub = `${masterTestName} • ${subGroupName} (${leafName})`;
    } else if (subGroupId && subGroupName) {
      this.leafNode = `${discipline} / ${masterTestName} / ${subGroupName}`;
      this.paperSub = `${masterTestName} • ${subGroupName}`;
    } else {
      this.leafNode = `${discipline} / ${masterTestName}`;
      this.paperSub = masterTestName;
    }

    // Automatically resolve matching default layout structure archetype
    const matchedKey = this.getArchetypeKeyForUnifiedItem(item, masterTestName);
    this.selectedArchetypeKey = matchedKey;
    this.selectedTestKey = matchedKey;

    // Mount layout sections of matched archetype
    this.sections = this.getDefaultSectionsForTest(matchedKey);
    if (this.sections.length > 0) {
      this.selectedSectionId = this.sections[0].id;
    }

    // Synchronize live parameters and dataset pool for that exact leaf node
    this.syncLiveParametersForUnifiedSelection(matchedKey, item);

    // Load saved database layout for this test & hierarchy (or fallback to defaults)
    this.loadDatabaseLayoutForHierarchy(
      masterTestId,
      subGroupId,
      analysisTypeId,
      this.leafNode,
      matchedKey
    );

    this.toastService.show(`Target: ${fullDisplayName} (Group, SubGroup & Leaf resolved)`, 'success');
  }

  getArchetypeKeyForUnifiedItem(item: any, masterTestName: string): string {
    const raw = `${masterTestName} ${item?.name || ''} ${item?.additionalValues?.fullDisplayName || ''}`.toLowerCase();
    const isChem = !!(item?.additionalValues?.isChemical);

    if (raw.includes('tensile')) return 'tensile';
    if (raw.includes('charpy')) return 'impact';
    if (raw.includes('izod')) return 'izod';
    if (raw.includes('micro vickers') || raw.includes('micro-vickers')) return 'micro_vickers';
    if (raw.includes('weld survey') || raw.includes('multi-location') || raw.includes('multi location')) return 'hardness_multiloc';
    if (raw.includes('effective case depth') || raw.includes('case depth (hardness)')) return 'case_depth_hardness';
    if (raw.includes('case depth') && raw.includes('micro')) return 'case_depth_micro';
    if (raw.includes('rockwell') || raw.includes('hardness')) return 'rockwell';
    if (raw.includes('oes') || raw.includes('spectro') || isChem) return 'oes';
    if (raw.includes('grain size')) return 'grain_size';
    if (raw.includes('ferrite')) return 'ferrite_content';
    if (raw.includes('macro')) return 'macro_weld';
    if (raw.includes('metallograph') || raw.includes('microstructure')) return 'metallography';
    if (raw.includes('salt spray') || raw.includes('corrosion')) return 'corrosion_sst';

    return 'generic';
  }

  syncLiveParametersForUnifiedSelection(archetypeKey: string, item: any): void {
    const test = this.testDatabase[archetypeKey];
    if (!test) return;

    const addVals = item?.additionalValues || {};
    const analysisTypeId = addVals.analysisTypeId || (item?.nodeType === 'AnalysisType' ? item.id : null);
    const subGroupId = addVals.subGroupId || (item?.nodeType === 'SubGroup' ? item.id : null);
    const masterTestId = addVals.masterTestId || (item?.nodeType === 'TestGroup' ? item.id : null) || this.selectedLabTestId;

    if (analysisTypeId) {
      this.labService.getAnalysisTypeDetails(analysisTypeId).subscribe({
        next: (atDetails: any) => {
          const pList = atDetails?.parameters || [];
          if (pList.length > 0) {
            test.params = pList.map((p: any) => ({
              id: p.parameter?.id || p.parameterId,
              name: p.parameter?.name || p.parameterName || 'Parameter',
              unit: p.parameter?.parameterUnit?.name || p.parameterUnit || '%',
              requirement: 'Runtime',
              isCalculated: !!(p.parameter?.isCalculated),
              formula: p.parameter?.formula || '',
              formulaDisplay: p.parameter?.formulaDisplay || ''
            }));
            test.demo = test.params.map(() => '0.25');
          }
        },
        error: () => {
          this.labService.getAnalysisTypeParameters(analysisTypeId).subscribe({
            next: (paramsList: any[]) => {
              if (paramsList && paramsList.length > 0) {
                test.params = paramsList.map((p: any) => ({
                  id: p.id,
                  name: p.name || p.parameterName || 'Parameter',
                  unit: p.unit || p.parameterUnit || '%',
                  requirement: p.requirement || 'Runtime'
                }));
                test.demo = test.params.map(() => '0.25');
              }
            },
            error: (err) => console.error('Failed to load AnalysisType parameters', err)
          });
        }
      });
    } else if (subGroupId) {
      this.labService.getSubGroupDetails(subGroupId).subscribe({
        next: (sgDetails: any) => {
          if (sgDetails?.parameters && sgDetails.parameters.length > 0) {
            test.params = sgDetails.parameters.map((p: any) => ({
              id: p.parameter?.id || p.parameterId,
              name: p.parameter?.name || p.parameterName || 'Parameter',
              unit: p.parameter?.parameterUnit?.name || p.parameterUnit || '—',
              requirement: 'Runtime',
              isCalculated: !!(p.parameter?.isCalculated),
              formula: p.parameter?.formula || '',
              formulaDisplay: p.parameter?.formulaDisplay || ''
            }));
            test.demo = test.params.map(() => '100');
          }
        },
        error: (err) => console.error('Failed to load SubGroup details', err)
      });

      this.labService.getTestMethodSpecificationBySubGroup(subGroupId).subscribe({
        next: (specs: any[]) => {
          if (specs && specs.length > 0) {
            const specNames = specs.map((s: any) => s.name).join(' • ');
            this.paperSub = `${this.resolvedHierarchy?.groupName || ''} • ${specNames}`;
          }
        },
        error: (err) => console.error('Failed to load SubGroup specifications', err)
      });
    } else if (masterTestId) {
      this.syncLiveParametersForTest(archetypeKey);
    }
  }

  onActualLabTestChange(testId: number | string): void {
    this.selectedLabTestId = Number(testId);
    const labTest = this.currentLabTest;
    if (!labTest) return;

    // Automatically resolve matching default layout structure archetype
    const matchedKey = this.getArchetypeKeyForLabTest(labTest);
    this.selectedArchetypeKey = matchedKey;
    this.selectedTestKey = matchedKey;

    // Load SubGroups from backend
    this.loadSubGroupsForTest(labTest.id);

    // Update leafNode and paperSub
    const def = this.testDatabase[matchedKey];
    if (def) {
      this.leafNode = def.leaf;
      this.paperSub = `${labTest.name} • ${def.sub}`;
    } else {
      const isChem = !!labTest.isChemicalTest ||
        (labTest.department && labTest.department.toLowerCase().includes('chem')) ||
        (labTest.name && (labTest.name.toLowerCase().includes('spectro') || labTest.name.toLowerCase().includes('chem')));
      const dept = isChem ? 'Chemical' : 'General';
      this.leafNode = `${dept} / ${labTest.name}`;
      this.paperSub = labTest.name;
    }

    // Mount layout sections & sync live parameters from database
    this.sections = this.getDefaultSectionsForTest(matchedKey);
    if (this.sections.length > 0) {
      this.selectedSectionId = this.sections[0].id;
    }
    this.syncLiveParametersForTest(matchedKey);
    this.loadSavedLayoutForTest();

    this.toastService.show(`Target Test: ${labTest.name} (Mapped to ${this.getArchetypeLabel(matchedKey)})`, 'info');
  }

  // Indirect Structure Preset Loading
  loadSelectedStructurePreset(): void {
    if (!this.selectedPresetToLoad) {
      this.toastService.show('Please select a structure preset to load', 'warning');
      return;
    }

    const presetKey = this.selectedPresetToLoad;
    const archLabel = this.getArchetypeLabel(presetKey);

    if (this.sections && this.sections.length > 0) {
      const confirmed = window.confirm(`Loading preset "${archLabel}" will replace current canvas layout sections with the preset structure. Do you want to proceed?`);
      if (!confirmed) {
        return;
      }
    }

    this.selectedArchetypeKey = presetKey;
    this.selectedTestKey = presetKey;

    // Mount visual layout sections of the chosen structural archetype
    this.sections = this.getDefaultSectionsForTest(presetKey);
    this.isMapped = true;
    if (this.sections.length > 0) {
      this.selectedSectionId = this.sections[0].id;
    }
    this.syncLiveParametersForTest(presetKey);

    this.toastService.show(`Layout Structure: "${archLabel}" loaded into canvas`, 'success');
    // Reset dropdown selection back to empty so nothing stays selected (protects against accidental re-selection)
    this.selectedPresetToLoad = '';
  }

  onLayoutArchetypeChange(archetypeKey: string): void {
    this.selectedArchetypeKey = archetypeKey;
    this.selectedTestKey = archetypeKey;

    // Mount visual layout sections of the chosen structural archetype
    this.sections = this.getDefaultSectionsForTest(archetypeKey);
    this.isMapped = true;
    if (this.sections.length > 0) {
      this.selectedSectionId = this.sections[0].id;
    }

    const archLabel = this.getArchetypeLabel(archetypeKey);
    this.toastService.show(`Layout Structure: "${archLabel}" mapped to ${this.currentLabTestName}`, 'success');
  }

  // Wrapper for backwards compatibility
  onTestChange(key: string): void {
    this.onLayoutArchetypeChange(key);
  }

  getArchetypeLabel(key: string): string {
    const arch = this.layoutArchetypeList.find(a => a.key === key);
    return arch ? arch.label : key;
  }

  getArchetypeKeyForLabTest(labTest: any): string {
    if (!labTest) return 'tensile';

    // Direct dbTestId match
    const directMatch = Object.values(this.testDatabase).find(t => t.dbTestId === labTest.id);
    if (directMatch) return directMatch.key;

    // Match by name
    const n = (labTest.name || '').toLowerCase();
    if (n.includes('tensile')) return 'tensile';
    if (n.includes('charpy')) return 'impact';
    if (n.includes('izod')) return 'izod';
    if (n.includes('micro vickers') || n.includes('micro-vickers')) return 'micro_vickers';
    if (n.includes('weld survey') || n.includes('multi-location') || n.includes('multi location')) return 'hardness_multiloc';
    if (n.includes('effective case depth') || n.includes('case depth (hardness)')) return 'case_depth_hardness';
    if (n.includes('case depth') && n.includes('micro')) return 'case_depth_micro';
    if (n.includes('rockwell') || n.includes('hardness')) return 'rockwell';
    if (n.includes('oes') || n.includes('spectro') || labTest.isChemicalTest) return 'oes';
    if (n.includes('grain size')) return 'grain_size';
    if (n.includes('ferrite')) return 'ferrite_content';
    if (n.includes('macro')) return 'macro_weld';
    if (n.includes('metallograph') || n.includes('microstructure')) return 'metallography';
    if (n.includes('salt spray') || n.includes('corrosion')) return 'corrosion_sst';

    return 'generic';
  }

  loadSubGroupsForTest(labTestId: number): void {
    this.subGroups = [];
    this.selectedSubGroupId = null;
    this.analysisTypes = [];
    this.selectedAnalysisTypeId = null;

    this.labService.getSubGroupsByLabTest(labTestId).subscribe({
      next: (res: any[]) => {
        if (res && res.length > 0) {
          this.subGroups = res.map((sg: any) => ({ id: sg.id, name: sg.name }));
          this.selectedSubGroupId = this.subGroups[0].id;

          const firstSg = res[0];
          if (firstSg.analysisTypes && firstSg.analysisTypes.length > 0) {
            this.analysisTypes = firstSg.analysisTypes.map((at: any) => ({ id: at.id, name: at.name }));
            this.selectedAnalysisTypeId = this.analysisTypes[0].id;
          }
        }
      },
      error: (e) => console.error('Failed to load subgroups', e)
    });
  }

  onSubGroupChange(sgId: number | string): void {
    this.selectedSubGroupId = Number(sgId);
    const sg = this.subGroups.find(s => s.id === this.selectedSubGroupId);
    if (sg) {
      this.leafNode = `${this.currentLabTestName} / ${sg.name}`;
      this.syncLiveParametersForTest(this.selectedArchetypeKey);
      this.toastService.show(`Variant: ${sg.name}`, 'info');
    }
  }

  onAnalysisTypeChange(atId: number | string): void {
    this.selectedAnalysisTypeId = Number(atId);
    const at = this.analysisTypes.find(a => a.id === this.selectedAnalysisTypeId);
    if (at) {
      const sg = this.subGroups.find(s => s.id === this.selectedSubGroupId);
      this.leafNode = `${this.currentLabTestName} / ${sg?.name || 'Base'} / ${at.name}`;
      this.syncLiveParametersForTest(this.selectedArchetypeKey);
      this.toastService.show(`Matrix: ${at.name}`, 'info');
    }
  }

  // Palette Add Section
  addSection(type: string): void {
    const sec = this.createSectionObject(type);
    this.sections.push(sec);
    this.selectedSectionId = sec.id;
    this.toastService.show(`${this.componentNames[type]} added to layout`, 'success');
  }

  selectSection(id: number): void {
    this.selectedSectionId = id;
  }

  deleteSection(id?: number): void {
    const targetId = id || this.selectedSectionId;
    if (!targetId) {
      this.toastService.show('Please select a section to remove', 'warning');
      return;
    }
    this.sections = this.sections.filter(s => s.id !== targetId);
    if (this.selectedSectionId === targetId) {
      this.selectedSectionId = this.sections.length > 0 ? this.sections[0].id : null;
    }
    this.toastService.show('Section removed', 'info');
  }

  duplicateSection(id?: number): void {
    const targetId = id || this.selectedSectionId;
    if (!targetId) {
      this.toastService.show('Please select a section to duplicate', 'warning');
      return;
    }
    const idx = this.sections.findIndex(s => s.id === targetId);
    if (idx === -1) return;
    const orig = this.sections[idx];
    const newId = Date.now() + Math.floor(Math.random() * 1000);
    const newTitle = `${orig.title} (Copy)`;
    const cleanTitle = newTitle.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    const dupConfig = JSON.parse(JSON.stringify(orig.config));
    dupConfig.sectionKey = `${cleanTitle}_${newId}`;
    const dup: ExecutionSection = {
      id: newId,
      type: orig.type,
      title: newTitle,
      config: dupConfig
    };
    this.sections.splice(idx + 1, 0, dup);
    this.selectedSectionId = dup.id;
    this.toastService.show('Section duplicated', 'success');
  }

  toggleOrientation(sec?: ExecutionSection): void {
    const s = sec || this.selectedSection;
    if (!s) return;
    s.config.orientation = s.config.orientation === 'Specimens × Parameters'
      ? 'Parameters × Specimens'
      : 'Specimens × Parameters';
    delete s.config.tableColumns;
    delete s.config.tableRows;
    this.ensureTableColumns(s);
    this.ensureTableRows(s);
    this.toastService.show(`Matrix orientation: ${s.config.orientation}`, 'info');
  }

  moveSection(dir: number, id?: number): void {
    const targetId = id || this.selectedSectionId;
    if (!targetId) return;
    const idx = this.sections.findIndex(s => s.id === targetId);
    if (idx === -1) return;
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= this.sections.length) return;
    const item = this.sections.splice(idx, 1)[0];
    this.sections.splice(targetIdx, 0, item);
    this.selectedSectionId = targetId;
  }

  clearAllSections(): void {
    if (this.sections.length === 0) return;
    if (confirm('Are you sure you want to clear all sections from this layout?')) {
      this.sections = [];
      this.selectedSectionId = null;
      this.toastService.show('All sections cleared', 'info');
    }
  }

  // Toggle Demo Data
  toggleDemoData(): void {
    this.demoMode = !this.demoMode;
    this.toastService.show(this.demoMode ? 'Demo data enabled' : 'Demo data disabled', 'info');
  }

  // Reset to default
  resetLayout(): void {
    this.initDefaultSections();
    this.demoMode = false;
    this.toastService.show('Layout reset to default template', 'info');
  }

  // Zoom controls
  zoom(delta: number): void {
    this.zoomLevel = Math.max(0.7, Math.min(1.3, Math.round((this.zoomLevel + delta * 0.05) * 100) / 100));
  }

  loadAllAvailableTests(): void {
    // 1. Fetch unified dropdown items (which have full Leaf Node paths and chemical resolution)
    this.labService.getUnifiedTestMethodDropdown('', 0, 500).subscribe({
      next: (unifiedList: any[]) => {
        const leafItems: any[] = [];
        if (Array.isArray(unifiedList)) {
          unifiedList.forEach((item: any) => {
            if (item.selectable) {
              const addVals = item.additionalValues || {};
              const masterTestId = addVals.masterTestId ? Number(addVals.masterTestId) : (item.nodeType === 'TestGroup' ? Number(item.id) : 0);
              const masterName = addVals.masterTestName || (item.nodeType === 'TestGroup' ? item.name : '') || item.name;
              const subGroupId = addVals.subGroupId ? Number(addVals.subGroupId) : (item.nodeType === 'SubGroup' ? Number(item.id) : null);
              const subGroupName = addVals.subGroupName || (item.nodeType === 'SubGroup' ? item.name : '');
              const analysisTypeId = addVals.analysisTypeId ? Number(addVals.analysisTypeId) : (item.nodeType === 'AnalysisType' ? Number(item.id) : null);
              const isChem = !!addVals.isChemical || !!item.isChemical ||
                (masterName && (masterName.toLowerCase().includes('spectro') || masterName.toLowerCase().includes('chem'))) ||
                (item.name && (item.name.toLowerCase().includes('spectro') || item.name.toLowerCase().includes('oes') || item.name.toLowerCase().includes('chem')));
              const disc = isChem ? 'Chemical' : 'General';

              let uniqueKey = '';
              let leafPath = '';
              if (item.nodeType === 'AnalysisType') {
                uniqueKey = `at_${analysisTypeId || item.id}`;
                leafPath = `${disc} / ${masterName} / ${subGroupName} / ${item.name}`;
              } else if (item.nodeType === 'SubGroup') {
                uniqueKey = `sg_${subGroupId || item.id}`;
                leafPath = `${disc} / ${masterName} / ${item.name}`;
              } else {
                uniqueKey = `lt_${masterTestId || item.id}`;
                leafPath = `${disc} / ${item.name} (Direct Leaf)`;
              }

              leafItems.push({
                uniqueKey: uniqueKey,
                id: masterTestId,
                leafId: item.id,
                masterTestId: masterTestId,
                masterTestName: masterName,
                subGroupId: subGroupId,
                subGroupName: subGroupName,
                analysisTypeId: analysisTypeId,
                name: item.name,
                parentTestName: masterName,
                leafNode: item.name,
                subGroup: subGroupName,
                isChemical: isChem,
                department: disc,
                code: item.nodeType || 'LEAF',
                leafPath: leafPath,
                fullDisplayName: addVals.fullDisplayName || leafPath
              });
            }
          });
        }

        // 2. Also fetch all root tests to ensure any standalone test is present
        this.labService.getAllLaboratoryTests({
          PageNumber: 1,
          PageSize: 500,
          searchTerm: '',
          sortByColumn: 'name',
          sortOrder: 'asc'
        }).subscribe({
          next: (res: any) => {
            const list = res?.items || res?.data || (Array.isArray(res) ? res : []);
            list.forEach((t: any) => {
              const isChem = !!t.isChemicalTest || (t.departmentName === 'Chemical') ||
                (t.name && (t.name.toLowerCase().includes('spectro') || t.name.toLowerCase().includes('chem')));
              const disc = isChem ? 'Chemical' : 'General';
              const uniqueKey = `lt_${t.id}`;

              const alreadyHas = leafItems.some(l => l.uniqueKey === uniqueKey || l.masterTestId === t.id || l.id === t.id);
              if (!alreadyHas) {
                leafItems.push({
                  uniqueKey: uniqueKey,
                  id: t.id,
                  leafId: t.id,
                  masterTestId: t.id,
                  masterTestName: t.name,
                  subGroupId: null,
                  subGroupName: '',
                  analysisTypeId: null,
                  name: t.name,
                  parentTestName: t.name,
                  leafNode: t.name,
                  subGroup: '',
                  isChemical: isChem,
                  department: disc,
                  code: t.code || 'TEST',
                  leafPath: `${disc} / ${t.name} (Direct Leaf)`,
                  fullDisplayName: `${t.name} (${disc})`
                });
              }
            });

            this.availableAllTests = leafItems;
            this.syncAdditionalMappedTestIds();
          },
          error: () => {
            this.availableAllTests = leafItems;
            this.syncAdditionalMappedTestIds();
          }
        });
      },
      error: () => {
        this.labService.getAllLaboratoryTests({
          PageNumber: 1,
          PageSize: 500,
          searchTerm: '',
          sortByColumn: 'name',
          sortOrder: 'asc'
        }).subscribe({
          next: (res: any) => {
            const list = res?.items || res?.data || (Array.isArray(res) ? res : []);
            this.availableAllTests = list.map((t: any) => {
              const isChem = !!t.isChemicalTest || (t.departmentName === 'Chemical') ||
                (t.name && (t.name.toLowerCase().includes('spectro') || t.name.toLowerCase().includes('chem')));
              const disc = isChem ? 'Chemical' : 'General';
              return {
                id: t.id,
                name: t.name,
                leafNode: t.name,
                isChemical: isChem,
                department: disc,
                code: t.code || 'LAB',
                leafPath: `${disc} / ${t.name}`,
                fullDisplayName: `${t.name} (${disc})`
              };
            });
          }
        });
      }
    });
  }

  // Load Database Layout for Hierarchy
  loadDatabaseLayoutForHierarchy(testId: number | null, subGroupId: number | null, analysisTypeId: number | null, leaf: string, matchedKey: string): void {
    if (!testId && !this.isGlobalDefault) {
      this.handleNoDatabaseLayoutFound(testId || 1, matchedKey);
      return;
    }

    this.testLayoutService.getLayoutByHierarchy(testId, subGroupId, analysisTypeId, leaf, this.selectedTestMethodId, this.selectedTestMethodName).subscribe({
      next: (res) => {
        if (res && res.id) {
          this.currentLayoutId = res.id;
          this.layoutCode = res.layoutCode || `TL-${(matchedKey || 'GEN').toUpperCase()}-${testId || 'GLOBAL'}`;
          this.layoutName = res.layoutName || (res.isGlobalDefault ? 'Global Default Test Execution Layout' : `${this.resolvedHierarchy.fullDisplayName} Layout`);
          this.layoutRev = res.revision || '1.0';
          this.currentVersion = res.version || 1;
          this.layoutStatus = res.status || 'Published';
          this.isDefaultLayout = res.isDefault ?? true;
          this.isGlobalDefault = res.isGlobalDefault ?? false;
          this.applyToLeaf = res.applyToLeaf ?? true;
          this.loadedSource = 'db';
          if (res.testMethodSpecificationID) {
            this.selectedTestMethodId = res.testMethodSpecificationID;
          }
          if (res.testMethodName) {
            this.selectedTestMethodName = res.testMethodName;
          }

          let parsedMappedLeafKeys: string[] = [];
          try {
            const config = JSON.parse(res.layoutConfigJson);
            if (config.mappedLeafKeys && Array.isArray(config.mappedLeafKeys)) {
              parsedMappedLeafKeys = config.mappedLeafKeys;
            }
            if (config.sections && Array.isArray(config.sections) && config.sections.length > 0) {
              this.sections = config.sections;
            }
            if (config.archetypeKey) {
              this.selectedArchetypeKey = config.archetypeKey;
            }
            const key = this.selectedTestKey;
            if (config.customConditions) this.customConditionsMap[key] = config.customConditions;
            if (config.customDimensions) this.customDimensionsMap[key] = config.customDimensions;
            if (config.deselectedConditions) this.deselectedConditionsMap[key] = config.deselectedConditions;
            if (config.deselectedDimensions) this.deselectedDimensionsMap[key] = config.deselectedDimensions;
          } catch (e) {
            console.error('Error parsing layout config JSON from DB', e);
          }

          if (parsedMappedLeafKeys.length > 0) {
            this.additionalMappedLeafKeys = parsedMappedLeafKeys;
          } else if (res.mappedLeafNodes && Array.isArray(res.mappedLeafNodes)) {
            this.additionalMappedLeafKeys = res.mappedLeafNodes.map((m: any) => m.uniqueKey).filter(Boolean);
          } else {
            this.additionalMappedLeafKeys = [];
          }
          this.syncAdditionalMappedTestIds();

          this.ensureSectionKeys();
          this.isMapped = true;
          this.selectedSectionId = this.sections.length > 0 ? this.sections[0].id : null;
          this.toastService.show(`Loaded layout "${res.layoutName}" from database`, 'info');
        } else {
          this.handleNoDatabaseLayoutFound(testId || 1, matchedKey);
        }
      },
      error: (err) => {
        console.warn('No database layout found or error fetching', err);
        this.handleNoDatabaseLayoutFound(testId || 1, matchedKey);
      }
    });
  }

  loadLayoutById(id: number): void {
    this.testLayoutService.getLayoutById(id).subscribe({
      next: (res) => {
        if (res && res.id) {
          this.currentLayoutId = res.id;
          this.layoutCode = res.layoutCode;
          this.layoutName = res.layoutName;
          this.layoutRev = res.revision || '1.0';
          this.currentVersion = res.version || 1;
          this.layoutStatus = res.status || 'Published';
          this.isDefaultLayout = res.isDefault ?? true;
          this.isGlobalDefault = res.isGlobalDefault ?? false;
          this.applyToLeaf = res.applyToLeaf ?? true;
          this.leafNode = res.leafNode || this.leafNode;
          this.loadedSource = 'db';
          this.selectedPresetToLoad = ''; // Ensure no preset is selected when editing from list

          if (res.testMethodSpecificationID) {
            this.selectedTestMethodId = res.testMethodSpecificationID;
          } else {
            this.selectedTestMethodId = null;
          }
          if (res.testMethodName) {
            this.selectedTestMethodName = res.testMethodName;
          } else {
            this.selectedTestMethodName = '';
          }

          if (res.laboratoryTestID) {
            this.selectedLabTestId = res.laboratoryTestID;
            this.selectedUnifiedTestId = res.laboratoryTestID;
          }

          if (res.laboratoryTest) {
            const isChem = !!res.laboratoryTest.isChemicalTest ||
              (res.laboratoryTest.name && (res.laboratoryTest.name.toLowerCase().includes('spectro') || res.laboratoryTest.name.toLowerCase().includes('chem')));
            const disc = isChem ? 'Chemical' : 'General';
            this.resolvedHierarchy = {
              groupId: res.laboratoryTest.id,
              groupName: res.laboratoryTest.name,
              subGroupId: res.laboratoryTestSubGroupID,
              subGroupName: res.subGroup?.name || '',
              analysisTypeId: res.laboratoryTestAnalysisTypeID,
              leafName: res.analysisType?.name || res.subGroup?.name || res.laboratoryTest.name,
              fullDisplayName: `${res.laboratoryTest.name}${res.subGroup?.name ? ' - ' + res.subGroup.name : ''}${res.analysisType?.name ? ' (' + res.analysisType.name + ')' : ''}`,
              isChemical: isChem
            };

            if (!this.leafNode || this.leafNode.startsWith('General /') || this.leafNode.includes('Universal Layout') || this.leafNode.includes('Room Temperature')) {
              this.leafNode = `${disc} / ${res.laboratoryTest.name}${res.subGroup?.name ? ' / ' + res.subGroup.name : ''}${res.analysisType?.name ? ' / ' + res.analysisType.name : ''}`;
            }
          }

          let parsedMappedLeafKeys: string[] = [];
          try {
            const config = JSON.parse(res.layoutConfigJson);
            if (config.mappedLeafKeys && Array.isArray(config.mappedLeafKeys)) {
              parsedMappedLeafKeys = config.mappedLeafKeys;
            }
            if (config.sections && Array.isArray(config.sections) && config.sections.length > 0) {
              this.sections = config.sections;
            }
            if (config.archetypeKey) {
              this.selectedArchetypeKey = config.archetypeKey;
            }
            const key = this.selectedTestKey;
            if (config.customConditions) this.customConditionsMap[key] = config.customConditions;
            if (config.customDimensions) this.customDimensionsMap[key] = config.customDimensions;
            if (config.deselectedConditions) this.deselectedConditionsMap[key] = config.deselectedConditions;
            if (config.deselectedDimensions) this.deselectedDimensionsMap[key] = config.deselectedDimensions;
          } catch (e) {
            console.error('Error parsing layout config JSON from DB', e);
          }

          if (parsedMappedLeafKeys.length > 0) {
            this.additionalMappedLeafKeys = parsedMappedLeafKeys;
          } else if (res.mappedLeafNodes && Array.isArray(res.mappedLeafNodes)) {
            this.additionalMappedLeafKeys = res.mappedLeafNodes.map((m: any) => m.uniqueKey).filter(Boolean);
          } else {
            this.additionalMappedLeafKeys = [];
          }
          this.syncAdditionalMappedTestIds();

          this.ensureSectionKeys();
          this.isMapped = true;
          this.selectedSectionId = this.sections.length > 0 ? this.sections[0].id : null;
          this.toastService.show(`Loaded layout "${res.layoutName}"`, 'success');
        }
      },
      error: (err) => {
        console.error('Failed to load layout by id', err);
        this.toastService.show('Failed to load requested layout format', 'error');
      }
    });
  }

  handleNoDatabaseLayoutFound(testId: number, matchedKey: string): void {
    this.currentLayoutId = null;
    this.loadedSource = 'preset';
    this.layoutCode = `TL-${(matchedKey || 'GEN').toUpperCase()}-${testId || 1}`;
    this.layoutName = `${this.resolvedHierarchy.fullDisplayName} Universal Layout`;
    this.layoutRev = '1.0';
    this.currentVersion = 1;
    this.layoutStatus = 'Published';
    this.isDefaultLayout = true;
    this.isMapped = false;
    this.additionalMappedTestIds = [];
    this.loadSavedLayoutForTest();
    this.ensureSectionKeys();
  }

  // Stable Section Key Management (Auto-generated & Non-editable)
  ensureSectionKeys(): void {
    if (!this.sections) return;
    this.sections.forEach(s => {
      if (!s.config) {
        s.config = {} as any;
      }
      if (!s.config.sectionKey || s.config.sectionKey.trim() === '') {
        s.config.sectionKey = this.generateSectionKey(s);
      }
    });
  }

  generateSectionKey(s: ExecutionSection): string {
    const clean = (s.title || s.type || 'section')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    return `${clean}_${(s.id || '').toString().toLowerCase()}`;
  }

  onSectionTitleChange(s: ExecutionSection): void {
    s.config.sectionKey = this.generateSectionKey(s);
  }

  // Global Default Layout Toggle
  onGlobalDefaultToggle(): void {
    if (this.isGlobalDefault) {
      this.isDefaultLayout = true;
      this.layoutCode = `TL-GLOBAL-${this.currentLayoutId || Date.now()}`;
      if (!this.layoutName || this.layoutName.includes('Universal Layout') || this.layoutName.includes('Tensile')) {
        this.layoutName = 'Global Default Test Execution Layout';
      }
      this.selectedArchetypeKey = 'generic';
      this.selectedTestKey = 'generic';
      this.sections = this.getDefaultSectionsForTest('generic');
      if (this.sections.length > 0) {
        this.selectedSectionId = this.sections[0].id;
      }
      this.toastService.show('Global Default enabled: generic runtime layout loaded (fallback for all tests)', 'info');
    } else {
      const archKey = this.resolvedHierarchy?.groupName ? this.getArchetypeKeyForUnifiedItem(this.selectedUnifiedTestItem, this.resolvedHierarchy.groupName) : 'generic';
      this.selectedArchetypeKey = archKey;
      this.selectedTestKey = archKey;
      this.layoutCode = `TL-${(this.selectedArchetypeKey || 'GEN').toUpperCase()}-${this.selectedLabTestId || 1}`;
      this.toastService.show('Global Default disabled: mapped to specific laboratory test', 'info');
    }
  }

  // Multi-Test Mapping Modal
  openMultiTestModal(): void {
    this.showMultiTestModal = true;
  }

  closeMultiTestModal(): void {
    this.showMultiTestModal = false;
  }

  getPrimaryLeafKey(): string {
    if (this.isGlobalDefault) return '';
    if (this.selectedAnalysisTypeId) {
      return `at_${this.selectedAnalysisTypeId}`;
    }
    if (this.selectedSubGroupId) {
      return `sg_${this.selectedSubGroupId}`;
    }
    if (this.selectedLabTestId) {
      return `lt_${this.selectedLabTestId}`;
    }
    return '';
  }

  toggleAdditionalTest(uniqueKey: string): void {
    if (!uniqueKey) return;
    if (uniqueKey === this.getPrimaryLeafKey()) {
      this.toastService.show('Primary Target Test is always mapped to this layout', 'info');
      return;
    }
    const idx = this.additionalMappedLeafKeys.indexOf(uniqueKey);
    if (idx > -1) {
      this.additionalMappedLeafKeys.splice(idx, 1);
    } else {
      this.additionalMappedLeafKeys.push(uniqueKey);
    }
    this.syncAdditionalMappedTestIds();
  }

  isAdditionalTestSelected(uniqueKey: string): boolean {
    if (!uniqueKey) return false;
    if (uniqueKey === this.getPrimaryLeafKey()) {
      return true;
    }
    return this.additionalMappedLeafKeys.includes(uniqueKey);
  }

  selectAllAdditionalTests(): void {
    const primaryKey = this.getPrimaryLeafKey();
    const filteredKeys = this.getFilteredAvailableTests()
      .map(t => t.uniqueKey)
      .filter(k => k && k !== primaryKey);
    this.additionalMappedLeafKeys = Array.from(new Set([...this.additionalMappedLeafKeys, ...filteredKeys]));
    this.syncAdditionalMappedTestIds();
  }

  clearAllAdditionalTests(): void {
    this.additionalMappedLeafKeys = [];
    this.syncAdditionalMappedTestIds();
  }

  syncAdditionalMappedTestIds(): void {
    const ids: number[] = [];
    for (const key of this.additionalMappedLeafKeys) {
      const item = this.availableAllTests.find(t => t.uniqueKey === key);
      if (item && item.id && !ids.includes(item.id)) {
        ids.push(item.id);
      }
    }
    this.additionalMappedTestIds = ids;
  }

  getFilteredAvailableTests(): any[] {
    if (!this.multiTestSearchTerm) return this.availableAllTests;
    const term = this.multiTestSearchTerm.toLowerCase();
    return this.availableAllTests.filter(t =>
      (t.name && t.name.toLowerCase().includes(term)) ||
      (t.parentTestName && t.parentTestName.toLowerCase().includes(term)) ||
      (t.code && t.code.toLowerCase().includes(term)) ||
      (t.department && t.department.toLowerCase().includes(term)) ||
      (t.subGroup && t.subGroup.toLowerCase().includes(term)) ||
      (t.leafNode && t.leafNode.toLowerCase().includes(term)) ||
      (t.leafPath && t.leafPath.toLowerCase().includes(term)) ||
      (t.fullDisplayName && t.fullDisplayName.toLowerCase().includes(term)) ||
      (t.isChemical && 'chemical'.includes(term)) ||
      (!t.isChemical && 'general'.includes(term))
    );
  }

  navigateToList(): void {
    this.router.navigate(['/test/layout-templates']);
  }

  // Save Layout to Database (Supports both in-place update and Save as New Revision)
  saveLayout(forceNewRevision: boolean = false): void {
    const testId = this.isGlobalDefault ? null : (this.selectedLabTestId || this.resolvedHierarchy.groupId);
    if (!this.isGlobalDefault && !testId) {
      this.toastService.show('Select a Laboratory Test first (or enable Global Default Layout)', 'warning');
      return;
    }
    if (this.sections.length === 0) {
      this.toastService.show('Add at least one section before saving', 'warning');
      return;
    }

    this.ensureSectionKeys();

    const mappedLeafNodes: any[] = [];
    const allMappedIds: number[] = [];
    if (testId) allMappedIds.push(testId);

    for (const key of this.additionalMappedLeafKeys) {
      const item = this.availableAllTests.find(t => t.uniqueKey === key);
      if (item) {
        if (item.id && !allMappedIds.includes(item.id)) {
          allMappedIds.push(item.id);
        }
        mappedLeafNodes.push({
          laboratoryTestID: item.masterTestId || item.id,
          laboratoryTestSubGroupID: item.subGroupId || null,
          laboratoryTestAnalysisTypeID: item.analysisTypeId || null,
          leafNode: item.leafNode || item.name,
          uniqueKey: item.uniqueKey
        });
      }
    }

    const configPayload = {
      archetypeKey: this.selectedArchetypeKey,
      testKey: this.selectedTestKey,
      layoutName: this.layoutName,
      revision: this.layoutRev,
      sections: this.sections,
      testMethodSpecificationID: this.selectedTestMethodId,
      testMethodName: this.selectedTestMethodName,
      customConditions: this.customConditionsMap[this.selectedTestKey] || [],
      customDimensions: this.customDimensionsMap[this.selectedTestKey] || [],
      deselectedConditions: this.deselectedConditionsMap[this.selectedTestKey] || [],
      deselectedDimensions: this.deselectedDimensionsMap[this.selectedTestKey] || [],
      mappedLeafKeys: this.additionalMappedLeafKeys,
      mappedLeafNodes: mappedLeafNodes
    };

    const archetypeSummary = Array.from(new Set(this.sections.map(s => s.type))).join(', ');
    const generatedCode = this.layoutCode || (this.isGlobalDefault ? `TL-GLOBAL-${Date.now()}` : `TL-${(this.selectedArchetypeKey || 'GEN').toUpperCase()}-${testId}`);
    const defaultName = this.layoutName || (this.isGlobalDefault ? 'Global Default Test Execution Layout' : `${this.resolvedHierarchy.fullDisplayName} Layout`);

    let revToSave = this.layoutRev || '1.0';
    let versionToSave = this.currentVersion || 1;

    if (forceNewRevision) {
      versionToSave += 1;
      const revNum = parseFloat(revToSave);
      revToSave = !isNaN(revNum) ? (revNum + 0.1).toFixed(1) : `${revToSave}.1`;
      this.layoutRev = revToSave;
      this.currentVersion = versionToSave;
    }

    const dto: TestLayoutTemplateDto = {
      id: forceNewRevision ? 0 : (this.currentLayoutId || 0),
      layoutCode: generatedCode,
      layoutName: defaultName,
      revision: revToSave,
      version: versionToSave,
      status: this.layoutStatus || 'Published',
      isDefault: this.isDefaultLayout,
      isGlobalDefault: this.isGlobalDefault,
      laboratoryTestID: testId,
      mappedTestIDs: allMappedIds,
      mappedLeafNodes: mappedLeafNodes,
      laboratoryTestSubGroupID: this.isGlobalDefault ? null : (this.selectedSubGroupId || this.resolvedHierarchy.subGroupId),
      laboratoryTestAnalysisTypeID: this.isGlobalDefault ? null : (this.selectedAnalysisTypeId || this.resolvedHierarchy.analysisTypeId),
      testMethodSpecificationID: this.selectedTestMethodId,
      testMethodName: this.selectedTestMethodName,
      leafNode: this.isGlobalDefault ? 'Global / All Tests' : this.leafNode,
      applyToLeaf: this.applyToLeaf,
      sectionCount: this.sections.length,
      archetypeSummary,
      layoutConfigJson: JSON.stringify(configPayload),
      outputPayloadSchemaJson: this.getJsonPayloadPreview()
    };

    if (dto.id && dto.id > 0) {
      this.testLayoutService.updateLayout(dto).subscribe({
        next: () => {
          this.isMapped = true;
          this.loadedSource = 'db';
          this.backupToLocalStorage();
          this.toastService.show(`Layout updated in database (Rev ${dto.revision || '1.0'})`, 'success');
        },
        error: (err) => {
          console.error('Update layout failed', err);
          this.backupToLocalStorage();
          this.toastService.show('Failed to update in database (saved locally as draft)', 'warning');
        }
      });
    } else {
      this.testLayoutService.createLayout(dto).subscribe({
        next: (res) => {
          this.currentLayoutId = res.id;
          this.isMapped = true;
          this.loadedSource = 'db';
          this.backupToLocalStorage();
          this.toastService.show(`Layout saved to database (Rev ${dto.revision || '1.0'})`, 'success');
        },
        error: (err) => {
          console.error('Create layout failed', err);
          this.backupToLocalStorage();
          this.toastService.show('Failed to save in database (saved locally as draft)', 'warning');
        }
      });
    }
  }

  deleteCurrentLayout(): void {
    if (!this.currentLayoutId) return;
    if (!confirm(`Are you sure you want to delete layout "${this.layoutName}" from the database?`)) return;

    this.testLayoutService.deleteLayout(this.currentLayoutId).subscribe({
      next: () => {
        this.toastService.show('Layout deleted from database', 'success');
        this.currentLayoutId = null;
        this.isMapped = false;
        this.sections = this.getDefaultSectionsForTest(this.selectedArchetypeKey);
        if (this.sections.length > 0) this.selectedSectionId = this.sections[0].id;
      },
      error: (err) => {
        console.error('Failed to delete layout', err);
        this.toastService.show('Failed to delete layout', 'error');
      }
    });
  }

  backupToLocalStorage(): void {
    try {
      const saved = JSON.parse(localStorage.getItem('lims_universal_layouts') || '{}');
      const payload = {
        testKey: this.selectedTestKey,
        name: this.layoutName,
        rev: this.layoutRev,
        savedAt: new Date().toISOString(),
        sections: this.sections
      };
      saved[this.selectedTestKey] = payload;
      if (this.applyToLeaf && this.currentTest.leaf) {
        saved[`leaf:${this.currentTest.leaf}`] = payload;
      }
      localStorage.setItem('lims_universal_layouts', JSON.stringify(saved));
    } catch (e) {
      console.warn('Local storage backup failed', e);
    }
  }

  // Load Saved Layout (Local fallback)
  loadSavedLayoutForTest(): void {
    try {
      const saved = JSON.parse(localStorage.getItem('lims_universal_layouts') || '{}');
      const testLayout = saved[this.selectedTestKey] || (this.currentTest.leaf ? saved[`leaf:${this.currentTest.leaf}`] : null);
      if (testLayout && Array.isArray(testLayout.sections) && testLayout.sections.length > 0) {
        this.sections = JSON.parse(JSON.stringify(testLayout.sections));
        if (testLayout.name) this.layoutName = testLayout.name;
        if (testLayout.rev) this.layoutRev = testLayout.rev;
        this.isMapped = true;
        if (this.sections.length > 0) {
          this.selectedSectionId = this.sections[0].id;
        }
      } else {
        this.sections = this.getDefaultSectionsForTest(this.selectedTestKey);
        this.isMapped = false;
        if (this.sections.length > 0) {
          this.selectedSectionId = this.sections[0].id;
        }
      }
    } catch (e) {
      console.error(e);
      this.sections = this.getDefaultSectionsForTest(this.selectedTestKey);
      this.isMapped = false;
      if (this.sections.length > 0) {
        this.selectedSectionId = this.sections[0].id;
      }
    }
  }

  // Load Database Tests (2-level & 3-level hierarchy integration)
  loadDatabaseTests(): void {
    const filter = {
      PageNumber: 1,
      PageSize: 100,
      searchTerm: '',
      sortByColumn: 'Name',
      sortOrder: 'asc',
      filter: []
    };
    this.labService.getAllLaboratoryTests(filter).subscribe({
      next: (res) => {
        const dbTests: any[] = res?.items || [];
        if (dbTests.length > 0) {
          this.actualLabTests = dbTests.map((t: any) => ({
            id: t.id,
            name: t.name,
            isChemicalTest: !!t.isChemicalTest,
            code: t.code,
            department: t.department || (t.isChemicalTest ? 'Chemical' : 'General')
          }));
        } else {
          this.initFallbackActualLabTests();
        }

        // Set default selected lab test (Tensile Test or first test)
        if (!this.selectedLabTestId && this.actualLabTests.length > 0) {
          this.selectedLabTestId = this.actualLabTests[0].id;
        }

        // Match each preset by its dbTestId
        Object.values(this.testDatabase).forEach(test => {
          if (test.dbTestId) {
            const match = this.actualLabTests.find(t => t.id === test.dbTestId);
            if (match) {
              test.isChemical = !!match.isChemicalTest;
            }
          }
        });

        // Load subgroups for active lab test
        if (this.selectedLabTestId) {
          this.loadSubGroupsForTest(this.selectedLabTestId);
        }

        this.syncLiveParametersForTest(this.selectedArchetypeKey);
      },
      error: (e) => {
        console.error('Failed to load DB tests', e);
        this.initFallbackActualLabTests();
        if (!this.selectedLabTestId && this.actualLabTests.length > 0) {
          this.selectedLabTestId = this.actualLabTests[0].id;
        }
        this.syncLiveParametersForTest(this.selectedArchetypeKey);
      }
    });
  }

  initFallbackActualLabTests(): void {
    this.actualLabTests = [
      { id: 1, name: 'Tensile Test', isChemicalTest: false, code: 'TENSILE', department: 'General' },
      { id: 7, name: 'Hardness Test (Rockwell / Brinell)', isChemicalTest: false, code: 'HARDNESS', department: 'General' },
      { id: 8, name: 'Charpy Impact Test', isChemicalTest: false, code: 'CHARPY', department: 'General' },
      { id: 9, name: 'Izod Impact Test', isChemicalTest: false, code: 'IZOD', department: 'General' },
      { id: 10, name: 'Micro Vickers Hardness', isChemicalTest: false, code: 'MICRO_VICKERS', department: 'General' },
      { id: 11, name: 'Hardness Multi-Location (Weld Survey)', isChemicalTest: false, code: 'HARDNESS_SURVEY', department: 'General' },
      { id: 12, name: 'Effective Case Depth', isChemicalTest: false, code: 'CASE_DEPTH', department: 'Heat Treatment' },
      { id: 2, name: 'Spectro', isChemicalTest: true, code: 'SPECTRO', department: 'Chemical' },
      { id: 5, name: 'Spectro OES Chemical Analysis', isChemicalTest: true, code: 'OES', department: 'Chemical' },
      { id: 13, name: 'Metallography Microstructural Analysis', isChemicalTest: false, code: 'METALLOGRAPHY', department: 'Metallography' },
      { id: 14, name: 'Grain Size Analysis', isChemicalTest: false, code: 'GRAIN_SIZE', department: 'Metallography' },
      { id: 15, name: 'Ferrite Content Phase Analysis', isChemicalTest: false, code: 'FERRITE', department: 'Metallography' },
      { id: 16, name: 'Macroscopic Examination (Weld)', isChemicalTest: false, code: 'MACRO_WELD', department: 'Metallography' },
      { id: 17, name: 'Salt Spray Corrosion Test (SST)', isChemicalTest: false, code: 'SST', department: 'Corrosion' }
    ];
  }

  // Sync Live Parameters from DB (supports 3-level Chemical & 2-level General)
  syncLiveParametersForTest(testKey: string): void {
    const test = this.testDatabase[testKey];
    if (!test || !test.dbTestId) return;

    if (test.isChemical) {
      // 3-Level hierarchy: LaboratoryTest -> SubGroup (Metal Base) -> AnalysisType (Matrix/Technique) -> Parameters
      this.labService.getSubGroupsByLabTest(test.dbTestId).subscribe({
        next: (subGroups: any[]) => {
          if (subGroups && subGroups.length > 0) {
            const firstSg = subGroups[0];
            test.subGroupId = firstSg.id;
            if (firstSg.analysisTypes && firstSg.analysisTypes.length > 0) {
              const firstAt = firstSg.analysisTypes[0];
              test.analysisTypeId = firstAt.id;
              this.labService.getAnalysisTypeDetails(firstAt.id).subscribe({
                next: (atDetails: any) => {
                  const pList = atDetails?.parameters || [];
                  if (pList.length > 0) {
                    test.params = pList.map((p: any) => ({
                      id: p.parameter?.id || p.parameterId,
                      name: p.parameter?.name || p.parameterName || 'Parameter',
                      unit: p.parameter?.parameterUnit?.name || p.parameterUnit || '%',
                      requirement: 'Runtime',
                      isCalculated: !!(p.parameter?.isCalculated),
                      formula: p.parameter?.formula || '',
                      formulaDisplay: p.parameter?.formulaDisplay || ''
                    }));
                    test.demo = test.params.map(() => '0.25');
                  }
                },
                error: () => {
                  this.labService.getAnalysisTypeParameters(firstAt.id).subscribe({
                    next: (paramsList: any[]) => {
                      if (paramsList && paramsList.length > 0) {
                        test.params = paramsList.map((p: any) => ({
                          id: p.id,
                          name: p.name || 'Parameter',
                          unit: '%',
                          requirement: 'Runtime'
                        }));
                        test.demo = test.params.map(() => '0.25');
                      }
                    },
                    error: (err) => console.error('Failed to load AnalysisType parameters', err)
                  });
                }
              });
            }
          }
        },
        error: (err) => console.error('Failed to load Chemical SubGroups', err)
      });
    } else {
      // 2-Level hierarchy: LaboratoryTest -> SubGroup -> Parameters & Standards
      this.labService.getSubGroupsByLabTest(test.dbTestId).subscribe({
        next: (subGroups: any[]) => {
          if (subGroups && subGroups.length > 0) {
            const firstSg = subGroups[0];
            test.subGroupId = firstSg.id;
            this.labService.getSubGroupDetails(firstSg.id).subscribe({
              next: (sgDetails: any) => {
                if (sgDetails?.parameters && sgDetails.parameters.length > 0) {
                  test.params = sgDetails.parameters.map((p: any) => ({
                    id: p.parameter?.id || p.parameterId,
                    name: p.parameter?.name || p.parameterName || 'Parameter',
                    unit: p.parameter?.parameterUnit?.name || p.parameterUnit || '—',
                    requirement: 'Runtime',
                    isCalculated: !!(p.parameter?.isCalculated),
                    formula: p.parameter?.formula || '',
                    formulaDisplay: p.parameter?.formulaDisplay || ''
                  }));
                  test.demo = test.params.map(() => '100');
                }
              },
              error: (err) => console.error('Failed to load SubGroup details', err)
            });

            // Sync live standard specifications
            this.labService.getTestMethodSpecificationBySubGroup(firstSg.id).subscribe({
              next: (specs: any[]) => {
                if (specs && specs.length > 0) {
                  const specNames = specs.map((s: any) => s.name).join(' • ');
                  test.sub = `${firstSg.name} • ${specNames}`;
                }
              },
              error: (err) => console.error('Failed to load SubGroup specifications', err)
            });
          }
        },
        error: (err) => console.error('Failed to load SubGroups', err)
      });
    }
  }



  // Execution Preview Modal
  openPreviewModal(): void {
    this.previewEntries = {};
    this.previewStatus = {};
    this.previewStats = {};
    this.previewModalOpen = true;
  }

  closePreviewModal(): void {
    this.previewModalOpen = false;
  }

  onPreviewEntryChange(key: string, value: string, req?: string, groupKey?: string): void {
    this.previewEntries[key] = value;

    if (req) {
      this.previewStatus[key] = this.evaluateRequirement(req, value);
    }

    if (groupKey) {
      this.recalculateGroupStats(groupKey);
    }
  }

  evaluateRequirement(req: string, val: string): boolean | null {
    const num = parseFloat(val);
    if (isNaN(num)) return null;

    const gte = req.match(/^[≥>=]\s*([\d.]+)/);
    if (gte) return num >= parseFloat(gte[1]);

    const lte = req.match(/^[≤<=]\s*([\d.]+)/);
    if (lte) return num <= parseFloat(lte[1]);

    const range = req.match(/^([\d.]+)\s*[–-]\s*([\d.]+)/);
    if (range) return num >= parseFloat(range[1]) && num <= parseFloat(range[2]);

    return null;
  }

  recalculateGroupStats(groupKey: string): void {
    const values: number[] = [];
    Object.keys(this.previewEntries).forEach(k => {
      if (k.startsWith(groupKey + '_')) {
        const n = parseFloat(this.previewEntries[k]);
        if (!isNaN(n)) values.push(n);
      }
    });

    if (values.length === 0) {
      this.previewStats[groupKey] = { avg: '—', min: '—', max: '—', agg: '—' };
      return;
    }

    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    this.previewStats[groupKey] = {
      avg: avg >= 100 ? avg.toFixed(0) : avg.toFixed(2),
      min: String(min),
      max: String(max),
      agg: avg >= 100 ? avg.toFixed(0) : avg.toFixed(2)
    };
  }

  submitPreviewResult(): void {
    const vals = Object.values(this.previewEntries).filter(v => v !== '');
    const fails = Object.values(this.previewStatus).filter(s => s === false).length;
    if (vals.length === 0) {
      this.toastService.show('Please enter at least one measurement before submitting', 'warning');
      return;
    }
    if (fails > 0) {
      this.toastService.show(`Result Submitted with ${fails} FAIL observation(s) [Simulated]`, 'warning');
    } else {
      this.toastService.show('Result Submitted Successfully — All Observations PASS [Simulated]', 'success');
    }
  }

  // Field helpers for templates
  getConditionFields(sec: ExecutionSection): string[] {
    const list = [...(sec.config.fields || [])];
    if (sec.config.extraFields) {
      sec.config.extraFields.split(',').forEach(f => {
        const trimmed = f.trim();
        if (trimmed && !list.includes(trimmed)) list.push(trimmed);
      });
    }
    return list.filter(f => this.isConditionSelected(f));
  }

  getConditionLabel(identifier: string): string {
    const c = this.currentDataset.conditions.find(item => item.field === identifier || item.label === identifier);
    return c ? c.label : identifier;
  }

  getConditionValue(identifier: string): string {
    const c = this.currentDataset.conditions.find(item => item.field === identifier || item.label === identifier);
    if (c && c.demoValue) {
      return c.demoValue + (c.unit && !c.demoValue.includes(c.unit) ? ' ' + c.unit : '');
    }
    if (identifier.includes('Temp')) return '23.0 °C';
    if (identifier.includes('Humidity')) return '52 %';
    if (identifier.includes('Speed')) return '5 mm/min';
    return 'Specified';
  }

  isConditionFieldChecked(sec: ExecutionSection, c: DatasetCondition): boolean {
    if (!sec.config.fields) return false;
    return sec.config.fields.includes(c.field) || sec.config.fields.includes(c.label);
  }

  toggleConditionField(sec: ExecutionSection, c: DatasetCondition): void {
    if (!sec.config.fields) sec.config.fields = [];
    const idx = sec.config.fields.findIndex(f => f === c.field || f === c.label);
    if (idx > -1) {
      sec.config.fields.splice(idx, 1);
    } else {
      sec.config.fields.push(c.field);
    }
  }

  getCustomColumns(sec: ExecutionSection): string[] {
    const raw = typeof sec.config.columns === 'string' ? sec.config.columns : 'Column 1, Column 2, Column 3';
    return String(raw).split(',').map(c => c.trim()).filter(Boolean);
  }

  getChecklistItems(sec: ExecutionSection): string[] {
    const raw = sec.config.items || 'Visual condition, Dimensions verified, Equipment calibrated';
    return String(raw).split(',').map(i => i.trim()).filter(Boolean);
  }

  ensureSpecimenRows(sec: ExecutionSection): string[] {
    if (!sec || !sec.config) return [];
    if (Array.isArray(sec.config.specimenRows) && sec.config.specimenRows.length > 0) {
      return sec.config.specimenRows;
    }
    let initialRows: string[] = [];
    if (sec.config.specimenNames && typeof sec.config.specimenNames === 'string' && sec.config.specimenNames.trim()) {
      initialRows = sec.config.specimenNames.split(',').map(s => s.trim()).filter(Boolean);
    }
    if (!initialRows.length) {
      const n = Math.max(1, Math.min(20, Number(sec.config.count) || 3));
      const prefix = sec.config.prefix || 'S';
      initialRows = Array.from({ length: n }, (_, i) => `${prefix}${i + 1}`);
    }
    sec.config.specimenRows = initialRows;
    sec.config.count = initialRows.length;
    sec.config.specimenNames = initialRows.join(', ');
    return sec.config.specimenRows;
  }

  getSpecimenList(sec: ExecutionSection): string[] {
    return this.ensureSpecimenRows(sec);
  }

  addSpecimenRow(sec: ExecutionSection, customName?: string): void {
    const rows = this.ensureSpecimenRows(sec);
    const prefix = sec.config.prefix || 'S';
    const newName = customName || `${prefix}${rows.length + 1}`;
    rows.push(newName);
    sec.config.specimenRows = rows;
    sec.config.count = rows.length;
    sec.config.specimenNames = rows.join(', ');
    delete sec.config.tableColumns;
    delete sec.config.tableRows;
    this.ensureTableColumns(sec);
    this.ensureTableRows(sec);
    this.toastService.show(`Added specimen: "${newName}"`, 'success');
  }

  removeSpecimenRow(sec: ExecutionSection, index: number): void {
    const rows = this.ensureSpecimenRows(sec);
    if (rows.length <= 1) {
      this.toastService.show('At least one specimen is required', 'warning');
      return;
    }
    const removed = rows.splice(index, 1);
    sec.config.specimenRows = rows;
    sec.config.count = rows.length;
    sec.config.specimenNames = rows.join(', ');
    delete sec.config.tableColumns;
    delete sec.config.tableRows;
    this.ensureTableColumns(sec);
    this.ensureTableRows(sec);
    this.toastService.show(`Removed specimen: "${removed[0]}"`, 'info');
  }

  updateSpecimenRow(sec: ExecutionSection, index: number, value: string): void {
    const rows = this.ensureSpecimenRows(sec);
    if (rows && rows[index] !== undefined) {
      rows[index] = value;
      sec.config.specimenNames = rows.join(', ');
      if (sec.config.tableColumns && sec.config.orientation !== 'Specimens × Parameters') {
        const targetCol = sec.config.tableColumns.find(c => c.key === `spec_${index + 1}`);
        if (targetCol) targetCol.label = value;
      } else if (sec.config.tableRows && sec.config.orientation === 'Specimens × Parameters') {
        if (sec.config.tableRows[index]) sec.config.tableRows[index].label = value;
      }
    }
  }

  moveSpecimenRow(sec: ExecutionSection, index: number, direction: 'up' | 'down'): void {
    const rows = this.ensureSpecimenRows(sec);
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= rows.length) return;
    const temp = rows[index];
    rows[index] = rows[target];
    rows[target] = temp;
    sec.config.specimenNames = rows.join(', ');
    delete sec.config.tableColumns;
    delete sec.config.tableRows;
    this.ensureTableColumns(sec);
    this.ensureTableRows(sec);
  }

  applySpecimenPreset(sec: ExecutionSection, preset: 's1-3' | 's1-5' | 'specimens' | 'samples' | 'trans-long' | 'bend' | 'notches'): void {
    let names: string[] = [];
    if (preset === 's1-3') {
      names = ['S1', 'S2', 'S3'];
    } else if (preset === 's1-5') {
      names = ['S1', 'S2', 'S3', 'S4', 'S5'];
    } else if (preset === 'specimens') {
      names = ['Specimen 1', 'Specimen 2', 'Specimen 3'];
    } else if (preset === 'samples') {
      names = ['Sample A', 'Sample B', 'Sample C'];
    } else if (preset === 'trans-long') {
      names = ['Transverse (T)', 'Longitudinal (L)'];
    } else if (preset === 'bend') {
      names = ['Root Bend', 'Face Bend', 'Side Bend'];
    } else if (preset === 'notches') {
      names = ['Notch 1', 'Notch 2', 'Notch 3'];
    }
    sec.config.specimenRows = names;
    sec.config.count = names.length;
    sec.config.specimenNames = names.join(', ');
    delete sec.config.tableColumns;
    delete sec.config.tableRows;
    this.ensureTableColumns(sec);
    this.ensureTableRows(sec);
    this.toastService.show(`Applied specimen preset: ${preset.toUpperCase()}`, 'info');
  }

  getSpecimenTableColCount(sec: ExecutionSection): number {
    if (sec.config.orientation === 'Specimens × Parameters') {
      return 1 + (this.getSpecimenParamsForSection(sec)?.length || 1);
    }
    let count = 1; // Parameter column
    count += this.getSpecimenList(sec).length;
    if (sec.config.showAverage) count++;
    if (sec.config.showMinMax) count += 2;
    if (sec.config.showRequirement) count++;
    return count;
  }

  getSpecimenCount(sec: ExecutionSection): number[] {
    const list = this.getSpecimenList(sec);
    return list.map((_, i) => i + 1);
  }

  ensureLocationRows(sec: ExecutionSection): string[] {
    if (!sec || !sec.config) return [];
    if (Array.isArray(sec.config.locationRows) && sec.config.locationRows.length > 0) {
      return sec.config.locationRows;
    }
    let initialRows: string[] = [];
    if (sec.config.locationNames && typeof sec.config.locationNames === 'string' && sec.config.locationNames.trim()) {
      initialRows = sec.config.locationNames.split(',').map(l => l.trim()).filter(Boolean);
    }
    if (!initialRows.length) {
      const n = Math.max(1, Math.min(15, Number(sec.config.count) || 3));
      const prefix = sec.config.prefix || 'Zone';
      initialRows = Array.from({ length: n }, (_, i) => `${prefix} ${i + 1}`);
    }
    sec.config.locationRows = initialRows;
    sec.config.count = initialRows.length;
    sec.config.locationNames = initialRows.join(', ');
    return sec.config.locationRows;
  }

  getLocationList(sec: ExecutionSection): string[] {
    return this.ensureLocationRows(sec);
  }

  addLocationRow(sec: ExecutionSection, customName?: string): void {
    const rows = this.ensureLocationRows(sec);
    const prefix = sec.config.prefix || 'Zone';
    const newName = customName || `${prefix} ${rows.length + 1}`;
    rows.push(newName);
    sec.config.locationRows = [...rows];
    sec.config.count = rows.length;
    sec.config.locationNames = rows.join(', ');
    this.toastService.show(`Added location row: "${newName}"`, 'success');
  }

  removeLocationRow(sec: ExecutionSection, index: number): void {
    const rows = this.ensureLocationRows(sec);
    if (rows.length <= 1) {
      this.toastService.show('At least one location row is required', 'warning');
      return;
    }
    const removed = rows.splice(index, 1);
    sec.config.locationRows = [...rows];
    sec.config.count = rows.length;
    sec.config.locationNames = rows.join(', ');
    this.toastService.show(`Removed location row: "${removed[0]}"`, 'info');
  }

  trackByIndex(index: number, _item?: any): number {
    return index;
  }

  updateLocationRow(sec: ExecutionSection, index: number, value: string): void {
    const rows = this.ensureLocationRows(sec);
    if (rows && rows[index] !== undefined) {
      rows[index] = value;
      sec.config.locationNames = rows.join(', ');
    }
  }

  moveLocationRow(sec: ExecutionSection, index: number, direction: 'up' | 'down'): void {
    const rows = this.ensureLocationRows(sec);
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= rows.length) return;
    const temp = rows[index];
    rows[index] = rows[target];
    rows[target] = temp;
    sec.config.locationRows = [...rows];
    sec.config.locationNames = rows.join(', ');
  }

  applyLocationPreset(sec: ExecutionSection, preset: 'weld' | 'zones' | 'samples' | 'levels'): void {
    let names: string[] = [];
    if (preset === 'weld') {
      names = ['Base Metal (BM)', 'Heat Affected Zone (HAZ)', 'Weld Metal (WM)'];
    } else if (preset === 'zones') {
      names = ['Zone 1', 'Zone 2', 'Zone 3', 'Zone 4'];
    } else if (preset === 'samples') {
      names = ['Sample A', 'Sample B', 'Sample C'];
    } else if (preset === 'levels') {
      names = ['Top Level', 'Mid Depth', 'Root / Bottom'];
    }
    sec.config.locationRows = names;
    sec.config.count = names.length;
    sec.config.locationNames = names.join(', ');
    this.toastService.show(`Applied preset: ${preset.toUpperCase()}`, 'info');
  }

  getLocationTableColCount(sec: ExecutionSection): number {
    let count = 1; // Location column
    count += (this.currentTest?.params?.slice(0, 3)?.length || 3);
    if (sec.config.showAverage) count++;
    if (sec.config.showRequirement) count++;
    return count;
  }

  toggleArrayItem(arr: string[] | undefined, item: string): string[] {
    const res = Array.isArray(arr) ? [...arr] : [];
    const idx = res.indexOf(item);
    if (idx > -1) {
      res.splice(idx, 1);
    } else {
      res.push(item);
    }
    return res;
  }

  // =========================================================================
  // STEP 2: Universal Test Dataset Pool & Section-Level Binding Engine
  // =========================================================================

  get currentDataset(): TestDatasetPool {
    return this.getTestDatasetPool(this.selectedTestKey);
  }

  getTestDatasetPool(testKey: string): TestDatasetPool {
    const test = this.currentTest;
    const pool: TestDatasetPool = {
      testKey,
      testName: test.label,
      parameters: [],
      conditions: [],
      dimensions: [],
      calculations: []
    };

    // Map test params dynamically from active test definition
    pool.parameters = (test.params || []).map((p, idx) => ({
      id: p.id || (idx + 1),
      name: p.name,
      symbol: p.name.split(' ')[0],
      unit: p.unit,
      requirement: p.requirement,
      demoValue: test.demo && test.demo[idx] ? test.demo[idx] : '100',
      type: p.unit === 'Rating' || p.unit === 'Phase' ? 'rating' : (isNaN(Number(p.requirement?.replace(/[^\d.]/g, ''))) ? 'text' : 'numeric'),
      isCalculated: !!p.isCalculated,
      formula: p.formula,
      formulaDisplay: p.formulaDisplay
    }));

    // Rich domain datasets tailored per test
    switch (testKey) {
      case 'generic':
        pool.conditions = [
          { field: 'Temperature', label: 'Test Temperature', unit: '°C', demoValue: '23.0 °C' },
          { field: 'Relative Humidity', label: 'Relative Humidity', unit: '%', demoValue: '50 %' },
          { field: 'Equipment', label: 'Equipment Used', demoValue: 'Runtime Equipment' },
          { field: 'Method', label: 'Test Standard', demoValue: 'IS / ASTM / ISO' }
        ];
        pool.dimensions = [];
        pool.calculations = [];
        break;

      case 'blank':
        pool.conditions = [];
        pool.dimensions = [];
        pool.calculations = [];
        break;

      case 'tensile':
        pool.conditions = [
          { field: 'Temperature', label: 'Test Temperature', unit: '°C', demoValue: '23.0 °C' },
          { field: 'Relative Humidity', label: 'Relative Humidity', unit: '%', demoValue: '52 %' },
          { field: 'Test Speed', label: 'Crosshead Speed', unit: 'mm/min', demoValue: '5 mm/min' },
          { field: 'Load Rate', label: 'Stress Rate', unit: 'MPa/s', demoValue: '10 MPa/s' },
          { field: 'Grip Type', label: 'Specimen Grips', demoValue: 'Wedge Serrated Grips' },
          { field: 'Extensometer', label: 'Gauge Length GL', unit: 'mm', demoValue: '50 mm Extensometer' }
        ];
        pool.dimensions = [
          { field: 'GaugeLength_L0', label: 'Original Gauge Length (L0)', unit: 'mm', demoValue: '50.0' },
          { field: 'FinalLength_Lu', label: 'Final Gauge Length (Lu)', unit: 'mm', demoValue: '62.25' },
          { field: 'Width_W0', label: 'Original Width (W0)', unit: 'mm', demoValue: '25.0' },
          { field: 'Thickness_T0', label: 'Original Thickness (T0)', unit: 'mm', demoValue: '12.0' },
          { field: 'Area_S0', label: 'Cross-Section Area (S0)', unit: 'mm²', demoValue: '300.0' },
          { field: 'Strain', label: 'Engineering Strain (ε)', unit: 'mm/mm', demoValue: '0.245' }
        ];
        pool.calculations = [
          { field: 'UTS', label: 'Ultimate Tensile Strength', formula: 'UTS = PeakLoad / Area_S0', unit: 'MPa', targetParam: 'Ultimate Tensile Strength' },
          { field: 'YieldStrength', label: 'Yield Strength (0.2% Proof)', formula: 'YS = YieldLoad / Area_S0', unit: 'MPa', targetParam: 'Yield Strength' },
          { field: 'Elongation', label: 'Elongation %', formula: 'EL = ((Lu - L0) / L0) * 100', unit: '%', targetParam: 'Elongation' },
          { field: 'ReductionOfArea', label: 'Reduction of Area %', formula: 'RA = ((S0 - Su) / S0) * 100', unit: '%', targetParam: 'Reduction of Area' }
        ];
        break;

      case 'impact':
        pool.conditions = [
          { field: 'Temperature', label: 'Test Temperature', unit: '°C', demoValue: '-20.0 °C' },
          { field: 'Striker Radius', label: 'Striker Radius', unit: 'mm', demoValue: '2 mm / 8 mm' },
          { field: 'Impact Velocity', label: 'Striking Velocity', unit: 'm/s', demoValue: '5.2 m/s' },
          { field: 'Anvil Span', label: 'Anvil Support Span', unit: 'mm', demoValue: '40.0 mm' },
          { field: 'Notch Geometry', label: 'Notch Geometry', demoValue: 'V-Notch 45° 2mm' },
          { field: 'Cooling Medium', label: 'Cooling Medium', demoValue: 'Ethanol / Liquid N2' }
        ];
        pool.dimensions = [
          { field: 'Width', label: 'Specimen Width', unit: 'mm', demoValue: '10.0' },
          { field: 'Height', label: 'Specimen Height', unit: 'mm', demoValue: '10.0' },
          { field: 'Length', label: 'Specimen Length', unit: 'mm', demoValue: '55.0' },
          { field: 'NotchDepth', label: 'Residual Notch Depth', unit: 'mm', demoValue: '8.0' }
        ];
        pool.calculations = [
          { field: 'AvgAbsorbedEnergy', label: 'Average Absorbed Energy', formula: 'Avg = (Notch1 + Notch2 + Notch3) / 3', unit: 'J', targetParam: 'Impact Energy' },
          { field: 'MinAbsorbedEnergy', label: 'Minimum Individual Energy', formula: 'Min = Min(Notch1, Notch2, Notch3)', unit: 'J', targetParam: 'Impact Energy' }
        ];
        break;

      case 'izod':
        pool.conditions = [
          { field: 'Temperature', label: 'Ambient Temperature', unit: '°C', demoValue: '23.0 °C' },
          { field: 'Striker Velocity', label: 'Striking Velocity', unit: 'm/s', demoValue: '3.5 m/s' },
          { field: 'Clamping Pressure', label: 'Vice Grip Torque', unit: 'N·m', demoValue: 'Standard Vice' }
        ];
        pool.dimensions = [
          { field: 'Dimensions', label: 'Specimen Dimensions', unit: 'mm', demoValue: '10 × 10 × 75' },
          { field: 'NotchDepth', label: 'V-Notch Depth', unit: 'mm', demoValue: '2.0' }
        ];
        pool.calculations = [
          { field: 'AverageEnergy', label: 'Mean Absorbed Energy', formula: 'Mean = Sum(R1..R3) / 3', unit: 'J', targetParam: 'Absorbed Energy' }
        ];
        break;

      case 'rockwell':
        pool.conditions = [
          { field: 'Scale', label: 'Hardness Scale', demoValue: 'HRC' },
          { field: 'Major Load', label: 'Major Test Load', unit: 'kgf', demoValue: '150 kgf' },
          { field: 'Minor Load', label: 'Minor Pre-load', unit: 'kgf', demoValue: '10 kgf' },
          { field: 'Indenter', label: 'Indenter Geometry', demoValue: '120° Diamond Spheroconical' },
          { field: 'Dwell Time', label: 'Load Dwell Time', unit: 's', demoValue: '4 s' }
        ];
        pool.dimensions = [
          { field: 'Thickness', label: 'Test Specimen Thickness', unit: 'mm', demoValue: '12.5' },
          { field: 'SpotSpacing', label: 'Impression Spacing', unit: 'mm', demoValue: '≥ 3 × Diameter' }
        ];
        pool.calculations = [
          { field: 'MeanHardness', label: 'Mean Rockwell Hardness', formula: 'Mean = Sum(Spots 1..5) / 5', unit: 'HRC', targetParam: 'Hardness (HRC)' },
          { field: 'EquivalentTensile', label: 'Equivalent Tensile Strength', formula: 'ASTM E140 Hardness Conversion Matrix', unit: 'MPa', targetParam: 'Equivalent Tensile' }
        ];
        break;

      case 'micro_vickers':
        pool.conditions = [
          { field: 'Test Load', label: 'Applied Load', demoValue: 'HV 0.5 (500 gf)' },
          { field: 'Dwell Time', label: 'Dwell Duration', unit: 's', demoValue: '15 s' },
          { field: 'Objective Lens', label: 'Optical Magnification', demoValue: '400X Plan Achromat' },
          { field: 'Surface Preparation', label: 'Polishing Finish', demoValue: '0.05 µm Alumina Cloth' }
        ];
        pool.dimensions = [
          { field: 'Diagonal_d1', label: 'Indentation Diagonal 1', unit: 'µm', demoValue: '39.8' },
          { field: 'Diagonal_d2', label: 'Indentation Diagonal 2', unit: 'µm', demoValue: '40.2' },
          { field: 'MeanDiagonal', label: 'Mean Diagonal (d)', unit: 'µm', demoValue: '40.0' }
        ];
        pool.calculations = [
          { field: 'CalculatedHV', label: 'Calculated Vickers Hardness', formula: 'HV = 1854.4 × P_gf / (d_µm²)', unit: 'HV 0.5', targetParam: 'Micro Hardness HV 0.5' }
        ];
        break;

      case 'hardness_multiloc':
        pool.conditions = [
          { field: 'Test Load', label: 'Applied Load', demoValue: 'HV 10 (10 kgf)' },
          { field: 'Weld Procedure', label: 'WPS / PQR Reference', demoValue: 'WPS-GTAW-04A' },
          { field: 'Joint Design', label: 'Joint Geometry', demoValue: 'Single V-Butt (16mm)' }
        ];
        pool.dimensions = [
          { field: 'PlateThickness', label: 'Parent Plate Thickness', unit: 'mm', demoValue: '16.0' },
          { field: 'WeldWidth', label: 'Weld Cap Width', unit: 'mm', demoValue: '22.0' },
          { field: 'StepDistance', label: 'Traverse Spacing', unit: 'mm', demoValue: '0.5' }
        ];
        pool.calculations = [
          { field: 'MaxZoneHardness', label: 'Maximum Observed Zone Hardness', formula: 'Max(ParentMetal, HAZ, WeldMetal)', unit: 'HV 10', targetParam: 'Weld Metal Hardness' },
          { field: 'NaceLimitCheck', label: 'NACE MR0175 Compliance', formula: 'Hardness ≤ 250 HV 10 / 22 HRC', unit: 'Boolean' }
        ];
        break;

      case 'case_depth_hardness':
        pool.conditions = [
          { field: 'Test Load', label: 'Microhardness Load', demoValue: 'HV 0.5' },
          { field: 'Limiting Hardness', label: 'Effective Cutoff Limit', unit: 'HV', demoValue: '550 HV' },
          { field: 'Case Hardening Type', label: 'Treatment Process', demoValue: 'Gas Carburized & Quenched' }
        ];
        pool.dimensions = [
          { field: 'DepthFromSurface', label: 'Depth from Surface', unit: 'mm', demoValue: '0.05 to 1.50' },
          { field: 'TraversePitch', label: 'Traverse Step Pitch', unit: 'mm', demoValue: '0.05' }
        ];
        pool.calculations = [
          { field: 'EffectiveCaseDepth', label: 'Effective Case Depth (ECD)', formula: 'ECD = Depth where Hardness drops to 550 HV', unit: 'mm', targetParam: 'Effective Case Depth' }
        ];
        break;

      case 'case_depth_micro':
        pool.conditions = [
          { field: 'Etchant', label: 'Chemical Etchant', demoValue: '2% Nital Solution' },
          { field: 'Magnification', label: 'Microscope Zoom', demoValue: '100X / 500X' }
        ];
        pool.dimensions = [
          { field: 'TotalDepth_mm', label: 'Total Case Depth', unit: 'mm', demoValue: '0.85' },
          { field: 'WhiteLayer_um', label: 'Compound Layer', unit: 'µm', demoValue: '18.0' }
        ];
        pool.calculations = [
          { field: 'TotalCaseDepth', label: 'Total Depth Calculation', formula: 'Total = Compound Layer + Diffusion Zone', unit: 'mm', targetParam: 'Total Case Depth' }
        ];
        break;

      case 'oes':
        pool.conditions = [
          { field: 'Instrument ID', label: 'Spectrometer ID', demoValue: 'Thermo ARL 3460' },
          { field: 'Argon Purity', label: 'Argon Gas Purity', unit: '%', demoValue: '99.999 %' },
          { field: 'Flush Pressure', label: 'Argon Flush Pressure', unit: 'bar', demoValue: '2.5 bar' },
          { field: 'Electrode Type', label: 'Excitation Counter-Electrode', demoValue: 'Tungsten Point' }
        ];
        pool.dimensions = [
          { field: 'SparkDiameter', label: 'Burn Spot Diameter', unit: 'mm', demoValue: '8.0' },
          { field: 'SampleThickness', label: 'Spectro Disc Thickness', unit: 'mm', demoValue: '15.0' }
        ];
        pool.calculations = [
          { field: 'CE_IIW', label: 'Carbon Equivalent (IIW)', formula: 'CE = C + Mn/6 + (Cr+Mo+V)/5 + (Ni+Cu)/15', unit: '%', targetParam: 'Carbon Equivalent' },
          { field: 'Pcm', label: 'Critical Metal Parameter (Pcm)', formula: 'Pcm = C + Si/30 + (Mn+Cu+Cr)/20 + Ni/60 + Mo/15 + V/10 + 5B', unit: '%' }
        ];
        break;

      case 'metallography':
        pool.conditions = [
          { field: 'Etchant', label: 'Chemical Etchant', demoValue: '2% Nital' },
          { field: 'Magnification', label: 'Microscope Magnification', demoValue: '100X / 500X' },
          { field: 'Specimen Plane', label: 'Sectioning Plane', demoValue: 'Longitudinal Centerline' }
        ];
        pool.dimensions = [
          { field: 'FieldDiameter', label: 'Optical Field Diameter', unit: 'µm', demoValue: '1000' }
        ];
        pool.calculations = [
          { field: 'DecarbDepth', label: 'Decarburization Depth', formula: 'Measured from surface boundary to 100% core matrix', unit: 'mm', targetParam: 'Decarburization' }
        ];
        break;

      case 'grain_size':
        pool.conditions = [
          { field: 'Etchant', label: 'Etching Reagent', demoValue: 'Picral + HCl' },
          { field: 'Magnification', label: 'Examination Zoom', demoValue: '100X' },
          { field: 'Reference Chart', label: 'Comparison Standard', demoValue: 'ASTM E112 Plate I' }
        ];
        pool.dimensions = [
          { field: 'ExaminedArea', label: 'Examined Field Area', unit: 'mm²', demoValue: '0.5' },
          { field: 'MeanDiameter', label: 'Average Grain Diameter', unit: 'µm', demoValue: '31.8' }
        ];
        pool.calculations = [
          { field: 'GrainNumber', label: 'ASTM Grain Size Index', formula: 'N = 2^(G - 1) grains/in² at 100X', unit: 'ASTM No.', targetParam: 'ASTM Grain Size No.' },
          { field: 'GrainDiameter', label: 'Calculated Grain Diameter', formula: 'd = 1 / sqrt(N)', unit: 'µm', targetParam: 'Average Grain Diameter' }
        ];
        break;

      case 'ferrite_content':
        pool.conditions = [
          { field: 'Etchant', label: 'Electrolytic Etchant', demoValue: '10% KOH / Murakami' },
          { field: 'Grid Points', label: 'Point Count Grid', demoValue: '25 Points / Field' },
          { field: 'Fields Examined', label: 'Number of Fields', demoValue: '5 Optical Fields' },
          { field: 'Magnification', label: 'Optical Magnification', demoValue: '500X' }
        ];
        pool.dimensions = [
          { field: 'GridSpacing', label: 'Point Grid Spacing', unit: 'µm', demoValue: '20.0' }
        ];
        pool.calculations = [
          { field: 'MeanFerrite', label: 'Mean Ferrite Content', formula: 'Mean = Sum(P_i) / n', unit: '%', targetParam: 'Mean Ferrite Content' },
          { field: 'AusteniteBalance', label: 'Austenite Phase Balance', formula: 'Austenite = 100 - Ferrite %', unit: '%' },
          { field: 'ConfidenceInterval', label: '95% Confidence Interval', formula: '95% CI = 2.776 × (StdDev / sqrt(n))', unit: '%' }
        ];
        break;

      case 'macro_weld':
        pool.conditions = [
          { field: 'Etchant', label: 'Macro Etchant', demoValue: '10% Ammonium Persulphate' },
          { field: 'Surface Polish', label: 'Abrasive Finish', demoValue: '600 Grit Silicon Carbide' },
          { field: 'Zoom Level', label: 'Macro Zoom', demoValue: '1X – 10X' }
        ];
        pool.dimensions = [
          { field: 'RootGap', label: 'Joint Root Gap', unit: 'mm', demoValue: '2.5' },
          { field: 'ThroatThickness', label: 'Measured Throat', unit: 'mm', demoValue: '8.6' },
          { field: 'Leg1', label: 'Leg Length 1', unit: 'mm', demoValue: '10.8' },
          { field: 'Leg2', label: 'Leg Length 2', unit: 'mm', demoValue: '11.2' }
        ];
        pool.calculations = [
          { field: 'LegSymmetry', label: 'Leg Length Symmetry', formula: '|Leg1 - Leg2| ≤ 1.5 mm', unit: 'mm' }
        ];
        break;

      case 'corrosion_sst':
        pool.conditions = [
          { field: 'Chamber Temp', label: 'Cabinet Temperature', unit: '°C', demoValue: '35 ± 2 °C' },
          { field: 'Salt Solution', label: 'NaCl Concentration', unit: '%', demoValue: '5 ± 1 % NaCl' },
          { field: 'Solution pH', label: 'Chamber Solution pH', demoValue: '6.5 – 7.2' },
          { field: 'Collection Rate', label: 'Fog Collection Rate', unit: 'ml/hr', demoValue: '1.5 ml/hr/80cm²' },
          { field: 'Air Pressure', label: 'Atomizing Air Pressure', unit: 'bar', demoValue: '1.0 bar' }
        ];
        pool.dimensions = [
          { field: 'PanelSize', label: 'Test Panel Dimensions', unit: 'mm', demoValue: '150 × 100 × 1.0' },
          { field: 'TiltAngle', label: 'Specimen Angle of Tilt', unit: '°', demoValue: '20° from vertical' }
        ];
        pool.calculations = [
          { field: 'WhiteRustOnset', label: 'White Rust Onset Duration', formula: 'First periodic inspection displaying zinc hydroxide', unit: 'Hours', targetParam: 'White Rust Observed' },
          { field: 'RedRustOnset', label: 'Red Rust Onset Duration', formula: 'First periodic inspection displaying base metal corrosion', unit: 'Hours', targetParam: 'Red Rust Observed' }
        ];
        break;

      default:
        pool.conditions = [
          { field: 'Temperature', label: 'Ambient Temperature', unit: '°C', demoValue: '23.0 °C' },
          { field: 'Humidity', label: 'Relative Humidity', unit: '%', demoValue: '50 %' }
        ];
        pool.dimensions = [
          { field: 'Dimensions', label: 'Specimen Dimensions', unit: 'mm', demoValue: 'Standard' }
        ];
        pool.calculations = [
          { field: 'Mean', label: 'Arithmetic Mean', formula: 'Mean = Sum(Values) / Count', unit: '—' }
        ];
        break;
    }

    // 1. Merge Base Conditions with Custom Conditions and Selection state
    const baseConditions = pool.conditions || [];
    const customConds = this.customConditionsMap[testKey] || [];
    pool.conditions = [...baseConditions, ...customConds].map(c => ({
      ...c,
      selected: this.isConditionSelected(c.field)
    }));

    // 2. Merge Base Dimensions with Custom Dimensions and Selection state
    const baseDimensions = pool.dimensions || [];
    const customDims = this.customDimensionsMap[testKey] || [];
    pool.dimensions = [...baseDimensions, ...customDims].map(d => ({
      ...d,
      selected: this.isDimensionSelected(d.field)
    }));

    // 3. Strict Calculations Resolution: ONLY parameters where isCalculated is true AND formula is added!
    // Extract from live test params (from DB ParameterMaster or preset)
    const dbCalculations: DatasetCalculation[] = (test.params || [])
      .filter(p => p.isCalculated && ((p.formula && p.formula.trim().length > 0) || (p.formulaDisplay && p.formulaDisplay.trim().length > 0)))
      .map(p => ({
        id: p.id,
        field: p.name.replace(/\s+/g, '_'),
        label: p.name,
        formula: (p.formulaDisplay && !/\{?P\d+\}?/i.test(p.formulaDisplay)) ? p.formulaDisplay : (formatFormulaDisplay(p.formula, test.params) || `${p.name} = Formula`),
        unit: p.unit,
        targetParam: p.name,
        isCalculated: true,
        isFromDb: true
      }));

    // Merge with preset base calculations
    const baseCalcs = (pool.calculations || []).filter(c => c.formula && c.formula.trim().length > 0);
    const finalCalculations: DatasetCalculation[] = [...dbCalculations];
    baseCalcs.forEach(bc => {
      if (!finalCalculations.some(c => (c.targetParam && c.targetParam === bc.targetParam) || c.label.toLowerCase() === bc.label.toLowerCase())) {
        finalCalculations.push({
          ...bc,
          isCalculated: true,
          isFromDb: false
        });
      }
    });

    pool.calculations = finalCalculations;

    return pool;
  }

  // -------------------------------------------------------------------------
  // Section Data Binding Helper Methods
  // -------------------------------------------------------------------------

  getParameterListForSection(sec: ExecutionSection): DatasetParameter[] {
    const all = this.currentDataset.parameters;
    if (sec.config.parameterMode === 'Configured parameter subset' && sec.config.subset && sec.config.subset.length > 0) {
      const filtered = all.filter(p => sec.config.subset!.includes(p.name));
      return filtered.length > 0 ? filtered : all;
    }
    return all;
  }

  isParameterInSubset(sec: ExecutionSection, paramName: string): boolean {
    if (!sec.config.subset || sec.config.subset.length === 0) return true;
    return sec.config.subset.includes(paramName);
  }

  syncRowsWithParameterSubset(sec: ExecutionSection): void {
    if (!sec || sec.type !== 'parameter' || !sec.config) return;
    const rows = this.ensureTableRows(sec);
    const subset = sec.config.subset || [];
    const mode = sec.config.parameterMode || 'All runtime parameters';

    if (mode === 'Configured parameter subset' && subset.length > 0) {
      rows.forEach(r => {
        r.visible = subset.includes(r.label);
      });
      const existingLabels = rows.map(r => r.label);
      subset.forEach(paramName => {
        if (!existingLabels.includes(paramName)) {
          const matched = (this.currentDataset?.parameters || []).find(p => p.name === paramName);
          rows.push({
            key: `param_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            label: paramName,
            bindingMode: sec.config.dataBindingMode || 'runtime',
            unit: matched?.unit || '',
            requirement: matched?.requirement || '',
            isCalculated: matched?.isCalculated,
            visible: true
          });
        }
      });
    } else {
      rows.forEach(r => {
        r.visible = true;
      });
    }
    sec.config.tableRows = [...rows];
  }

  onParameterModeChange(sec: ExecutionSection): void {
    if (sec.config.parameterMode === 'Configured parameter subset' && (!sec.config.subset || sec.config.subset.length === 0)) {
      sec.config.subset = (this.currentDataset?.parameters || []).map(p => p.name);
    }
    this.syncRowsWithParameterSubset(sec);
  }

  toggleParameterInSubset(sec: ExecutionSection, paramName: string): void {
    if (!sec.config.subset) {
      sec.config.subset = this.currentDataset.parameters.map(p => p.name);
    }
    const idx = sec.config.subset.indexOf(paramName);
    if (idx > -1) {
      if (sec.config.subset.length > 1) {
        sec.config.subset.splice(idx, 1);
      } else {
        this.toastService.show('At least one parameter must remain selected', 'warning');
      }
    } else {
      sec.config.subset.push(paramName);
    }
    this.syncRowsWithParameterSubset(sec);
  }

  selectAllParameters(sec: ExecutionSection): void {
    sec.config.subset = this.currentDataset.parameters.map(p => p.name);
    this.syncRowsWithParameterSubset(sec);
    this.toastService.show('All parameters selected for section', 'info');
  }

  // Enhanced Parameter Configuration & Search Filter State
  parameterFilterQuery: string = '';
  isAnnotationsExpanded: boolean = false;
  isMergeSectionExpanded: boolean = false;

  getFilteredParameters(sec: ExecutionSection): DatasetParameter[] {
    const list = this.currentDataset?.parameters || [];
    if (!this.parameterFilterQuery || !this.parameterFilterQuery.trim()) {
      return list;
    }
    const q = this.parameterFilterQuery.trim().toLowerCase();
    return list.filter(p =>
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.unit && p.unit.toLowerCase().includes(q)) ||
      (p.requirement && p.requirement.toLowerCase().includes(q))
    );
  }

  selectCalculatedOnly(sec: ExecutionSection): void {
    const calcs = (this.currentDataset?.parameters || [])
      .filter(p => p.isCalculated)
      .map(p => p.name);
    if (calcs.length > 0) {
      sec.config.subset = calcs;
      this.syncRowsWithParameterSubset(sec);
      this.toastService.show(`${calcs.length} calculated parameters (ƒx) selected`, 'info');
    } else {
      this.toastService.show('No calculated parameters found in current dataset', 'warning');
    }
  }

  getSelectedParametersCount(sec: ExecutionSection): number {
    if (sec.config.parameterMode === 'Configured parameter subset' && sec.config.subset) {
      return sec.config.subset.length;
    }
    return (this.currentDataset?.parameters || []).length;
  }

  toggleAnnotations(): void {
    this.isAnnotationsExpanded = !this.isAnnotationsExpanded;
  }

  toggleMergeSection(): void {
    this.isMergeSectionExpanded = !this.isMergeSectionExpanded;
  }

  getAnnotationsCount(sec: ExecutionSection): number {
    if (!sec || !sec.config) return 0;
    let count = 0;
    if (sec.config.topLeft && sec.config.topLeft.trim()) count++;
    if (sec.config.topRight && sec.config.topRight.trim()) count++;
    if (sec.config.bottomLeft && sec.config.bottomLeft.trim()) count++;
    if (sec.config.bottomRight && sec.config.bottomRight.trim()) count++;
    return count;
  }

  deselectAllParameters(sec: ExecutionSection): void {
    if (this.currentDataset.parameters.length > 0) {
      sec.config.subset = [this.currentDataset.parameters[0].name];
      this.syncRowsWithParameterSubset(sec);
      this.toastService.show('Only primary parameter selected', 'info');
    }
  }

  selectedMasterParamToAdd: string = '';

  get availableParametersOptions(): Array<{ value: string; label: string; unit?: string; requirement?: string; isCalculated?: boolean }> {
    const list: Array<{ value: string; label: string; unit?: string; requirement?: string; isCalculated?: boolean }> = [];
    const seen = new Set<string>();

    (this.currentDataset?.parameters || []).forEach(p => {
      if (p.name && !seen.has(p.name)) {
        seen.add(p.name);
        list.push({
          value: p.name,
          label: p.unit && p.unit !== '—' ? `${p.name} (${p.unit})` : p.name,
          unit: p.unit,
          requirement: p.requirement,
          isCalculated: p.isCalculated
        });
      }
    });

    Object.values(this.testDatabase).forEach(t => {
      (t.params || []).forEach(p => {
        if (p.name && !seen.has(p.name) && p.name !== 'Runtime Parameter (Auto-bound)') {
          seen.add(p.name);
          list.push({
            value: p.name,
            label: p.unit && p.unit !== '—' ? `${p.name} (${p.unit})` : p.name,
            unit: p.unit,
            requirement: p.requirement,
            isCalculated: p.isCalculated
          });
        }
      });
    });

    return list;
  }

  addParameterFromMaster(sec: ExecutionSection, paramName?: string): void {
    const nameToAdd = paramName || this.selectedMasterParamToAdd;
    if (!nameToAdd) {
      this.toastService.show('Please select a parameter from the list', 'warning');
      return;
    }
    const rows = this.ensureTableRows(sec);
    const matched = (this.currentDataset?.parameters || []).find(p => p.name === nameToAdd) ||
      this.availableParametersOptions.find(p => p.value === nameToAdd);

    // If the only row is the dummy placeholder, replace it with this real parameter
    if (rows.length === 1 && rows[0].label === 'Runtime Parameter (Auto-bound)') {
      rows[0].label = nameToAdd;
      rows[0].unit = matched?.unit || '';
      rows[0].requirement = matched?.requirement || '';
      rows[0].isCalculated = matched?.isCalculated || false;
      sec.config.tableRows = [...rows];
      if (sec.config.subset) {
        sec.config.subset = [nameToAdd];
      }
      this.selectedMasterParamToAdd = '';
      this.toastService.show(`Parameter "${nameToAdd}" configured as primary row`, 'success');
      return;
    }

    if (rows.some(r => r.label === nameToAdd)) {
      this.toastService.show(`Parameter "${nameToAdd}" is already in table`, 'info');
      return;
    }

    rows.push({
      key: `param_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      label: nameToAdd,
      bindingMode: sec.config.dataBindingMode || 'runtime',
      unit: matched?.unit || '',
      requirement: matched?.requirement || '',
      isCalculated: matched?.isCalculated || false,
      visible: true,
      removable: true
    });
    sec.config.tableRows = [...rows];
    if (sec.config.subset && !sec.config.subset.includes(nameToAdd)) {
      sec.config.subset.push(nameToAdd);
    }
    this.selectedMasterParamToAdd = '';
    this.toastService.show(`Added parameter: "${nameToAdd}"`, 'success');
  }

  selectParameterForRow(sec: ExecutionSection, rIdx: number, paramName: string): void {
    const rows = this.ensureTableRows(sec);
    if (!rows[rIdx] || !paramName) return;
    const matched = (this.currentDataset?.parameters || []).find(p => p.name === paramName) ||
      this.availableParametersOptions.find(p => p.value === paramName);
    rows[rIdx].label = paramName;
    if (matched) {
      rows[rIdx].unit = matched.unit || '';
      rows[rIdx].requirement = matched.requirement || '';
      rows[rIdx].isCalculated = matched.isCalculated || false;
    }
    sec.config.tableRows = [...rows];
    this.toastService.show(`Row ${rIdx + 1} updated to "${paramName}"`, 'success');
  }

  populateAllMasterParameters(sec: ExecutionSection): void {
    const params = (this.currentDataset?.parameters || []).filter(p => p.name !== 'Runtime Parameter (Auto-bound)');
    if (params.length === 0) {
      this.toastService.show('No master parameters available for this test', 'info');
      return;
    }
    const defaultMode = sec.config.dataBindingMode || 'runtime';
    const rows: LayoutRowItem[] = params.map((p, idx) => ({
      key: `param_${idx}_${Date.now()}`,
      label: p.name,
      bindingMode: defaultMode,
      requirement: p.requirement || '',
      unit: p.unit || '',
      isCalculated: p.isCalculated,
      formula: p.formula,
      visible: true,
      removable: true
    }));
    sec.config.tableRows = rows;
    sec.config.subset = params.map(p => p.name);
    this.toastService.show(`Loaded ${rows.length} test parameters into table`, 'success');
  }

  getSpecimenParamsForSection(sec: ExecutionSection): DatasetParameter[] {
    const all = this.currentDataset.parameters;
    if (sec.config.specimenColumns && sec.config.specimenColumns.length > 0) {
      const filtered = all.filter(p => sec.config.specimenColumns!.includes(p.name));
      return filtered.length > 0 ? filtered : all;
    }
    return all;
  }

  isSpecimenParamSelected(sec: ExecutionSection, paramName: string): boolean {
    if (!sec.config.specimenColumns || sec.config.specimenColumns.length === 0) return true;
    return sec.config.specimenColumns.includes(paramName);
  }

  toggleSpecimenParam(sec: ExecutionSection, paramName: string): void {
    if (!sec.config.specimenColumns) {
      sec.config.specimenColumns = this.currentDataset.parameters.map(p => p.name);
    }
    const idx = sec.config.specimenColumns.indexOf(paramName);
    if (idx > -1) {
      if (sec.config.specimenColumns.length > 1) {
        sec.config.specimenColumns.splice(idx, 1);
      } else {
        this.toastService.show('At least one parameter column is required', 'warning');
      }
    } else {
      sec.config.specimenColumns.push(paramName);
    }
  }

  selectAllSpecimenParams(sec: ExecutionSection): void {
    sec.config.specimenColumns = this.currentDataset.parameters.map(p => p.name);
  }

  resetSpecimenParams(sec: ExecutionSection): void {
    sec.config.specimenColumns = undefined;
    this.toastService.show('Reset to all test parameters', 'info');
  }

  // Specimen Dimensions Binding Helpers
  isSpecimenDimensionSelected(sec: ExecutionSection, dimField: string): boolean {
    if (!sec.config.dimensionSubset) return true;
    return sec.config.dimensionSubset.includes(dimField);
  }

  toggleSpecimenDimension(sec: ExecutionSection, dimField: string): void {
    if (!sec.config.dimensionSubset) {
      sec.config.dimensionSubset = this.currentDataset.dimensions.map(d => d.field);
    }
    const idx = sec.config.dimensionSubset.indexOf(dimField);
    if (idx > -1) {
      sec.config.dimensionSubset.splice(idx, 1);
    } else {
      sec.config.dimensionSubset.push(dimField);
    }
  }

  selectAllSpecimenDimensions(sec: ExecutionSection): void {
    sec.config.dimensionSubset = this.currentDataset.dimensions.map(d => d.field);
  }

  resetSpecimenDimensions(sec: ExecutionSection): void {
    sec.config.dimensionSubset = undefined;
    this.toastService.show('Reset to all specimen dimensions', 'info');
  }

  getSpecimenDimensionsForSection(sec: ExecutionSection): DatasetDimension[] {
    const active = this.currentDataset.dimensions.filter(d => this.isDimensionSelected(d.field));
    if (sec.config.dimensionSubset && sec.config.dimensionSubset.length > 0) {
      return active.filter(d => sec.config.dimensionSubset!.includes(d.field));
    }
    return active;
  }

  // Reading Target Parameter
  getReadingTargetForSection(sec: ExecutionSection): DatasetParameter {
    const all = this.currentDataset.parameters;
    if (sec.config.targetParameter) {
      const match = all.find(p => p.name === sec.config.targetParameter);
      if (match) return match;
    }
    return all[0] || { name: 'Measured Value', symbol: 'Val', unit: '—', requirement: 'Runtime', demoValue: '100', type: 'numeric' };
  }

  onReadingTargetChange(sec: ExecutionSection): void {
    const target = this.getReadingTargetForSection(sec);
    sec.config.unit = target.unit;
    sec.config.readingLabel = `${target.name} Spot Readings`;
    this.toastService.show(`Target set to ${target.name} (${target.unit})`, 'info');
  }

  getReadingCount(sec: ExecutionSection): number[] {
    const count = Number(sec.config.count);
    const validCount = (isNaN(count) || count <= 0) ? 5 : count;
    return Array.from({ length: validCount }, (_, i) => i + 1);
  }

  // Chart Axes Selection
  getAvailableXFields(): { name: string; unit: string; category: string }[] {
    const dims = this.currentDataset.dimensions.map(d => ({ name: d.label, unit: d.unit, category: 'Dimension' }));
    const params = this.currentDataset.parameters.map(p => ({ name: p.name, unit: p.unit, category: 'Parameter' }));
    return [...dims, ...params];
  }

  getAvailableYFields(): { name: string; unit: string; category: string }[] {
    return this.currentDataset.parameters.map(p => ({ name: p.name, unit: p.unit, category: 'Parameter' }));
  }

  onChartAxisChange(sec: ExecutionSection, axis: 'x' | 'y'): void {
    if (axis === 'x') {
      const match = this.getAvailableXFields().find(f => f.name === sec.config.xField);
      if (match) {
        sec.config.xLabel = match.name;
        sec.config.xUnit = match.unit;
      }
    } else {
      const match = this.getAvailableYFields().find(f => f.name === sec.config.yField);
      if (match) {
        sec.config.yLabel = match.name;
        sec.config.yUnit = match.unit;
      }
    }
  }

  // Traverse fields
  onTraverseAxisChange(sec: ExecutionSection): void {
    if (sec.config.xField?.includes('mm')) sec.config.xUnit = 'mm';
    else if (sec.config.xField?.includes('µm')) sec.config.xUnit = 'µm';
    else if (sec.config.xField?.includes('Hours')) sec.config.xUnit = 'Hours';

    if (sec.config.yField?.includes('HV')) sec.config.yUnit = 'HV';
    else if (sec.config.yField?.includes('HRC')) sec.config.yUnit = 'HRC';
    else if (sec.config.yField?.includes('Rating')) sec.config.yUnit = 'Rating';
  }

  // Formula derivation
  onFormulaTargetChange(sec: ExecutionSection): void {
    const calc = this.currentDataset.calculations.find(c => c.field === sec.config.targetOutput || c.label === sec.config.targetOutput);
    if (calc) {
      sec.config.formulaExpression = calc.formula;
      sec.config.resultLabel = calc.label;
    }
  }

  toggleFormulaInput(sec: ExecutionSection, inputName: string): void {
    if (!sec.config.inputFields) {
      sec.config.inputFields = [];
    }
    const idx = sec.config.inputFields.indexOf(inputName);
    if (idx > -1) {
      sec.config.inputFields.splice(idx, 1);
    } else {
      sec.config.inputFields.push(inputName);
    }
    sec.config.inputs = sec.config.inputFields.join(', ');
  }

  formatFormula(rawFormula: string | undefined): string {
    if (!rawFormula) return '';
    return formatFormulaDisplay(rawFormula, this.currentDataset?.parameters || []);
  }

  // Section data binding description summary
  getSectionBindingSummary(sec: ExecutionSection): string {
    switch (sec.type) {
      case 'parameter':
        const pCount = this.getParameterListForSection(sec).length;
        const total = this.currentDataset.parameters.length;
        return sec.config.parameterMode === 'Configured parameter subset'
          ? `Bound to ${pCount} of ${total} parameters (Subset)`
          : `Bound to all ${total} runtime parameters`;
      case 'chart':
        return `X: ${sec.config.xField || 'Dimension'} (${sec.config.xUnit || '—'}) ➔ Y: ${sec.config.yField || 'Parameter'} (${sec.config.yUnit || '—'})`;
      case 'reading':
        const target = this.getReadingTargetForSection(sec);
        return `Target: ${target.name} (${target.unit}) • ${sec.config.count || 3} Readings`;
      case 'specimen':
        const sCount = this.getSpecimenParamsForSection(sec).length;
        const dimCount = this.getSpecimenDimensionsForSection(sec).length;
        return `${sec.config.count || 3} Specimens × (${dimCount} Dimensions, ${sCount} Parameters)`;
      case 'traverse':
        return `Distance: ${sec.config.xField || 'Depth'} vs Hardness: ${sec.config.yField || 'HV'} (Cutoff: ${sec.config.cutoffHardness || '550'} HV)`;
      case 'condition':
        const cFields = this.getConditionFields(sec).length;
        const totalConds = this.currentDataset.conditions.length;
        return `${cFields} of ${totalConds} conditions active in pool`;
      case 'formula':
        return `Target: ${sec.config.targetOutput || sec.config.resultLabel || 'Derived Result'} (${this.formatFormula(sec.config.formulaExpression) || 'Calculated'})`;
      default:
        return `Live mapped to ${this.currentTest.label}`;
    }
  }

  // -------------------------------------------------------------------------
  // Custom Pool Persistence & Operations
  // -------------------------------------------------------------------------
  loadCustomPoolsFromStorage(): void {
    try {
      const conds = localStorage.getItem(this.STORAGE_KEY_CUSTOM_CONDITIONS);
      if (conds) this.customConditionsMap = JSON.parse(conds);
      const dims = localStorage.getItem(this.STORAGE_KEY_CUSTOM_DIMENSIONS);
      if (dims) this.customDimensionsMap = JSON.parse(dims);
      const desConds = localStorage.getItem(this.STORAGE_KEY_DESELECTED_CONDITIONS);
      if (desConds) this.deselectedConditionsMap = JSON.parse(desConds);
      const desDims = localStorage.getItem(this.STORAGE_KEY_DESELECTED_DIMENSIONS);
      if (desDims) this.deselectedDimensionsMap = JSON.parse(desDims);
    } catch (e) {
      console.error('Failed to load custom pools from storage', e);
    }
  }

  saveCustomPoolsToStorage(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY_CUSTOM_CONDITIONS, JSON.stringify(this.customConditionsMap));
      localStorage.setItem(this.STORAGE_KEY_CUSTOM_DIMENSIONS, JSON.stringify(this.customDimensionsMap));
      localStorage.setItem(this.STORAGE_KEY_DESELECTED_CONDITIONS, JSON.stringify(this.deselectedConditionsMap));
      localStorage.setItem(this.STORAGE_KEY_DESELECTED_DIMENSIONS, JSON.stringify(this.deselectedDimensionsMap));
    } catch (e) {
      console.error('Failed to save custom pools to storage', e);
    }
  }

  // Conditions Pool Operations
  toggleAddConditionForm(): void {
    this.showAddConditionForm = !this.showAddConditionForm;
    if (this.showAddConditionForm) {
      this.newConditionInput = { label: '', unit: '', demoValue: '' };
    }
  }

  saveNewCondition(): void {
    const lbl = this.newConditionInput.label?.trim();
    if (!lbl) {
      this.toastService.show('Condition name / label is required', 'warning');
      return;
    }
    const key = this.selectedTestKey;
    if (!this.customConditionsMap[key]) {
      this.customConditionsMap[key] = [];
    }
    const field = lbl.replace(/\s+/g, '_');
    const exists = this.currentDataset.conditions.some(c => c.field === field || c.label.toLowerCase() === lbl.toLowerCase());
    if (exists) {
      this.toastService.show('A condition with this name already exists', 'warning');
      return;
    }
    const newCond: DatasetCondition = {
      field,
      label: lbl,
      unit: this.newConditionInput.unit?.trim() || undefined,
      demoValue: this.newConditionInput.demoValue?.trim() || 'Specified',
      selected: true,
      isCustom: true
    };
    this.customConditionsMap[key].push(newCond);
    this.saveCustomPoolsToStorage();
    this.showAddConditionForm = false;
    this.newConditionInput = { label: '', unit: '', demoValue: '' };
    this.toastService.show(`Custom condition "${lbl}" added`, 'success');
  }

  removeCustomCondition(field: string): void {
    const key = this.selectedTestKey;
    if (this.customConditionsMap[key]) {
      this.customConditionsMap[key] = this.customConditionsMap[key].filter(c => c.field !== field);
      this.saveCustomPoolsToStorage();
      this.toastService.show('Custom condition removed', 'info');
    }
  }

  selectAllConditions(): void {
    const key = this.selectedTestKey;
    this.deselectedConditionsMap[key] = [];
    this.saveCustomPoolsToStorage();
    this.toastService.show('All conditions selected (Active)', 'success');
  }

  deselectAllConditions(): void {
    const key = this.selectedTestKey;
    this.deselectedConditionsMap[key] = this.currentDataset.conditions.map(c => c.field);
    this.saveCustomPoolsToStorage();
    this.toastService.show('All conditions deselected', 'info');
  }

  toggleConditionSelection(c: DatasetCondition): void {
    const key = this.selectedTestKey;
    if (!this.deselectedConditionsMap[key]) {
      this.deselectedConditionsMap[key] = [];
    }
    const idx = this.deselectedConditionsMap[key].indexOf(c.field);
    if (idx > -1) {
      this.deselectedConditionsMap[key].splice(idx, 1);
    } else {
      this.deselectedConditionsMap[key].push(c.field);
    }
    this.saveCustomPoolsToStorage();
  }

  isConditionSelected(fieldOrLabel: string): boolean {
    const des = this.deselectedConditionsMap[this.selectedTestKey] || [];
    return !des.includes(fieldOrLabel);
  }

  trackByField(index: number, item: any): string {
    return item.field || item.name || item.id || index;
  }

  get activeConditionsCount(): number {
    return this.currentDataset.conditions.filter(c => this.isConditionSelected(c.field)).length;
  }

  // Dimensions Pool Operations
  toggleAddDimensionForm(): void {
    this.showAddDimensionForm = !this.showAddDimensionForm;
    if (this.showAddDimensionForm) {
      this.newDimensionInput = { label: '', unit: 'mm', demoValue: '10.0' };
    }
  }

  saveNewDimension(): void {
    const lbl = this.newDimensionInput.label?.trim();
    if (!lbl) {
      this.toastService.show('Dimension label is required', 'warning');
      return;
    }
    const key = this.selectedTestKey;
    if (!this.customDimensionsMap[key]) {
      this.customDimensionsMap[key] = [];
    }
    const field = lbl.replace(/\s+/g, '_');
    const exists = this.currentDataset.dimensions.some(d => d.field === field || d.label.toLowerCase() === lbl.toLowerCase());
    if (exists) {
      this.toastService.show('A dimension with this name already exists', 'warning');
      return;
    }
    const newDim: DatasetDimension = {
      field,
      label: lbl,
      unit: this.newDimensionInput.unit?.trim() || 'mm',
      demoValue: this.newDimensionInput.demoValue?.trim() || '10.0',
      selected: true,
      isCustom: true
    };
    this.customDimensionsMap[key].push(newDim);
    this.saveCustomPoolsToStorage();
    this.showAddDimensionForm = false;
    this.newDimensionInput = { label: '', unit: 'mm', demoValue: '10.0' };
    this.toastService.show(`Custom dimension "${lbl}" added`, 'success');
  }

  removeCustomDimension(field: string): void {
    const key = this.selectedTestKey;
    if (this.customDimensionsMap[key]) {
      this.customDimensionsMap[key] = this.customDimensionsMap[key].filter(d => d.field !== field);
      this.saveCustomPoolsToStorage();
      this.toastService.show('Custom dimension removed', 'info');
    }
  }

  selectAllDimensions(): void {
    const key = this.selectedTestKey;
    this.deselectedDimensionsMap[key] = [];
    this.saveCustomPoolsToStorage();
    this.toastService.show('All dimensions selected (Active)', 'success');
  }

  deselectAllDimensions(): void {
    const key = this.selectedTestKey;
    this.deselectedDimensionsMap[key] = this.currentDataset.dimensions.map(d => d.field);
    this.saveCustomPoolsToStorage();
    this.toastService.show('All dimensions deselected', 'info');
  }

  toggleDimensionSelection(d: DatasetDimension): void {
    const key = this.selectedTestKey;
    if (!this.deselectedDimensionsMap[key]) {
      this.deselectedDimensionsMap[key] = [];
    }
    const idx = this.deselectedDimensionsMap[key].indexOf(d.field);
    if (idx > -1) {
      this.deselectedDimensionsMap[key].splice(idx, 1);
    } else {
      this.deselectedDimensionsMap[key].push(d.field);
    }
    this.saveCustomPoolsToStorage();
  }

  isDimensionSelected(fieldOrLabel: string): boolean {
    const des = this.deselectedDimensionsMap[this.selectedTestKey] || [];
    return !des.includes(fieldOrLabel);
  }

  get activeDimensionsCount(): number {
    return this.currentDataset.dimensions.filter(d => this.isDimensionSelected(d.field)).length;
  }

  // Section-Wise Data Source Relevance Isolation
  isPoolRelevantToSection(poolType: 'parameters' | 'conditions' | 'dimensions' | 'calculations', sec: ExecutionSection | null): boolean {
    if (this.dataSourceViewMode === 'all' || !sec) return true;
    switch (sec.type) {
      case 'parameter':
        return poolType === 'parameters' || poolType === 'calculations';
      case 'specimen':
        return poolType === 'dimensions' || poolType === 'parameters';
      case 'reading':
        return poolType === 'parameters';
      case 'condition':
        return poolType === 'conditions';
      case 'traverse':
        return poolType === 'dimensions' || poolType === 'parameters';
      case 'chart':
        return poolType === 'dimensions' || poolType === 'parameters' || poolType === 'calculations';
      case 'formula':
        return poolType === 'calculations' || poolType === 'parameters' || poolType === 'dimensions';
      case 'location':
        return poolType === 'parameters' || poolType === 'dimensions';
      case 'rule':
        return poolType === 'parameters' || poolType === 'calculations';
      default:
        return true;
    }
  }

  getRelevantPoolsDescription(sec: ExecutionSection | null): string {
    if (!sec) return 'All test pools';
    switch (sec.type) {
      case 'parameter':
        return 'Parameters Pool (Measured & Calculated Parameter Columns)';
      case 'specimen':
        return 'Dimensions & Geometry Pool (Specimen Dimensions) + Parameter Columns';
      case 'reading':
        return 'Target Parameter from Parameters Pool';
      case 'condition':
        return 'Test Conditions Pool (Environmental & Test Setup Parameters)';
      case 'traverse':
        return 'Dimensions Pool (Distance / Depth) + Parameters Pool (Hardness)';
      case 'chart':
        return 'Dimensions Pool & Parameters Pool (X-Axis and Y-Axis Curves)';
      case 'formula':
        return 'Calculations Pool (Derivations) + Input Parameter/Dimension Variables';
      case 'location':
        return 'Parameters Pool (Zonal Values)';
      case 'rule':
        return 'Parameters Pool (Acceptance Rule Target)';
      default:
        return 'Relevant Test Data Sources';
    }
  }

  setDataSourceViewMode(mode: 'relevant' | 'all'): void {
    this.dataSourceViewMode = mode;
  }

  // --- Output Payload Preview Methods ---
  getJsonPayloadPreview(): string {
    const payload: any = {
      testId: 'TEST-12345',
      testName: this.currentTest?.label || 'Unknown Test',
      sections: []
    };

    if (this.sections) {
      this.sections.forEach(s => {
        const sectionData: any = {
          sectionKey: s.config.sectionKey || `section_${s.id}`,
          type: s.type,
          title: s.title
        };

        if (s.type === 'parameter') {
          sectionData.fields = this.getParameterListForSection(s).map(p => ({
            fieldKey: p.name.replace(/\s+/g, '_').toLowerCase(),
            label: p.name,
            value: '...',
            unit: p.unit
          }));
        } else if (s.type === 'specimen') {
          const specCount = s.config.countMode === 'Fixed count' ? (s.config.count || 1) : (s.rt || s.config.count || 1);
          sectionData.specimens = Array.from({ length: specCount }).map((_, i) => {
            const spec: any = { specimenId: `${s.config.prefix || 'S'}${i + 1}` };
            this.currentDataset.parameters.forEach(p => {
              if (this.isSpecimenParamSelected(s, p.name)) {
                spec[p.name.replace(/\s+/g, '_').toLowerCase()] = '...';
              }
            });
            return spec;
          });
        } else if (s.type === 'reading') {
          const readCount = s.config.count || 1;
          sectionData.targetParameter = s.config.targetParameter;
          sectionData.readings = Array.from({ length: readCount }).map((_, i) => `R${i + 1}_Value`);
          if (s.config.showStatistics) {
            sectionData.statistics = { average: '...', min: '...', max: '...' };
          }
        } else if (s.type === 'rule') {
          sectionData.targetParameter = s.config.parameter;
          sectionData.rule = s.config.valueSource;
          sectionData.evaluation = 'PASS/FAIL';
        } else {
          sectionData.data = '... (Type-specific payload mapping)';
        }

        payload.sections.push(sectionData);
      });
    }

    return JSON.stringify(payload, null, 2);
  }

  hasMergedHeader(s: ExecutionSection): boolean {
    if (!s || !s.config) return false;
    const merge = s.config.headerMerge;
    const cols = s.config.columns;
    const title = merge?.title || cols?.mergedHeader;
    const isMerged = merge?.isMerged ?? (cols?.isMerged ?? (!!title && title.trim().length > 0));
    return !!(isMerged && title && title.trim().length > 0);
  }

  isSubLabelsVisible(s: ExecutionSection): boolean {
    if (!s || !s.config) return true;
    if (s.config.headerMerge?.showSubLabels !== undefined) {
      return s.config.headerMerge.showSubLabels;
    }
    if (s.config.columns?.showSubLabels !== undefined) {
      return s.config.columns.showSubLabels;
    }
    return true;
  }

  getMergedHeaderText(s: ExecutionSection): string {
    if (!s || !s.config) return '';
    return s.config.headerMerge?.title || s.config.columns?.mergedHeader || '';
  }

  // =========================================================================
  // UNIVERSAL DATA BINDING & ROW / COLUMN MANAGEMENT (ALL TABLE ARCHETYPES)
  // =========================================================================

  readonly standardParamColDefinitions: { [key: string]: { label: string; bindingMode: DataBindingMode; width?: string } } = {
    param: { label: 'Parameter', bindingMode: 'runtime', width: '28%' },
    unit: { label: 'Unit', bindingMode: 'runtime', width: '12%' },
    requirement: { label: 'Requirement', bindingMode: 'runtime', width: '20%' },
    result: { label: 'Observed Result', bindingMode: 'runtime', width: '24%' },
    status: { label: 'Status', bindingMode: 'runtime', width: '16%' },
    method: { label: 'Method / Standard', bindingMode: 'runtime', width: '18%' },
    remarks: { label: 'Remarks', bindingMode: 'manual', width: '18%' },
    uncertainty: { label: 'Uncertainty (±)', bindingMode: 'runtime', width: '14%' },
    dl: { label: 'Detection Limit', bindingMode: 'runtime', width: '14%' },
    scope: { label: 'Scope Mark', bindingMode: 'runtime', width: '12%' }
  };

  readonly standardParamColOrder: string[] = [
    'param', 'unit', 'requirement', 'result', 'status', 'method', 'remarks', 'uncertainty', 'dl', 'scope'
  ];

  syncParameterColumnsState(sec: ExecutionSection): void {
    if (!sec || sec.type !== 'parameter' || !sec.config || !sec.config.columns) return;
    const cfgCols: Record<string, any> = sec.config.columns;
    const cols = sec.config.tableColumns;
    if (!Array.isArray(cols)) return;

    // Synchronize sec.config.columns flags from current tableColumns visibility
    cols.forEach(col => {
      if (col.key in this.standardParamColDefinitions && col.key !== 'param') {
        cfgCols[col.key] = col.visible !== false;
      }
    });

    // Recreate any column that has been enabled via config.columns if not present in tableColumns
    Object.keys(this.standardParamColDefinitions).forEach(key => {
      if (key === 'param') return;
      if (cfgCols[key] === true && !cols.some(c => c.key === key)) {
        const def = this.standardParamColDefinitions[key];
        const newCol: LayoutColumnItem = {
          key,
          label: def.label,
          bindingMode: def.bindingMode,
          visible: true,
          width: def.width
        };
        const targetCanonicalIdx = this.standardParamColOrder.indexOf(key);
        let insertIdx = cols.length;
        if (targetCanonicalIdx !== -1) {
          for (let i = 0; i < cols.length; i++) {
            const currCanonicalIdx = this.standardParamColOrder.indexOf(cols[i].key);
            if (currCanonicalIdx > targetCanonicalIdx) {
              insertIdx = i;
              break;
            }
          }
        }
        cols.splice(insertIdx, 0, newCol);
      }
    });
  }

  ensureTableColumns(sec: ExecutionSection): LayoutColumnItem[] {
    if (!sec || !sec.config) return [];
    if (Array.isArray(sec.config.tableColumns) && sec.config.tableColumns.length > 0) {
      if (sec.type === 'parameter' && sec.config.columns) {
        this.syncParameterColumnsState(sec);
      }
      return sec.config.tableColumns;
    }
    const defaultMode: DataBindingMode = sec.config.dataBindingMode || 'runtime';
    const cols: LayoutColumnItem[] = [];

    if (sec.type === 'parameter') {
      cols.push({ key: 'param', label: 'Parameter', bindingMode: 'runtime', visible: true, width: '28%' });
      if (sec.config.columns?.unit !== false) cols.push({ key: 'unit', label: 'Unit', bindingMode: 'runtime', visible: true, width: '12%' });
      if (sec.config.columns?.requirement !== false) cols.push({ key: 'requirement', label: 'Requirement', bindingMode: 'runtime', visible: true, width: '20%' });
      cols.push({
        key: 'result',
        label: sec.config.resultMode === 'Calculated Result only' ? 'Calculated Result' : 'Observed Result',
        bindingMode: defaultMode,
        visible: true,
        width: '24%'
      });
      if (sec.config.columns?.status !== false) cols.push({ key: 'status', label: 'Status', bindingMode: 'runtime', visible: true, width: '16%' });
      if (sec.config.columns?.method) cols.push({ key: 'method', label: 'Method / Standard', bindingMode: 'runtime', visible: true, width: '18%' });
      if (sec.config.columns?.remarks) cols.push({ key: 'remarks', label: 'Remarks', bindingMode: 'manual', visible: true, width: '18%' });
      if (sec.config.columns?.uncertainty) cols.push({ key: 'uncertainty', label: 'Uncertainty (±)', bindingMode: 'runtime', visible: true, width: '14%' });
      if (sec.config.columns?.dl) cols.push({ key: 'dl', label: 'Detection Limit', bindingMode: 'runtime', visible: true, width: '14%' });
      if (sec.config.columns?.scope) cols.push({ key: 'scope', label: 'Scope Mark', bindingMode: 'runtime', visible: true, width: '12%' });
    } else if (sec.type === 'specimen') {
      if (sec.config.orientation === 'Specimens × Parameters') {
        cols.push({ key: 'specimen', label: sec.config.specimenColHeader || 'Specimen / Sample', bindingMode: 'static', visible: true, width: '30%' });
        const params = this.getSpecimenParamsForSection(sec);
        params.forEach((p, idx) => {
          cols.push({ key: `param_${idx}`, label: `${p.name} (${p.unit})`, bindingMode: defaultMode, visible: true });
        });
      } else {
        cols.push({ key: 'param', label: 'Parameter', bindingMode: 'runtime', visible: true, width: '30%' });
        const specList = this.getSpecimenList(sec);
        specList.forEach((specName, idx) => {
          cols.push({ key: `spec_${idx + 1}`, label: specName, bindingMode: defaultMode, visible: true });
        });
        if (sec.config.showAverage) cols.push({ key: 'avg', label: 'Average', bindingMode: 'runtime', visible: true });
        if (sec.config.showRequirement) cols.push({ key: 'requirement', label: 'Requirement', bindingMode: 'runtime', visible: true });
      }
    } else if (sec.type === 'reading') {
      cols.push({
        key: 'target',
        label: sec.config.readingLabel || (this.getReadingTargetForSection(sec).name + ' Readings'),
        bindingMode: 'runtime',
        visible: true,
        width: '35%'
      });
      const rNums = this.getSpecimenCount(sec);
      rNums.forEach(num => {
        cols.push({ key: `reading_${num}`, label: `R${num}`, bindingMode: 'manual', visible: true });
      });
      cols.push({ key: 'agg', label: sec.config.aggregation || 'Average', bindingMode: 'runtime', visible: true });
    } else if (sec.type === 'location') {
      cols.push({ key: 'loc', label: sec.config.locationColHeader || 'Zone / Location', bindingMode: 'static', visible: true, width: '30%' });
      this.currentTest.params.slice(0, 3).forEach((p, idx) => {
        cols.push({ key: `param_${idx}`, label: `${p.name} (${p.unit})`, bindingMode: defaultMode, visible: true });
      });
      if (sec.config.showAverage) cols.push({ key: 'avg', label: 'Average', bindingMode: 'runtime', visible: true });
      if (sec.config.showRequirement) cols.push({ key: 'requirement', label: 'Requirement', bindingMode: 'runtime', visible: true });
    } else if (sec.type === 'traverse') {
      cols.push({ key: 'x', label: sec.config.xField || 'Depth / Distance', bindingMode: 'static', visible: true });
      cols.push({ key: 'y', label: sec.config.yField || 'Hardness Result', bindingMode: defaultMode, visible: true });
      cols.push({ key: 'unit', label: 'Unit', bindingMode: 'static', visible: true });
      cols.push({ key: 'requirement', label: 'Requirement', bindingMode: 'runtime', visible: true });
    } else if (sec.type === 'classification') {
      cols.push({ key: 'grade', label: 'Class / Grade', bindingMode: 'static', visible: true });
      if (sec.config.showCriteria) cols.push({ key: 'criteria', label: 'Criteria / Scale', bindingMode: 'static', visible: true });
      cols.push({ key: 'system', label: 'Rating System', bindingMode: 'static', visible: true });
      cols.push({ key: 'result', label: 'Classification Result', bindingMode: defaultMode, visible: true });
    } else if (sec.type === 'custom') {
      if (sec.config.customColumns && sec.config.customColumns.length > 0) {
        sec.config.customColumns.forEach((c, idx) => {
          cols.push({ key: `col_${idx}`, label: c.label || `Col ${idx + 1}`, bindingMode: defaultMode, visible: true });
        });
      } else {
        ['Col 1', 'Col 2', 'Col 3', 'Col 4'].forEach((c, idx) => {
          cols.push({ key: `col_${idx}`, label: c, bindingMode: defaultMode, visible: true });
        });
      }
    } else if (sec.type === 'condition') {
      cols.push({ key: 'field', label: 'Condition / Parameter', bindingMode: 'static', visible: true });
      cols.push({ key: 'val', label: 'Observed Reading', bindingMode: defaultMode, visible: true });
    } else if (sec.type === 'checklist') {
      cols.push({ key: 'item', label: 'Inspection Point', bindingMode: 'static', visible: true });
      cols.push({ key: 'resp', label: 'Compliance Response', bindingMode: 'manual', visible: true });
    } else {
      cols.push({ key: 'col_1', label: 'Parameter / Feature', bindingMode: 'runtime', visible: true });
      cols.push({ key: 'col_2', label: 'Observed Result', bindingMode: defaultMode, visible: true });
    }

    sec.config.tableColumns = cols;
    return sec.config.tableColumns;
  }

  ensureTableRows(sec: ExecutionSection): LayoutRowItem[] {
    if (!sec || !sec.config) return [];
    if (Array.isArray(sec.config.tableRows) && sec.config.tableRows.length > 0) {
      return sec.config.tableRows;
    }
    const defaultMode: DataBindingMode = sec.config.dataBindingMode || 'runtime';
    const rows: LayoutRowItem[] = [];

    if (sec.type === 'parameter') {
      const params = this.currentDataset?.parameters?.length ? this.currentDataset.parameters : this.currentTest.params;
      params.forEach((p, idx) => {
        rows.push({
          key: `param_${idx}`,
          label: p.name,
          bindingMode: defaultMode,
          requirement: p.requirement || '',
          unit: p.unit || '',
          isCalculated: p.isCalculated,
          visible: true
        });
      });
    } else if (sec.type === 'specimen') {
      if (sec.config.orientation === 'Specimens × Parameters') {
        const specList = this.getSpecimenList(sec);
        specList.forEach((spec, idx) => {
          rows.push({
            key: `spec_${idx}`,
            label: spec,
            bindingMode: defaultMode,
            visible: true
          });
        });
      } else {
        const params = this.getSpecimenParamsForSection(sec);
        params.forEach((p, idx) => {
          rows.push({
            key: `param_${idx}`,
            label: p.name,
            bindingMode: defaultMode,
            requirement: p.requirement,
            unit: p.unit,
            visible: true
          });
        });
      }
    } else if (sec.type === 'location') {
      const locList = this.getLocationList(sec);
      locList.forEach((loc, idx) => {
        rows.push({
          key: `loc_${idx}`,
          label: loc,
          bindingMode: defaultMode,
          visible: true
        });
      });
    } else if (sec.type === 'reading') {
      const target = this.getReadingTargetForSection(sec);
      rows.push({
        key: 'target_0',
        label: `${target.name} (${target.unit})`,
        bindingMode: defaultMode,
        unit: target.unit,
        visible: true
      });
    } else if (sec.type === 'traverse') {
      [0.10, 0.20, 0.40, 0.60, 0.80, 1.00].forEach((step, idx) => {
        rows.push({
          key: `step_${idx}`,
          label: step.toFixed(2),
          bindingMode: defaultMode,
          unit: sec.config.xUnit || 'mm',
          visible: true
        });
      });
    } else if (sec.type === 'classification') {
      rows.push({
        key: 'class_0',
        label: 'Observed Structural Rating',
        bindingMode: defaultMode,
        visible: true
      });
    } else if (sec.type === 'custom') {
      ['Row 1', 'Row 2', 'Row 3'].forEach((r, idx) => {
        rows.push({
          key: `row_${idx}`,
          label: r,
          bindingMode: defaultMode,
          visible: true
        });
      });
    } else if (sec.type === 'condition') {
      const conds = this.getConditionFields(sec);
      conds.forEach((c, idx) => {
        rows.push({
          key: `cond_${idx}`,
          label: this.getConditionLabel(c),
          bindingMode: defaultMode,
          visible: true
        });
      });
    } else if (sec.type === 'checklist') {
      const items = this.getChecklistItems(sec);
      items.forEach((it, idx) => {
        rows.push({
          key: `chk_${idx}`,
          label: it,
          bindingMode: 'manual',
          visible: true
        });
      });
    } else {
      rows.push({
        key: 'row_1',
        label: 'Observation 1',
        bindingMode: defaultMode,
        visible: true
      });
    }

    sec.config.tableRows = rows;
    return sec.config.tableRows;
  }

  getTableColumns(sec: ExecutionSection): LayoutColumnItem[] {
    return this.ensureTableColumns(sec);
  }

  getVisibleTableColumns(sec: ExecutionSection): LayoutColumnItem[] {
    return this.getTableColumns(sec).filter(c => c.visible !== false);
  }

  getTableRows(sec: ExecutionSection): LayoutRowItem[] {
    return this.ensureTableRows(sec);
  }

  getVisibleTableRows(sec: ExecutionSection): LayoutRowItem[] {
    return this.getTableRows(sec).filter(r => r.visible !== false);
  }

  // Row Manipulation
  addTableRow(sec: ExecutionSection, customLabel?: string): void {
    const rows = this.ensureTableRows(sec);
    const newIdx = rows.length + 1;
    const label = customLabel || `New Row ${newIdx}`;
    const newRow: LayoutRowItem = {
      key: `custom_row_${Date.now()}`,
      label: label,
      bindingMode: sec.config.dataBindingMode || 'runtime',
      visible: true,
      removable: true
    };
    rows.push(newRow);
    sec.config.tableRows = [...rows];
    this.toastService.show(`Added row: "${label}"`, 'success');
  }

  removeTableRow(sec: ExecutionSection, index: number): void {
    const rows = this.ensureTableRows(sec);
    if (rows.length <= 1) {
      this.toastService.show('At least one row is required in table', 'warning');
      return;
    }
    const removed = rows.splice(index, 1);
    sec.config.tableRows = [...rows];
    this.toastService.show(`Removed row: "${removed[0]?.label || 'Row'}"`, 'info');
  }

  moveTableRow(sec: ExecutionSection, index: number, direction: 'up' | 'down'): void {
    const rows = this.ensureTableRows(sec);
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= rows.length) return;
    const temp = rows[index];
    rows[index] = rows[target];
    rows[target] = temp;
    sec.config.tableRows = [...rows];
  }

  toggleTableRowVisibility(sec: ExecutionSection, index: number): void {
    const rows = this.ensureTableRows(sec);
    if (rows[index]) {
      rows[index].visible = rows[index].visible === false ? true : false;
      sec.config.tableRows = [...rows];
    }
  }

  updateTableRowLabel(sec: ExecutionSection, index: number, label: string): void {
    const rows = this.ensureTableRows(sec);
    if (rows[index]) {
      rows[index].label = label;
      if (sec.type === 'location' && sec.config.locationRows && sec.config.locationRows[index] !== undefined) {
        sec.config.locationRows[index] = label;
      }
      if (sec.type === 'specimen' && sec.config.specimenRows && sec.config.orientation === 'Specimens × Parameters' && sec.config.specimenRows[index] !== undefined) {
        sec.config.specimenRows[index] = label;
      }
    }
  }

  updateTableRowBindingMode(sec: ExecutionSection, index: number, mode: DataBindingMode): void {
    const rows = this.ensureTableRows(sec);
    if (rows[index]) {
      rows[index].bindingMode = mode;
      sec.config.tableRows = [...rows];
    }
  }

  updateTableRowStaticValue(sec: ExecutionSection, index: number, val: string): void {
    const rows = this.ensureTableRows(sec);
    if (rows[index]) {
      rows[index].staticValue = val;
    }
  }

  // Column Manipulation
  addTableColumn(sec: ExecutionSection, customLabel?: string): void {
    const cols = this.ensureTableColumns(sec);
    const newIdx = cols.length + 1;
    const label = customLabel || `New Column ${newIdx}`;
    const newCol: LayoutColumnItem = {
      key: `custom_col_${Date.now()}`,
      label: label,
      bindingMode: sec.config.dataBindingMode || 'runtime',
      visible: true,
      removable: true
    };
    cols.push(newCol);
    sec.config.tableColumns = [...cols];
    this.toastService.show(`Added column: "${label}"`, 'success');
  }

  isParameterColVisible(sec: ExecutionSection, colKey: string): boolean {
    if (!sec || !sec.config) return false;
    if (Array.isArray(sec.config.tableColumns) && sec.config.tableColumns.length > 0) {
      const col = sec.config.tableColumns.find(c => c.key === colKey);
      if (col) {
        return col.visible !== false;
      }
      return false;
    }
    if (!sec.config.columns) return false;
    const cfgCols: Record<string, any> = sec.config.columns;
    if (colKey === 'unit' || colKey === 'requirement' || colKey === 'status') {
      return cfgCols[colKey] !== false;
    }
    if (colKey === 'result') {
      return cfgCols['result'] !== false;
    }
    return !!cfgCols[colKey];
  }

  toggleParameterColumn(sec: ExecutionSection, colKey: string, isVisible: boolean): void {
    if (!sec || !sec.config) return;
    if (!sec.config.columns) {
      sec.config.columns = {};
    }
    const cfgCols: Record<string, any> = sec.config.columns;
    cfgCols[colKey] = isVisible;

    const cols = this.ensureTableColumns(sec);
    const existingCol = cols.find(c => c.key === colKey);

    if (existingCol) {
      existingCol.visible = isVisible;
    } else if (isVisible) {
      const def = this.standardParamColDefinitions[colKey] || {
        label: colKey.charAt(0).toUpperCase() + colKey.slice(1),
        bindingMode: 'runtime' as DataBindingMode
      };
      const label = colKey === 'result' && sec.config.resultMode === 'Calculated Result only'
        ? 'Calculated Result'
        : def.label;

      const newCol: LayoutColumnItem = {
        key: colKey,
        label,
        bindingMode: def.bindingMode,
        visible: true,
        width: def.width
      };

      const targetCanonicalIdx = this.standardParamColOrder.indexOf(colKey);
      let insertIdx = cols.length;
      if (targetCanonicalIdx !== -1) {
        for (let i = 0; i < cols.length; i++) {
          const currCanonicalIdx = this.standardParamColOrder.indexOf(cols[i].key);
          if (currCanonicalIdx > targetCanonicalIdx) {
            insertIdx = i;
            break;
          }
        }
      }
      cols.splice(insertIdx, 0, newCol);
    }

    sec.config.tableColumns = [...cols];
    this.validateHeaderMergeAfterColumnChange(sec);
  }

  validateHeaderMergeAfterColumnChange(sec: ExecutionSection): void {
    if (!this.hasMergedHeader(sec)) return;
    const mergeState = this.ensureHeaderMergeState(sec);
    const visibleCols = this.getVisibleTableColumns(sec);

    if (visibleCols.length < 2) {
      this.resetHeaderMerge(sec);
      return;
    }

    let startIdx = visibleCols.findIndex(c => c.key === mergeState.startCol);
    if (startIdx === -1) {
      startIdx = 0;
      mergeState.startCol = visibleCols[0].key;
    }

    const maxPossibleColspan = visibleCols.length - startIdx;
    if (maxPossibleColspan < 2) {
      if (visibleCols.length >= 2) {
        startIdx = visibleCols.length - 2;
        mergeState.startCol = visibleCols[startIdx].key;
        mergeState.colspan = 2;
      } else {
        this.resetHeaderMerge(sec);
        return;
      }
    } else if ((mergeState.colspan || 2) > maxPossibleColspan) {
      mergeState.colspan = maxPossibleColspan;
    }
  }

  removeTableColumn(sec: ExecutionSection, index: number): void {
    const cols = this.ensureTableColumns(sec);
    if (cols.length <= 1) {
      this.toastService.show('At least one column is required in table', 'warning');
      return;
    }
    const removed = cols.splice(index, 1);
    const key = removed[0]?.key;
    if (sec.type === 'parameter' && sec.config.columns && key && key in this.standardParamColDefinitions) {
      const cfgCols: Record<string, any> = sec.config.columns;
      cfgCols[key] = false;
    }
    sec.config.tableColumns = [...cols];
    this.validateHeaderMergeAfterColumnChange(sec);
    this.toastService.show(`Removed column: "${removed[0]?.label || 'Column'}"`, 'info');
  }

  moveTableColumn(sec: ExecutionSection, index: number, direction: 'up' | 'down'): void {
    const cols = this.ensureTableColumns(sec);
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= cols.length) return;
    const temp = cols[index];
    cols[index] = cols[target];
    cols[target] = temp;
    sec.config.tableColumns = [...cols];
  }

  toggleTableColumnVisibility(sec: ExecutionSection, index: number): void {
    const cols = this.ensureTableColumns(sec);
    if (cols[index]) {
      cols[index].visible = cols[index].visible === false ? true : false;
      const key = cols[index].key;
      if (sec.type === 'parameter' && sec.config.columns && key && key in this.standardParamColDefinitions) {
        const cfgCols: Record<string, any> = sec.config.columns;
        cfgCols[key] = cols[index].visible !== false;
      }
      sec.config.tableColumns = [...cols];
      this.validateHeaderMergeAfterColumnChange(sec);
    }
  }

  updateTableColumnLabel(sec: ExecutionSection, index: number, label: string): void {
    const cols = this.ensureTableColumns(sec);
    if (cols[index]) {
      cols[index].label = label;
      if (sec.type === 'specimen' && sec.config.specimenRows && sec.config.orientation !== 'Specimens × Parameters') {
        const specIdx = index - 1;
        if (specIdx >= 0 && specIdx < sec.config.specimenRows.length) {
          sec.config.specimenRows[specIdx] = label;
        }
      }
    }
  }

  updateTableColumnBindingMode(sec: ExecutionSection, index: number, mode: DataBindingMode): void {
    const cols = this.ensureTableColumns(sec);
    if (cols[index]) {
      cols[index].bindingMode = mode;
      sec.config.tableColumns = [...cols];
    }
  }

  activeBindingDropdownKey: string | null = null;

  @HostListener('document:click')
  onDocumentClick(): void {
    this.closeBindingDropdown();
  }

  toggleBindingDropdown(key: string, event: Event): void {
    event.stopPropagation();
    this.activeBindingDropdownKey = this.activeBindingDropdownKey === key ? null : key;
  }

  closeBindingDropdown(): void {
    this.activeBindingDropdownKey = null;
  }

  selectRowBindingMode(sec: ExecutionSection, index: number, mode: DataBindingMode): void {
    this.updateTableRowBindingMode(sec, index, mode);
    this.closeBindingDropdown();
  }

  selectColumnBindingMode(sec: ExecutionSection, index: number, mode: DataBindingMode): void {
    this.updateTableColumnBindingMode(sec, index, mode);
    this.closeBindingDropdown();
  }

  getBindingIcon(mode?: DataBindingMode): string {
    if (mode === 'static') return 'bi-pin-angle-fill';
    if (mode === 'manual') return 'bi-pencil-square';
    return 'bi-lightning-charge-fill';
  }

  getBindingColorClass(mode?: DataBindingMode): string {
    if (mode === 'static') return 'text-warning-emphasis';
    if (mode === 'manual') return 'text-success';
    return 'text-theme';
  }

  getBindingShortLabel(mode?: DataBindingMode): string {
    if (mode === 'static') return 'Static';
    if (mode === 'manual') return 'Manual';
    return 'Run';
  }

  getBindingBadgeClass(mode?: DataBindingMode): string {
    if (mode === 'static') return 'binding-pill-static';
    if (mode === 'manual') return 'binding-pill-manual';
    return 'binding-pill-runtime';
  }

  setSectionDefaultBinding(sec: ExecutionSection, mode: DataBindingMode, propagate: boolean = false): void {
    sec.config.dataBindingMode = mode;
    if (propagate) {
      if (sec.config.tableRows) {
        sec.config.tableRows.forEach(r => r.bindingMode = mode);
      }
      if (sec.config.tableColumns) {
        sec.config.tableColumns.forEach(c => {
          if (c.key === 'result' || (!['param', 'unit', 'requirement', 'status'].includes(c.key))) {
            c.bindingMode = mode;
          }
        });
      }
    }
    this.toastService.show(`Set section default binding mode to ${mode.toUpperCase()}`, 'info');
  }

  getCellDisplayValue(sec: ExecutionSection, row: LayoutRowItem, col: LayoutColumnItem, colIdx: number, rowIdx: number): string {
    if (col.key === 'unit') return row.unit || (this.demoMode ? 'MPa' : '—');
    if (col.key === 'requirement') return row.requirement || (this.demoMode ? '≥ 420' : 'Runtime');
    if (col.key === 'status') return this.demoMode ? 'PASS' : 'Runtime';
    if (col.key === 'method') return this.demoMode ? 'IS 1608 : 2022' : '—';
    if (col.key === 'remarks') return this.demoMode ? 'Conforms' : '—';
    if (col.key === 'uncertainty') return this.demoMode ? '± 2.5%' : '—';
    if (col.key === 'dl') return this.demoMode ? '0.01' : '—';
    if (col.key === 'scope') return this.demoMode ? 'NABL Scope' : '—';

    const mode = row.bindingMode || col.bindingMode || sec.config.dataBindingMode || 'runtime';
    if (mode === 'static') {
      return row.staticValue || col.staticValue || (this.demoMode ? 'Static 420' : 'Static');
    }
    if (mode === 'manual') {
      return this.demoMode ? 'Manual Entry' : '—';
    }
    if (this.demoMode) {
      return (480 + rowIdx * 15 + colIdx * 5).toString();
    }
    return '—';
  }

  isTableSection(s: ExecutionSection): boolean {
    if (!s) return false;
    return ['parameter', 'specimen', 'reading', 'location', 'rule', 'traverse', 'custom', 'classification'].includes(s.type);
  }

  getVisibleColumnsForSection(s: ExecutionSection): { key: string; label: string; bindingMode?: DataBindingMode; staticValue?: string }[] {
    if (!s) return [];
    if (s.config?.tableColumns && s.config.tableColumns.length > 0) {
      return s.config.tableColumns
        .filter(c => c.visible !== false)
        .map(c => ({ key: c.key, label: c.label, bindingMode: c.bindingMode, staticValue: c.staticValue }));
    }
    if (s.type === 'parameter') {
      const list: { key: string; label: string }[] = [];
      list.push({ key: 'param', label: 'Parameter' });
      if (s.config?.columns?.unit !== false) list.push({ key: 'unit', label: 'Unit' });
      if (s.config?.columns?.requirement !== false) list.push({ key: 'requirement', label: 'Requirement' });
      list.push({
        key: 'result',
        label: s.config?.resultMode === 'Calculated Result only' ? 'Calculated Result' : 'Observed Result'
      });
      if (s.config?.columns?.uncertainty) list.push({ key: 'uncertainty', label: 'Uncertainty (±)' });
      if (s.config?.columns?.dl) list.push({ key: 'dl', label: 'DL / LOQ' });
      if (s.config?.columns?.status !== false) list.push({ key: 'status', label: 'Status' });
      if (s.config?.columns?.method) list.push({ key: 'method', label: 'Method / Standard' });
      if (s.config?.columns?.scope) list.push({ key: 'scope', label: 'NABL Scope' });
      if (s.config?.columns?.remarks) list.push({ key: 'remarks', label: 'Remarks' });
      return list;
    }
    if (s.type === 'specimen') {
      const list: { key: string; label: string }[] = [];
      if (s.config?.orientation === 'Specimens × Parameters') {
        list.push({ key: 'specimen', label: s.config?.specimenColHeader || 'Specimen / Sample' });
        const params = this.getSpecimenParamsForSection(s);
        params.forEach((p, idx) => {
          list.push({ key: `param_${idx}`, label: `${p.name} (${p.unit})` });
        });
      } else {
        list.push({ key: 'param', label: 'Parameter' });
        const specList = this.getSpecimenList(s);
        specList.forEach((specName, idx) => {
          list.push({ key: `spec_${idx + 1}`, label: specName });
        });
        if (s.config?.showAverage) list.push({ key: 'avg', label: 'Average' });
        if (s.config?.showMinMax) {
          list.push({ key: 'min', label: 'Min' });
          list.push({ key: 'max', label: 'Max' });
        }
        if (s.config?.showRequirement) list.push({ key: 'requirement', label: 'Requirement' });
      }
      return list;
    }
    if (s.type === 'reading') {
      const list: { key: string; label: string }[] = [];
      list.push({
        key: 'target',
        label: s.config?.readingLabel || (this.getReadingTargetForSection(s).name + ' Readings')
      });
      const rNums = this.getSpecimenCount(s);
      rNums.forEach(num => {
        list.push({ key: `reading_${num}`, label: `R${num}` });
      });
      list.push({ key: 'agg', label: s.config?.aggregation || 'Average' });
      return list;
    }
    if (s.type === 'location') {
      const list: { key: string; label: string }[] = [];
      list.push({ key: 'loc', label: s.config?.locationColHeader || 'Zone / Location' });
      this.currentTest.params.slice(0, 3).forEach((p, idx) => {
        list.push({ key: `param_${idx}`, label: `${p.name} (${p.unit})` });
      });
      if (s.config?.showAverage) list.push({ key: 'avg', label: 'Average' });
      if (s.config?.showRequirement) list.push({ key: 'requirement', label: 'Requirement' });
      return list;
    }
    if (s.type === 'rule') {
      const list: { key: string; label: string }[] = [];
      list.push({ key: 'param', label: 'Parameter' });
      list.push({ key: 'operator', label: 'Operator' });
      list.push({ key: 'source', label: 'Value Source' });
      list.push({ key: 'result', label: 'Observed Result' });
      list.push({ key: 'eval', label: 'Evaluation' });
      return list;
    }
    if (s.type === 'traverse') {
      const list: { key: string; label: string }[] = [];
      list.push({ key: 'x', label: s.config?.xField || 'Depth / Distance' });
      list.push({ key: 'y', label: s.config?.yField || 'Hardness Result' });
      list.push({ key: 'unit', label: 'Unit' });
      list.push({ key: 'requirement', label: 'Requirement' });
      return list;
    }
    if (s.type === 'custom') {
      const list: { key: string; label: string }[] = [];
      if (s.config?.customColumns && s.config.customColumns.length > 0) {
        s.config.customColumns.forEach((c, idx: number) => {
          list.push({ key: `col_${idx}`, label: c.label || `Col ${idx + 1}` });
        });
      } else {
        ['Col 1', 'Col 2', 'Col 3', 'Col 4'].forEach((c, idx: number) => {
          list.push({ key: `col_${idx}`, label: c });
        });
      }
      return list;
    }
    return [];
  }

  getMergedColumnsList(s: ExecutionSection): { key: string; label: string }[] {
    const allCols = this.getVisibleColumnsForSection(s);
    if (!allCols.length) return [];

    let defaultStart = 'result';
    if (s.type === 'specimen') defaultStart = 'spec_1';
    if (s.type === 'reading') defaultStart = 'reading_1';

    const startKey = s.config?.headerMerge?.startCol || s.config?.columns?.mergedStartCol || defaultStart;
    let startIndex = allCols.findIndex(c => c.key === startKey);
    if (startIndex === -1) {
      startIndex = allCols.findIndex(c => c.key === defaultStart);
      if (startIndex === -1) startIndex = 0;
    }

    const rawColspan = s.config?.headerMerge?.colspan || s.config?.columns?.mergedColspan || 2;
    const maxPossible = allCols.length - startIndex;
    const colspan = Math.min(Math.max(2, rawColspan), maxPossible);

    return allCols.slice(startIndex, startIndex + colspan);
  }

  getPreMergedColumns(s: ExecutionSection): { key: string; label: string }[] {
    const allCols = this.getVisibleColumnsForSection(s);
    const merged = this.getMergedColumnsList(s);
    if (!merged.length) return [];
    const firstMergedKey = merged[0].key;
    const firstIndex = allCols.findIndex(c => c.key === firstMergedKey);
    if (firstIndex <= 0) return [];
    return allCols.slice(0, firstIndex);
  }

  getPostMergedColumns(s: ExecutionSection): { key: string; label: string }[] {
    const allCols = this.getVisibleColumnsForSection(s);
    const merged = this.getMergedColumnsList(s);
    if (!merged.length) return [];
    const lastMergedKey = merged[merged.length - 1].key;
    const lastIndex = allCols.findIndex(c => c.key === lastMergedKey);
    if (lastIndex === -1 || lastIndex >= allCols.length - 1) return [];
    return allCols.slice(lastIndex + 1);
  }

  ensureHeaderMergeState(s: ExecutionSection): HeaderMergeConfig {
    if (!s) return {};
    if (!s.config) s.config = {};
    if (!s.config.headerMerge) {
      let defaultStart = 'result';
      if (s.type === 'specimen') defaultStart = 'spec_1';
      if (s.type === 'reading') defaultStart = 'reading_1';

      s.config.headerMerge = {
        title: s.config.columns?.mergedHeader || '',
        startCol: s.config.columns?.mergedStartCol || defaultStart,
        colspan: s.config.columns?.mergedColspan || 2,
        showSubLabels: s.config.columns?.showSubLabels !== false,
        isMerged: !!(s.config.columns?.mergedHeader && s.config.columns.mergedHeader.trim().length > 0)
      };
    }
    return s.config.headerMerge;
  }

  applyHeaderMerge(s: ExecutionSection): void {
    if (!s || !s.config) return;
    const hm = this.ensureHeaderMergeState(s);
    if (!hm.title || !hm.title.trim()) {
      if (s.type === 'parameter') hm.title = 'Test Observations';
      else if (s.type === 'specimen') hm.title = 'Specimen Test Values';
      else if (s.type === 'reading') hm.title = 'Indentation Spot Readings';
      else hm.title = 'Grouped Observations';
    }
    if (!hm.startCol) {
      if (s.type === 'parameter') hm.startCol = 'result';
      else if (s.type === 'specimen') hm.startCol = 'spec_1';
      else if (s.type === 'reading') hm.startCol = 'reading_1';
      else hm.startCol = this.getVisibleColumnsForSection(s)[0]?.key || 'col_1';
    }
    if (!hm.colspan || hm.colspan < 2) {
      hm.colspan = 2;
    }
    if (hm.showSubLabels === undefined) {
      hm.showSubLabels = true;
    }
    hm.isMerged = true;

    // Sync with columns config for backwards compatibility
    if (!s.config.columns) {
      s.config.columns = { unit: true, requirement: true, result: true, status: true, method: true, remarks: true };
    }
    s.config.columns.mergedHeader = hm.title;
    s.config.columns.mergedStartCol = hm.startCol;
    s.config.columns.mergedColspan = hm.colspan;
    s.config.columns.showSubLabels = hm.showSubLabels;
    s.config.columns.isMerged = true;

    this.toastService.show(`Header merge applied: "${hm.title}"`, 'success');
  }

  resetHeaderMerge(s: ExecutionSection): void {
    if (!s || !s.config) return;
    if (s.config.headerMerge) {
      s.config.headerMerge.isMerged = false;
      s.config.headerMerge.title = '';
    }
    if (s.config.columns) {
      s.config.columns.isMerged = false;
      s.config.columns.mergedHeader = '';
    }
    this.toastService.show('Header merge removed. Reverted to standard flat columns.', 'info');
  }

  openPayloadPreview() {
    this.payloadPreviewModalOpen = true;
  }

  closePayloadPreview() {
    this.payloadPreviewModalOpen = false;
  }
}


