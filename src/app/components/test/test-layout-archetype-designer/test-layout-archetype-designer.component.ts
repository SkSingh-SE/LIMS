import { Component, OnInit, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { ToastService } from '../../../services/toast.service';
import { LaboratoryTestService } from '../../../services/laboratory-test.service';
import { TestMethodSpecificationService } from '../../../services/test-method-specification.service';
import { ParameterService } from '../../../services/parameter.service';
import { DimensionalFactorService } from '../../../services/dimensional-factor.service';
import { HeatTreatmentService } from '../../../services/heat-treatment.service';
import { ProductConditionService } from '../../../services/product-condition.service';
import { SpecimenOrientationService } from '../../../services/specimen-orientation.service';
import { EquipmentService } from '../../../services/equipment.service';
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
  // Environmental Conditions & Specimen Geometry
  temperature?: string;
  humidity?: string;
  specimenType?: string;
  surfaceCondition?: string;
  speedOfTesting?: string;
  testingSpeed?: string;
  gaugeLength?: string;
  conditionPreset?: string;

  // Equipment & Traceability
  equipmentName?: string;
  equipmentId?: string;
  calibrationCertificate?: string;
  calibrationDate?: string;
  calibrationDue?: string;
  extensometerType?: string;
  indenterType?: string;
  testLoad?: string;
  dwellTime?: string;
  traceabilityPreset?: string;
  width?: string;
  visibility?: string;
  enabled?: boolean;
  renderMode?: 'fixed' | 'runtime';
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
  specimenShape?: 'rectangular' | 'round' | 'tubular';
  selectedOrientationId?: number | string;
  selectedOrientationNotation?: string;
  showOrientationColumn?: boolean;
  showOrientationCol?: boolean;
  showDimensions?: boolean;
  showAreaCalculation?: boolean;
  showAreaCol?: boolean;
  showConformanceVerdict?: boolean;
  specimenExecutionMode?: 'fixed' | 'runtime';

  // Reading
  readingSource?: string;
  readingCount?: string;
  aggregation?: string;
  showIndividual?: boolean;
  showStatistics?: boolean;
  readingLabel?: string;
  targetParameter?: string;
  unit?: string;
  targetParamId?: number | string;
  targetParamName?: string;
  targetUnit?: string;
  targetRequirement?: string;
  targetMin?: number | string;
  targetMax?: number | string;
  readingExecutionMode?: 'fixed' | 'runtime';
  spotCount?: number;
  outlierSpreadLimit?: number;
  showSpreadRow?: boolean;
  showOverallAverageRow?: boolean;

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
  cutoff?: string;
  showTable?: boolean;
  showCurve?: boolean;
  showStatus?: boolean;

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
  cellMatrix?: CustomTableCell[][];
  activeCellCoords?: { rowIdx: number; colIdx: number } | null;

  // Photo & Attachment Plate
  caption?: string;
  showMagnification?: boolean;
  showDateTime?: boolean;
  showScale?: boolean;
  showSpecimenId?: boolean;
  showLocation?: boolean;
  showEtchant?: boolean;
  showFieldNo?: boolean;
  showCaptureDate?: boolean;
  showAnalystBadge?: boolean;
  gridColumns?: string;
  aspectRatio?: string;
  cardStyle?: string;
  plateHeight?: string;
  allowRuntimeUpload?: boolean;
  allowZoomModal?: boolean;
  requirePhotoToVerify?: boolean;
  allowedFormats?: string;
  maxFileSizeMb?: number;
  reportPlacement?: string;
  watermarkReport?: boolean;
  highResPrint?: boolean;
  photoSlots?: PhotoSlotItem[];
  activePhotoTab?: 'slots' | 'layout' | 'nabl';
  showPreText?: boolean;
  preText?: string;
  showPostText?: boolean;
  postText?: string;

  // Opinion & Interpretation (ISO 17025 Cl. 7.8.7)
  isOptional?: boolean;
  sectionStatus?: 'Optional' | 'Required';
  derivedOnly?: boolean;
  showOverallStatement?: boolean;
  overallStatement?: string;

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

  // Demo Data Properties
  testMethod?: string;
  demoConditionValues?: { [field: string]: string };
  demoTraceValues?: { [field: string]: string };
  demoText?: string;
  hasDemoData?: boolean;
}

export type DataBindingMode = 'runtime' | 'static' | 'manual';
export type DataOriginType = 'entry' | 'db' | 'calc' | 'fixed';
export type DbMasterSourceType = 'parameter' | 'dimensional_factor' | 'heat_treatment' | 'product_condition' | 'specimen_orientation';

export interface CustomTableCell {
  id: string;
  rowIdx: number;
  colIdx: number;
  rowKey: string;
  colKey: string;
  value: string | number;
  displayLabel?: string;
  dataType: 'text' | 'number' | 'date' | 'select' | 'formula';
  bindingMode: DataBindingMode;
  staticValue?: string;
  formulaExpression?: string;
  selectOptions?: string[];
  selectOptionsRaw?: string;
  unit?: string;
  precision?: number;
  colspan?: number;
  rowspan?: number;
  align?: 'left' | 'center' | 'right';
  isLocked?: boolean;
  demoValue?: string;
}

export interface LayoutColumnItem {
  id?: string;
  key: string;
  label: string;
  bindingMode: DataBindingMode;
  origin?: DataOriginType;
  dbMasterSource?: DbMasterSourceType;
  dbMasterId?: number | string;
  staticValue?: string;
  paramKey?: string;
  unit?: string;
  requirement?: string;
  minLimit?: number | string;
  maxLimit?: number | string;
  targetLimit?: number | string;
  decimalPrecision?: number;
  isCalculated?: boolean;
  formula?: string;
  formulaDisplay?: string;
  aggregateFunction?: string;
  aggregateSourceKeys?: string[];
  flagLimitExcess?: boolean;
  readingsPerCell?: number;
  subAggs?: string[];
  headerGroup?: string;
  clause?: string;
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
  nature?: 'data' | 'summary';
  rowOrigin?: 'manual' | 'pattern' | 'db';
  dbMasterSource?: DbMasterSourceType;
  dbMasterId?: number | string;
  patternConfig?: { prefix: string; count: number; start: number; step: number };
  summaryFn?: 'avg' | 'sum' | 'min' | 'max' | 'range' | 'std_dev' | 'count' | 'formula';
  summaryScope?: 'all' | 'custom';
  customRowKeys?: string[];
  staticValue?: string;
  requirement?: string;
  unit?: string;
  visible: boolean;
  isCalculated?: boolean;
  formula?: string;
  formulaDisplay?: string;
  values?: { [colKey: string]: string };
  demoValue?: string;
  isLocked?: boolean;
  isInternal?: boolean;
  removable?: boolean;
}

export interface PhotoSlotItem {
  id: string;
  title: string;
  caption?: string;
  bindingSource: DataBindingMode;
  magnification?: string;
  etchant?: string;
  etchantMode?: 'manual' | 'param';
  etchantSource?: string;
  etchantId?: number | string;
  paramKey?: string;
  paramName?: string;
  scaleBar?: string;
  location?: string;
  specimenId?: string;
  mandatory?: boolean;
  reportable?: boolean;
  mockUrl?: string;
  fieldNo?: string;
  aspectRatio?: string;
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
    photoGridColumns: [
      { value: '2 Columns (Pair)', label: '2 Columns (Side-by-side Pair — Standard)' },
      { value: '1 Column (Full Width)', label: '1 Column (Full Width Single Plate)' },
      { value: '3 Columns (Trio)', label: '3 Columns (Trio Grid)' },
      { value: '4 Columns (Quad)', label: '4 Columns (Quad Gallery)' },
      { value: 'Comparison Mode (Before / After)', label: 'Comparison Mode (Before vs After Split View)' },
    ],
    photoAspectRatio: [
      { value: '4:3', label: '4:3 (Standard Optical Micrograph)' },
      { value: '16:9', label: '16:9 (Widescreen / Macro View)' },
      { value: '1:1', label: '1:1 (Square Field View)' },
      { value: '3:2', label: '3:2 (Classic 35mm Format)' },
      { value: 'Auto', label: 'Auto (Original File Proportion)' },
    ],
    photoCardStyle: [
      { value: 'Technical Datasheet', label: 'Technical Datasheet (Metadata Header & Reticle Viewport)' },
      { value: 'Standard Bordered', label: 'Standard Bordered Card' },
      { value: 'Minimal Plate', label: 'Minimal Clean Plate' },
    ],
    photoPlateHeight: [
      { value: 'Standard (185px)', label: 'Standard (185px)' },
      { value: 'Compact (140px)', label: 'Compact (140px)' },
      { value: 'Large (240px)', label: 'Large (240px)' },
      { value: 'Hero (300px)', label: 'Hero (300px)' },
    ],
    photoReportPlacement: [
      { value: 'Inline with section', label: 'Inline with section (Flows with test results)' },
      { value: 'Dedicated Annexure Page', label: 'Dedicated Annexure Page (Full-page Photo Plate)' },
      { value: 'Report Appendix', label: 'Report Appendix (End of Certificate)' },
    ],
    photoMaxFileSize: [
      { value: 5, label: '5 MB (Standard)' },
      { value: 2, label: '2 MB (Compact)' },
      { value: 10, label: '10 MB (High Definition)' },
      { value: 25, label: '25 MB (Raw / Uncompressed)' },
    ],
    photoBindingSource: [
      { value: 'runtime', label: '⚡ Runtime (Analyst Upload)' },
      { value: 'static', label: '📌 Static (Pre-configured Diagram / Spec Standard)' },
      { value: 'manual', label: '✏ Manual (External URL or File Reference)' },
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
  } | null = null;

  private testMethodSpecService = inject(TestMethodSpecificationService);
  private parameterService = inject(ParameterService);
  private dimensionalFactorService = inject(DimensionalFactorService);
  private heatTreatmentService = inject(HeatTreatmentService);
  private productConditionService = inject(ProductConditionService);
  private specimenOrientationService = inject(SpecimenOrientationService);
  private equipmentService = inject(EquipmentService);

  fetchMasterParameterDropdown = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.parameterService.getParameterDropdown(term, page, pageSize);
  };

  fetchDimensionalFactorDropdown = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.dimensionalFactorService.getDimensionalFactorDropdown(term, page, pageSize);
  };

  fetchHeatTreatmentDropdown = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.heatTreatmentService.getHeatTreatmentDropdown(term, page, pageSize);
  };

  fetchProductConditionDropdown = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.productConditionService.getProductConditionDropdown(term, page, pageSize);
  };

  fetchSpecimenOrientationDropdown = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.specimenOrientationService.getSpecimenOrientationDropdown(term, page, pageSize);
  };

  fetchEquipmentDropdown = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.equipmentService.getEquipmentDropdown(term, page, pageSize);
  };

  databaseSourceOptions: Array<{ value: string; label: string }> = [
    { value: 'parameter', label: 'Parameter / Chemical Reagent' },
    { value: 'equipment', label: 'Equipment / Microscope Master' },
    { value: 'product_condition', label: 'Product Condition Master' },
    { value: 'heat_treatment', label: 'Heat Treatment Master' },
    { value: 'specimen_orientation', label: 'Specimen Orientation Master' },
    { value: 'dimensional_factor', label: 'Dimensional Factor Master' }
  ];

  getFetchFnForSource = (source: string = 'parameter') => {
    switch (source) {
      case 'equipment':
        return this.fetchEquipmentDropdown;
      case 'product_condition':
        return this.fetchProductConditionDropdown;
      case 'heat_treatment':
        return this.fetchHeatTreatmentDropdown;
      case 'specimen_orientation':
        return this.fetchSpecimenOrientationDropdown;
      case 'dimensional_factor':
        return this.fetchDimensionalFactorDropdown;
      case 'parameter':
      default:
        return this.fetchMasterParameterDropdown;
    }
  };

  onSlotEtchantSelected(item: any, slot: PhotoSlotItem): void {
    if (!item) return;
    const name = item.name || item.parameterName || item.label || '';
    const id = item.id || item.parameterId || '';
    slot.etchantId = id;
    slot.etchant = name;
    slot.paramKey = item.key || item.code || '';
    slot.paramName = name;
  }

  clearSlotEtchant(slot: PhotoSlotItem): void {
    slot.etchantId = undefined;
    slot.etchant = '';
    slot.paramKey = undefined;
    slot.paramName = undefined;
  }

  // Dual-Key Test Mapping (Key 1: Laboratory Test, Key 2: Test Method Specification)
  selectedTestMethodId: number | null = null;
  selectedTestMethodName: string = '';
  selectedTestMethodItem: any = null;

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
      this.selectedTestMethodItem = null;
      this.toastService.show('Test Method unlinked (Layout applies to all methods)', 'info');
      return;
    }

    const addVals = item.additionalValues || {};
    const specId = addVals.testMethodSpecificationId ? Number(addVals.testMethodSpecificationId) : null;
    const versionId = item.nodeType === 'Version' ? Number(item.id) : (addVals.versionId ? Number(addVals.versionId) : null);

    this.selectedTestMethodId = specId || versionId || Number(item.id || item.ID);
    this.selectedTestMethodName = addVals.fullDisplayName || item.name || addVals.displayTitle || item.TestStandard || '';
    this.selectedTestMethodItem = {
      id: item.id,
      name: this.selectedTestMethodName,
      nodeType: item.nodeType,
      additionalValues: {
        ...addVals,
        testMethodSpecificationId: specId,
        fullDisplayName: this.selectedTestMethodName
      }
    };

    this.toastService.show(`Target Test Method set to: ${this.selectedTestMethodName}`, 'success');

    // Reload layout for this hierarchy + new test method combination
    if (this.selectedLabTestId || this.selectedUnifiedTestId) {
      this.loadDatabaseLayoutForHierarchy(
        Number(this.selectedLabTestId || this.selectedUnifiedTestId) || null,
        this.selectedSubGroupId,
        this.selectedAnalysisTypeId,
        this.leafNode,
        this.selectedArchetypeKey
      );
    }
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
  activeConfigTab: 'structure' | 'datasource_rules' | 'display' = 'structure';
  locationConfigTarget: 'rows' | 'columns' = 'columns';
  selectedLocationColIdx: number = 1;
  selectedLocationRowIdx: number = 0;

  setActiveConfigTab(tab: 'structure' | 'datasource_rules' | 'display'): void {
    this.activeConfigTab = tab;
  }

  selectLocationCol(idx: number): void {
    this.selectedLocationColIdx = idx;
  }

  selectLocationRow(idx: number): void {
    this.selectedLocationRowIdx = idx;
  }

  getSelectedLocationCol(sec: ExecutionSection): LayoutColumnItem | null {
    const cols = this.getTableColumns(sec);
    if (!cols || cols.length === 0) return null;
    if (this.selectedLocationColIdx >= cols.length) {
      this.selectedLocationColIdx = 0;
    }
    return cols[this.selectedLocationColIdx] || null;
  }

  isAverageCol(col: LayoutColumnItem | null): boolean {
    return col?.key === 'avg';
  }

  isLocationParamCol(col: LayoutColumnItem | null): boolean {
    return !!col && col.key.startsWith('param_');
  }

  setSectionRenderMode(sec: ExecutionSection, mode: 'fixed' | 'runtime'): void {
    sec.config.renderMode = mode;
    sec.config.allowRuntimeAdd = (mode === 'runtime');
    sec.config.runtimeAdjust = (mode === 'runtime');
  }

  isSectionFixed(sec: ExecutionSection): boolean {
    return sec.config.renderMode === 'fixed' || (sec.config.allowRuntimeAdd === false && sec.config.runtimeAdjust === false);
  }

  getSelectedLocationRow(sec: ExecutionSection): LayoutRowItem | null {
    const rows = this.ensureTableRows(sec);
    if (!rows || rows.length === 0) return null;
    if (this.selectedLocationRowIdx >= rows.length) {
      this.selectedLocationRowIdx = 0;
    }
    return rows[this.selectedLocationRowIdx] || null;
  }

  bindMasterParamToColumn(col: LayoutColumnItem, item: any): void {
    this.bindMasterSourceToColumn(col, 'parameter', item);
  }

  bindMasterSourceToColumn(col: LayoutColumnItem, masterType: string, item: any): void {
    if (!col || !item) return;
    col.dbMasterSource = masterType as any;
    col.dbMasterId = item.id || item.value || '';
    const name = item.name || item.parameterName || item.label || '';
    const unit = item.unit || item.parameterUnit?.name || '';

    if (masterType === 'parameter') {
      col.paramKey = name;
      let cleanName = name;
      if (unit) {
        cleanName = name.replace(new RegExp(`\\s*\\(?${unit}\\)?\\s*`, 'gi'), '').trim();
        col.label = `${cleanName} (${unit})`;
      } else {
        col.label = cleanName;
      }
      col.unit = unit;
      if (item.requirement || item.standardValue) {
        col.requirement = item.requirement || item.standardValue;
      }
      if (item.decimalPrecision !== undefined) {
        col.decimalPrecision = item.decimalPrecision;
      }
      if (item.formula) {
        col.formula = item.formula;
        col.formulaDisplay = item.formulaDisplay || item.formula;
        col.isCalculated = true;
      }
    } else if (masterType === 'dimensional_factor') {
      col.label = item.name || item.label || item.factorName || name;
      col.paramKey = item.symbol || item.code || 'dim';
      col.unit = item.unit || 'mm';
    } else if (masterType === 'specimen_orientation') {
      col.label = item.name || item.label || 'Orientation';
      col.paramKey = item.code || item.notation || 'orient';
      col.staticValue = item.code || item.notation || 'L-T';
    } else if (masterType === 'heat_treatment') {
      col.label = item.name || item.label || 'Heat Treatment';
      col.paramKey = 'heat_treatment';
      col.unit = item.temperatureRange || '°C';
    } else if (masterType === 'product_condition') {
      col.label = item.name || item.label || 'Product Condition';
      col.paramKey = 'product_condition';
    }
    this.toastService.show(`Bound column to "${name}"`, 'success');
  }

  bindMasterSourceToRow(row: LayoutRowItem, masterType: string, item: any): void {
    if (!row || !item) return;
    row.dbMasterSource = masterType as any;
    row.dbMasterId = item.id || item.value || '';
    const name = item.name || item.parameterName || item.label || '';
    row.label = name;
    if (masterType === 'parameter') {
      if (item.unit) row.unit = item.unit;
      if (item.requirement || item.standardValue) row.requirement = item.requirement || item.standardValue;
      if (item.formula) {
        row.formula = item.formula;
        row.formulaDisplay = item.formulaDisplay || item.formula;
        row.isCalculated = true;
      }
    } else if (masterType === 'specimen_orientation') {
      row.staticValue = item.code || item.notation || 'L-T';
    }
    this.toastService.show(`Bound row to "${name}"`, 'success');
  }

  patternRowConfig = {
    prefix: 'Depth ',
    count: 10,
    start: 0.1,
    step: 0.1
  };

  generatePatternRows(sec: ExecutionSection): void {
    const p = this.patternRowConfig;
    const count = Math.max(1, Math.min(50, p.count || 5));
    const start = p.start !== undefined ? +p.start : 0.1;
    const step = p.step !== undefined ? +p.step : 0.1;
    const prefix = p.prefix || 'Depth ';

    const newRows: string[] = [];
    for (let i = 0; i < count; i++) {
      const val = +(start + i * step).toFixed(3);
      newRows.push(`${prefix}${val}`);
    }
    sec.config.locationRows = newRows;
    const tableRows = this.ensureTableRows(sec);
    const summaryRows = tableRows.filter(r => r.nature === 'summary');
    const generatedDataRows: LayoutRowItem[] = newRows.map((lbl, idx) => ({
      key: `loc_pat_${idx + 1}`,
      label: lbl,
      nature: 'data',
      rowOrigin: 'pattern',
      bindingMode: 'runtime',
      visible: true
    }));
    sec.config.tableRows = [...generatedDataRows, ...summaryRows];
    this.toastService.show(`Generated ${count} traverse rows`, 'success');
  }

  addCustomObservationColumn(sec: ExecutionSection): void {
    const cols = this.getTableColumns(sec);
    const nextNum = cols.filter(c => c.key.startsWith('col_custom_')).length + 1;
    const newCol: LayoutColumnItem = {
      key: `col_custom_${Date.now()}_${nextNum}`,
      label: `Custom Obs ${nextNum}`,
      bindingMode: 'manual',
      origin: 'entry',
      visible: true,
      align: 'center',
      removable: true
    };
    cols.push(newCol);
    this.selectedLocationColIdx = cols.length - 1;
    this.toastService.show('Added custom observation column', 'info');
  }

  addLocationObservationColumn(sec: ExecutionSection): void {
    const cols = this.getTableColumns(sec);
    const obsCols = cols.filter(c => c.key.startsWith('param_') || c.key.startsWith('col_custom_'));
    const nextNum = obsCols.length + 1;
    const newCol: LayoutColumnItem = {
      key: `param_${Date.now()}_${nextNum}`,
      label: `Observation ${nextNum}`,
      unit: '',
      bindingMode: 'manual',
      origin: 'entry',
      visible: true,
      align: 'center',
      removable: true
    };
    const avgIdx = cols.findIndex(c => c.key === 'avg');
    if (avgIdx > -1) {
      cols.splice(avgIdx, 0, newCol);
      this.selectedLocationColIdx = avgIdx;
    } else {
      cols.push(newCol);
      this.selectedLocationColIdx = cols.length - 1;
    }
    this.toastService.show(`Added Observation column ${nextNum}`, 'info');
  }

  addSummaryRow(sec: ExecutionSection, summaryFn: 'avg' | 'sum' | 'min' | 'max' | 'range' | 'std_dev'): void {
    const labels: Record<string, string> = {
      avg: 'Σ OVERALL AVERAGE',
      sum: 'Σ TOTAL SUM',
      min: 'MINIMUM OBSERVED',
      max: 'MAXIMUM OBSERVED',
      range: 'Δ HARDNESS SPREAD',
      std_dev: 'σ STANDARD DEVIATION'
    };
    const label = labels[summaryFn] || 'SUMMARY';
    const newRow: LayoutRowItem = {
      key: `summary_${summaryFn}_${Date.now()}`,
      label: label,
      nature: 'summary',
      summaryFn: summaryFn,
      summaryScope: 'all',
      bindingMode: 'manual',
      visible: true,
      isCalculated: true,
      removable: true
    };
    const rows = this.ensureTableRows(sec);
    rows.push(newRow);
    this.selectedLocationRowIdx = rows.length - 1;
    this.locationConfigTarget = 'rows';
    this.toastService.show(`Added summary row: ${label}`, 'success');
  }

  insertFormulaToken(col: LayoutColumnItem, token: string): void {
    if (!col) return;
    col.formula = (col.formula || '') + token;
  }

  toggleAvgSourceColumn(col: LayoutColumnItem, sourceColKey: string): void {
    if (!col.aggregateSourceKeys) {
      col.aggregateSourceKeys = [];
    }
    const idx = col.aggregateSourceKeys.indexOf(sourceColKey);
    if (idx > -1) {
      col.aggregateSourceKeys.splice(idx, 1);
    } else {
      col.aggregateSourceKeys.push(sourceColKey);
    }
  }

  isAvgSourceColumnChecked(col: LayoutColumnItem, sourceColKey: string): boolean {
    if (!col.aggregateSourceKeys || col.aggregateSourceKeys.length === 0) {
      return sourceColKey.startsWith('param_');
    }
    return col.aggregateSourceKeys.includes(sourceColKey);
  }

  getLocationObservationColumns(sec: ExecutionSection): LayoutColumnItem[] {
    const cols = this.getTableColumns(sec);
    return cols.filter(c => c.key.startsWith('param_'));
  }

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
    { key: 'all_sections', label: 'All 16 Sections Master Showcase (Universal Layout)', icon: '★' },
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
    traceability: 'Traceability / Technical Record',
    opinion: 'Opinion & Interpretation'
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
    traceability: '🧾',
    opinion: '⚖'
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
      params: [],
      demo: []
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
    all_sections: {
      key: 'all_sections',
      label: 'All 16 Sections Master Showcase',
      leaf: 'Master / Universal / All-16-Archetypes',
      sub: 'Complete 16-Section Standard Studio Showcase',
      dbTestId: 999,
      isChemical: false,
      params: [
        { name: 'Yield Strength', unit: 'MPa', requirement: '≥ 250', isCalculated: true, formula: 'YS = YieldLoad / Area_S0', formulaDisplay: 'YS = Yield Load / S0' },
        { name: 'Ultimate Tensile Strength', unit: 'MPa', requirement: '≥ 410', isCalculated: true, formula: 'UTS = PeakLoad / Area_S0', formulaDisplay: 'UTS = Peak Load / S0' },
        { name: 'Elongation', unit: '%', requirement: '≥ 20', isCalculated: true, formula: 'EL = ((Lu - L0) / L0) * 100', formulaDisplay: 'EL% = ((Lu - L0) / L0) * 100' },
        { name: 'Rockwell Hardness', unit: 'HRC', requirement: '28 – 34 HRC' },
        { name: 'Carbon Equivalent', unit: '%', requirement: '≤ 0.45', isCalculated: true, formula: 'CEV = C + Mn/6 + (Cr+Mo+V)/5 + (Ni+Cu)/15', formulaDisplay: 'CEV = C + Mn/6 + (Cr+Mo+V)/5 + (Ni+Cu)/15' }
      ],
      demo: ['425', '555', '26.0', '31.5', '0.38']
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

  get hasSelectedTest(): boolean {
    return !!(
      (this.selectedUnifiedTestId && this.selectedUnifiedTestId !== '' && this.selectedUnifiedTestId !== 0) ||
      (this.selectedLabTestId && this.selectedLabTestId > 0 && this.resolvedHierarchy?.groupName)
    );
  }

  get actualLabTestList(): any[] {
    return this.actualLabTests;
  }

  get currentLabTest(): any {
    if (!this.selectedLabTestId) return null;
    return this.actualLabTests.find(t => t.id === this.selectedLabTestId) || null;
  }

  get currentLabTestName(): string {
    if (!this.hasSelectedTest) return 'No Test Selected';
    return this.resolvedHierarchy?.fullDisplayName || this.resolvedHierarchy?.groupName || this.currentLabTest?.name || this.currentTest.label;
  }

  get dataSourceLabel(): string {
    if (!this.hasSelectedTest) return 'Manual Configuration (No Test Selected)';
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
        config.orientation = 'Specimens × Parameters';
        config.specimenShape = 'rectangular';
        config.selectedOrientationNotation = 'L-T (Transverse)';
        config.showOrientationColumn = true;
        config.showDimensions = true;
        config.showAreaCalculation = true;
        config.showAverage = true;
        config.showMinMax = false;
        config.showRequirement = true;
        config.showConformanceVerdict = true;
        config.specimenExecutionMode = 'runtime';
        config.editable = true;
        config.showIdentity = true;
        config.ident = this.specimenIdentFields.slice(0, 3);
        break;

      case 'reading':
        config.readingSource = 'Runtime readings';
        config.readingCount = 'Fixed count';
        config.count = 5;
        config.spotCount = 5;
        config.targetParamName = 'Rockwell Hardness';
        config.targetUnit = 'HRC';
        config.targetRequirement = '28 – 34 HRC';
        config.readingLabel = 'Rockwell Hardness Spot Readings';
        config.aggregation = 'Average / Mean';
        config.showIndividual = true;
        config.showStatistics = true;
        config.showOverallAverageRow = true;
        config.showSpreadRow = true;
        config.outlierSpreadLimit = 3.0;
        config.readingExecutionMode = 'runtime';
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
        config.columns = { unit: true };
        config.caption = 'Runtime attachment caption';
        config.showMagnification = true;
        config.showDateTime = false;
        config.showScale = true;
        config.showSpecimenId = true;
        config.showLocation = true;
        config.showEtchant = true;
        config.showFieldNo = true;
        config.showCaptureDate = false;
        config.showAnalystBadge = false;
        config.gridColumns = '2 Columns (Pair)';
        config.aspectRatio = '4:3';
        config.cardStyle = 'Technical Datasheet';
        config.plateHeight = 'Standard (185px)';
        config.allowRuntimeUpload = true;
        config.allowZoomModal = true;
        config.requirePhotoToVerify = false;
        config.allowedFormats = 'JPG, PNG, WEBP, PDF';
        config.maxFileSizeMb = 5;
        config.reportPlacement = 'Inline with section';
        config.watermarkReport = false;
        config.pageBreak = 'Auto';
        config.count = 2;
        config.showPreText = true;
        config.preText = 'Microscopic examination carried out on transverse metallographic cross-section in unetched and etched conditions.';
        config.showPostText = true;
        config.postText = 'Microstructure reveals uniformly distributed fine pearlite and ferrite grains. No continuous grain-boundary carbide network or decarburization observed.';
        config.photoSlots = [
          {
            id: 'slot_1',
            title: 'Micrograph Plate 1 (100X)',
            caption: 'Microstructure / Inclusion Assessment as per ASTM E45',
            bindingSource: 'runtime',
            magnification: '100X',
            etchant: '2% Nital',
            etchantMode: 'manual',
            etchantSource: 'parameter',
            scaleBar: '50 µm',
            location: 'Surface Zone',
            specimenId: 'Specimen #1',
            mandatory: true,
            reportable: true
          },
          {
            id: 'slot_2',
            title: 'Micrograph Plate 2 (500X)',
            caption: 'Matrix structure, grain boundaries & carbides morphology',
            bindingSource: 'runtime',
            magnification: '500X',
            etchant: '2% Nital',
            etchantMode: 'manual',
            etchantSource: 'parameter',
            scaleBar: '20 µm',
            location: 'Core / Mid-thickness',
            specimenId: 'Specimen #1',
            mandatory: false,
            reportable: true
          }
        ];
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

      case 'opinion':
        config.source = 'Derived Parameters & Expert Evaluation';
        config.isOptional = true;
        config.sectionStatus = 'Optional';
        config.derivedOnly = true;
        config.showOverallStatement = true;
        config.overallStatement = 'Based on the above test results, the material complies with specified standard requirements. The tensile and yield behavior exhibits ductile fracture characteristics.';
        config.tableColumns = [
          { key: 'param', label: 'Parameter / Evaluation Topic', bindingMode: 'runtime', visible: true, width: '40%' },
          { key: 'observed', label: 'Observed Value', bindingMode: 'runtime', visible: true, width: '30%' },
          { key: 'requirement', label: 'Requirement Min / Max', bindingMode: 'runtime', visible: true, width: '30%' }
        ];
        config.tableRows = [
          {
            key: 'row_uts_fracture',
            label: 'Ultimate Tensile Strength (N/mm²) & Fracture Mode',
            unit: 'N/mm²',
            requirement: '535.0 Min. (Conforms)',
            staticValue: '555.00 / 553.45 (Ductile B.O.W)',
            isCalculated: true,
            formula: 'UTS = Fmax / So',
            formulaDisplay: 'UTS = Maximum Load (Fmax) / Original Cross-Section Area (So)',
            bindingMode: 'runtime',
            visible: true
          },
          {
            key: 'row_yield_ratio',
            label: 'Yield-to-Tensile Ratio (Re/Rm)',
            unit: 'Ratio',
            requirement: '≤ 0.85 (Conforms)',
            staticValue: '0.78',
            isCalculated: true,
            formula: 'Ratio = Re / Rm',
            formulaDisplay: 'Ratio = Yield Strength (Re) / Tensile Strength (Rm)',
            bindingMode: 'runtime',
            visible: true
          },
          {
            key: 'row_carbon_equiv',
            label: 'Carbon Equivalent (CEV)',
            unit: '%',
            requirement: '0.45 % Max (Conforms)',
            staticValue: '0.38 %',
            isCalculated: true,
            formula: 'CEV = C + Mn/6 + (Cr+Mo+V)/5 + (Ni+Cu)/15',
            formulaDisplay: 'CEV = C + Mn/6 + (Cr+Mo+V)/5 + (Ni+Cu)/15',
            bindingMode: 'runtime',
            visible: true
          }
        ];
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
    if (!item) {
      this.selectedUnifiedTestId = null;
      this.selectedUnifiedTestItem = null;
      this.selectedLabTestId = 0;
      this.selectedSubGroupId = null;
      this.selectedAnalysisTypeId = null;
      this.resolvedHierarchy = null;
      this.leafNode = '';
      this.paperSub = '';
      return;
    }

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

  // Toggle / Set Demo Data
  toggleDemoData(): void {
    const sec = this.selectedSection;
    if (sec) {
      this.populateDemoDataForSection(sec);
      this.demoMode = true;
      this.toastService.show(`Demo data generated for: "${sec.title}"`, 'success');
    } else {
      this.populateDemoDataForAllSections();
      this.demoMode = true;
      this.toastService.show(`Demo data generated for all ${this.sections.length} sections`, 'success');
    }
    this.markLayoutDirty();
  }

  populateDemoDataForAllSections(): void {
    this.sections.forEach(s => this.populateDemoDataForSection(s));
    this.demoMode = true;
  }

  parseRequirementTarget(req: string): number | null {
    if (!req) return null;
    const clean = req.trim();
    const rangeMatch = clean.match(/([\d.]+)\s*(?:[-–]|to)\s*([\d.]+)/i);
    if (rangeMatch) {
      const min = parseFloat(rangeMatch[1]);
      const max = parseFloat(rangeMatch[2]);
      if (!isNaN(min) && !isNaN(max)) {
        return Math.round(((min + max) / 2) * 10) / 10;
      }
    }
    const gteMatch = clean.match(/(?:[≥>=]|min\.?)\s*([\d.]+)|([\d.]+)\s*min/i);
    if (gteMatch) {
      const val = parseFloat(gteMatch[1] || gteMatch[2]);
      if (!isNaN(val)) {
        return val >= 100 ? Math.round(val * 1.12) : Math.round((val + 4.5) * 10) / 10;
      }
    }
    const lteMatch = clean.match(/(?:[≤<=]|max\.?)\s*([\d.]+)|([\d.]+)\s*max/i);
    if (lteMatch) {
      const val = parseFloat(lteMatch[1] || lteMatch[2]);
      if (!isNaN(val)) {
        return val >= 100 ? Math.round(val * 0.90) : Math.round((val - 1.5) * 10) / 10;
      }
    }
    const singleNum = clean.match(/[\d.]+/);
    if (singleNum) {
      const n = parseFloat(singleNum[0]);
      if (!isNaN(n)) return n;
    }
    return null;
  }

  generateRealisticDemoValue(label: string, unit: string, req: string, rowIdx: number, colIdx: number, secType: string): string {
    const l = (label || '').toLowerCase();
    const u = (unit || '').toLowerCase();
    const r = (req || '').trim();
    const reqTarget = this.parseRequirementTarget(r);

    if (l.includes('tensile strength') || l.includes('uts') || l.includes('rm') || l.includes('ultimate')) {
      if (reqTarget) return String(Math.round(reqTarget));
      return String(620 + (rowIdx * 8) + (colIdx * 3));
    }
    if (l.includes('yield') || l.includes('proof stress') || l.includes('reh') || l.includes('rp0.2') || l.includes('rp 0.2')) {
      if (reqTarget) return String(Math.round(reqTarget));
      return String(445 + (rowIdx * 6) + (colIdx * 2));
    }
    if (l.includes('elongation') || l.includes('% a') || l === 'a' || (u.includes('%') && l.includes('el'))) {
      if (reqTarget) return reqTarget.toFixed(1);
      return (24.5 + ((rowIdx * 1.2) % 4)).toFixed(1);
    }
    if (l.includes('reduction of area') || l.includes('roa') || l === 'z') {
      if (reqTarget) return reqTarget.toFixed(1);
      return (58.5 - ((rowIdx * 0.8) % 5)).toFixed(1);
    }
    if (l.includes('brinell') || l.includes('hbw') || u.includes('hbw')) {
      if (reqTarget) return String(Math.round(reqTarget));
      return String(142 + (rowIdx % 5) * 3);
    }
    if (l.includes('rockwell') || l.includes('hrc') || u.includes('hrc') || l.includes('hrb')) {
      if (reqTarget) return reqTarget.toFixed(1);
      return (32.5 + ((rowIdx * 0.5) % 3)).toFixed(1);
    }
    if (l.includes('vickers') || l.includes('hv') || u.includes('hv')) {
      if (reqTarget) return String(Math.round(reqTarget));
      return String(218 + (rowIdx * 4) + (colIdx * 3));
    }
    if (l.includes('impact') || l.includes('charpy') || l.includes('joule') || u.includes('j')) {
      if (reqTarget) return reqTarget.toFixed(1);
      return (42.5 + ((rowIdx * 2) % 6)).toFixed(1);
    }
    if (l.includes('expansion') || l.includes('mils')) {
      return (1.25 + (rowIdx * 0.05)).toFixed(2);
    }
    if (l.includes('shear') || l.includes('fracture')) {
      return '100 %';
    }
    if (l.includes('width') || l.includes('w0') || l === 'w') return (12.50 + rowIdx * 0.02).toFixed(2);
    if (l.includes('thickness') || l.includes('t0') || l === 't') return (3.20 - rowIdx * 0.01).toFixed(2);
    if (l.includes('diameter') || l.includes('d0') || l === 'd') return (10.00 + rowIdx * 0.05).toFixed(2);
    if (l.includes('gauge length') || l.includes('l0') || l === 'gl') return '50.00';
    if (l.includes('final length') || l.includes('lu')) return '63.20';
    if (l.includes('final diameter') || l.includes('du')) return '6.80';
    if (l.includes('area') || l.includes('s0')) return (78.54 - rowIdx * 0.2).toFixed(2);
    if (l.includes('yield load') || l.includes('feh')) return (35.20 + rowIdx * 0.4).toFixed(2);
    if (l.includes('peak load') || l.includes('fm') || l.includes('tensile load')) return (48.80 + rowIdx * 0.5).toFixed(2);
    if (l.includes('force') || l.includes('load')) return u.includes('kgf') ? '750' : '85.4';
    if (l.includes('temp') || u.includes('°c')) return (23.2 + (rowIdx * 0.3)).toFixed(1);
    if (l.includes('humid') || u.includes('% rh')) return '52';
    if (l.includes('speed') || l.includes('rate')) return '5.0';

    if (l.includes('carbon') || l === 'c') return '0.18';
    if (l.includes('manganese') || l === 'mn') return '0.85';
    if (l.includes('silicon') || l === 'si') return '0.28';
    if (l.includes('sulphur') || l.includes('sulfur') || l === 's') return '0.018';
    if (l.includes('phosphorus') || l === 'p') return '0.015';
    if (l.includes('chromium') || l === 'cr') return '18.25';
    if (l.includes('nickel') || l === 'ni') return '8.50';
    if (l.includes('molybdenum') || l === 'mo') return '0.35';

    if (reqTarget !== null) {
      return String(reqTarget);
    }
    if (secType === 'traverse') {
      return String(Math.max(320, Math.round(650 - (rowIdx * 35))));
    }
    if (secType === 'reading' || secType === 'location') {
      return String(215 + (rowIdx * 8) + (colIdx * 4));
    }
    if (secType === 'condition') {
      return (23.0 + rowIdx * 0.2).toFixed(1);
    }
    if (secType === 'classification') {
      return '0.5';
    }

    return String(100 + (rowIdx * 12) + (colIdx * 5));
  }

  populateDemoDataForSection(sec: ExecutionSection): void {
    if (!sec) return;
    this.demoMode = true;

    switch (sec.type) {
      case 'parameter':
      case 'rule':
      case 'opinion': {
        const rows = this.ensureTableRows(sec);
        const cols = this.ensureTableColumns(sec);
        rows.forEach((r, rIdx) => {
          const val = this.generateRealisticDemoValue(r.label, r.unit || '', r.requirement || '', rIdx, 0, sec.type);
          r.demoValue = val;
          r.values = r.values || {};
          cols.forEach(c => {
            if (c.key === 'result' || c.key === 'observed' || c.key === 'val' || c.key === 'entry') {
              r.values![c.key] = val;
            } else if (c.key === 'status') {
              r.values![c.key] = 'PASS';
            } else if (c.key === 'remarks') {
              r.values![c.key] = 'Conforms';
            } else if (c.key === 'uncertainty') {
              r.values![c.key] = '± 2.5%';
            } else if (c.key === 'dl') {
              r.values![c.key] = '0.01';
            } else if (c.key === 'scope') {
              r.values![c.key] = 'NABL Scope';
            } else if (c.key === 'method') {
              r.values![c.key] = sec.config.testMethod || this.currentTest?.leaf || 'Standard Method';
            }
          });
        });
        break;
      }

      case 'specimen': {
        const rows = this.ensureTableRows(sec);
        const cols = this.ensureTableColumns(sec);
        const dataCols = cols.filter(c => c.key !== 'param' && c.key !== 'label' && c.key !== 'unit' && c.key !== 'requirement' && c.key !== 'avg' && c.key !== 'status');
        rows.forEach((r, rIdx) => {
          const baseStr = this.generateRealisticDemoValue(r.label, r.unit || '', r.requirement || '', rIdx, 0, sec.type);
          const baseVal = parseFloat(baseStr);
          r.values = r.values || {};
          const isNum = !isNaN(baseVal);
          const collectedNums: number[] = [];

          dataCols.forEach((c, cIdx) => {
            if (isNum) {
              const variance = (cIdx % 2 === 0 ? 1 : -1) * (baseVal * (0.008 + (cIdx * 0.004)));
              const finalVal = baseVal >= 100 ? Math.round(baseVal + variance).toString() : (baseVal + variance).toFixed(baseVal < 10 ? 2 : 1);
              r.values![c.key] = finalVal;
              collectedNums.push(parseFloat(finalVal));
            } else {
              r.values![c.key] = 'Cup & Cone';
            }
          });

          if (collectedNums.length > 0) {
            const avg = collectedNums.reduce((a, b) => a + b, 0) / collectedNums.length;
            r.values!['avg'] = avg >= 100 ? avg.toFixed(1) : avg.toFixed(2);
            r.demoValue = r.values!['avg'];
          } else {
            r.demoValue = r.values![dataCols[0]?.key] || 'Conforms';
          }
          if (r.requirement) {
            r.values!['requirement'] = r.requirement;
          }
          if (r.unit) {
            r.values!['unit'] = r.unit;
          }
        });
        break;
      }

      case 'reading': {
        const rows = this.ensureTableRows(sec);
        const cols = this.ensureTableColumns(sec);
        const unit = sec.config.unit || 'HBW';
        const isBrinell = unit.includes('HBW') || (sec.title || '').includes('Brinell');
        const isVickers = unit.includes('HV') || (sec.title || '').includes('Vickers');
        const isRockwell = unit.includes('HR') || (sec.title || '').includes('Rockwell');

        rows.forEach((r, rIdx) => {
          r.values = r.values || {};
          let baseHardness = isBrinell ? 142 : (isRockwell ? 32 : (isVickers ? 220 : 150));
          if (r.requirement) {
            const parsed = this.parseRequirementTarget(r.requirement);
            if (parsed) baseHardness = parsed;
          }
          const readingSpots = [baseHardness, baseHardness + (rIdx % 2 === 0 ? 3 : -2), baseHardness + (rIdx % 3 === 0 ? 1 : -1)];
          const avg = (readingSpots.reduce((a, b) => a + b, 0) / readingSpots.length).toFixed(1);
          r.demoValue = avg;

          cols.forEach(c => {
            if (c.key.includes('ball') || c.key.includes('indenter')) r.values![c.key] = '5.0 mm';
            else if (c.key.includes('load') || c.key.includes('force')) r.values![c.key] = isBrinell ? '750 kgf' : (isVickers ? '10 kgf' : '150 kgf');
            else if (c.key.includes('observed') || c.key.includes('reading')) r.values![c.key] = String(readingSpots[0]);
            else if (c.key === 'avg' || c.key.includes('average')) r.values![c.key] = avg;
            else if (c.key === 'requirement') r.values![c.key] = r.requirement || (isBrinell ? '120 - 160 HBW' : '200 - 250 HV');
            else if (c.key.startsWith('spot_') || c.key.startsWith('reading_')) {
              const spotIdx = parseInt(c.key.replace(/\D/g, ''), 10) - 1;
              r.values![c.key] = String(readingSpots[Math.max(0, spotIdx % readingSpots.length)]);
            }
          });
        });
        break;
      }

      case 'location': {
        const rows = this.ensureTableRows(sec);
        const cols = this.ensureTableColumns(sec);
        rows.forEach((r, rIdx) => {
          r.values = r.values || {};
          cols.forEach((c, cIdx) => {
            if (cIdx === 0) return;
            const colLabel = (c.label || '').toLowerCase();
            let val = 215;
            if (colLabel.includes('haz')) {
              val = 238 + (rIdx * 2) + (cIdx % 3);
            } else if (colLabel.includes('weld')) {
              val = 224 + (rIdx * 3);
            } else if (colLabel.includes('parent')) {
              val = 205 + (rIdx * 2);
            } else if (c.key === 'avg') {
              val = 222 + (rIdx * 2);
            } else {
              val = 210 + (rIdx * 5) + (cIdx * 3);
            }
            r.values![c.key] = String(val);
          });
          r.demoValue = r.values![cols[cols.length - 1]?.key] || '225';
        });
        break;
      }

      case 'traverse': {
        const rows = this.ensureTableRows(sec);
        const cols = this.ensureTableColumns(sec);
        const cutoff = parseInt(String(sec.config.cutoffHardness || '550'), 10);
        rows.forEach((r, rIdx) => {
          r.values = r.values || {};
          const depthVal = Math.max(320, Math.round(650 - (rIdx * 38)));
          cols.forEach((c, cIdx) => {
            if (cIdx === 0) return;
            if (c.key === 'hardness' || c.key === 'observed') {
              r.values![c.key] = String(depthVal);
            } else if (c.key === 'cutoff' || c.key === 'limit') {
              r.values![c.key] = `${cutoff} HV`;
            }
          });
          r.demoValue = String(depthVal);
        });
        break;
      }

      case 'custom': {
        const matrix = this.ensureCustomCellMatrix(sec);
        matrix.forEach((rowCells, rIdx) => {
          rowCells.forEach((cell, cIdx) => {
            if (cIdx === 0) return;
            if (cell.isLocked || cell.bindingMode === 'static') return;
            if (cell.dataType === 'select') {
              cell.value = (cell.selectOptions && cell.selectOptions.length > 0) ? cell.selectOptions[0] : 'Satisfactory';
            } else if (cell.dataType === 'number') {
              cell.value = 100 + (rIdx * 15) + (cIdx * 5);
            } else if (cell.dataType === 'formula') {
              cell.value = this.evaluateCustomCellFormula(sec, cell.formulaExpression, rIdx, true);
            } else {
              cell.value = 'Conforms';
            }
          });
        });
        break;
      }

      case 'condition': {
        sec.config.demoConditionValues = sec.config.demoConditionValues || {};
        const fields = this.getConditionFields(sec);
        fields.forEach(f => {
          const l = f.toLowerCase();
          if (l.includes('temp')) sec.config.demoConditionValues![f] = '23.2 °C';
          else if (l.includes('humid')) sec.config.demoConditionValues![f] = '52 %';
          else if (l.includes('speed') || l.includes('rate')) sec.config.demoConditionValues![f] = '5 mm/min';
          else if (l.includes('grip')) sec.config.demoConditionValues![f] = 'Wedge Serrated Grips';
          else if (l.includes('extensometer')) sec.config.demoConditionValues![f] = '50mm Gauge Length';
          else sec.config.demoConditionValues![f] = 'Standard Ambient';
        });
        const rows = this.ensureTableRows(sec);
        const cols = this.ensureTableColumns(sec);
        rows.forEach((r, rIdx) => {
          r.values = r.values || {};
          cols.forEach(c => {
            if (c.key === 'setpoint') r.values![c.key] = r.staticValue || '23.0 °C';
            else if (c.key === 'tolerance') r.values![c.key] = r.requirement || '± 2.0 °C';
            else if (c.key === 'sensor') r.values![c.key] = 'TH-LOG-01';
          });
        });
        break;
      }

      case 'traceability': {
        sec.config.demoTraceValues = {
          'Equipment': 'Universal Testing Machine 600kN (UTM-01)',
          'Equipment ID': 'EQ-UTM-001',
          'Calibration Certificate': 'CAL/2026/0421',
          'Calibration Date': '2026-04-15',
          'Valid Till': '2027-04-14',
          'Standard': 'ISO 7500-1 Class 0.5',
          'Analyst': 'Er. Rajesh Sharma (TECH-08)'
        };
        const rows = this.ensureTableRows(sec);
        const cols = this.ensureTableColumns(sec);
        rows.forEach((r, rIdx) => {
          r.values = r.values || {};
          cols.forEach(c => {
            if (c.key === 'tag') r.values![c.key] = `EQ-00${rIdx + 1}`;
            else if (c.key === 'calDate') r.values![c.key] = '2026-04-15';
            else if (c.key === 'dueDate') r.values![c.key] = '2027-04-14';
            else if (c.key === 'cert') r.values![c.key] = 'CAL/2026/0421';
          });
        });
        break;
      }

      case 'photo': {
        const slots = this.ensurePhotoSlots(sec);
        slots.forEach(slot => {
          slot.mockUrl = 'macro_weld_cross_section_01.jpg';
          slot.magnification = slot.magnification || '100X';
          slot.etchant = slot.etchant || '2% Nital';
          slot.caption = slot.caption || 'Macrograph showing complete root penetration, sound HAZ and defect-free parent metal.';
        });
        break;
      }

      case 'narrative': {
        sec.config.demoText = 'Testing executed in strict accordance with the standard method. The specimen demonstrated typical ductile fracture behavior with sound metallurgical integrity. Results conform to all specified requirements.';
        break;
      }

      case 'checklist': {
        const rows = this.ensureTableRows(sec);
        rows.forEach(r => {
          r.values = r.values || {};
          r.values['resp'] = 'Conforming';
          r.demoValue = 'Conforming';
        });
        break;
      }

      case 'classification': {
        const rows = this.ensureTableRows(sec);
        rows.forEach(r => {
          r.values = r.values || {};
          r.values['thin'] = '0.5';
          r.values['heavy'] = '0.5';
          r.values['decision'] = 'CONFORMS';
          r.demoValue = '0.5 / 0.5';
        });
        break;
      }
    }
    sec.config.hasDemoData = true;
  }

  populatePreviewEntriesWithDemoData(): void {
    this.previewEntries = {};
    this.previewStatus = {};
    this.previewStats = {};

    this.sections.forEach(s => {
      // Ensure section demo data is populated
      this.populateDemoDataForSection(s);

      switch (s.type) {
        case 'parameter': {
          const rows = this.ensureTableRows(s);
          rows.forEach((r, rIdx) => {
            const key = 'param_' + rIdx;
            const val = r.values?.['result'] || r.demoValue || this.generateRealisticDemoValue(r.label, r.unit || '', r.requirement || '', rIdx, 0, s.type);
            this.previewEntries[key] = val;
            if (r.requirement) {
              this.previewStatus[key] = this.evaluateRequirement(r.requirement, val) ?? true;
            } else {
              this.previewStatus[key] = true;
            }
          });
          break;
        }

        case 'specimen': {
          const rows = this.ensureTableRows(s);
          const cols = this.ensureTableColumns(s);
          rows.forEach((r, rIdx) => {
            cols.slice(1).forEach((c, cIdx) => {
              const key = 'spec_' + s.id + '_' + rIdx + '_' + cIdx;
              const val = r.values?.[c.key] || (c.key === 'avg' ? (r.demoValue || '615') : (c.key === 'requirement' ? (r.requirement || '≥ 550') : (c.key === 'unit' ? (r.unit || 'MPa') : this.generateRealisticDemoValue(r.label, r.unit || '', r.requirement || '', rIdx, cIdx, s.type))));
              this.previewEntries[key] = val;
            });
          });
          break;
        }

        case 'reading': {
          if (s.config.layout !== 'Table') {
            const counts = this.getReadingCount(s);
            counts.forEach(i => {
              this.previewEntries['read_' + s.id + '_' + i] = String(142 + (i % 2 === 0 ? 3 : -1));
            });
          } else {
            const rows = this.ensureTableRows(s);
            const cols = this.ensureTableColumns(s);
            rows.forEach((r, rIdx) => {
              cols.slice(1).forEach((c, cIdx) => {
                const key = 'read_' + s.id + '_' + rIdx + '_' + cIdx;
                this.previewEntries[key] = r.values?.[c.key] || String(142 + rIdx * 3);
              });
            });
          }
          break;
        }

        case 'location': {
          const rows = this.ensureTableRows(s);
          const cols = this.ensureTableColumns(s);
          rows.forEach((r, rIdx) => {
            cols.slice(1).forEach((c, cIdx) => {
              const key = 'loc_' + s.id + '_' + rIdx + '_' + cIdx;
              this.previewEntries[key] = r.values?.[c.key] || String(215 + rIdx * 8 + cIdx * 4);
            });
          });
          break;
        }

        case 'condition': {
          const fields = this.getConditionFields(s);
          fields.forEach(f => {
            const val = s.config.demoConditionValues?.[f] || this.getConditionValue(f, s);
            this.previewEntries['cond_' + s.id + '_' + f] = val;
            this.previewEntries['cond_' + f] = val;
          });
          if (s.config.tableRows && s.config.tableRows.length > 0) {
            const rows = this.ensureTableRows(s);
            const cols = this.ensureTableColumns(s);
            rows.forEach((r, rIdx) => {
              cols.slice(1).forEach((c, cIdx) => {
                const key = 'cond_' + s.id + '_' + rIdx + '_' + cIdx;
                this.previewEntries[key] = r.values?.[c.key] || (c.key === 'setpoint' ? (r.requirement || '23.0 °C') : (c.key === 'tolerance' ? '± 2.0 °C' : (r.staticValue || 'TH-LOG-01')));
              });
            });
          }
          break;
        }

        case 'traceability': {
          const fields = this.getTraceabilityFields(s);
          fields.forEach(f => {
            const val = s.config.demoTraceValues?.[f] || this.getTraceabilityValue(s, f);
            this.previewEntries['trace_' + s.id + '_' + f] = val;
            this.previewEntries['trace_' + f] = val;
          });
          if (s.config.tableRows && s.config.tableRows.length > 0) {
            const rows = this.ensureTableRows(s);
            const cols = this.ensureTableColumns(s);
            rows.forEach((r, rIdx) => {
              cols.slice(1).forEach((c, cIdx) => {
                const key = 'trace_' + s.id + '_' + rIdx + '_' + cIdx;
                this.previewEntries[key] = r.values?.[c.key] || (c.key === 'tag' ? `EQ-00${rIdx + 1}` : (c.key === 'calDate' ? '2026-04-15' : (c.key === 'dueDate' ? (r.unit || '2027-04-14') : (r.staticValue || 'Active'))));
              });
            });
          }
          break;
        }

        case 'traverse': {
          const rows = this.ensureTableRows(s);
          const cols = this.ensureTableColumns(s);
          rows.forEach((r, rIdx) => {
            cols.slice(1).forEach((c, cIdx) => {
              const key = 'trav_' + s.id + '_' + rIdx + '_' + cIdx;
              this.previewEntries[key] = r.values?.[c.key] || String(Math.max(320, 650 - rIdx * 35));
            });
          });
          break;
        }

        case 'rule': {
          const rows = this.ensureTableRows(s);
          rows.forEach((r, rIdx) => {
            const key = 'rule_' + s.id + '_' + rIdx;
            const val = r.demoValue || this.generateRealisticDemoValue(r.label, r.unit || '', r.requirement || '', rIdx, 0, s.type);
            this.previewEntries[key] = val;
            this.previewStatus[key] = this.evaluateRequirement(r.requirement || '', val) ?? true;
          });
          break;
        }

        case 'custom': {
          const matrix = this.ensureCustomCellMatrix(s);
          matrix.forEach((rowCells, rIdx) => {
            rowCells.slice(1).forEach((cell, cIdx) => {
              const key = 'custom_' + s.id + '_' + rIdx + '_' + (cIdx + 1);
              this.previewEntries[key] = String(cell.value || (cell.dataType === 'number' ? (100 + rIdx * 10 + cIdx * 5) : (cell.dataType === 'select' ? (cell.selectOptions?.[0] || 'Conforming') : 'Satisfactory')));
            });
          });
          break;
        }

        case 'photo': {
          const slots = this.ensurePhotoSlots(s);
          slots.forEach(slot => {
            this.previewEntries['photo_' + s.id + '_' + slot.id] = slot.mockUrl || 'macro_weld_cross_section_01.jpg';
            this.previewEntries['photo_cap_' + s.id + '_' + slot.id] = slot.caption || 'Macrograph cross-section showing sound penetration and uniform fusion.';
          });
          break;
        }

        case 'narrative': {
          this.previewEntries['narrative_' + s.id] = s.config.demoText || 'Testing executed in strict accordance with the standard method. The specimen demonstrated typical ductile fracture behavior with sound metallurgical integrity. Results conform to all specified requirements.';
          break;
        }

        case 'checklist': {
          const rows = this.ensureTableRows(s);
          rows.forEach((r, rIdx) => {
            this.previewEntries['chk_' + s.id + '_' + rIdx] = 'Conforming';
          });
          break;
        }

        case 'classification': {
          const rows = this.ensureTableRows(s);
          const cols = this.ensureTableColumns(s);
          rows.forEach((r, rIdx) => {
            cols.slice(1).forEach((c, cIdx) => {
              const key = 'class_' + s.id + '_' + rIdx + '_' + cIdx;
              this.previewEntries[key] = c.key === 'thin' ? '0.5' : (c.key === 'heavy' ? '0.5' : 'CONFORMS');
            });
          });
          break;
        }

        case 'opinion': {
          const rows = this.ensureTableRows(s);
          rows.forEach((r, rIdx) => {
            this.previewEntries['opinion_' + s.id + '_' + rIdx] = 'Conforms to Specification';
          });
          this.previewEntries['opinion_statement_' + s.id] = 'The sample complies with all specified chemical and mechanical property requirements.';
          break;
        }
      }
    });
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
          this.layoutName = res.layoutName || (res.isGlobalDefault ? 'Global Default Test Execution Layout' : `${this.resolvedHierarchy?.fullDisplayName || 'Laboratory'} Layout`);
          this.layoutRev = res.revision || '1.0';
          this.currentVersion = res.version || 1;
          this.layoutStatus = res.status || 'Published';
          this.isDefaultLayout = res.isDefault ?? true;
          this.isGlobalDefault = res.isGlobalDefault ?? false;
          this.applyToLeaf = res.applyToLeaf ?? true;
          this.loadedSource = 'db';
          if (!this.selectedTestMethodId) {
            if (res.testMethodSpecificationID) {
              this.selectedTestMethodId = res.testMethodSpecificationID;
            }
            if (res.testMethodName) {
              this.selectedTestMethodName = res.testMethodName;
            }
            this.selectedTestMethodItem = this.selectedTestMethodId
              ? { id: this.selectedTestMethodId, name: this.selectedTestMethodName || String(this.selectedTestMethodId) }
              : (this.selectedTestMethodName ? { id: 0, name: this.selectedTestMethodName } : null);
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
          this.selectedTestMethodItem = this.selectedTestMethodId
            ? { id: this.selectedTestMethodId, name: this.selectedTestMethodName || String(this.selectedTestMethodId) }
            : (this.selectedTestMethodName ? { id: 0, name: this.selectedTestMethodName } : null);

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
    this.layoutName = `${this.resolvedHierarchy?.fullDisplayName || 'Laboratory'} Universal Layout`;
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
      const archKey = this.resolvedHierarchy?.groupName ? this.getArchetypeKeyForUnifiedItem(this.selectedUnifiedTestItem, this.resolvedHierarchy?.groupName || '') : 'generic';
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
    const testId = this.isGlobalDefault ? null : (this.selectedLabTestId || this.resolvedHierarchy?.groupId);
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
    const defaultName = this.layoutName || (this.isGlobalDefault ? 'Global Default Test Execution Layout' : `${this.resolvedHierarchy?.fullDisplayName || 'Laboratory'} Layout`);

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
      laboratoryTestSubGroupID: this.isGlobalDefault ? null : (this.selectedSubGroupId || this.resolvedHierarchy?.subGroupId || null),
      laboratoryTestAnalysisTypeID: this.isGlobalDefault ? null : (this.selectedAnalysisTypeId || this.resolvedHierarchy?.analysisTypeId || null),
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

        // Match each preset by its dbTestId
        Object.values(this.testDatabase).forEach(test => {
          if (test.dbTestId) {
            const match = this.actualLabTests.find(t => t.id === test.dbTestId);
            if (match) {
              test.isChemical = !!match.isChemicalTest;
            }
          }
        });

        // Load subgroups for active lab test if selected
        if (this.selectedLabTestId) {
          this.loadSubGroupsForTest(this.selectedLabTestId);
          this.syncLiveParametersForTest(this.selectedArchetypeKey);
        }
      },
      error: (e) => {
        console.error('Failed to load DB tests', e);
        this.initFallbackActualLabTests();
        if (this.selectedLabTestId) {
          this.syncLiveParametersForTest(this.selectedArchetypeKey);
        }
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
    this.populatePreviewEntriesWithDemoData();
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
    if (!sec || !sec.config) return [];
    const list: string[] = [];

    // 1. Explicit fields array
    if (Array.isArray(sec.config.fields) && sec.config.fields.length > 0) {
      sec.config.fields.forEach(f => {
        if (f && !list.includes(f)) list.push(f);
      });
    }

    // 2. Extra fields
    if (sec.config.extraFields) {
      sec.config.extraFields.split(',').forEach(f => {
        const trimmed = f.trim();
        if (trimmed && !list.includes(trimmed)) list.push(trimmed);
      });
    }

    // 3. Inspect known property keys stored directly on sec.config
    const conditionKeyMap: { [k: string]: string } = {
      temperature: 'Ambient Temperature',
      humidity: 'Relative Humidity',
      specimenType: 'Specimen Geometry / Type',
      surfaceCondition: 'Surface Preparation Condition',
      testingSpeed: 'Test Speed / Strain Rate',
      speedOfTesting: 'Test Speed / Strain Rate',
      medium: 'Testing Medium / Environment',
      gripType: 'Grips & Fixtures',
      extensometer: 'Extensometer Gauge Length'
    };
    Object.keys(conditionKeyMap).forEach(k => {
      if ((sec.config as Record<string, any>)[k] && !list.includes(conditionKeyMap[k]) && !list.includes(k)) {
        list.push(conditionKeyMap[k]);
      }
    });

    // 4. If list is still empty and tableRows exist, derive labels from tableRows
    if (list.length === 0 && sec.config.tableRows && sec.config.tableRows.length > 0) {
      sec.config.tableRows.forEach(r => {
        if (r.label && !list.includes(r.label)) list.push(r.label);
      });
    }

    // 5. Fallback standard condition fields
    if (list.length === 0) {
      list.push('Ambient Temperature', 'Relative Humidity', 'Test Speed / Strain Rate', 'Specimen Geometry / Type');
    }

    return list;
  }

  getConditionLabel(identifier: string): string {
    const c = this.currentDataset?.conditions?.find(item => item.field === identifier || item.label === identifier);
    return c ? c.label : identifier;
  }

  getConditionValue(identifier: string, sec?: ExecutionSection): string {
    if (sec && sec.config?.demoConditionValues && sec.config.demoConditionValues[identifier]) {
      return sec.config.demoConditionValues[identifier];
    }
    const l = (identifier || '').toLowerCase();
    if (sec && sec.config) {
      if (l.includes('temp') && sec.config.temperature) return sec.config.temperature;
      if (l.includes('humid') && sec.config.humidity) return sec.config.humidity;
      if (l.includes('specimen') && sec.config.specimenType) return sec.config.specimenType;
      if (l.includes('surface') && sec.config.surfaceCondition) return sec.config.surfaceCondition;
      if (l.includes('speed') && (sec.config.speedOfTesting || sec.config.testingSpeed)) {
        return sec.config.speedOfTesting || sec.config.testingSpeed || '5 mm/min';
      }
      if (sec.config.tableRows) {
        const matchingRow = sec.config.tableRows.find(r => r.label === identifier || r.key === identifier);
        if (matchingRow) {
          return matchingRow.staticValue || matchingRow.requirement || (matchingRow.values ? matchingRow.values['setpoint'] || matchingRow.values['val'] : '') || 'Conforming';
        }
      }
    }
    const c = this.currentDataset?.conditions?.find(item => item.field === identifier || item.label === identifier);
    if (c && c.demoValue) {
      return c.demoValue + (c.unit && !c.demoValue.includes(c.unit) ? ' ' + c.unit : '');
    }
    if (l.includes('temp')) return '23.0 ± 2.0 °C';
    if (l.includes('humid')) return '52 % RH';
    if (l.includes('speed') || l.includes('rate')) return '5 mm/min';
    if (l.includes('specimen') || l.includes('shape')) return 'Transverse Rectangular Pipe Strip';
    if (l.includes('surface')) return 'Flat, ground test surface free from scale';
    if (l.includes('grip')) return 'Wedge Serrated Grips';
    if (l.includes('extensometer')) return '50mm Gauge Length';
    return 'Ambient Air (Standard)';
  }

  getTraceabilityFields(sec: ExecutionSection): string[] {
    if (!sec || !sec.config) return [];
    const list: string[] = [];

    // 1. Explicit fields array
    if (Array.isArray(sec.config.fields) && sec.config.fields.length > 0) {
      sec.config.fields.forEach(f => {
        if (f && !list.includes(f)) list.push(f);
      });
    }

    // 2. Inspect known property keys stored directly on sec.config
    const keysMap: { [k: string]: string } = {
      equipmentName: 'Equipment Name / Model',
      equipmentId: 'Asset Tag / ID',
      calibrationCertificate: 'Calibration Certificate No.',
      calibrationDate: 'Calibration Date',
      calibrationDue: 'Calibration Due Date',
      extensometerType: 'Extensometer / Sensor',
      speedOfTesting: 'Test Speed / Strain Rate',
      indenterType: 'Indenter Type & Size',
      testLoad: 'Test Force / Load',
      dwellTime: 'Dwell Time'
    };
    Object.keys(keysMap).forEach(k => {
      if ((sec.config as Record<string, any>)[k] && !list.includes(keysMap[k]) && !list.includes(k)) {
        list.push(keysMap[k]);
      }
    });

    // 3. If list is still empty and tableRows exist, derive labels from tableRows
    if (list.length === 0 && sec.config.tableRows && sec.config.tableRows.length > 0) {
      sec.config.tableRows.forEach(r => {
        if (r.label && !list.includes(r.label)) list.push(r.label);
      });
    }

    // 4. Fallback standard traceability fields
    if (list.length === 0) {
      list.push('Equipment Name / Model', 'Asset Tag / ID', 'Calibration Certificate No.', 'Calibration Due Date');
    }

    return list;
  }

  getTraceabilityValue(sec: ExecutionSection, field: string): string {
    const l = (field || '').toLowerCase();
    if (sec.config?.demoTraceValues && sec.config.demoTraceValues[field]) {
      return sec.config.demoTraceValues[field];
    }
    if (sec.config) {
      if ((l.includes('cert') || l.includes('certificate')) && sec.config.calibrationCertificate) {
        return sec.config.calibrationCertificate;
      }
      if ((l.includes('due') || l.includes('valid')) && sec.config.calibrationDue) {
        return sec.config.calibrationDue;
      }
      if (l.includes('date') && sec.config.calibrationDate) {
        return sec.config.calibrationDate;
      }
      if ((l.includes('extensometer') || l.includes('sensor')) && sec.config.extensometerType) {
        return sec.config.extensometerType;
      }
      if ((l.includes('speed') || l.includes('rate')) && sec.config.speedOfTesting) {
        return sec.config.speedOfTesting;
      }
      if (l.includes('indenter') && sec.config.indenterType) {
        return sec.config.indenterType;
      }
      if ((l.includes('load') || l.includes('force')) && sec.config.testLoad) {
        return sec.config.testLoad;
      }
      if (l.includes('dwell') && sec.config.dwellTime) {
        return sec.config.dwellTime;
      }
      if ((l.includes('tag') || l.includes('id')) && sec.config.equipmentId) {
        return sec.config.equipmentId;
      }
      if ((l.includes('equip') || l.includes('machine')) && sec.config.equipmentName) {
        return sec.config.equipmentName;
      }
      if (sec.config.tableRows) {
        const matchingRow = sec.config.tableRows.find(r => r.label === field || r.key === field);
        if (matchingRow) {
          return matchingRow.staticValue || matchingRow.requirement || (matchingRow.values ? matchingRow.values['cert'] || matchingRow.values['tag'] : '') || 'Valid Calibration';
        }
      }
    }
    if (l.includes('cert')) return 'CAL/2026/0421';
    if (l.includes('due')) return '10-Jun-2027';
    if (l.includes('date')) return '2026-04-15';
    if (l.includes('extensometer')) return 'Electronic Axial Extensometer (50mm GL)';
    if (l.includes('speed')) return '5 mm/min (Yield) / 25 mm/min';
    if (l.includes('indenter')) return 'Tungsten Carbide Ball 5 mm Diameter';
    if (l.includes('load')) return '750 kgf (7.355 kN)';
    if (l.includes('dwell')) return '12 - 15 seconds';
    if (l.includes('tag') || l.includes('id')) return 'EQ-UTM-001';
    if (l.includes('equip')) return 'Universal Testing Machine 600kN (UTM-01)';
    if (l.includes('analyst')) return 'Er. Rajesh Sharma (TECH-08)';
    if (l.includes('standard')) return 'ISO 7500-1 Class 0.5';
    return 'Valid & Calibrated';
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

  applyLocationPreset(sec: ExecutionSection, preset: string): void {
    let names: string[] = [];
    if (preset === 'weld') {
      names = ['Base Metal (BM)', 'Heat Affected Zone (HAZ)', 'Weld Metal (WM)'];
    } else if (preset === 'zones') {
      names = ['Zone 1', 'Zone 2', 'Zone 3', 'Zone 4'];
    } else if (preset === 'samples') {
      names = ['Sample A', 'Sample B', 'Sample C'];
    } else if (preset === 'levels') {
      names = ['Top Level', 'Mid Depth', 'Root / Bottom'];
    } else if (preset === 'weldment') {
      names = ['Weld Cap (Crown Face)', 'Weld Mid-Thickness', 'Weld Root Pass', 'Heat Affected Zone (HAZ)', 'Base Metal Parent Material'];
    } else if (preset === 'cross_section') {
      names = ['Outer Surface (0-1 mm)', 'Quarter Radius (T/4)', 'Center Core (T/2)'];
    } else {
      names = ['Zone 1', 'Zone 2', 'Zone 3'];
    }
    sec.config.locationRows = names;
    sec.config.count = names.length;
    sec.config.locationNames = names.join(', ');

    const defaultMode = sec.config.dataBindingMode || 'runtime';
    sec.config.tableRows = names.map((name, i) => ({
      key: `loc_${i}`,
      label: name,
      visible: true,
      removable: true,
      bindingMode: defaultMode
    }));
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

    // Map test params dynamically from active test definition (only when a laboratory test is selected)
    if (this.hasSelectedTest) {
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
    } else {
      pool.parameters = [];
    }

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
    if (this.hasSelectedTest) {
      if (sec.config.parameterMode === 'Configured parameter subset' && (!sec.config.subset || sec.config.subset.length === 0)) {
        sec.config.subset = (this.currentDataset?.parameters || []).map(p => p.name);
      }
    } else {
      sec.config.subset = (sec.config.tableRows || []).map(r => r.label);
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
    if (!this.hasSelectedTest) {
      return (sec.config.tableRows || []).length;
    }
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
  selectedMasterParamId: number | null = null;
  selectedMasterParamItem: any = null;
  masterParamReloadKey: number = Date.now();

  onMasterParamSelected(item: any, sec?: ExecutionSection): void {
    if (!item) {
      this.selectedMasterParamId = null;
      this.selectedMasterParamItem = null;
      return;
    }
    this.selectedMasterParamId = item.id;
    this.selectedMasterParamItem = item;
  }

  toggleSlotEtchantMode(slot: PhotoSlotItem): void {
    slot.etchantMode = slot.etchantMode === 'param' ? 'manual' : 'param';
  }

  private _cachedAvailableParamsKey: string | null = null;
  private _cachedAvailableParamsList: Array<{ value: string; label: string; unit?: string; requirement?: string; isCalculated?: boolean }> | null = null;

  get availableParametersOptions(): Array<{ value: string; label: string; unit?: string; requirement?: string; isCalculated?: boolean }> {
    const currentKey = `${this.selectedTestKey}_${(this.currentDataset?.parameters || []).length}`;
    if (this._cachedAvailableParamsList && this._cachedAvailableParamsKey === currentKey) {
      return this._cachedAvailableParamsList;
    }
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

    this._cachedAvailableParamsKey = currentKey;
    this._cachedAvailableParamsList = list;
    return list;
  }

  addParameterFromMaster(sec: ExecutionSection, paramName?: string): void {
    let nameToAdd = paramName || this.selectedMasterParamToAdd;
    let unit = '';
    let requirement = 'Runtime';
    let isCalculated = false;
    let formula = '';
    let formulaDisplay = '';

    if (this.selectedMasterParamItem) {
      const item = this.selectedMasterParamItem;
      const addVals = item.additionalValues || {};
      const rawName = item.name || item.displayText || '';
      nameToAdd = addVals.PureName || (rawName.includes(' - ') ? rawName.split(' - ')[0] : rawName).trim();
      unit = addVals.Unit || item.unit || '';
      requirement = addVals.Requirement || item.requirement || 'Runtime';
      isCalculated = !!addVals.IsCalculated || !!item.isCalculated;
      formula = addVals.Formula || item.formula || '';
      formulaDisplay = addVals.FormulaDisplay || item.formulaDisplay || '';
    } else if (nameToAdd) {
      const matched = (this.currentDataset?.parameters || []).find(p => p.name === nameToAdd) ||
        this.availableParametersOptions.find(p => p.value === nameToAdd);
      if (matched) {
        unit = matched.unit || '';
        requirement = matched.requirement || 'Runtime';
        isCalculated = !!matched.isCalculated;
      }
    } else {
      this.toastService.show('Please search and select a parameter from the database', 'warning');
      return;
    }

    const rows = this.ensureTableRows(sec);
    const existing = rows.find(r => r.label.toLowerCase() === nameToAdd!.toLowerCase());
    if (existing) {
      this.toastService.show(`Parameter "${nameToAdd}" is already in table`, 'info');
      this.selectedMasterParamItem = null;
      this.selectedMasterParamId = null;
      this.selectedMasterParamToAdd = '';
      this.masterParamReloadKey = Date.now();
      return;
    }

    // If the only row is a dummy placeholder, replace it with this real parameter
    if (rows.length === 1 && (rows[0].label === 'Runtime Parameter (Auto-bound)' || rows[0].label === 'Observation 1')) {
      rows[0].label = nameToAdd!;
      rows[0].unit = unit;
      rows[0].requirement = requirement;
      rows[0].isCalculated = isCalculated;
      rows[0].formula = formula;
      rows[0].formulaDisplay = formulaDisplay;
      sec.config.tableRows = [...rows];
      if (sec.config.subset) {
        sec.config.subset = [nameToAdd!];
      }
      this.selectedMasterParamItem = null;
      this.selectedMasterParamId = null;
      this.selectedMasterParamToAdd = '';
      this.masterParamReloadKey = Date.now();
      this.toastService.show(`Parameter "${nameToAdd}" configured as primary row`, 'success');
      return;
    }

    rows.push({
      key: `param_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      label: nameToAdd!,
      bindingMode: sec.config.dataBindingMode || 'runtime',
      unit: unit,
      requirement: requirement,
      isCalculated: isCalculated,
      formula: formula,
      formulaDisplay: formulaDisplay,
      visible: true,
      removable: true
    });
    sec.config.tableRows = [...rows];
    if (sec.config.subset && !sec.config.subset.includes(nameToAdd!)) {
      sec.config.subset.push(nameToAdd!);
    }
    this.selectedMasterParamItem = null;
    this.selectedMasterParamId = null;
    this.selectedMasterParamToAdd = '';
    this.masterParamReloadKey = Date.now();
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
        cols.push({ key: 'specimen', label: sec.config.specimenColHeader || 'Specimen ID', bindingMode: 'static', visible: true, width: '18%' });

        if (sec.config.showOrientationColumn !== false) {
          cols.push({
            key: 'orientation',
            label: 'Orientation (ASTM E399)',
            bindingMode: 'static',
            visible: true,
            width: '15%'
          });
        }

        if (sec.config.showDimensions !== false) {
          if (sec.config.specimenShape === 'round') {
            cols.push({ key: 'd0', label: 'Diameter D0 (mm)', bindingMode: 'manual', visible: true, width: '12%' });
          } else if (sec.config.specimenShape === 'tubular') {
            cols.push({ key: 'd0', label: 'OD D0 (mm)', bindingMode: 'manual', visible: true, width: '10%' });
            cols.push({ key: 't0', label: 'WT T0 (mm)', bindingMode: 'manual', visible: true, width: '10%' });
          } else {
            cols.push({ key: 'w0', label: 'Width W0 (mm)', bindingMode: 'manual', visible: true, width: '10%' });
            cols.push({ key: 't0', label: 'Thick T0 (mm)', bindingMode: 'manual', visible: true, width: '10%' });
          }
        }

        if (sec.config.showAreaCalculation !== false) {
          cols.push({
            key: 's0',
            label: 'Initial Area S0 (mm²)',
            isCalculated: true,
            formulaDisplay: sec.config.specimenShape === 'round' ? '(π/4) × D0²' : (sec.config.specimenShape === 'tubular' ? 'π × T0 × (D0 - T0)' : 'W0 × T0'),
            bindingMode: 'runtime',
            visible: true,
            width: '14%'
          });
        }

        cols.push({ key: 'fm', label: 'Peak Load Fm (kN)', bindingMode: 'manual', visible: true, width: '12%' });
        cols.push({ key: 'rm', label: 'Tensile Rm (MPa)', isCalculated: true, formulaDisplay: 'Fm × 1000 / S0', bindingMode: 'runtime', visible: true, width: '13%' });
        cols.push({ key: 'reh', label: 'Yield ReH (MPa)', bindingMode: 'manual', visible: true, width: '12%' });
        cols.push({ key: 'a', label: 'Elongation A (%)', bindingMode: 'manual', visible: true, width: '11%' });

        if (sec.config.showAverage !== false) cols.push({ key: 'avg', label: 'Average', bindingMode: 'runtime', visible: true });
        if (sec.config.showRequirement !== false) cols.push({ key: 'requirement', label: 'Requirement', bindingMode: 'runtime', visible: true });
      } else {
        cols.push({ key: 'param', label: 'Parameter', bindingMode: 'runtime', visible: true, width: '28%' });
        if (sec.config.showUnit !== false) cols.push({ key: 'unit', label: 'Unit', bindingMode: 'runtime', visible: true, width: '12%' });
        const specList = this.getSpecimenList(sec);
        specList.forEach((specName, idx) => {
          cols.push({ key: `spec_${idx + 1}`, label: specName, bindingMode: defaultMode, visible: true, removable: true });
        });
        if (sec.config.showAverage !== false) cols.push({ key: 'avg', label: 'Average', bindingMode: 'runtime', visible: true });
        if (sec.config.showRequirement !== false) cols.push({ key: 'requirement', label: 'Requirement', bindingMode: 'runtime', visible: true });
        if (sec.config.showStatus !== false) cols.push({ key: 'status', label: 'Status', bindingMode: 'runtime', visible: true });
      }
    } else if (sec.type === 'reading') {
      const targetUnit = sec.config.targetUnit || 'HRC';
      const targetReq = sec.config.targetRequirement || '28 – 34 HRC';

      cols.push({
        key: 'specimen',
        label: sec.config.readingLabel || 'Specimen / Test Point',
        bindingMode: 'static',
        visible: true,
        width: '22%'
      });

      const spotN = sec.config.spotCount || 5;
      for (let sIdx = 1; sIdx <= spotN; sIdx++) {
        cols.push({
          key: `spot_${sIdx}`,
          label: `Spot #${sIdx}`,
          bindingMode: 'manual',
          visible: true,
          removable: true,
          width: `${Math.floor(38 / spotN)}%`
        });
      }

      cols.push({
        key: 'agg',
        label: `Average (${targetUnit})`,
        bindingMode: 'runtime',
        visible: true,
        width: '14%'
      });

      if (sec.config.showMinMax) {
        cols.push({ key: 'min', label: 'Min', bindingMode: 'runtime', visible: true });
        cols.push({ key: 'max', label: 'Max', bindingMode: 'runtime', visible: true });
      }

      cols.push({ key: 'requirement', label: 'Requirement', requirement: targetReq, bindingMode: 'static', visible: true, width: '14%' });
      cols.push({ key: 'status', label: 'Status', bindingMode: 'runtime', visible: true, width: '10%' });
    } else if (sec.type === 'location') {
      cols.push({ key: 'loc', label: sec.config.locationColHeader || 'Location / Sampling Zone', bindingMode: 'static', visible: true, width: '28%' });
      const testParams = this.currentTest.params?.length ? this.currentTest.params.slice(0, 3) : [{ name: 'Hardness (HRC)', unit: 'HRC', req: '28 – 34' }, { name: 'Equivalent Tensile (MPa)', unit: 'MPa', req: '850 – 950' }];
      testParams.forEach((p: any, idx) => {
        cols.push({
          key: `param_${idx}`,
          label: `${p.name}${p.unit && !p.name.includes(p.unit) ? ' (' + p.unit + ')' : ''}`,
          paramKey: p.name,
          unit: p.unit || '',
          requirement: p.requirement || p.req || '',
          bindingMode: defaultMode,
          visible: true,
          removable: true
        });
      });
      if (sec.config.showAverage !== false) cols.push({ key: 'avg', label: 'Zone Average', bindingMode: 'runtime', visible: true });
      if (sec.config.showRequirement !== false) cols.push({ key: 'requirement', label: 'Requirement', bindingMode: 'runtime', visible: true });
      cols.push({ key: 'status', label: 'Status', bindingMode: 'runtime', visible: true });
    } else if (sec.type === 'traverse') {
      cols.push({ key: 'x', label: sec.config.xField || 'Depth / Distance (mm)', bindingMode: 'static', visible: true, width: '25%' });
      cols.push({ key: 'y', label: sec.config.yField || 'Hardness (HV)', bindingMode: defaultMode, visible: true, width: '25%' });
      cols.push({ key: 'y2', label: 'Hardness (HRC)', bindingMode: 'runtime', visible: true, width: '18%' });
      cols.push({ key: 'requirement', label: 'Cutoff / Requirement', bindingMode: 'static', visible: true, width: '18%' });
      cols.push({ key: 'status', label: 'Status', bindingMode: 'runtime', visible: true, width: '14%' });
    } else if (sec.type === 'classification') {
      cols.push({ key: 'grade', label: 'Inclusion / Structure Class', bindingMode: 'static', visible: true, width: '26%' });
      cols.push({ key: 'system', label: 'Standard / System', bindingMode: 'static', visible: true, width: '18%' });
      cols.push({ key: 'thin', label: 'Thin Series', bindingMode: 'manual', visible: true, width: '14%' });
      cols.push({ key: 'heavy', label: 'Heavy Series', bindingMode: 'manual', visible: true, width: '14%' });
      cols.push({ key: 'limit', label: 'Specified Limit', bindingMode: 'static', visible: true, width: '14%' });
      cols.push({ key: 'result', label: 'Result', bindingMode: defaultMode, visible: true, width: '14%' });
    } else if (sec.type === 'custom') {
      if (sec.config.customColumns && sec.config.customColumns.length > 0) {
        sec.config.customColumns.forEach((c, idx) => {
          cols.push({ key: `col_${idx}`, label: c.label || `Col ${idx + 1}`, bindingMode: defaultMode, visible: true, removable: true });
        });
      } else {
        ['Feature / Test Point', 'Specified Nominal', 'Observed Value', 'Evaluation Status'].forEach((c, idx) => {
          cols.push({ key: `col_${idx}`, label: c, bindingMode: defaultMode, visible: true, removable: true });
        });
      }
    } else if (sec.type === 'condition') {
      cols.push({ key: 'field', label: 'Condition / Parameter', bindingMode: 'static', visible: true, width: '28%' });
      cols.push({ key: 'setpoint', label: 'Specified Set Point', bindingMode: 'static', visible: true, width: '20%' });
      cols.push({ key: 'tolerance', label: 'Tolerance Range', bindingMode: 'static', visible: true, width: '18%' });
      cols.push({ key: 'val', label: 'Observed Reading', bindingMode: defaultMode, visible: true, width: '18%' });
      cols.push({ key: 'sensor', label: 'Sensor / Instrument ID', bindingMode: 'manual', visible: true, width: '16%' });
    } else if (sec.type === 'checklist') {
      cols.push({ key: 'clause', label: 'Standard Clause', bindingMode: 'static', visible: true, width: '18%' });
      cols.push({ key: 'item', label: 'Inspection Point Description', bindingMode: 'static', visible: true, width: '38%' });
      cols.push({ key: 'method', label: 'Verification Mode', bindingMode: 'static', visible: true, width: '18%' });
      cols.push({ key: 'resp', label: 'Compliance Response', bindingMode: 'manual', visible: true, width: '16%' });
      cols.push({ key: 'status', label: 'Status', bindingMode: 'runtime', visible: true, width: '10%' });
    } else if (sec.type === 'rule') {
      cols.push({ key: 'param', label: 'Parameter', bindingMode: 'runtime', visible: true, width: '25%' });
      cols.push({ key: 'limit', label: 'Specification Limit', bindingMode: 'static', visible: true, width: '20%' });
      cols.push({ key: 'operator', label: 'Operator', bindingMode: 'static', visible: true, width: '12%' });
      cols.push({ key: 'uncertainty', label: 'Uncertainty (U)', bindingMode: 'static', visible: true, width: '15%' });
      cols.push({ key: 'val', label: 'Observed Value', bindingMode: defaultMode, visible: true, width: '15%' });
      cols.push({ key: 'decision', label: 'Conformance Decision', bindingMode: 'runtime', visible: true, width: '13%' });
    } else if (sec.type === 'traceability') {
      cols.push({ key: 'equip', label: 'Equipment Name', bindingMode: 'static', visible: true, width: '28%' });
      cols.push({ key: 'tag', label: 'Asset Tag / ID', bindingMode: 'static', visible: true, width: '16%' });
      cols.push({ key: 'cert', label: 'Cal Certificate No', bindingMode: 'static', visible: true, width: '18%' });
      cols.push({ key: 'calDate', label: 'Cal Date', bindingMode: 'static', visible: true, width: '13%' });
      cols.push({ key: 'dueDate', label: 'Due Date', bindingMode: 'static', visible: true, width: '13%' });
      cols.push({ key: 'status', label: 'Status', bindingMode: 'runtime', visible: true, width: '12%' });
    } else if (sec.type === 'opinion') {
      cols.push({ key: 'param', label: 'Parameter / Evaluation Topic', bindingMode: 'runtime', visible: true, width: '40%' });
      cols.push({ key: 'observed', label: 'Observed Value', bindingMode: 'runtime', visible: true, width: '30%' });
      cols.push({ key: 'requirement', label: 'Requirement Min / Max', bindingMode: 'runtime', visible: true, width: '30%' });
    } else {
      cols.push({ key: 'col_1', label: 'Parameter / Feature', bindingMode: 'runtime', visible: true });
      cols.push({ key: 'col_2', label: 'Observed Result', bindingMode: defaultMode, visible: true });
    }

    sec.config.tableColumns = cols;
    return sec.config.tableColumns;
  }

  ensureTableRows(sec: ExecutionSection): LayoutRowItem[] {
    if (Array.isArray(sec.config.tableRows)) {
      return sec.config.tableRows;
    }
    const defaultMode: DataBindingMode = sec.config.dataBindingMode || 'runtime';
    const rows: LayoutRowItem[] = [];

    if (sec.type === 'parameter') {
      if (this.hasSelectedTest) {
        const params = this.currentDataset?.parameters?.length ? this.currentDataset.parameters : this.currentTest.params;
        (params || []).forEach((p, idx) => {
          rows.push({
            key: `param_${idx}`,
            label: p.name,
            bindingMode: defaultMode,
            requirement: p.requirement || '',
            unit: p.unit || '',
            isCalculated: p.isCalculated,
            formula: p.formula,
            formulaDisplay: p.formulaDisplay,
            visible: true,
            removable: true
          });
        });
      }
    } else if (sec.type === 'specimen') {
      if (sec.config.orientation === 'Specimens × Parameters') {
        const specList = this.getSpecimenList(sec);
        specList.forEach((spec, idx) => {
          rows.push({
            key: `spec_${idx}`,
            label: spec,
            bindingMode: defaultMode,
            nature: 'data',
            visible: true,
            removable: true
          });
        });
        if (sec.config.showAverage !== false) {
          rows.push({
            key: 'summary_avg',
            label: 'Σ AVERAGE RESULT',
            nature: 'summary',
            summaryFn: 'avg',
            bindingMode: 'runtime',
            visible: true
          });
        }
        if (sec.config.showConformanceVerdict !== false) {
          rows.push({
            key: 'summary_verdict',
            label: 'SPECIFICATION CONFORMANCE',
            nature: 'summary',
            requirement: 'ASTM A370 / IS 1608 : 550.0 MPa Min.',
            bindingMode: 'runtime',
            visible: true
          });
        }
      } else {
        const params = this.getSpecimenParamsForSection(sec);
        params.forEach((p, idx) => {
          rows.push({
            key: `param_${idx}`,
            label: p.name,
            bindingMode: defaultMode,
            requirement: p.requirement,
            unit: p.unit,
            visible: true,
            removable: true
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
          visible: true,
          removable: true
        });
      });
    } else if (sec.type === 'reading') {
      const targetUnit = sec.config.targetUnit || 'HRC';
      const targetReq = sec.config.targetRequirement || '28 – 34 HRC';

      const specList = sec.config.specimenRows?.length ? sec.config.specimenRows : ['Specimen #1', 'Specimen #2'];
      specList.forEach((spec, idx) => {
        rows.push({
          key: `spec_${idx}`,
          label: spec,
          bindingMode: defaultMode,
          unit: targetUnit,
          requirement: targetReq,
          nature: 'data',
          visible: true,
          removable: true
        });
      });

      if (sec.config.showOverallAverageRow !== false) {
        rows.push({
          key: 'summary_batch_avg',
          label: 'Σ BATCH OVERALL AVERAGE HARDNESS',
          nature: 'summary',
          unit: targetUnit,
          summaryFn: 'avg',
          bindingMode: 'runtime',
          visible: true
        });
      }
      if (sec.config.showSpreadRow !== false) {
        rows.push({
          key: 'summary_spread',
          label: 'Δ HARDNESS SPREAD (Max – Min)',
          nature: 'summary',
          unit: targetUnit,
          requirement: `≤ ${sec.config.outlierSpreadLimit || 3.0} ${targetUnit}`,
          summaryFn: 'range',
          bindingMode: 'runtime',
          visible: true
        });
      }
    } else if (sec.type === 'traverse') {
      [0.05, 0.10, 0.15, 0.20, 0.25, 0.30, 0.40, 0.50, 0.60, 0.80, 1.00, 1.20].forEach((step, idx) => {
        rows.push({
          key: `step_${idx}`,
          label: step.toFixed(2),
          bindingMode: defaultMode,
          unit: sec.config.xUnit || 'mm',
          requirement: sec.config.cutoff || '550 HV',
          visible: true,
          removable: true
        });
      });
    } else if (sec.type === 'classification') {
      [
        { key: 'e45_a', label: 'Type A — Sulfides (Manganese Sulfide)', req: 'Thin ≤ 1.5, Heavy ≤ 1.0' },
        { key: 'e45_b', label: 'Type B — Alumina (Alumina stringers)', req: 'Thin ≤ 1.5, Heavy ≤ 1.0' },
        { key: 'e45_c', label: 'Type C — Silicates (Silicate stringers)', req: 'Thin ≤ 1.0, Heavy ≤ 0.5' },
        { key: 'e45_d', label: 'Type D — Globular Oxides', req: 'Thin ≤ 1.5, Heavy ≤ 1.0' }
      ].forEach(item => {
        rows.push({
          key: item.key,
          label: item.label,
          requirement: item.req,
          bindingMode: defaultMode,
          visible: true,
          removable: true
        });
      });
    } else if (sec.type === 'custom') {
      ['Observation Line 1', 'Observation Line 2', 'Observation Line 3'].forEach((r, idx) => {
        rows.push({
          key: `row_${idx}`,
          label: r,
          bindingMode: defaultMode,
          visible: true,
          removable: true
        });
      });
    } else if (sec.type === 'condition') {
      [
        { key: 'temp', label: 'Ambient Temperature', req: '23.0 ± 2.0 °C', unit: '°C', staticVal: '23.0 °C' },
        { key: 'humidity', label: 'Relative Humidity', req: '50.0 ± 10.0 %', unit: '% RH', staticVal: '50.0 %' },
        { key: 'speed', label: 'Test Speed / Strain Rate', req: '2.0 mm/min', unit: 'mm/min', staticVal: '2.0 mm/min' },
        { key: 'medium', label: 'Testing Medium / Environment', req: 'Ambient Air', unit: '—', staticVal: 'Ambient Air' }
      ].forEach(cond => {
        rows.push({
          key: cond.key,
          label: cond.label,
          requirement: cond.req,
          unit: cond.unit,
          staticValue: cond.staticVal,
          bindingMode: defaultMode,
          visible: true,
          removable: true
        });
      });
    } else if (sec.type === 'checklist') {
      [
        { key: 'chk_1', label: 'Sample identification & labeling integrity verified', req: 'ISO 17025 Cl. 7.4.2' },
        { key: 'chk_2', label: 'Test machine calibration validity & zero balance checked', req: 'ISO 17025 Cl. 6.4.1' },
        { key: 'chk_3', label: 'Ambient temperature and relative humidity logged', req: 'ISO 17025 Cl. 6.3' },
        { key: 'chk_4', label: 'Standard test method & test parameters confirmed', req: 'ISO 17025 Cl. 7.2' },
        { key: 'chk_5', label: 'Raw data recorded contemporaneously with audit trail', req: 'ISO 17025 Cl. 7.5' }
      ].forEach(item => {
        rows.push({
          key: item.key,
          label: item.label,
          requirement: item.req,
          bindingMode: 'manual',
          visible: true,
          removable: true
        });
      });
    } else if (sec.type === 'rule') {
      const pList = this.currentTest.params?.length ? this.currentTest.params.slice(0, 3) : [{ name: 'Tensile Strength', req: '≥ 420 MPa' }];
      pList.forEach((p, idx) => {
        rows.push({
          key: `rule_${idx}`,
          label: p.name,
          requirement: (p as any).requirement || (p as any).req || '≥ 420 MPa',
          unit: (p as any).unit || 'MPa',
          bindingMode: defaultMode,
          visible: true,
          removable: true
        });
      });
    } else if (sec.type === 'traceability') {
      [
        { key: 'tr_1', label: 'Universal Testing Machine (UTM-600kN)', req: 'Cal Cert: NABL/2026/1104', unit: 'Due: 2027-02-15', val: 'Instron 600kN' },
        { key: 'tr_2', label: 'Digital Extensometer (EXT-50-25)', req: 'Cal Cert: NABL/2026/0928', unit: 'Due: 2027-01-30', val: 'Instron 2630-100' },
        { key: 'tr_3', label: 'Digital Vernier Calliper (CAL-01)', req: 'Cal Cert: NABL/2026/0512', unit: 'Due: 2026-11-20', val: 'Mitutoyo 500-196' },
        { key: 'tr_4', label: 'Ambient Temp / Humidity Logger (TH-LOG-01)', req: 'Cal Cert: NABL/2026/0304', unit: 'Due: 2027-03-10', val: 'Testo 174H' }
      ].forEach(tr => {
        rows.push({
          key: tr.key,
          label: tr.label,
          requirement: tr.req,
          unit: tr.unit,
          staticValue: tr.val,
          bindingMode: 'static',
          visible: true,
          removable: true
        });
      });
    } else if (sec.type === 'opinion') {
      [
        {
          key: 'row_uts_fracture',
          label: 'Ultimate Tensile Strength (N/mm²) & Fracture Mode',
          unit: 'N/mm²',
          requirement: '535.0 Min. (Conforms)',
          staticValue: '555.00 / 553.45 (Ductile B.O.W)',
          isCalculated: true,
          formula: 'UTS = Fmax / So',
          formulaDisplay: 'UTS = Maximum Load (Fmax) / Original Cross-Section Area (So)',
          bindingMode: 'runtime' as DataBindingMode
        },
        {
          key: 'row_yield_ratio',
          label: 'Yield-to-Tensile Ratio (Re/Rm)',
          unit: 'Ratio',
          requirement: '≤ 0.85 (Conforms)',
          staticValue: '0.78',
          isCalculated: true,
          formula: 'Ratio = Re / Rm',
          formulaDisplay: 'Ratio = Yield Strength (Re) / Tensile Strength (Rm)',
          bindingMode: 'runtime' as DataBindingMode
        },
        {
          key: 'row_carbon_equiv',
          label: 'Carbon Equivalent (CEV)',
          unit: '%',
          requirement: '0.45 % Max (Conforms)',
          staticValue: '0.38 %',
          isCalculated: true,
          formula: 'CEV = C + Mn/6 + (Cr+Mo+V)/5 + (Ni+Cu)/15',
          formulaDisplay: 'CEV = C + Mn/6 + (Cr+Mo+V)/5 + (Ni+Cu)/15',
          bindingMode: 'runtime' as DataBindingMode
        }
      ].forEach(r => {
        rows.push({
          key: r.key,
          label: r.label,
          unit: r.unit,
          requirement: r.requirement,
          staticValue: r.staticValue,
          isCalculated: r.isCalculated,
          formula: r.formula,
          formulaDisplay: r.formulaDisplay,
          bindingMode: r.bindingMode,
          visible: true,
          removable: true
        });
      });
    } else {
      rows.push({
        key: 'row_1',
        label: 'Observation 1',
        bindingMode: defaultMode,
        visible: true,
        removable: true
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
    if (!rows || rows.length === 0 || index < 0 || index >= rows.length) return;
    const removed = rows.splice(index, 1);
    sec.config.tableRows = [...rows];
    if (sec.config.subset && removed[0]?.label) {
      sec.config.subset = sec.config.subset.filter(s => s !== removed[0].label);
    }
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

  addLocationParameterColumn(sec: ExecutionSection, paramName?: string): void {
    const cols = this.ensureTableColumns(sec);
    let nameToAdd = paramName || 'New Parameter';
    let unit = '';
    let requirement = '';

    if (this.selectedMasterParamItem) {
      const item = this.selectedMasterParamItem;
      const addVals = item.additionalValues || {};
      const rawName = item.name || item.displayText || '';
      nameToAdd = addVals.PureName || (rawName.includes(' - ') ? rawName.split(' - ')[0] : rawName).trim();
      unit = addVals.Unit || item.unit || '';
      requirement = addVals.Requirement || item.requirement || '';
    } else {
      const available = this.currentTest.params?.find(p => p.name === paramName);
      if (available) {
        unit = available.unit || '';
        requirement = available.requirement || '';
      }
    }

    const colKey = `param_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const label = `${nameToAdd}${unit && !nameToAdd.includes(unit) ? ' (' + unit + ')' : ''}`;

    const newCol: LayoutColumnItem = {
      key: colKey,
      label: label,
      paramKey: nameToAdd,
      unit: unit,
      requirement: requirement,
      bindingMode: sec.config.dataBindingMode || 'runtime',
      visible: true,
      removable: true
    };

    cols.push(newCol);
    sec.config.tableColumns = [...cols];
    this.toastService.show(`Added location parameter column: "${nameToAdd}"`, 'success');
  }

  setSpecimenShape(sec: ExecutionSection, shape: 'rectangular' | 'round' | 'tubular'): void {
    sec.config.specimenShape = shape;
    delete sec.config.tableColumns;
    this.ensureTableColumns(sec);
    this.toastService.show(`Specimen shape set to ${shape.toUpperCase()}`, 'info');
  }

  onSpecimenOrientationSelected(event: any, sec: ExecutionSection): void {
    if (!event) return;
    sec.config.selectedOrientationId = event.id;
    const notation = event.name || event.displayText || 'L-T';
    sec.config.selectedOrientationNotation = notation;
    const cols = this.ensureTableColumns(sec);
    const orientCol = cols.find(c => c.key === 'orientation');
    if (orientCol) {
      orientCol.label = `Orientation (${notation})`;
    }
    this.toastService.show(`Orientation bound to ${notation}`, 'success');
  }

  toggleSpecimenExecutionMode(sec: ExecutionSection): void {
    sec.config.specimenExecutionMode = sec.config.specimenExecutionMode === 'fixed' ? 'runtime' : 'fixed';
    this.toastService.show(`Specimen execution mode: ${sec.config.specimenExecutionMode.toUpperCase()}`, 'info');
  }

  onReadingTargetParamSelected(event: any, sec: ExecutionSection): void {
    if (!event) return;
    sec.config.targetParamId = event.id;
    const rawName = event.name || event.displayText || 'Hardness';
    const cleanName = (rawName.includes(' - ') ? rawName.split(' - ')[0] : rawName).trim();
    sec.config.targetParamName = cleanName;
    sec.config.targetParameter = cleanName;
    sec.config.readingLabel = `${cleanName} Spot Readings`;

    if (event.additionalValues) {
      if (event.additionalValues.Unit) sec.config.targetUnit = event.additionalValues.Unit;
      if (event.additionalValues.Requirement) sec.config.targetRequirement = event.additionalValues.Requirement;
    }
    if (!sec.config.targetUnit) {
      if (cleanName.toLowerCase().includes('rockwell') || cleanName.toLowerCase().includes('hrc')) sec.config.targetUnit = 'HRC';
      else if (cleanName.toLowerCase().includes('vickers') || cleanName.toLowerCase().includes('hv')) sec.config.targetUnit = 'HV';
      else if (cleanName.toLowerCase().includes('brinell') || cleanName.toLowerCase().includes('hbw')) sec.config.targetUnit = 'HBW';
      else if (cleanName.toLowerCase().includes('charpy') || cleanName.toLowerCase().includes('impact')) sec.config.targetUnit = 'J';
      else sec.config.targetUnit = 'Units';
    }
    delete sec.config.tableColumns;
    delete sec.config.tableRows;
    this.ensureTableColumns(sec);
    this.ensureTableRows(sec);
    this.toastService.show(`Reading target parameter: "${cleanName}" (${sec.config.targetUnit})`, 'success');
  }

  setReadingSpotCount(sec: ExecutionSection, count: number): void {
    const clamped = Math.max(1, Math.min(10, count));
    sec.config.spotCount = clamped;
    sec.config.count = clamped;
    delete sec.config.tableColumns;
    this.ensureTableColumns(sec);
  }

  applyReadingPreset(sec: ExecutionSection, preset: '3spots' | '5spots' | '10spots'): void {
    if (preset === '3spots') {
      this.setReadingSpotCount(sec, 3);
      this.toastService.show('Applied 3 Spots (ASTM E18 / ISO 6508)', 'info');
    } else if (preset === '5spots') {
      this.setReadingSpotCount(sec, 5);
      this.toastService.show('Applied 5 Spots (Standard Grid)', 'info');
    } else if (preset === '10spots') {
      this.setReadingSpotCount(sec, 10);
      this.toastService.show('Applied 10 Spots (Comprehensive Survey)', 'info');
    }
  }

  toggleReadingExecutionMode(sec: ExecutionSection): void {
    sec.config.readingExecutionMode = sec.config.readingExecutionMode === 'fixed' ? 'runtime' : 'fixed';
    this.toastService.show(`Reading execution mode: ${sec.config.readingExecutionMode.toUpperCase()}`, 'info');
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
        sec.config.tableColumns.forEach(c => c.bindingMode = mode);
      }
    }
  }

  // Auto-Step Generator State for Hardness Traverse & Surveys
  autoStepStart: number = 0.05;
  autoStepIncrement: number = 0.05;
  autoStepPoints: number = 10;

  generateTraverseAutoStep(sec: ExecutionSection, start?: number, step?: number, points?: number): void {
    const s = start !== undefined ? start : this.autoStepStart;
    const inc = step !== undefined ? step : this.autoStepIncrement;
    const count = points !== undefined ? points : this.autoStepPoints;
    const rows: LayoutRowItem[] = [];
    const defaultMode = sec.config.dataBindingMode || 'runtime';
    for (let i = 0; i < count; i++) {
      const val = s + i * inc;
      rows.push({
        key: `step_${i}`,
        label: val.toFixed(2),
        bindingMode: defaultMode,
        unit: sec.config.xUnit || 'mm',
        requirement: sec.config.cutoff || '550 HV',
        visible: true,
        removable: true
      });
    }
    sec.config.tableRows = rows;
    this.toastService.show(`Generated ${count} stepped traverse points (${s.toFixed(2)} to ${(s + (count - 1) * inc).toFixed(2)} mm)`, 'success');
  }

  adjustReadingSpots(sec: ExecutionSection, delta: number): void {
    const cols = this.ensureTableColumns(sec);
    const readingCols = cols.filter(c => c.key.startsWith('reading_'));
    if (delta > 0) {
      if (readingCols.length >= 25) {
        this.toastService.show('Maximum 25 reading spots reached', 'warning');
        return;
      }
      const newNum = readingCols.length + 1;
      const newCol: LayoutColumnItem = {
        key: `reading_${newNum}`,
        label: `R${newNum}`,
        bindingMode: 'manual',
        visible: true,
        removable: true
      };
      const aggIdx = cols.findIndex(c => c.key === 'agg');
      if (aggIdx !== -1) {
        cols.splice(aggIdx, 0, newCol);
      } else {
        cols.push(newCol);
      }
      sec.config.tableColumns = [...cols];
      this.toastService.show(`Added reading spot R${newNum}`, 'success');
    } else if (delta < 0) {
      if (readingCols.length <= 1) {
        this.toastService.show('At least 1 reading spot required', 'warning');
        return;
      }
      const lastReadingCol = readingCols[readingCols.length - 1];
      const idx = cols.findIndex(c => c.key === lastReadingCol.key);
      if (idx !== -1) {
        cols.splice(idx, 1);
        sec.config.tableColumns = [...cols];
        this.validateHeaderMergeAfterColumnChange(sec);
        this.toastService.show(`Removed reading spot ${lastReadingCol.label}`, 'info');
      }
    }
  }

  applyConditionPreset(sec: ExecutionSection, presetKey: string): void {
    const defaultMode = sec.config.dataBindingMode || 'runtime';
    const rows: LayoutRowItem[] = [];
    if (presetKey === 'standard') {
      rows.push({ key: 'temp', label: 'Ambient Temperature', requirement: '23.0 ± 2.0 °C', unit: '°C', staticValue: '23.0 °C', bindingMode: defaultMode, visible: true, removable: true });
      rows.push({ key: 'humidity', label: 'Relative Humidity', requirement: '50.0 ± 10.0 %', unit: '% RH', staticValue: '50.0 %', bindingMode: defaultMode, visible: true, removable: true });
      rows.push({ key: 'speed', label: 'Test Speed / Strain Rate', requirement: '2.0 mm/min', unit: 'mm/min', staticValue: '2.0 mm/min', bindingMode: defaultMode, visible: true, removable: true });
      rows.push({ key: 'medium', label: 'Testing Medium / Environment', requirement: 'Ambient Air', unit: '—', staticValue: 'Ambient Air', bindingMode: 'static', visible: true, removable: true });
    } else if (presetKey === 'elevated') {
      rows.push({ key: 'temp', label: 'Furnace Temperature', requirement: '650 ± 5 °C', unit: '°C', staticValue: '650 °C', bindingMode: defaultMode, visible: true, removable: true });
      rows.push({ key: 'soak', label: 'Soak Duration', requirement: '30 min', unit: 'min', staticValue: '30 min', bindingMode: 'static', visible: true, removable: true });
      rows.push({ key: 'rate', label: 'Heating Rate', requirement: '10 °C/min', unit: '°C/min', staticValue: '10 °C/min', bindingMode: 'static', visible: true, removable: true });
      rows.push({ key: 'atmosphere', label: 'Chamber Atmosphere', requirement: 'Argon Purged', unit: '—', staticValue: 'Inert Argon', bindingMode: 'static', visible: true, removable: true });
    } else if (presetKey === 'subzero') {
      rows.push({ key: 'temp', label: 'Chamber Temperature', requirement: '-40.0 ± 1.0 °C', unit: '°C', staticValue: '-40.0 °C', bindingMode: defaultMode, visible: true, removable: true });
      rows.push({ key: 'medium', label: 'Cooling Bath Medium', requirement: 'Liquid Nitrogen / Alcohol', unit: '—', staticValue: 'Liquid N2', bindingMode: 'static', visible: true, removable: true });
      rows.push({ key: 'soak', label: 'Pre-chill Soak Duration', requirement: '20 min', unit: 'min', staticValue: '20 min', bindingMode: 'static', visible: true, removable: true });
    }
    sec.config.tableRows = rows;
    this.toastService.show(`Applied condition preset: ${presetKey.toUpperCase()}`, 'success');
  }

  applyChecklistPreset(sec: ExecutionSection, presetKey: string): void {
    const rows: LayoutRowItem[] = [];
    if (presetKey === 'iso17025') {
      rows.push({ key: 'chk_1', label: 'Sample identification & labeling integrity verified', requirement: 'ISO 17025 Cl. 7.4.2', bindingMode: 'manual', visible: true, removable: true });
      rows.push({ key: 'chk_2', label: 'Test machine calibration validity & zero balance checked', requirement: 'ISO 17025 Cl. 6.4.1', bindingMode: 'manual', visible: true, removable: true });
      rows.push({ key: 'chk_3', label: 'Ambient temperature and relative humidity logged', requirement: 'ISO 17025 Cl. 6.3', bindingMode: 'manual', visible: true, removable: true });
      rows.push({ key: 'chk_4', label: 'Standard test method & test parameters confirmed', requirement: 'ISO 17025 Cl. 7.2', bindingMode: 'manual', visible: true, removable: true });
      rows.push({ key: 'chk_5', label: 'Raw data recorded contemporaneously with audit trail', requirement: 'ISO 17025 Cl. 7.5', bindingMode: 'manual', visible: true, removable: true });
    } else if (presetKey === 'pretest') {
      rows.push({ key: 'pre_1', label: 'Specimen surface finish, parallelism & dimensions checked', requirement: 'ASTM E8 / ISO 6892', bindingMode: 'manual', visible: true, removable: true });
      rows.push({ key: 'pre_2', label: 'Grip alignment and hydraulic clamping pressure verified', requirement: 'SOP-MEC-01', bindingMode: 'manual', visible: true, removable: true });
      rows.push({ key: 'pre_3', label: 'Extensometer knife-edge gauge length confirmed', requirement: 'Class 0.5 Calibration', bindingMode: 'manual', visible: true, removable: true });
      rows.push({ key: 'pre_4', label: 'Emergency stop and protective interlock operational', requirement: 'Lab Safety Manual', bindingMode: 'manual', visible: true, removable: true });
    }
    sec.config.tableRows = rows;
    this.toastService.show(`Loaded ${rows.length} checklist items for ${presetKey.toUpperCase()}`, 'success');
  }

  applyClassificationPreset(sec: ExecutionSection, scaleKey: string): void {
    const defaultMode = sec.config.dataBindingMode || 'runtime';
    const rows: LayoutRowItem[] = [];
    if (scaleKey === 'astm_e45') {
      rows.push({ key: 'e45_a', label: 'Type A — Sulfides (Manganese Sulfide)', requirement: 'Thin ≤ 1.5, Heavy ≤ 1.0', bindingMode: defaultMode, visible: true, removable: true });
      rows.push({ key: 'e45_b', label: 'Type B — Alumina (Alumina stringers)', requirement: 'Thin ≤ 1.5, Heavy ≤ 1.0', bindingMode: defaultMode, visible: true, removable: true });
      rows.push({ key: 'e45_c', label: 'Type C — Silicates (Silicate stringers)', requirement: 'Thin ≤ 1.0, Heavy ≤ 0.5', bindingMode: defaultMode, visible: true, removable: true });
      rows.push({ key: 'e45_d', label: 'Type D — Globular Oxides', requirement: 'Thin ≤ 1.5, Heavy ≤ 1.0', bindingMode: defaultMode, visible: true, removable: true });
    } else if (scaleKey === 'astm_e112') {
      rows.push({ key: 'e112_g', label: 'ASTM Grain Size Number (G)', requirement: 'G ≥ 5 (Fine grain)', bindingMode: defaultMode, visible: true, removable: true });
      rows.push({ key: 'e112_diam', label: 'Mean Grain Intercept / Diameter (µm)', requirement: '≤ 65 µm', bindingMode: defaultMode, visible: true, removable: true });
    } else if (scaleKey === 'astm_a247') {
      rows.push({ key: 'a247_form', label: 'Graphite Form (Flake / Nodular / Compacted)', requirement: 'Type VII (Flake)', bindingMode: defaultMode, visible: true, removable: true });
      rows.push({ key: 'a247_dist', label: 'Graphite Distribution (Type A/B/C/D/E)', requirement: 'Type A (Uniform random)', bindingMode: defaultMode, visible: true, removable: true });
      rows.push({ key: 'a247_size', label: 'Graphite Flake Size Class (1 to 8)', requirement: 'Size 4 to 6', bindingMode: defaultMode, visible: true, removable: true });
    }
    sec.config.tableRows = rows;
    this.toastService.show(`Loaded classification scale: ${scaleKey.toUpperCase()}`, 'success');
  }

  applyTraceabilityPreset(sec: ExecutionSection): void {
    const rows: LayoutRowItem[] = [];
    rows.push({ key: 'tr_1', label: 'Universal Testing Machine (UTM-600kN)', requirement: 'Cal Cert: NABL/2026/1104', unit: 'Due: 2027-02-15', staticValue: 'Instron 600kN', bindingMode: 'static', visible: true, removable: true });
    rows.push({ key: 'tr_2', label: 'Digital Extensometer (EXT-50-25)', requirement: 'Cal Cert: NABL/2026/0928', unit: 'Due: 2027-01-30', staticValue: 'Instron 2630-100', bindingMode: 'static', visible: true, removable: true });
    rows.push({ key: 'tr_3', label: 'Digital Vernier Calliper (CAL-01)', requirement: 'Cal Cert: NABL/2026/0512', unit: 'Due: 2026-11-20', staticValue: 'Mitutoyo 500-196', bindingMode: 'static', visible: true, removable: true });
    rows.push({ key: 'tr_4', label: 'Ambient Temp / Humidity Logger (TH-LOG-01)', requirement: 'Cal Cert: NABL/2026/0304', unit: 'Due: 2027-03-10', staticValue: 'Testo 174H', bindingMode: 'static', visible: true, removable: true });
    sec.config.tableRows = rows;
    this.toastService.show('Loaded Equipment Calibration Traceability Records', 'success');
  }

  ensurePhotoSlots(sec: ExecutionSection): PhotoSlotItem[] {
    if (!sec.config) {
      sec.config = this.createSectionObject('photo').config;
    }
    if (!sec.config.photoSlots || !Array.isArray(sec.config.photoSlots)) {
      const count = Math.max(1, Math.min(8, sec.config.count || 2));
      const slots: PhotoSlotItem[] = [];
      for (let i = 1; i <= count; i++) {
        slots.push({
          id: `slot_${Date.now()}_${i}`,
          title: `Attachment Plate ${i}${i === 1 ? ' (100X)' : i === 2 ? ' (500X)' : ''}`,
          caption: sec.config.caption || 'Runtime attachment caption',
          bindingSource: 'runtime',
          magnification: i === 1 ? '100X' : i === 2 ? '500X' : '1000X',
          etchant: sec.config.showEtchant ? '2% Nital' : '',
          etchantMode: 'manual',
          etchantSource: 'parameter',
          scaleBar: i === 1 ? '50 µm' : '20 µm',
          location: i === 1 ? 'Surface' : 'Core',
          specimenId: `Specimen #${i}`,
          mandatory: i === 1,
          reportable: true
        });
      }
      sec.config.photoSlots = slots;
    }
    sec.config.count = sec.config.photoSlots.length;
    return sec.config.photoSlots;
  }

  addPhotoSlot(sec: ExecutionSection): void {
    const slots = this.ensurePhotoSlots(sec);
    const newIdx = slots.length + 1;
    slots.push({
      id: `slot_${Date.now()}_${newIdx}`,
      title: `Attachment Plate ${newIdx}`,
      caption: sec.config.caption || 'Runtime attachment caption',
      bindingSource: 'runtime',
      magnification: '100X',
      etchant: '2% Nital',
      etchantMode: 'manual',
      etchantSource: 'parameter',
      scaleBar: '50 µm',
      location: 'Surface',
      specimenId: `Specimen #${newIdx}`,
      mandatory: false,
      reportable: true
    });
    sec.config.count = slots.length;
    this.toastService.show(`Photo Plate #${newIdx} added`, 'success');
  }

  removePhotoSlot(sec: ExecutionSection, index: number): void {
    const slots = this.ensurePhotoSlots(sec);
    if (index >= 0 && index < slots.length) {
      slots.splice(index, 1);
      sec.config.count = slots.length;
      this.toastService.show('Photo plate removed', 'info');
    }
  }

  duplicatePhotoSlot(sec: ExecutionSection, index: number): void {
    const slots = this.ensurePhotoSlots(sec);
    if (index >= 0 && index < slots.length) {
      const orig = slots[index];
      const copy: PhotoSlotItem = {
        ...orig,
        id: `slot_${Date.now()}_copy`,
        title: `${orig.title} (Copy)`
      };
      slots.splice(index + 1, 0, copy);
      sec.config.count = slots.length;
      this.toastService.show('Photo plate duplicated', 'success');
    }
  }

  movePhotoSlot(sec: ExecutionSection, index: number, direction: -1 | 1): void {
    const slots = this.ensurePhotoSlots(sec);
    const newIdx = index + direction;
    if (newIdx >= 0 && newIdx < slots.length) {
      const temp = slots[index];
      slots[index] = slots[newIdx];
      slots[newIdx] = temp;
    }
  }

  applyPhotoPreset(sec: ExecutionSection, presetKey: 'metallography' | 'weld_macro' | 'fracture' | 'corrosion' | 'setup'): void {
    if (!sec.config) sec.config = {};
    sec.config.showMagnification = true;
    sec.config.showEtchant = true;
    sec.config.showScale = true;
    sec.config.showLocation = true;
    sec.config.showSpecimenId = true;
    sec.config.allowRuntimeUpload = true;
    sec.config.allowZoomModal = true;
    sec.config.cardStyle = 'Technical Datasheet';

    switch (presetKey) {
      case 'metallography':
        sec.config.gridColumns = '2 Columns (Pair)';
        sec.config.aspectRatio = '4:3';
        sec.config.photoSlots = [
          {
            id: 'slot_meta_1',
            title: '1. Unetched Inclusions Field (100X)',
            caption: 'ASTM E45 Method A Non-Metallic Inclusion Rating',
            bindingSource: 'runtime',
            magnification: '100X',
            etchant: 'Unetched / Polished',
            scaleBar: '100 µm',
            location: 'Longitudinal Center',
            specimenId: 'Specimen #1',
            mandatory: true,
            reportable: true
          },
          {
            id: 'slot_meta_2',
            title: '2. Etched Microstructure (500X)',
            caption: 'Tempered martensite with fine carbide precipitates',
            bindingSource: 'runtime',
            magnification: '500X',
            etchant: '2% Nital',
            scaleBar: '20 µm',
            location: 'Mid-Radius',
            specimenId: 'Specimen #1',
            mandatory: true,
            reportable: true
          }
        ];
        this.toastService.show('Loaded Metallography Micrograph Pair Preset (100X & 500X)', 'success');
        break;

      case 'weld_macro':
        sec.config.gridColumns = '3 Columns (Trio)';
        sec.config.aspectRatio = '16:9';
        sec.config.photoSlots = [
          {
            id: 'slot_weld_1',
            title: '1. Weld Macro-Etch Cross Section',
            caption: 'Penetration depth, fusion line, and run sequence check',
            bindingSource: 'runtime',
            magnification: 'Macro (5X)',
            etchant: '10% Ammonium Persulfate',
            scaleBar: '5 mm',
            location: 'Joint Cross Section',
            specimenId: 'Coupon A',
            mandatory: true,
            reportable: true
          },
          {
            id: 'slot_weld_2',
            title: '2. Heat Affected Zone (HAZ) @ 200X',
            caption: 'Coarse grain HAZ grain growth & acicular ferrite morphology',
            bindingSource: 'runtime',
            magnification: '200X',
            etchant: '2% Nital',
            scaleBar: '50 µm',
            location: 'HAZ Fusion Boundary',
            specimenId: 'Coupon A',
            mandatory: true,
            reportable: true
          },
          {
            id: 'slot_weld_3',
            title: '3. Weld Metal Microstructure @ 500X',
            caption: 'Acicular ferrite with intergranular boundary allotriomorphs',
            bindingSource: 'runtime',
            magnification: '500X',
            etchant: '2% Nital',
            scaleBar: '20 µm',
            location: 'Weld Centerline',
            specimenId: 'Coupon A',
            mandatory: false,
            reportable: true
          }
        ];
        this.toastService.show('Loaded Weld Macro & Micro Trio Preset', 'success');
        break;

      case 'fracture':
        sec.config.gridColumns = 'Comparison Mode (Before / After)';
        sec.config.aspectRatio = '4:3';
        sec.config.photoSlots = [
          {
            id: 'slot_frac_1',
            title: 'Specimen Before Test (Gauge Length)',
            caption: 'Original gauge length marking & surface condition',
            bindingSource: 'runtime',
            magnification: '1X Macro',
            etchant: 'None',
            scaleBar: '50 mm',
            location: 'Gauge Length',
            specimenId: 'Tensile #1',
            mandatory: false,
            reportable: true
          },
          {
            id: 'slot_frac_2',
            title: 'Fractured Specimen / Cup-Cone Mode',
            caption: 'Ductile cup-and-cone shear fracture appearance with necking',
            bindingSource: 'runtime',
            magnification: '2X Macro',
            etchant: 'None',
            scaleBar: '10 mm',
            location: 'Fracture Zone',
            specimenId: 'Tensile #1',
            mandatory: true,
            reportable: true
          }
        ];
        this.toastService.show('Loaded Pre/Post Fracture Split Comparison Preset', 'success');
        break;

      case 'corrosion':
        sec.config.gridColumns = '3 Columns (Trio)';
        sec.config.aspectRatio = '1:1';
        sec.config.photoSlots = [
          {
            id: 'slot_corr_1',
            title: '1. Pre-Exposure (0 Hours)',
            caption: 'Clean passivated / coated surface prior to chamber placement',
            bindingSource: 'runtime',
            magnification: 'Visual',
            etchant: 'None',
            scaleBar: 'Panel 150×100mm',
            location: 'Front Face',
            specimenId: 'Panel A',
            mandatory: true,
            reportable: true
          },
          {
            id: 'slot_corr_2',
            title: '2. Intermediate Inspection (48 Hours)',
            caption: 'First white rust appearance, blister evaluation as per ASTM D714',
            bindingSource: 'runtime',
            magnification: 'Visual',
            etchant: 'None',
            scaleBar: 'Panel 150×100mm',
            location: 'Front Face',
            specimenId: 'Panel A',
            mandatory: false,
            reportable: true
          },
          {
            id: 'slot_corr_3',
            title: '3. Final Post-Exposure (96 Hours)',
            caption: 'Red rust area coverage rating (%) as per ASTM B117 / ISO 9227',
            bindingSource: 'runtime',
            magnification: 'Visual',
            etchant: 'None',
            scaleBar: 'Panel 150×100mm',
            location: 'Front Face',
            specimenId: 'Panel A',
            mandatory: true,
            reportable: true
          }
        ];
        this.toastService.show('Loaded Salt Spray / Corrosion Exposure Series Preset', 'success');
        break;

      case 'setup':
        sec.config.gridColumns = '2 Columns (Pair)';
        sec.config.aspectRatio = '16:9';
        sec.config.photoSlots = [
          {
            id: 'slot_setup_1',
            title: '1. Test Setup & Specimen Clamping',
            caption: 'Specimen gripped in hydraulic wedge jaws with alignment verification',
            bindingSource: 'runtime',
            magnification: 'Visual',
            etchant: 'None',
            scaleBar: 'Full Setup',
            location: 'UTM Frame',
            specimenId: 'Setup #1',
            mandatory: false,
            reportable: true
          },
          {
            id: 'slot_setup_2',
            title: '2. Extensometer Clamping & Gauge Pin',
            caption: 'Class 0.5 axial extensometer clamped at 50mm gauge length',
            bindingSource: 'runtime',
            magnification: 'Visual',
            etchant: 'None',
            scaleBar: 'GL: 50mm',
            location: 'Specimen Gauge',
            specimenId: 'Setup #1',
            mandatory: true,
            reportable: true
          }
        ];
        this.toastService.show('Loaded Test Setup & Extensometer Preset', 'success');
        break;
    }
    sec.config.count = (sec.config.photoSlots || []).length;
  }

  getPhotoGridClass(sec: ExecutionSection): string {
    const cols = sec.config?.gridColumns || '2 Columns (Pair)';
    if (cols.includes('1 Column')) return 'photos-grid photos-grid-1col';
    if (cols.includes('3 Columns')) return 'photos-grid photos-grid-3col';
    if (cols.includes('4 Columns')) return 'photos-grid photos-grid-4col';
    if (cols.includes('Comparison')) return 'photos-grid photos-grid-compare';
    return 'photos-grid photos-grid-2col';
  }

  getPhotoAspectStyle(sec: ExecutionSection, slot?: PhotoSlotItem): string {
    const ratio = slot?.aspectRatio || sec.config?.aspectRatio || '4:3';
    switch (ratio) {
      case '16:9': return '16 / 9';
      case '1:1': return '1 / 1';
      case '3:2': return '3 / 2';
      case '4:3': return '4 / 3';
      default: return '4 / 3';
    }
  }

  getPhotoHeightStyle(sec: ExecutionSection): string {
    const h = sec.config?.plateHeight || 'Standard (185px)';
    if (h.includes('Compact')) return '140px';
    if (h.includes('Large')) return '240px';
    if (h.includes('Hero')) return '300px';
    return '185px';
  }


  getCellDisplayValue(sec: ExecutionSection, row: LayoutRowItem, col: LayoutColumnItem, colIdx: number, rowIdx: number): string {
    if (this.demoMode && row.values && row.values[col.key] !== undefined && row.values[col.key] !== '') {
      return String(row.values[col.key]);
    }
    if (this.demoMode && row.demoValue && (col.key === 'result' || col.key === 'observed' || col.key === 'val' || col.key === 'entry' || col.key === 'avg')) {
      return String(row.demoValue);
    }
    if (col.key === 'unit') return row.unit || (this.demoMode ? 'MPa' : '—');
    if (col.key === 'requirement') return row.requirement || (this.demoMode ? '≥ 420' : 'Runtime');
    if (col.key === 'status') return this.demoMode ? 'PASS' : 'Runtime';
    if (col.key === 'method') return this.demoMode ? 'IS 1608 : 2022' : '—';
    if (col.key === 'remarks') return this.demoMode ? 'Conforms' : '—';
    if (col.key === 'uncertainty') return this.demoMode ? '± 2.5%' : '—';
    if (col.key === 'dl') return this.demoMode ? '0.01' : '—';
    if (col.key === 'scope') return this.demoMode ? 'NABL Scope' : '—';
    if (col.key === 'setpoint') return row.staticValue || row.requirement || (this.demoMode ? '23.0 °C' : '—');
    if (col.key === 'tolerance') return row.requirement || (this.demoMode ? '± 2.0 °C' : '—');
    if (col.key === 'sensor') return this.demoMode ? 'TH-LOG-01' : '—';
    if (col.key === 'clause') return row.requirement || 'ISO 17025 Cl. 7.4';
    if (col.key === 'resp') return this.demoMode ? 'Conforming' : '—';
    if (col.key === 'thin') return this.demoMode ? '1.0' : '—';
    if (col.key === 'heavy') return this.demoMode ? '0.5' : '—';
    if (col.key === 'limit') return row.requirement || (this.demoMode ? '≤ 1.5' : '—');
    if (col.key === 'decision') return this.demoMode ? 'CONFORMS' : '—';
    if (col.key === 'cert') return row.requirement || 'CAL/2026/0421';
    if (col.key === 'calDate') return this.demoMode ? '2026-04-15' : '—';
    if (col.key === 'dueDate') return row.unit || (this.demoMode ? '2027-04-14' : '—');
    if (col.key === 'tag') return this.demoMode ? `EQ-00${rowIdx + 1}` : '—';
    if (col.key === 'y2') return this.demoMode ? (30 + rowIdx * 1.5).toFixed(1) : '—';
    if (col.key === 'avg') return this.demoMode ? (430 + rowIdx * 10).toString() : '—';

    // Specimen Matrix Specialized Keys
    if (col.key === 'orientation') {
      return sec.config.selectedOrientationNotation || (this.demoMode ? 'L-T (Trans)' : '—');
    }
    if (col.key === 'w0' || col.key === 'dim_w0') {
      return this.demoMode ? (12.50 + rowIdx * 0.02).toFixed(2) : '—';
    }
    if (col.key === 't0' || col.key === 'dim_t0') {
      return this.demoMode ? (3.20 - rowIdx * 0.01).toFixed(2) : '—';
    }
    if (col.key === 'd0' || col.key === 'dim_d0') {
      return this.demoMode ? (10.00 + rowIdx * 0.05).toFixed(2) : '—';
    }
    if (col.key === 's0' || col.key === 'dim_s0') {
      return this.demoMode ? (40.00 - rowIdx * 0.19).toFixed(2) : '—';
    }
    if (col.key === 'fm' || col.key === 'param_fm') {
      return this.demoMode ? (24.40 + rowIdx * 0.10).toFixed(2) : '—';
    }
    if (col.key === 'rm' || col.key === 'param_rm') {
      return this.demoMode ? (610 + rowIdx * 2).toString() : '—';
    }
    if (col.key === 'reh' || col.key === 'param_reh') {
      return this.demoMode ? (445 + rowIdx * 3).toString() : '—';
    }
    if (col.key === 'a' || col.key === 'param_a') {
      return this.demoMode ? (24.5 - rowIdx * 0.5).toFixed(1) : '—';
    }

    // Reading Matrix Specialized Spot Keys
    if (col.key.startsWith('spot_') || col.key.startsWith('reading_')) {
      const sNum = parseInt(col.key.replace(/\D/g, ''), 10) || 1;
      return this.demoMode ? (30.5 + (rowIdx * 0.7) + (sNum * 0.2)).toFixed(1) : '—';
    }
    if (col.key === 'agg') {
      return this.demoMode ? (31.13 + rowIdx * 0.45).toFixed(2) : '—';
    }

    const mode = row.bindingMode || col.bindingMode || sec.config.dataBindingMode || 'runtime';
    if (mode === 'static') {
      return row.staticValue || col.staticValue || (this.demoMode ? 'Static 420' : 'Static');
    }
    if (mode === 'manual') {
      return this.demoMode ? 'Manual Entry' : '—';
    }
    if (this.demoMode) {
      if (sec.type === 'traverse') return (620 - rowIdx * 20).toString();
      if (sec.type === 'reading') return (60 + rowIdx * 5 + colIdx * 2).toString();
      if (sec.type === 'condition') return (22.5 + rowIdx * 0.4).toFixed(1);
      return (480 + rowIdx * 15 + colIdx * 5).toString();
    }
    return '—';
  }

  isTableSection(s: ExecutionSection): boolean {
    if (!s) return false;
    return [
      'parameter',
      'specimen',
      'reading',
      'location',
      'condition',
      'rule',
      'traverse',
      'custom',
      'classification',
      'checklist',
      'traceability',
      'opinion'
    ].includes(s.type);
  }

  getVisibleColumnsForSection(s: ExecutionSection): { key: string; label: string; bindingMode?: DataBindingMode; staticValue?: string }[] {
    if (!s) return [];
    if (s.config?.tableColumns && s.config.tableColumns.length > 0) {
      return s.config.tableColumns
        .filter(c => c.visible !== false)
        .map(c => ({ key: c.key, label: c.label, bindingMode: c.bindingMode, staticValue: c.staticValue }));
    }
    return this.ensureTableColumns(s).filter(c => c.visible !== false);
  }

  getMergedColumnsList(s: ExecutionSection): { key: string; label: string }[] {
    const allCols = this.getVisibleColumnsForSection(s);
    if (!allCols.length) return [];

    let defaultStart = 'result';
    if (s.type === 'specimen') defaultStart = 'spec_1';
    if (s.type === 'reading') defaultStart = 'reading_1';
    if (s.type === 'traverse') defaultStart = 'y';
    if (s.type === 'condition') defaultStart = 'setpoint';
    if (s.type === 'classification') defaultStart = 'thin';
    if (s.type === 'checklist') defaultStart = 'clause';
    if (s.type === 'location') defaultStart = 'param_0';

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
      if (s.type === 'traverse') defaultStart = 'y';
      if (s.type === 'condition') defaultStart = 'setpoint';
      if (s.type === 'classification') defaultStart = 'thin';
      if (s.type === 'checklist') defaultStart = 'clause';
      if (s.type === 'location') defaultStart = 'param_0';

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
      else if (s.type === 'location') hm.title = 'Location Zone Observations';
      else if (s.type === 'condition') hm.title = 'Environmental Criteria';
      else if (s.type === 'traverse') hm.title = 'Hardness Depth Profile';
      else if (s.type === 'classification') hm.title = 'Structural Inclusion Severity';
      else if (s.type === 'checklist') hm.title = 'Technical Compliance Verification';
      else if (s.type === 'rule') hm.title = 'Decision Rule & Guard Band';
      else if (s.type === 'traceability') hm.title = 'Equipment Calibration Ledger';
      else hm.title = 'Grouped Observations';
    }
    if (!hm.startCol) {
      if (s.type === 'parameter') hm.startCol = 'result';
      else if (s.type === 'specimen') hm.startCol = 'spec_1';
      else if (s.type === 'reading') hm.startCol = 'reading_1';
      else if (s.type === 'traverse') hm.startCol = 'y';
      else if (s.type === 'condition') hm.startCol = 'setpoint';
      else if (s.type === 'classification') hm.startCol = 'thin';
      else if (s.type === 'checklist') hm.startCol = 'clause';
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

  // =========================================================================
  // CUSTOM TABLE INDIVIDUAL CELL MODIFICATION SYSTEM (CustomTableCell Engine)
  // =========================================================================

  ensureCustomCellMatrix(sec: ExecutionSection): CustomTableCell[][] {
    const rows = this.ensureTableRows(sec);
    const cols = this.ensureTableColumns(sec);
    const rCount = rows.length;
    const cCount = cols.length;

    if (!sec.config.cellMatrix) {
      sec.config.cellMatrix = [];
    }

    const matrix: CustomTableCell[][] = sec.config.cellMatrix;

    // Adjust row dimensions
    while (matrix.length < rCount) {
      matrix.push([]);
    }
    if (matrix.length > rCount) {
      matrix.splice(rCount, matrix.length - rCount);
    }

    // Adjust column dimensions for each row
    for (let r = 0; r < rCount; r++) {
      const rowItem = rows[r];
      while (matrix[r].length < cCount) {
        const c = matrix[r].length;
        const colItem = cols[c];
        const defaultMode = (c === 0 ? 'static' : (colItem.bindingMode || 'manual')) as DataBindingMode;
        const defaultVal = c === 0 ? (rowItem.label || `Row ${r + 1}`) : (rowItem.staticValue || '');
        matrix[r].push({
          id: `cell_${r}_${c}`,
          rowIdx: r,
          colIdx: c,
          rowKey: rowItem.key || `row_${r}`,
          colKey: colItem.key || `col_${c}`,
          value: defaultVal,
          dataType: 'text',
          bindingMode: defaultMode,
          align: c === 0 ? 'left' : 'center',
          isLocked: false
        });
      }
      if (matrix[r].length > cCount) {
        matrix[r].splice(cCount, matrix[r].length - cCount);
      }
      // Keep row/col keys synced
      for (let c = 0; c < cCount; c++) {
        matrix[r][c].rowIdx = r;
        matrix[r][c].colIdx = c;
        matrix[r][c].rowKey = rowItem.key;
        matrix[r][c].colKey = cols[c].key;
      }
    }

    return matrix;
  }

  selectCustomCell(sec: ExecutionSection, rIdx: number, cIdx: number, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    this.selectedSectionId = sec.id;
    const matrix = this.ensureCustomCellMatrix(sec);
    if (!matrix[rIdx] || !matrix[rIdx][cIdx]) return;

    sec.config.activeCellCoords = { rowIdx: rIdx, colIdx: cIdx };
    const cell = matrix[rIdx][cIdx];
    if (cell.selectOptions && !cell.selectOptionsRaw) {
      cell.selectOptionsRaw = cell.selectOptions.join(', ');
    }
    this.markLayoutDirty();
  }

  getActiveCustomCell(sec: ExecutionSection): CustomTableCell | null {
    if (!sec?.config?.activeCellCoords || !sec?.config?.cellMatrix) return null;
    const { rowIdx, colIdx } = sec.config.activeCellCoords;
    if (sec.config.cellMatrix[rowIdx] && sec.config.cellMatrix[rowIdx][colIdx]) {
      return sec.config.cellMatrix[rowIdx][colIdx];
    }
    return null;
  }

  clearActiveCustomCellSelection(sec: ExecutionSection): void {
    if (sec?.config) {
      sec.config.activeCellCoords = null;
    }
  }

  updateCustomCellDataType(sec: ExecutionSection, type: 'text' | 'number' | 'date' | 'select' | 'formula'): void {
    const cell = this.getActiveCustomCell(sec);
    if (!cell) return;
    cell.dataType = type;
    if (type === 'select') {
      if (!cell.selectOptions || cell.selectOptions.length === 0) {
        cell.selectOptions = ['Acceptable', 'Marginal', 'Defect / Reject'];
        cell.selectOptionsRaw = cell.selectOptions.join(', ');
      }
      if (!cell.value && cell.selectOptions[0]) {
        cell.value = cell.selectOptions[0];
      }
    } else if (type === 'formula') {
      if (!cell.formulaExpression) {
        const r = cell.rowIdx;
        cell.formulaExpression = `=[r${r},c1] * 1.0`;
      }
    } else if (type === 'number') {
      if (!cell.precision) cell.precision = 2;
    }
    this.markLayoutDirty();
    this.toastService.show(`Cell [R${cell.rowIdx + 1}:C${cell.colIdx + 1}] data type set to ${type.toUpperCase()}`, 'info');
  }

  updateCustomCellBindingMode(sec: ExecutionSection, mode: 'runtime' | 'static' | 'manual'): void {
    const cell = this.getActiveCustomCell(sec);
    if (!cell) return;
    cell.bindingMode = mode;
    this.markLayoutDirty();
    this.toastService.show(`Cell [R${cell.rowIdx + 1}:C${cell.colIdx + 1}] origin set to ${mode.toUpperCase()}`, 'info');
  }

  updateCustomCellAlign(sec: ExecutionSection, align: 'left' | 'center' | 'right'): void {
    const cell = this.getActiveCustomCell(sec);
    if (!cell) return;
    cell.align = align;
    this.markLayoutDirty();
  }

  updateCustomCellSelectOptions(sec: ExecutionSection, raw: string): void {
    const cell = this.getActiveCustomCell(sec);
    if (!cell) return;
    cell.selectOptionsRaw = raw;
    cell.selectOptions = raw.split(',').map(s => s.trim()).filter(s => s.length > 0);
    if (cell.selectOptions.length > 0 && !cell.selectOptions.includes(String(cell.value))) {
      cell.value = cell.selectOptions[0];
    }
    this.markLayoutDirty();
  }

  evaluateCustomCellFormula(sec: ExecutionSection, formula?: string, rIdx?: number, isSimulation?: boolean): string | number {
    if (!formula) return '—';
    try {
      let expr = formula.trim();
      if (expr.startsWith('=')) {
        expr = expr.substring(1).trim();
      }

      const matrix = this.ensureCustomCellMatrix(sec);

      // Replace coordinate tokens e.g. [r0,c1] or [r,c1]
      const resolved = expr.replace(/\[r(\d*),c(\d+)\]/gi, (match, rStr, cStr) => {
        let r = rStr === '' && rIdx !== undefined ? rIdx : parseInt(rStr, 10);
        const c = parseInt(cStr, 10);
        if (isNaN(r) && rIdx !== undefined) r = rIdx;

        let cellVal: any = 0;
        if (isSimulation) {
          const simKey = `custom_${sec.id}_${r}_${c}`;
          if (this.previewEntries[simKey] !== undefined) {
            cellVal = this.previewEntries[simKey];
          } else if (matrix[r] && matrix[r][c]) {
            cellVal = matrix[r][c].value;
          }
        } else if (matrix[r] && matrix[r][c]) {
          cellVal = matrix[r][c].value;
        }

        const num = parseFloat(String(cellVal).replace(/[^0-9.-]/g, ''));
        return isNaN(num) ? '0' : String(num);
      });

      if (/^[0-9.+\-*/()\s]+$/.test(resolved)) {
        // eslint-disable-next-line no-eval
        const result = Function(`"use strict"; return (${resolved});`)();
        if (typeof result === 'number' && !isNaN(result)) {
          return Math.round(result * 1000) / 1000;
        }
        return result;
      }
      return resolved;
    } catch {
      return '#ERR!';
    }
  }

  markLayoutDirty(): void {
    // Reactive layout change tracking hook
  }

  applyCustomTablePreset(sec: ExecutionSection, preset: 'blank' | 'corrosion' | 'mass_loss' | 'blank_grid'): void {
    if (preset === 'corrosion') {
      sec.config.tableColumns = [
        { key: 'col_interval', label: 'Exposure Interval', bindingMode: 'static', visible: true },
        { key: 'col_appearance', label: 'Visual Surface Rating', bindingMode: 'manual', visible: true },
        { key: 'col_pit_depth', label: 'Max Pit Depth (mm)', bindingMode: 'manual', visible: true, unit: 'mm' },
        { key: 'col_status', label: 'Pass / Fail Verdict', bindingMode: 'manual', visible: true }
      ];
      sec.config.tableRows = [
        { key: 'r_24h', label: '24 Hours Exposure', bindingMode: 'static', visible: true },
        { key: 'r_48h', label: '48 Hours Exposure', bindingMode: 'static', visible: true },
        { key: 'r_96h', label: '96 Hours Exposure', bindingMode: 'static', visible: true },
        { key: 'r_168h', label: '168 Hours (7 Days)', bindingMode: 'static', visible: true }
      ];
      delete sec.config.cellMatrix;
      const matrix = this.ensureCustomCellMatrix(sec);
      for (let r = 0; r < 4; r++) {
        const opts1 = ['No Rust or Blisters', 'Isolated Micro-Pits (<0.1mm)', 'Moderate Red Rust', 'Severe Flaking'];
        matrix[r][1].dataType = 'select';
        matrix[r][1].selectOptions = opts1;
        matrix[r][1].selectOptionsRaw = opts1.join(', ');
        matrix[r][1].value = opts1[0];

        matrix[r][2].dataType = 'number';
        matrix[r][2].unit = 'mm';
        matrix[r][2].precision = 2;
        matrix[r][2].value = (0.02 * (r + 1)).toFixed(2);

        const opts3 = ['PASS (Conforms to ASTM B117)', 'FAIL (Excessive Rust)'];
        matrix[r][3].dataType = 'select';
        matrix[r][3].selectOptions = opts3;
        matrix[r][3].selectOptionsRaw = opts3.join(', ');
        matrix[r][3].value = opts3[0];
      }
      this.toastService.show('Applied Salt Spray Corrosion Preset (ASTM B117)', 'success');
    } else if (preset === 'mass_loss') {
      sec.config.tableColumns = [
        { key: 'col_spec', label: 'Specimen ID', bindingMode: 'static', visible: true },
        { key: 'col_initial', label: 'Initial Weight (g)', bindingMode: 'manual', visible: true, unit: 'g' },
        { key: 'col_final', label: 'Final Weight (g)', bindingMode: 'manual', visible: true, unit: 'g' },
        { key: 'col_loss', label: 'Mass Loss Δm (g)', bindingMode: 'runtime', visible: true, unit: 'g' },
        { key: 'col_rate', label: 'Corrosion Rate (mpy)', bindingMode: 'runtime', visible: true, unit: 'mpy' }
      ];
      sec.config.tableRows = [
        { key: 'r_sp1', label: 'Coupon #1', bindingMode: 'static', visible: true },
        { key: 'r_sp2', label: 'Coupon #2', bindingMode: 'static', visible: true },
        { key: 'r_sp3', label: 'Coupon #3', bindingMode: 'static', visible: true }
      ];
      delete sec.config.cellMatrix;
      const matrix = this.ensureCustomCellMatrix(sec);
      for (let r = 0; r < 3; r++) {
        matrix[r][1].dataType = 'number';
        matrix[r][1].unit = 'g';
        matrix[r][1].value = (45.234 + r * 0.1).toFixed(3);

        matrix[r][2].dataType = 'number';
        matrix[r][2].unit = 'g';
        matrix[r][2].value = (45.210 + r * 0.1).toFixed(3);

        matrix[r][3].dataType = 'formula';
        matrix[r][3].formulaExpression = `=[r${r},c1] - [r${r},c2]`;
        matrix[r][3].unit = 'g';

        matrix[r][4].dataType = 'formula';
        matrix[r][4].formulaExpression = `=[r${r},c3] * 534.0`;
        matrix[r][4].unit = 'mpy';
      }
      this.toastService.show('Applied Mass Loss Corrosion Rate Preset (ASTM G31)', 'success');
    } else {
      sec.config.tableColumns = [
        { key: 'col_feature', label: 'Feature / Test Point', bindingMode: 'static', visible: true },
        { key: 'col_nominal', label: 'Specified Target', bindingMode: 'manual', visible: true },
        { key: 'col_obs', label: 'Observed Reading', bindingMode: 'manual', visible: true },
        { key: 'col_eval', label: 'Evaluation Status', bindingMode: 'manual', visible: true }
      ];
      sec.config.tableRows = [
        { key: 'row_1', label: 'Point A (Surface)', bindingMode: 'static', visible: true },
        { key: 'row_2', label: 'Point B (Mid-wall)', bindingMode: 'static', visible: true },
        { key: 'row_3', label: 'Point C (Core)', bindingMode: 'static', visible: true }
      ];
      delete sec.config.cellMatrix;
      this.ensureCustomCellMatrix(sec);
      this.toastService.show('Reset Custom Table to Clean 3×4 Dynamic Grid', 'info');
    }
    this.markLayoutDirty();
  }

  openPayloadPreview() {
    this.payloadPreviewModalOpen = true;
  }

  closePayloadPreview() {
    this.payloadPreviewModalOpen = false;
  }
}


