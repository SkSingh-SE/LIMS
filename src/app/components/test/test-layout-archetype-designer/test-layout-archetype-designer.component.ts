import { Component, OnInit, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { ToastService } from '../../../services/toast.service';
import { LaboratoryTestService } from '../../../services/laboratory-test.service';
import { SearchableDropdownComponent } from '../../../utility/components/searchable-dropdown/searchable-dropdown.component';

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
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, SearchableDropdownComponent],
  templateUrl: './test-layout-archetype-designer.component.html',
  styleUrls: ['./test-layout-archetype-designer.component.css']
})
export class TestLayoutArchetypeDesignerComponent implements OnInit {
  private toastService = inject(ToastService);
  private labService = inject(LaboratoryTestService);

  // Actual Laboratory Test (Unified Searchable Selection from Database)
  selectedUnifiedTestId: number | string | null = 1;
  selectedUnifiedTestItem: any = null;
  selectedLabTestId: number = 1;
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
    groupId: 1,
    groupName: 'Tensile Test',
    subGroupId: 1,
    subGroupName: 'Room Temperature',
    analysisTypeId: null,
    leafName: 'Room Temperature',
    fullDisplayName: 'Tensile Test - Room Temperature',
    isChemical: false
  };

  fetchUnifiedLabTestFn = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.labService.getUnifiedTestMethodDropdown(term, page, pageSize);
  };

  // Layout Structure Archetype (Center Canvas Top Bar Selection)
  selectedArchetypeKey: string = 'tensile';
  selectedTestKey: string = 'tensile';
  leafNode: string = 'Mechanical / Strength / Tensile';
  paperSub: string = 'Tensile Test • ASTM E8 / IS 1608';
  layoutName: string = 'Universal Execution Layout';
  layoutRev: string = '1.0';
  applyToLeaf: boolean = true;
  isMapped: boolean = false;
  demoMode: boolean = false;
  zoomLevel: number = 1;
  activeConfigTab: 'basic' | 'data' | 'rules' | 'display' | 'report' = 'basic';

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

  // Section Selection
  selectedSectionId: number | null = null;
  sections: ExecutionSection[] = [];

  // Modals state
  previewModalOpen: boolean = false;
  registerModalOpen: boolean = false;

  // Register Test Form state
  rtName: string = '';
  rtLeaf: string = '';
  rtStd: string = '';
  rtParams: string = 'Bend Angle | deg | ≥ 90\nCrack Observed | — | Runtime';

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

  // Master Test Database (All 14 Report Format Presets)
  testDatabase: Record<string, TestDef> = {
    tensile: {
      key: 'tensile',
      label: 'Tensile Test',
      leaf: 'Mechanical / Strength / Tensile',
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
      leaf: 'Mechanical / Impact / Charpy',
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
      leaf: 'Mechanical / Impact / Izod',
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
      leaf: 'Mechanical / Hardness / Rockwell',
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
      leaf: 'Mechanical / Hardness / Micro-Vickers',
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
      leaf: 'Mechanical / Hardness / Weld-Survey',
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
      leaf: 'Mechanical / Case-Depth / Micro-Hardness',
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
      leaf: 'Metallography / Microstructure / General',
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
    this.loadCustomTestsFromStorage();
    this.loadCustomPoolsFromStorage();
    this.initDefaultSections();
    this.loadSavedLayoutForTest();
    this.loadDatabaseTests();
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

  @HostListener('window:resize')
  onWindowResize(): void {
    const maxAllowed = Math.min(550, Math.floor(window.innerWidth * 0.45));
    if (this.leftPanelWidth > maxAllowed && maxAllowed >= 190) {
      this.leftPanelWidth = maxAllowed;
    }
  }

  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.altKey) && event.key === '[') {
      event.preventDefault();
      this.toggleLeftPanel();
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
    return `Live parameters mapped from ${target}${this.resolvedHierarchy?.groupId ? ' (ID: ' + this.resolvedHierarchy.groupId + ')' : ''}`;
  }

  get testList(): TestDef[] {
    return Object.values(this.testDatabase);
  }

  get currentTest(): TestDef {
    return this.testDatabase[this.selectedArchetypeKey] || this.testDatabase[this.selectedTestKey] || this.testDatabase['tensile'];
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
    const config: SectionConfig = {
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
    const isChemical = !!addVals.isChemical;
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

    // Construct hierarchical leaf node path (Leaf, SubGroup & Group)
    if (analysisTypeId && subGroupName) {
      this.leafNode = `${masterTestName} / ${subGroupName} / ${leafName}`;
      this.paperSub = `${masterTestName} • ${subGroupName} (${leafName})`;
    } else if (subGroupId && subGroupName) {
      this.leafNode = `${masterTestName} / ${subGroupName}`;
      this.paperSub = `${masterTestName} • ${subGroupName}`;
    } else {
      this.leafNode = `General / ${masterTestName}`;
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

    // Load saved customized layout if one exists for this test/leaf
    this.loadSavedLayoutForTest();

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

    return 'tensile';
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
      this.leafNode = labTest.department ? `${labTest.department} / ${labTest.name}` : `General / ${labTest.name}`;
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

    return 'tensile';
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

  duplicateSection(): void {
    if (!this.selectedSectionId) {
      this.toastService.show('Please select a section to duplicate', 'warning');
      return;
    }
    const idx = this.sections.findIndex(s => s.id === this.selectedSectionId);
    if (idx === -1) return;
    const orig = this.sections[idx];
    const dup: ExecutionSection = {
      id: Date.now(),
      type: orig.type,
      title: `${orig.title} (Copy)`,
      config: JSON.parse(JSON.stringify(orig.config))
    };
    this.sections.splice(idx + 1, 0, dup);
    this.selectedSectionId = dup.id;
    this.toastService.show('Section duplicated', 'success');
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

  // Save Layout
  saveLayout(): void {
    if (!this.selectedTestKey) {
      this.toastService.show('Select a Laboratory Test first (mandatory)', 'warning');
      return;
    }
    if (this.sections.length === 0) {
      this.toastService.show('Add at least one section before saving', 'warning');
      return;
    }

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
      this.isMapped = true;
      this.toastService.show(`Layout successfully saved & mapped to ${this.currentTest.label}`, 'success');
    } catch (e) {
      console.error(e);
      this.toastService.show('Failed to save layout configuration', 'error');
    }
  }

  // Load Saved Layout
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
            department: t.department || (t.isChemicalTest ? 'Chemical' : 'Mechanical')
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
      { id: 1, name: 'Tensile Test', isChemicalTest: false, code: 'TENSILE', department: 'Mechanical' },
      { id: 7, name: 'Hardness Test (Rockwell / Brinell)', isChemicalTest: false, code: 'HARDNESS', department: 'Mechanical' },
      { id: 8, name: 'Charpy Impact Test', isChemicalTest: false, code: 'CHARPY', department: 'Mechanical' },
      { id: 9, name: 'Izod Impact Test', isChemicalTest: false, code: 'IZOD', department: 'Mechanical' },
      { id: 10, name: 'Micro Vickers Hardness', isChemicalTest: false, code: 'MICRO_VICKERS', department: 'Mechanical' },
      { id: 11, name: 'Hardness Multi-Location (Weld Survey)', isChemicalTest: false, code: 'HARDNESS_SURVEY', department: 'Mechanical' },
      { id: 12, name: 'Effective Case Depth', isChemicalTest: false, code: 'CASE_DEPTH', department: 'Heat Treatment' },
      { id: 5, name: 'Spectro OES Chemical Analysis', isChemicalTest: true, code: 'OES', department: 'Chemical' },
      { id: 13, name: 'Metallography Microstructural Analysis', isChemicalTest: false, code: 'METALLOGRAPHY', department: 'Metallography' },
      { id: 14, name: 'Grain Size Analysis', isChemicalTest: false, code: 'GRAIN_SIZE', department: 'Metallography' },
      { id: 15, name: 'Ferrite Content Phase Analysis', isChemicalTest: false, code: 'FERRITE', department: 'Metallography' },
      { id: 16, name: 'Macroscopic Examination (Weld)', isChemicalTest: false, code: 'MACRO_WELD', department: 'Metallography' },
      { id: 17, name: 'Salt Spray Corrosion Test (SST)', isChemicalTest: false, code: 'SST', department: 'Corrosion' }
    ];
  }

  // Sync Live Parameters from DB (supports 3-level Chemical & 2-level General/Mechanical)
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

  // Register Custom Test Dialog
  openRegisterTestModal(): void {
    this.rtName = '';
    this.rtLeaf = '';
    this.rtStd = '';
    this.rtParams = 'Bend Angle | deg | ≥ 90\nCrack Observed | — | Runtime';
    this.registerModalOpen = true;
  }

  closeRegisterTestModal(): void {
    this.registerModalOpen = false;
  }

  saveCustomTest(): void {
    const name = this.rtName.trim();
    if (!name) {
      this.toastService.show('Test name is required', 'warning');
      return;
    }
    const lines = this.rtParams.split('\n').map(l => l.trim()).filter(Boolean);
    const parsedParams: TestParam[] = lines.map(line => {
      const parts = line.split('|').map(p => p.trim());
      return {
        name: parts[0] || 'Parameter',
        unit: parts[1] || '—',
        requirement: parts[2] || 'Runtime'
      };
    });

    if (parsedParams.length === 0) {
      this.toastService.show('At least one parameter is required', 'warning');
      return;
    }

    const key = name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const std = this.rtStd.trim();
    const leaf = this.rtLeaf.trim() || `General / ${name}`;
    const newTest: TestDef = {
      key,
      label: name,
      leaf,
      sub: std ? `${name} • ${std}` : name,
      params: parsedParams,
      demo: parsedParams.map(() => '100')
    };

    this.testDatabase[key] = newTest;
    this.saveCustomTestsToStorage();
    this.closeRegisterTestModal();
    this.onTestChange(key);
    this.toastService.show(`Laboratory Test "${name}" registered successfully`, 'success');
  }

  private loadCustomTestsFromStorage(): void {
    try {
      const custom = JSON.parse(localStorage.getItem('lims_universal_tests') || '{}');
      Object.keys(custom).forEach(k => {
        this.testDatabase[k] = custom[k];
      });
    } catch (e) {
      console.error(e);
    }
  }

  private saveCustomTestsToStorage(): void {
    try {
      const custom: Record<string, TestDef> = {};
      Object.keys(this.testDatabase).forEach(k => {
        if (!['tensile', 'impact', 'hardness', 'oes', 'metallography'].includes(k)) {
          custom[k] = this.testDatabase[k];
        }
      });
      localStorage.setItem('lims_universal_tests', JSON.stringify(custom));
    } catch (e) {
      console.error(e);
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

  getSpecimenCount(sec: ExecutionSection): number[] {
    const n = Math.max(1, Math.min(10, Number(sec.config.count) || 3));
    return Array.from({ length: n }, (_, i) => i + 1);
  }

  getLocationList(sec: ExecutionSection): string[] {
    if (sec.config.locationMode === 'Named locations' && sec.config.locationNames) {
      return sec.config.locationNames.split(',').map(l => l.trim()).filter(Boolean);
    }
    const n = Math.max(1, Math.min(10, Number(sec.config.count) || 3));
    const prefix = sec.config.prefix || 'Zone';
    return Array.from({ length: n }, (_, i) => `${prefix} ${i + 1}`);
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
        formula: p.formulaDisplay || p.formula || `${p.name} = Formula`,
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
  }

  selectAllParameters(sec: ExecutionSection): void {
    sec.config.subset = this.currentDataset.parameters.map(p => p.name);
    this.toastService.show('All parameters selected for section', 'info');
  }

  deselectAllParameters(sec: ExecutionSection): void {
    if (this.currentDataset.parameters.length > 0) {
      sec.config.subset = [this.currentDataset.parameters[0].name];
      this.toastService.show('Only primary parameter selected', 'info');
    }
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
        return `Target: ${sec.config.targetOutput || sec.config.resultLabel || 'Derived Result'} (${sec.config.formulaExpression || 'Calculated'})`;
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
}

