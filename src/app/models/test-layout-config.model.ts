/**
 * Shared Test Execution Layout contract.
 * Used by the Layout Studio (TestLayoutArchetypeDesignerComponent) and the Result Entry renderer
 * (ConfiguredTestLayoutRendererComponent). Stored as TestLayoutTemplate.LayoutConfigJson.
 * Key-by-key behaviour: see LAYOUT_STUDIO_CONFIG_MATRIX.md.
 */

/** Bump when the stored JSON shape changes; upgrade old shapes in normalizeLayoutConfig(). */
export const LAYOUT_CONFIG_VERSION = 1;

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
  /** Reading section: readings across the columns (one row per sample) or down the rows (one column per sample). */
  readingsAs?: 'columns' | 'rows';
  /** Reading section: the requirement as a closing row instead of a column. */
  requirementRow?: boolean;
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
  photoSlots?: PhotoSlotItem[];
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
  /** Name of the test parameter this row stands for, kept when `label` is renamed in the studio. */
  sourceName?: string;
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

export interface LayoutMappedLeafNode {
  laboratoryTestID: number;
  laboratoryTestSubGroupID?: number | null;
  laboratoryTestAnalysisTypeID?: number | null;
  testMethodSpecificationID?: number | null;
  testMethodName?: string | null;
  leafNode?: string | null;
  uniqueKey?: string;
}

/** Root object serialized into TestLayoutTemplate.LayoutConfigJson. */
export interface LayoutConfigPayload {
  configVersion?: number;
  archetypeKey?: string;
  testKey?: string;
  layoutName?: string;
  revision?: string;
  sections: ExecutionSection[];
  testMethodSpecificationID?: number | null;
  testMethodName?: string | null;
  customConditions?: DatasetCondition[];
  customDimensions?: DatasetDimension[];
  deselectedConditions?: string[];
  deselectedDimensions?: string[];
  mappedLeafKeys?: string[];
  mappedLeafNodes?: LayoutMappedLeafNode[];
}
