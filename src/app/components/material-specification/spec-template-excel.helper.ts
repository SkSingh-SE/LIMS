import * as ExcelJS from 'exceljs';

/**
 * Multi-sheet Material-Specification import/export.
 *
 * Sheet 1 ("Template") is the data-entry sheet. The remaining sheets hold the master
 * lists (Name + hidden ID). The Template columns use Excel list data-validation that
 * points at the master sheets so the user can only pick valid names. On import the
 * master sheets are read back to build Name→ID maps, so spec lines resolve entirely
 * from the file itself — no per-row API calls.
 */

export interface SpecMasters {
  parameters: any[]; // combined chemical + mechanical, each tagged { section }
  units: any[];
  laboratoryTests: any[];
  testMethodSpecs: any[];
  specimenOrientations: any[];
  heatTreatments: any[];
  dimensionalFactors: any[];
  productConditions: any[];
  productSizes: any[];
  metalClassifications: any[];
}

export interface ParsedSpecRow {
  rowNumber: number;
  grade: string;
  metalClassificationID: number | null;
  section: 'chemical' | 'mechanical';
  parameterID: number | null;
  parameterName: string;
  parameterSymbol: string;
  decimalPrecision: number;
  parameterUnitID: number | null;
  unitName: string;
  minValue: number | null;
  maxValue: number | null;
  minTolerance: number | null;
  maxTolerance: number | null;
  lowerLimitValue: string;
  lowerLimitDecimalValue: number | null;
  upperLimitValue: string;
  upperLimitDecimalValue: number | null;
  minEquation: string;
  maxEquation: string;
  notes: string;
  specimenOrientationID: number | null;
  dimensionalFactorID: number | null;
  heatTreatmentID: number | null;
  productConditionID1: number | null;
  productConditionID2: number | null;
  productSizeMasterID: number | null;
  testCondition: string;
  testNote: string;
  laboratoryTestID: number | null;
  testMethodSpecIDs: number[];
  status: 'ok' | 'warning' | 'error';
  messages: string[];
}

// Template column order — single source of truth for build + parse.
const COLUMNS = [
  'Grade', 'Metal Classification', 'Section', 'Parameter', 'Unit',
  'Min', 'Max', 'Min Tolerance', 'Max Tolerance',
  'Lower Limit Symbol', 'Lower Limit Value', 'Upper Limit Symbol', 'Upper Limit Value',
  'Min Equation', 'Max Equation', 'Note',
  'Specimen Orientation', 'Dimensional Factor', 'Heat Treatment',
  'Product Condition 1', 'Product Condition 2', 'Product Size',
  'Test Condition', 'Test Note', 'Laboratory Test',
  'Test Method 1', 'Test Method 2', 'Test Method 3', 'Test Method 4', 'Test Method 5',
] as const;

// Lower limit = minimum bound (>, ≥, =); Upper limit = maximum bound (<, ≤, =). Kept distinct.
const LOWER_SYMBOLS = ['>', '≥', '='];
const UPPER_SYMBOLS = ['<', '≤', '='];
const SECTIONS = ['Chemical', 'Mechanical'];
const VALIDATION_ROWS = 1000; // apply dropdown validation to rows 2..1001
const TEMPLATE_SHEET = 'Template';

// Master sheet config: { key in SpecMasters, sheet name (no spaces for formula refs), template column it feeds }
const MASTER_SHEETS: Array<{ key: keyof SpecMasters; sheet: string; column: string }> = [
  { key: 'metalClassifications', sheet: 'MetalClass', column: 'Metal Classification' },
  { key: 'units', sheet: 'Units', column: 'Unit' },
  { key: 'laboratoryTests', sheet: 'LabTests', column: 'Laboratory Test' },
  { key: 'specimenOrientations', sheet: 'SpecimenOrient', column: 'Specimen Orientation' },
  { key: 'dimensionalFactors', sheet: 'DimFactor', column: 'Dimensional Factor' },
  { key: 'heatTreatments', sheet: 'HeatTreat', column: 'Heat Treatment' },
  { key: 'productConditions', sheet: 'ProdCondition', column: 'Product Condition 1' }, // also feeds Cond 2
  { key: 'productSizes', sheet: 'ProductSize', column: 'Product Size' },
  { key: 'testMethodSpecs', sheet: 'TestMethods', column: 'Test Method 1' }, // also feeds 2..5
];

const colName = (item: any): string => (item?.name ?? item?.text ?? '').toString().trim();
const colId = (item: any): number | null => {
  const id = item?.id ?? item?.value;
  return id != null && id !== '' ? Number(id) : null;
};
const colLetter = (idx1: number): string => {
  // 1-based index → A, B, ... AA, AB
  let n = idx1, s = '';
  while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); }
  return s;
};

// ── BUILD ───────────────────────────────────────────────────────────────────
export async function buildSpecTemplate(masters: SpecMasters): Promise<Blob> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'LIMS';
  wb.created = new Date();

  const template = wb.addWorksheet(TEMPLATE_SHEET, { views: [{ state: 'frozen', ySplit: 1 }] });
  template.addRow(COLUMNS as unknown as string[]);
  styleHeader(template.getRow(1));
  COLUMNS.forEach((c, i) => { template.getColumn(i + 1).width = Math.max(14, c.length + 2); });

  // Parameters sheet carries extra metadata (Section, default Unit, Symbol, Precision) for auto-fill.
  const paramSheet = wb.addWorksheet('Parameters');
  paramSheet.addRow(['Name', 'ID', 'Section', 'Default Unit', 'Default Unit ID', 'Symbol', 'Precision']);
  styleHeader(paramSheet.getRow(1));
  (masters.parameters || []).forEach(p => {
    const add = p.additionalValues || {};
    paramSheet.addRow([
      colName(p), colId(p), p.section || '',
      add.Unit || add.unit || '', add.UnitID ?? add.unitID ?? '',
      add.Symbol || add.symbol || '', add.DecimalPrecision ?? add.decimalPrecision ?? 2,
    ]);
  });
  autoWidth(paramSheet);

  // Generic master sheets: Name + ID.
  const sheetRange: Record<string, { sheet: string; last: number }> = {};
  for (const m of MASTER_SHEETS) {
    const ws = wb.addWorksheet(m.sheet);
    ws.addRow(['Name', 'ID']);
    styleHeader(ws.getRow(1));
    const list = (masters[m.key] as any[]) || [];
    list.forEach(it => ws.addRow([colName(it), colId(it)]));
    autoWidth(ws);
    sheetRange[m.column] = { sheet: m.sheet, last: list.length + 1 };
  }
  const paramLast = (masters.parameters || []).length + 1;

  // Apply data-validation dropdowns to template columns (rows 2..VALIDATION_ROWS+1).
  const applyList = (column: string, formula: string) => {
    const ci = COLUMNS.indexOf(column as any) + 1;
    if (ci <= 0) return;
    const L = colLetter(ci);
    for (let r = 2; r <= VALIDATION_ROWS + 1; r++) {
      template.getCell(`${L}${r}`).dataValidation = {
        type: 'list', allowBlank: true, formulae: [formula],
      };
    }
  };
  applyList('Section', `"${SECTIONS.join(',')}"`);
  applyList('Lower Limit Symbol', `"${LOWER_SYMBOLS.join(',')}"`);
  applyList('Upper Limit Symbol', `"${UPPER_SYMBOLS.join(',')}"`);
  applyList('Parameter', `=Parameters!$A$2:$A$${paramLast}`);
  for (const m of MASTER_SHEETS) {
    const r = sheetRange[m.column];
    applyList(m.column, `=${r.sheet}!$A$2:$A$${r.last}`);
  }
  // Shared masters feeding multiple columns.
  const cond = sheetRange['Product Condition 1'];
  applyList('Product Condition 2', `=${cond.sheet}!$A$2:$A$${cond.last}`);
  const tms = sheetRange['Test Method 1'];
  ['Test Method 2', 'Test Method 3', 'Test Method 4', 'Test Method 5']
    .forEach(c => applyList(c, `=${tms.sheet}!$A$2:$A$${tms.last}`));

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

function styleHeader(row: ExcelJS.Row): void {
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDA261C' } };
  row.alignment = { vertical: 'middle' };
  row.height = 18;
}
function autoWidth(ws: ExcelJS.Worksheet): void {
  ws.columns.forEach(col => {
    let max = 10;
    col.eachCell?.({ includeEmpty: false }, cell => {
      const len = (cell.value ?? '').toString().length;
      if (len > max) max = len;
    });
    col.width = Math.min(40, max + 2);
  });
}

// ── PARSE ─────────────────────────────────────────────────────────────────────
export async function parseSpecTemplate(buffer: ArrayBuffer): Promise<ParsedSpecRow[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);

  const template = wb.getWorksheet(TEMPLATE_SHEET);
  if (!template) throw new Error(`Sheet "${TEMPLATE_SHEET}" not found. Please use the downloaded template.`);

  // Build Name→meta maps from the embedded master sheets.
  const paramMap = new Map<string, { id: number | null; section: string; unitId: number | null; unitName: string; symbol: string; precision: number }>();
  const pSheet = wb.getWorksheet('Parameters');
  pSheet?.eachRow((row, i) => {
    if (i === 1) return;
    const name = (row.getCell(1).value ?? '').toString().trim();
    if (!name) return;
    paramMap.set(name.toLowerCase(), {
      id: numOrNull(row.getCell(2).value),
      section: (row.getCell(3).value ?? '').toString().trim().toLowerCase(),
      unitName: (row.getCell(4).value ?? '').toString().trim(),
      unitId: numOrNull(row.getCell(5).value),
      symbol: (row.getCell(6).value ?? '').toString().trim(),
      precision: Number(numOrNull(row.getCell(7).value) ?? 2),
    });
  });

  const masterMap: Record<string, Map<string, number | null>> = {};
  for (const m of MASTER_SHEETS) {
    const map = new Map<string, number | null>();
    wb.getWorksheet(m.sheet)?.eachRow((row, i) => {
      if (i === 1) return;
      const name = (row.getCell(1).value ?? '').toString().trim();
      if (name) map.set(name.toLowerCase(), numOrNull(row.getCell(2).value));
    });
    masterMap[m.sheet] = map;
  }
  const lookup = (sheet: string, name: string): number | null => {
    const n = (name || '').trim().toLowerCase();
    if (!n) return null;
    return masterMap[sheet]?.has(n) ? masterMap[sheet].get(n)! : undefined as any;
  };

  const idx = (c: string) => COLUMNS.indexOf(c as any) + 1;
  const out: ParsedSpecRow[] = [];

  template.eachRow((row, i) => {
    if (i === 1) return;
    const cell = (c: string) => cellStr(row.getCell(idx(c)).value);
    const grade = cell('Grade');
    const paramName = cell('Parameter');
    // Skip fully empty rows.
    if (!grade && !paramName) return;

    const messages: string[] = [];
    let status: ParsedSpecRow['status'] = 'ok';
    const fail = (msg: string) => { messages.push(msg); status = 'error'; };
    const warn = (msg: string) => { messages.push(msg); if (status === 'ok') status = 'warning'; };

    const sectionRaw = cell('Section').toLowerCase();
    const section: 'chemical' | 'mechanical' = sectionRaw.startsWith('mech') ? 'mechanical' : 'chemical';

    const pmeta = paramMap.get(paramName.toLowerCase());
    if (!grade) fail('Grade is required.');
    if (!paramName) fail('Parameter is required.');
    else if (!pmeta || pmeta.id == null) fail(`Parameter "${paramName}" not found in master list.`);
    else if (pmeta.section && sectionRaw && !pmeta.section.startsWith(section.slice(0, 4))) {
      warn(`Parameter "${paramName}" is a ${pmeta.section} parameter but Section says "${cell('Section')}".`);
    }

    // Resolve a master name → id; warn (not fail) when a non-empty name is unknown.
    const resolve = (sheet: string, col: string): number | null => {
      const name = cell(col);
      if (!name) return null;
      const id = lookup(sheet, name);
      if (id === undefined) { warn(`${col} "${name}" not found in master list — skipped.`); return null; }
      return id;
    };

    const minV = numOrNull(row.getCell(idx('Min')).value);
    const maxV = numOrNull(row.getCell(idx('Max')).value);
    if (minV != null && maxV != null && minV > maxV) fail(`Min (${minV}) cannot be greater than Max (${maxV}).`);

    const lowerSym = cell('Lower Limit Symbol');
    const upperSym = cell('Upper Limit Symbol');
    if (lowerSym && !LOWER_SYMBOLS.includes(lowerSym)) warn(`Lower Limit Symbol "${lowerSym}" is invalid (allowed: ${LOWER_SYMBOLS.join(' ')}).`);
    if (upperSym && !UPPER_SYMBOLS.includes(upperSym)) warn(`Upper Limit Symbol "${upperSym}" is invalid (allowed: ${UPPER_SYMBOLS.join(' ')}).`);

    const unitName = cell('Unit');
    let unitId: number | null = unitName ? lookup('Units', unitName) : (pmeta?.unitId ?? null);
    if (unitName && unitId === undefined) { warn(`Unit "${unitName}" not found — using parameter default.`); unitId = pmeta?.unitId ?? null; }

    const tmIds = ['Test Method 1', 'Test Method 2', 'Test Method 3', 'Test Method 4', 'Test Method 5']
      .map(c => resolve('TestMethods', c))
      .filter((v): v is number => v != null);

    out.push({
      rowNumber: i,
      grade,
      metalClassificationID: resolve('MetalClass', 'Metal Classification'),
      section,
      parameterID: pmeta?.id ?? null,
      parameterName: paramName,
      parameterSymbol: pmeta?.symbol ?? '',
      decimalPrecision: pmeta?.precision ?? 2,
      parameterUnitID: unitId ?? null,
      unitName: unitName || pmeta?.unitName || '',
      minValue: minV,
      maxValue: maxV,
      minTolerance: numOrNull(row.getCell(idx('Min Tolerance')).value),
      maxTolerance: numOrNull(row.getCell(idx('Max Tolerance')).value),
      lowerLimitValue: lowerSym,
      lowerLimitDecimalValue: numOrNull(row.getCell(idx('Lower Limit Value')).value),
      upperLimitValue: upperSym,
      upperLimitDecimalValue: numOrNull(row.getCell(idx('Upper Limit Value')).value),
      minEquation: cell('Min Equation'),
      maxEquation: cell('Max Equation'),
      notes: cell('Note'),
      specimenOrientationID: resolve('SpecimenOrient', 'Specimen Orientation'),
      dimensionalFactorID: resolve('DimFactor', 'Dimensional Factor'),
      heatTreatmentID: resolve('HeatTreat', 'Heat Treatment'),
      productConditionID1: resolve('ProdCondition', 'Product Condition 1'),
      productConditionID2: resolve('ProdCondition', 'Product Condition 2'),
      productSizeMasterID: resolve('ProductSize', 'Product Size'),
      testCondition: cell('Test Condition'),
      testNote: cell('Test Note'),
      laboratoryTestID: resolve('LabTests', 'Laboratory Test'),
      testMethodSpecIDs: tmIds,
      status,
      messages,
    });
  });

  return out;
}

function numOrNull(v: ExcelJS.CellValue): number | null {
  if (v == null || v === '') return null;
  if (typeof v === 'object' && 'result' in (v as any)) v = (v as any).result; // formula cell
  const n = Number((v as any).toString().trim());
  return isNaN(n) ? null : n;
}
function cellStr(v: ExcelJS.CellValue): string {
  if (v == null) return '';
  if (typeof v === 'object') {
    const o = v as any;
    if ('text' in o) return (o.text ?? '').toString().trim();
    if ('result' in o) return (o.result ?? '').toString().trim();
    if ('richText' in o) return (o.richText || []).map((t: any) => t.text).join('').trim();
  }
  return v.toString().trim();
}
