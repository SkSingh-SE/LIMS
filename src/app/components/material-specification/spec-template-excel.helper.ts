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
  parameters: any[]; // combined chemical + mechanical/general, each tagged { section }
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
  unsNo?: string;
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
  equationFx?: string;
  formulaValid?: boolean;
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
  missingMasters?: Array<{ category: string; value: string; isRequired: boolean }>;
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
  'UNS No', 'Equation (fx)',
] as const;

// Lower limit = minimum bound (>, ≥, =); Upper limit = maximum bound (<, ≤, =). Kept distinct.
const LOWER_SYMBOLS = ['>', '≥', '='];
const UPPER_SYMBOLS = ['<', '≤', '='];
const SECTIONS = ['Chemical', 'General'];
const VALIDATION_ROWS = 1000; // apply dropdown validation to rows 2..1001
const TEMPLATE_SHEET = 'Template';

// Common parameter name aliases to map international standards (e.g. ASTM/BS/EN) to LIMS masters
const PARAM_ALIASES: Record<string, string> = {
  // Chemistry spelling and symbol aliases
  'sulphur': 'sulfur',
  'aluminium': 'aluminum',
  'phosphorous': 'phosphorus',
  'columbium': 'niobium',
  'cb': 'niobium',
  'nb': 'niobium',
  'mo': 'molybdenum',
  'si': 'silicon',
  'mn': 'manganese',
  'cr': 'chromium',
  'ni': 'nickel',
  'cu': 'copper',
  'fe': 'iron',
  'c': 'carbon',
  'p': 'phosphorus',
  's': 'sulfur',
  'v': 'vanadium',
  'w': 'tungsten',
  'ti': 'titanium',
  'co': 'cobalt',
  'al': 'aluminum',
  'b': 'boron',
  'n': 'nitrogen',
  'o': 'oxygen',
  'h': 'hydrogen',
  'as': 'arsenic',
  'sn': 'tin',
  'pb': 'lead',
  'sb': 'antimony',
  'bi': 'bismuth',
  'zr': 'zirconium',
  'ta': 'tantalum',

  // Mechanical / General test names & ASTM headings
  'uts': 'ultimate tensile strength',
  'tensile strength': 'ultimate tensile strength',
  'ultimate tensile strength': 'ultimate tensile strength',
  'ys': 'yield strength',
  'yield stress': 'yield strength',
  '0.2% proof stress': 'yield strength',
  'proof stress': 'yield strength',
  'elg': 'elongation',
  'el': 'elongation',
  'elongation': 'elongation',
  'ra': 'reduction of area',
  'reduction of area': 'reduction of area',
  'bhn': 'hardness (brinell)',
  'brinell hardness number': 'hardness (brinell)',
  'brinell hardness': 'hardness (brinell)',
  'hardness (brinell)': 'hardness (brinell)',
  'hardness': 'hardness (brinell)',
  'hrc': 'hardness (rockwell c)',
  'hrb': 'hardness (rockwell b)',
  'hv': 'hardness (vickers)',
};

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
    const sec = (p.section || '').toLowerCase();
    const displaySec = (sec.startsWith('gen') || sec.startsWith('mech')) ? 'General' : 'Chemical';
    paramSheet.addRow([
      colName(p), colId(p), displaySec,
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

export interface FormulaValidationResult {
  isValid: boolean;
  formula: string;
  leadingOp?: string;
  targetVar?: string;
  error?: string;
}

export function validateSpecFormula(
  rawInput: string,
  paramNames: Set<string>,
  paramSymbols: Set<string>
): FormulaValidationResult {
  if (!rawInput || !rawInput.trim()) return { isValid: true, formula: '' };
  let str = rawInput.trim();

  let leadingOp = '';
  let targetVar = '';

  // Match target assignment e.g. "Titanium >= 5*(C+N)" or "CE = C + Mn / 6"
  const leadAssignMatch = str.match(/^([a-zA-Z0-9_% ]+?)\s*([≥≤]|>=|<=|>|<|=)\s*(.+)$/);
  if (leadAssignMatch) {
    targetVar = leadAssignMatch[1].trim();
    leadingOp = leadAssignMatch[2].trim();
    str = leadAssignMatch[3].trim();
  } else {
    const leadOpMatch = str.match(/^([≥≤]|>=|<=|>|<|=)\s*(.+)$/);
    if (leadOpMatch) {
      leadingOp = leadOpMatch[1].trim();
      str = leadOpMatch[2].trim();
    }
  }

  // Parentheses balance check
  let depth = 0;
  for (const ch of str) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (depth < 0) return { isValid: false, formula: str, error: 'Unbalanced closing parenthesis' };
  }
  if (depth !== 0) return { isValid: false, formula: str, error: 'Unbalanced opening parenthesis' };

  // Check referenced identifiers
  const idents = str.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
  const knownFuncs = ['IF', 'MIN', 'MAX', 'ROUND', 'ABS', 'POW', 'SPECMIN', 'SPECMAX', 'MEAN', 'SUM'];
  const unknownIdents: string[] = [];

  for (const id of idents) {
    const upper = id.toUpperCase();
    if (knownFuncs.includes(upper)) continue;
    const lower = id.toLowerCase();
    if (paramSymbols.has(lower) || paramNames.has(lower)) continue;
    unknownIdents.push(id);
  }

  if (unknownIdents.length > 0) {
    return {
      isValid: false,
      formula: str,
      leadingOp,
      targetVar,
      error: 'Unknown parameter(s): ' + unknownIdents.join(', '),
    };
  }

  return {
    isValid: true,
    formula: str,
    leadingOp: leadingOp || '>=',
    targetVar,
  };
}

// ── PARSE ─────────────────────────────────────────────────────────────────────
export async function parseSpecTemplate(buffer: ArrayBuffer, liveMasters?: SpecMasters): Promise<ParsedSpecRow[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);

  const template = wb.getWorksheet(TEMPLATE_SHEET);
  if (!template) throw new Error(`Sheet "${TEMPLATE_SHEET}" not found. Please use the downloaded template.`);

  interface ParamMeta {
    id: number | null;
    name: string;
    section: string;
    unitId: number | null;
    unitName: string;
    symbol: string;
    precision: number;
  }

  // Build Name→meta maps from liveMasters (if provided) or fallback to embedded master sheets.
  const paramMap = new Map<string, ParamMeta>();
  const symbolMap = new Map<string, ParamMeta>();
  const paramNames = new Set<string>();
  const paramSymbols = new Set<string>();
  const masterMap: Record<string, Map<string, number | null>> = {};

  for (const m of MASTER_SHEETS) {
    masterMap[m.sheet] = new Map<string, number | null>();
  }

  // 1. Seed from liveMasters if available (the single source of truth for IDs)
  if (liveMasters) {
    for (const p of liveMasters.parameters || []) {
      const name = (p.name ?? (p as any).Name ?? p.parameterName ?? (p as any).text ?? '').toString().trim();
      if (!name) continue;
      const lower = name.toLowerCase();
      paramNames.add(lower);

      const add = (p as any).additionalValues || {};
      const sym = (add.Symbol ?? add.symbol ?? p.parameterSymbol ?? (p as any).symbol ?? '').toString().trim();
      if (sym) {
        paramSymbols.add(sym.toLowerCase());
      }

      const rawId = p.id ?? (p as any).Id ?? (p as any).value;
      const id = rawId != null && rawId !== '' ? Number(rawId) : null;
      const rawUnitId = add.UnitID ?? add.unitID ?? p.unitID ?? (p as any).unitId;
      const unitId = rawUnitId != null && rawUnitId !== '' ? Number(rawUnitId) : null;
      const unitName = (add.Unit ?? add.unit ?? p.defaultUnitName ?? (p as any).unitName ?? '').toString().trim();
      const precision = Number(add.DecimalPrecision ?? add.decimalPrecision ?? (p as any).decimalPlaces ?? 2);
      const section = (p.section || add.ParameterType || add.parameterType || '').toString().trim().toLowerCase();

      const meta: ParamMeta = { id, name, section, unitId, unitName, symbol: sym, precision };
      paramMap.set(lower, meta);

      const normName = lower.replace(/\s+/g, ' ');
      if (!paramMap.has(normName)) paramMap.set(normName, meta);

      if (sym) {
        const lowerSym = sym.toLowerCase();
        if (!symbolMap.has(lowerSym)) symbolMap.set(lowerSym, meta);
      }
    }

    const reg = (sheet: string, items: any[], nameKeys: string[]) => {
      const map = masterMap[sheet] || (masterMap[sheet] = new Map());
      for (const item of items || []) {
        let name = '';
        for (const k of nameKeys) {
          if (item[k]) { name = item[k].toString().trim(); break; }
        }
        if (!name && (item.name || item.text || item.Name)) name = (item.name || item.text || item.Name).toString().trim();
        const id = item.id ?? item.Id ?? item.value;
        if (name && id != null) {
          map.set(name.toLowerCase(), Number(id));
          const norm = name.toLowerCase().replace(/\s+/g, ' ');
          if (!map.has(norm)) map.set(norm, Number(id));
        }
      }
    };

    reg('MetalClass', liveMasters.metalClassifications, ['classificationName', 'metalClassificationName']);
    reg('Units', liveMasters.units, ['unitName', 'unit']);
    reg('LabTests', liveMasters.laboratoryTests, ['testName', 'laboratoryTestName']);
    reg('SpecimenOrient', liveMasters.specimenOrientations, ['specimenOrientationName', 'orientationName']);
    reg('DimFactor', liveMasters.dimensionalFactors, ['dimensionalFactorName', 'factorName']);
    reg('HeatTreat', liveMasters.heatTreatments, ['heatTreatmentName']);
    reg('ProdCondition', liveMasters.productConditions, ['productConditionName', 'conditionName']);
    reg('ProductSize', liveMasters.productSizes, ['sizeName', 'productSizeName']);
    reg('TestMethods', liveMasters.testMethodSpecs, ['testMethodName', 'testMethodSpecificationName']);
  }

  // 2. ONLY fallback to embedded workbook sheets if liveMasters was NOT provided at all
  if (!liveMasters) {
    const pSheet = wb.getWorksheet('Parameters');
    pSheet?.eachRow((row, i) => {
      if (i === 1) return;
      const name = (row.getCell(1).value ?? '').toString().trim();
      if (!name) return;
      const symbol = (row.getCell(6).value ?? '').toString().trim();
      const lowerName = name.toLowerCase();
      paramNames.add(lowerName);
      if (symbol) paramSymbols.add(symbol.toLowerCase());

      if (!paramMap.has(lowerName)) {
        const meta: ParamMeta = {
          id: numOrNull(row.getCell(2).value),
          name,
          section: (row.getCell(3).value ?? '').toString().trim().toLowerCase(),
          unitName: (row.getCell(4).value ?? '').toString().trim(),
          unitId: numOrNull(row.getCell(5).value),
          symbol,
          precision: Number(numOrNull(row.getCell(7).value) ?? 2),
        };
        paramMap.set(lowerName, meta);
        if (symbol && !symbolMap.has(symbol.toLowerCase())) {
          symbolMap.set(symbol.toLowerCase(), meta);
        }
      }
    });

    for (const m of MASTER_SHEETS) {
      const map = masterMap[m.sheet] || (masterMap[m.sheet] = new Map());
      wb.getWorksheet(m.sheet)?.eachRow((row, i) => {
        if (i === 1) return;
        const name = (row.getCell(1).value ?? '').toString().trim();
        if (name && !map.has(name.toLowerCase())) {
          map.set(name.toLowerCase(), numOrNull(row.getCell(2).value));
        }
      });
    }
  }

  const lookup = (sheet: string, name: string): number | null => {
    const n = (name || '').trim().toLowerCase();
    if (!n) return null;
    const map = masterMap[sheet];
    if (!map) return undefined as any;
    if (map.has(n)) return map.get(n)!;
    const norm = n.replace(/\s+/g, ' ');
    if (map.has(norm)) return map.get(norm)!;
    return undefined as any;
  };

  const resolveParameter = (rawName: string): ParamMeta | null => {
    if (!rawName) return null;
    const clean = rawName.trim().toLowerCase();
    const normalized = clean.replace(/\s+/g, ' ');

    // 1. Direct name match
    if (paramMap.has(clean)) return paramMap.get(clean)!;
    if (paramMap.has(normalized)) return paramMap.get(normalized)!;

    // 2. Alias match (e.g. "sulphur" -> "sulfur", "bhn" -> "hardness (brinell)")
    const alias = PARAM_ALIASES[clean] || PARAM_ALIASES[normalized];
    if (alias) {
      if (paramMap.has(alias)) return paramMap.get(alias)!;
      const aliasNorm = alias.replace(/\s+/g, ' ');
      if (paramMap.has(aliasNorm)) return paramMap.get(aliasNorm)!;
    }

    // 3. Symbol match (e.g. "Mo" -> Molybdenum, "C" -> Carbon)
    if (symbolMap.has(clean)) return symbolMap.get(clean)!;

    // 4. Fuzzy search across paramMap keys
    for (const [k, v] of paramMap.entries()) {
      if (k === clean || k === normalized || (v.symbol && v.symbol.toLowerCase() === clean)) {
        return v;
      }
    }

    return null;
  };

  // Dynamic header mapping with alias support (case-insensitive)
  const colIndexMap = new Map<string, number>();
  template.getRow(1).eachCell((cell, colNum) => {
    const text = (cell.value ?? '').toString().trim().toLowerCase();
    if (text) colIndexMap.set(text, colNum);
  });

  const getColIdx = (colName: string, aliases: string[] = []): number => {
    const all = [colName, ...aliases];
    for (const name of all) {
      const idx = colIndexMap.get(name.toLowerCase());
      if (idx != null) return idx;
    }
    const staticIdx = COLUMNS.indexOf(colName as any);
    return staticIdx >= 0 ? staticIdx + 1 : -1;
  };

  const out: ParsedSpecRow[] = [];

  template.eachRow((row, i) => {
    if (i === 1) return;
    const cell = (c: string, aliases: string[] = []) => {
      const colIdx = getColIdx(c, aliases);
      return colIdx > 0 ? cellStr(row.getCell(colIdx).value) : '';
    };

    const grade = cell('Grade', ['Grade Name', 'Grade card']);
    const paramName = cell('Parameter', ['Parameter Name', 'Param']);
    // Skip fully empty rows.
    if (!grade && !paramName) return;

    const messages: string[] = [];
    const missingMasters: Array<{ category: string; value: string; isRequired: boolean }> = [];
    let status: ParsedSpecRow['status'] = 'ok';
    const fail = (msg: string) => { messages.push(msg); status = 'error'; };
    const warn = (msg: string) => { messages.push(msg); if (status === 'ok') status = 'warning'; };

    // Support both 'general' and 'mechanical' seamlessly
    const sectionRaw = cell('Section').toLowerCase();
    const section: 'chemical' | 'mechanical' = (sectionRaw.startsWith('gen') || sectionRaw.startsWith('mech'))
      ? 'mechanical'
      : 'chemical';

    const pmeta = resolveParameter(paramName);
    if (!grade) fail('Grade is required.');
    if (!paramName) {
      fail('Parameter is required.');
    } else if (!pmeta || pmeta.id == null) {
      fail(`Missing Master: Parameter "${paramName}" not found in master database.`);
      missingMasters.push({ category: 'Parameter', value: paramName, isRequired: true });
    } else if (pmeta.section && sectionRaw) {
      const isParamGeneral = pmeta.section.startsWith('mech') || pmeta.section.startsWith('gen');
      const isRowGeneral = section === 'mechanical';
      if (isParamGeneral !== isRowGeneral) {
        warn(`Parameter "${paramName}" is configured as ${isParamGeneral ? 'General' : 'Chemical'} in master, but Section says "${cell('Section')}".`);
      }
    }

    // Resolve a master name → id; record missing master if unknown.
    const resolveMaster = (sheet: string, col: string, categoryLabel: string): number | null => {
      const name = cell(col);
      if (!name) return null;
      const id = lookup(sheet, name);
      if (id === undefined) {
        warn(`Missing Master: ${categoryLabel} "${name}" not found in master database.`);
        missingMasters.push({ category: categoryLabel, value: name, isRequired: false });
        return null;
      }
      return id;
    };

    const minIdx = getColIdx('Min');
    const maxIdx = getColIdx('Max');
    const minV = minIdx > 0 ? numOrNull(row.getCell(minIdx).value) : null;
    const maxV = maxIdx > 0 ? numOrNull(row.getCell(maxIdx).value) : null;
    if (minV != null && maxV != null && minV > maxV) fail(`Min (${minV}) cannot be greater than Max (${maxV}).`);

    let lowerSym = cell('Lower Limit Symbol');
    let upperSym = cell('Upper Limit Symbol');
    if (lowerSym && !LOWER_SYMBOLS.includes(lowerSym)) warn(`Lower Limit Symbol "${lowerSym}" is invalid (allowed: ${LOWER_SYMBOLS.join(' ')}).`);
    if (upperSym && !UPPER_SYMBOLS.includes(upperSym)) warn(`Upper Limit Symbol "${upperSym}" is invalid (allowed: ${UPPER_SYMBOLS.join(' ')}).`);

    const unitName = cell('Unit');
    let unitId: number | null = null;
    if (unitName) {
      unitId = lookup('Units', unitName);
      if (unitId === undefined) {
        warn(`Missing Master: Unit "${unitName}" not found in master database.`);
        missingMasters.push({ category: 'Unit', value: unitName, isRequired: false });
        unitId = pmeta?.unitId ?? null;
      }
    } else {
      unitId = pmeta?.unitId ?? null;
    }

    const tmIds = ['Test Method 1', 'Test Method 2', 'Test Method 3', 'Test Method 4', 'Test Method 5']
      .map(c => resolveMaster('TestMethods', c, 'Test Method'))
      .filter((v): v is number => v != null);

    // Formula auto-apply and validation
    let minEq = cell('Min Equation');
    let maxEq = cell('Max Equation');
    const eqFx = cell('Equation (fx)', ['Equation', 'Formula', 'Equation(fx)', 'Eq (fx)']);
    let formulaValid: boolean | undefined = undefined;

    if (eqFx && !minEq && !maxEq) {
      const val = validateSpecFormula(eqFx, paramNames, paramSymbols);
      formulaValid = val.isValid;
      if (val.isValid) {
        if (val.leadingOp === '<=' || val.leadingOp === '≤' || val.leadingOp === '<') {
          maxEq = val.formula;
        } else {
          minEq = val.formula;
        }
      } else {
        warn(`Formula "${eqFx}" for ${paramName} is invalid: ${val.error}`);
        minEq = eqFx;
      }
    } else {
      if (minEq) {
        const val = validateSpecFormula(minEq, paramNames, paramSymbols);
        if (!val.isValid) {
          warn(`Min Equation "${minEq}" is invalid: ${val.error}`);
          formulaValid = false;
        } else {
          formulaValid = true;
          if (val.formula) minEq = val.formula;
        }
      }
      if (maxEq) {
        const val = validateSpecFormula(maxEq, paramNames, paramSymbols);
        if (!val.isValid) {
          warn(`Max Equation "${maxEq}" is invalid: ${val.error}`);
          formulaValid = false;
        } else {
          if (formulaValid !== false) formulaValid = true;
          if (val.formula) maxEq = val.formula;
        }
      }
    }

    const minTolIdx = getColIdx('Min Tolerance');
    const maxTolIdx = getColIdx('Max Tolerance');
    const lowValIdx = getColIdx('Lower Limit Value');
    const upValIdx = getColIdx('Upper Limit Value');
    const unsNo = cell('UNS No', ['UNS', 'UNS Number', 'UNS No.', 'UNS Code']);

    out.push({
      rowNumber: i,
      grade,
      unsNo: unsNo || undefined,
      metalClassificationID: resolveMaster('MetalClass', 'Metal Classification', 'Metal Classification'),
      section,
      parameterID: pmeta?.id ?? null,
      parameterName: pmeta?.name || paramName,
      parameterSymbol: pmeta?.symbol ?? '',
      decimalPrecision: pmeta?.precision ?? 2,
      parameterUnitID: unitId ?? pmeta?.unitId ?? null,
      unitName: unitName || pmeta?.unitName || '',
      minValue: minV,
      maxValue: maxV,
      minTolerance: minTolIdx > 0 ? numOrNull(row.getCell(minTolIdx).value) : null,
      maxTolerance: maxTolIdx > 0 ? numOrNull(row.getCell(maxTolIdx).value) : null,
      lowerLimitValue: lowerSym,
      lowerLimitDecimalValue: lowValIdx > 0 ? numOrNull(row.getCell(lowValIdx).value) : null,
      upperLimitValue: upperSym,
      upperLimitDecimalValue: upValIdx > 0 ? numOrNull(row.getCell(upValIdx).value) : null,
      minEquation: minEq,
      maxEquation: maxEq,
      equationFx: eqFx || (minEq ? `${lowerSym || '≥'} ${minEq}` : (maxEq ? `${upperSym || '≤'} ${maxEq}` : undefined)),
      formulaValid,
      notes: cell('Note'),
      specimenOrientationID: resolveMaster('SpecimenOrient', 'Specimen Orientation', 'Specimen Orientation'),
      dimensionalFactorID: resolveMaster('DimFactor', 'Dimensional Factor', 'Dimensional Factor'),
      heatTreatmentID: resolveMaster('HeatTreat', 'Heat Treatment', 'Heat Treatment'),
      productConditionID1: resolveMaster('ProdCondition', 'Product Condition 1', 'Product Condition'),
      productConditionID2: resolveMaster('ProdCondition', 'Product Condition 2', 'Product Condition'),
      productSizeMasterID: resolveMaster('ProductSize', 'Product Size', 'Product Size'),
      testCondition: cell('Test Condition'),
      testNote: cell('Test Note'),
      laboratoryTestID: resolveMaster('LabTests', 'Laboratory Test', 'Laboratory Test'),
      testMethodSpecIDs: tmIds,
      status,
      messages,
      missingMasters: missingMasters.length > 0 ? missingMasters : undefined,
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

