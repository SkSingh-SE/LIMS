import { ExecutionSection, LAYOUT_CONFIG_VERSION, LayoutConfigPayload } from '../../models/test-layout-config.model';

/** Legacy / shorthand section type keys → canonical studio type keys (see LAYOUT_STUDIO_CONFIG_MATRIX.md §1). */
export const SECTION_TYPE_ALIASES: Record<string, string> = {
  spm: 'specimen',
  param: 'parameter',
  rem: 'narrative',
  remarks: 'narrative',
  note: 'narrative',
  loc: 'location',
  attrs: 'custom',
  decision: 'rule',
  class: 'classification',
  hdr: 'traceability',
  cond: 'condition',
  calc: 'formula',
  chk: 'checklist',
  graph: 'chart',
  sig: 'sign',
};

/** Keys that only hold Studio UI state or dead legacy keys; never persisted. */
const UI_STATE_KEYS = [
  'activeBindingTab',
  'activeCellCoords',
  'activePhotoTab',
  'conditionPreset',
  'traceabilityPreset',
  'highResPrint',
  'customRows'
];

/**
 * Settings the studio no longer offers (2026-11 config audit): nothing reads them, or another key says the same.
 * Dropped on load and on save, so old layouts shed them the next time they are saved.
 */
const RETIRED_KEYS = [
  // a section is either in the layout or not; the technician hides it on the result screen
  'enabled', 'sectionStatus', 'isOptional',
  // report group: only `reportable` and `printTitle` remain
  'printCertificate', 'reportLabel', 'pageBreak', 'density', 'keepHeader', 'showLabels', 'highlightStatus', 'showRaw',
  'showMUReport', 'showConformity', 'showEquipment', 'showScopeMark', 'reportProjection', 'alignment',
  // binding lives on each row / column
  'dataBindingMode',
  // duplicates (migrated in normalizeSection)
  'showConformanceVerdict', 'showAreaCol', 'showOrientationCol',
  // controls removed from the section panels: nothing reads these
  'stepMode', 'cutoffMode', 'xSource', 'ySource', 'showCriteria', 'allowedFormats', 'watermarkReport', 'showMU', 'derivedOnly',
  'specimenSource', 'gaugeLength', 'countMode', 'editable',
  'readingSource', 'locationSource', 'formulaSource', 'observedSource', 'dataSource',
  // parameter section: decimals come from the parameter master, requirement / status are column switches
  'decimals', 'resultMode', 'requirement', 'status',
  // rule section: replaced by verdictSource (preserve failAction & Studio decisionRulePolicy / showParameterEvaluationTable / defaultStatementText)
  'evaluation', 'valueSource', 'operator', 'parameter', 'decisionRule',
  // L3 duplicate keys (2026-11 config audit §4)
  'locationNames', 'showPreText', 'showPostText', 'spotCount', 'readingCount', 'targetParameter', 'customColumns', 'rows'
];

/** 'manual' meant the same as 'runtime' on the result screen: one value, "Entry". */
function normalizeBinding(item: any): void {
  if (item && item.bindingMode === 'manual') item.bindingMode = 'runtime';
}

export function normalizeSectionType(type: string | null | undefined): string {
  const t = (type || '').trim().toLowerCase();
  return SECTION_TYPE_ALIASES[t] || t;
}

function parseRaw(raw: unknown): any {
  if (raw == null) return null;
  if (typeof raw === 'string') {
    const s = raw.trim();
    if (!s) return null;
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  }
  return typeof raw === 'object' ? raw : null;
}

function normalizeSection(sec: any, index: number): ExecutionSection {
  const type = normalizeSectionType(sec?.type);
  const config = sec?.config && typeof sec.config === 'object' ? { ...sec.config } : {};
  const id = typeof sec?.id === 'number' ? sec.id : Number(sec?.id) || Date.now() + index;
  const title = sec?.title || config.reportLabel || type || 'Section';
  if (!config.sectionKey) {
    const clean = String(title).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    config.sectionKey = `${clean || 'section'}_${id}`;
  }

  // Retired / duplicate keys (2026-11 config audit)
  if (config.showConformanceVerdict !== undefined && config.showStatus === undefined) {
    config.showStatus = !!config.showConformanceVerdict;
  }
  if (config.width !== 'Half Width') config.width = 'Full Width';
  if (Array.isArray(config.tableRows)) config.tableRows.forEach(normalizeBinding);
  if (Array.isArray(config.tableColumns)) config.tableColumns.forEach(normalizeBinding);
  if (Array.isArray(config.cellMatrix)) {
    config.cellMatrix.forEach((row: any) => Array.isArray(row) && row.forEach(normalizeBinding));
  }

  // Normalize legacy shorthand / duplicate aliases (see LAYOUT_STUDIO_CONFIG_MATRIX.md §3)
  if (config.showAreaCol !== undefined && config.showAreaCalculation === undefined) {
    config.showAreaCalculation = !!config.showAreaCol;
  }
  if (config.showOrientationCol !== undefined && config.showOrientationColumn === undefined) {
    config.showOrientationColumn = !!config.showOrientationCol;
  }
  // Note: `showConformity` (Report: print conformity statement) and `conformity` (Rule: evaluate conformity)
  // are different settings and must never be mapped onto each other.

  // L3.1: Location names live only in locationRows
  if (type === 'location' || type === 'loc') {
    if (!Array.isArray(config.locationRows) || config.locationRows.length === 0) {
      if (typeof config.locationNames === 'string' && config.locationNames.trim()) {
        config.locationRows = config.locationNames.split(',').map((s: string) => s.trim()).filter(Boolean);
      } else if (Array.isArray(config.tableRows) && config.tableRows.length > 0) {
        config.locationRows = config.tableRows
          .filter((r: any) => r?.visible !== false)
          .map((r: any) => String(r?.label ?? '').trim())
          .filter(Boolean);
      }
    }
  }

  // L3.2: Photo text — showPreText / showPostText removed; empty text = hidden
  if (type === 'photo') {
    if (config.showPreText === false) config.preText = '';
    if (config.showPostText === false) config.postText = '';
  }

  // L3.3: Reading — spotCount, readingCount (string), targetParameter → count / targetParamName
  if (type === 'reading') {
    if (config.count === undefined || config.count === null) {
      const fromSpot = Number(config.spotCount);
      const fromReading = parseInt(String(config.readingCount ?? ''), 10);
      if (!isNaN(fromSpot) && fromSpot > 0) {
        config.count = fromSpot;
      } else if (!isNaN(fromReading) && fromReading > 0) {
        config.count = fromReading;
      }
    }
    if (!config.targetParamName && typeof config.targetParameter === 'string' && config.targetParameter.trim()) {
      config.targetParamName = config.targetParameter.trim();
    }
  }

  // L3.4: Custom — locationColHeader → rowHeaderLabel; customColumns → tableColumns; rows (CSV) → tableRows
  if (type === 'custom' || type === 'attrs') {
    if (config.locationColHeader && !config.rowHeaderLabel) {
      config.rowHeaderLabel = config.locationColHeader;
    }
    delete config.locationColHeader;

    if (Array.isArray(config.customColumns) && (!Array.isArray(config.tableColumns) || config.tableColumns.length === 0)) {
      config.tableColumns = config.customColumns.map((c: any, idx: number) => ({
        key: `col_${idx}`,
        label: typeof c === 'string' ? c : (c?.label || `Column ${idx + 1}`),
        bindingMode: (c?.type === 'static' || c?.bindingMode === 'static') ? 'static' : 'runtime',
        visible: true,
        unit: typeof c === 'object' ? c?.unit : undefined,
        staticValue: typeof c === 'object' ? (c?.default ?? c?.staticValue) : undefined
      }));
    }

    if (typeof config.rows === 'string' && config.rows.trim() && (!Array.isArray(config.tableRows) || config.tableRows.length === 0)) {
      const rowLabels = config.rows.split(',').map((r: string) => r.trim()).filter(Boolean);
      if (rowLabels.length) {
        config.tableRows = rowLabels.map((lbl: string, idx: number) => ({
          key: `r${idx}`,
          label: lbl,
          visible: true,
          bindingMode: 'runtime'
        }));
      }
    }
  }

  // L3.5: Classification — rows (CSV) → tableRows
  if (type === 'classification' || type === 'class') {
    if (typeof config.rows === 'string' && config.rows.trim() && (!Array.isArray(config.tableRows) || config.tableRows.length === 0)) {
      const rowLabels = config.rows.split(',').map((r: string) => r.trim()).filter(Boolean);
      if (rowLabels.length) {
        config.tableRows = rowLabels.map((lbl: string, idx: number) => ({
          key: `class_${idx}`,
          label: lbl,
          visible: true,
          bindingMode: 'runtime'
        }));
      }
    }
  }

  RETIRED_KEYS.forEach(k => delete config[k]);

  return { ...sec, id, type, title, config };
}

/**
 * Parse + normalize a stored layout config (TestLayoutTemplate.LayoutConfigJson or a saved snapshot).
 * Accepts a JSON string or an object. Always returns a payload with a `sections` array.
 * Also unwraps snapshot shapes `{ layoutConfigJson: "..." }` and `{ parsedConfig: {...} }`.
 */
export function normalizeLayoutConfig(raw: unknown): LayoutConfigPayload {
  let obj = parseRaw(raw);
  if (obj && typeof obj.layoutConfigJson === 'string' && !Array.isArray(obj.sections)) {
    obj = parseRaw(obj.layoutConfigJson) || obj;
  } else if (obj && obj.parsedConfig && !Array.isArray(obj.sections)) {
    obj = obj.parsedConfig;
  }
  if (!obj || typeof obj !== 'object') {
    return { configVersion: LAYOUT_CONFIG_VERSION, sections: [] };
  }
  // A section an old layout had switched off ("Enable Section" unticked) was never shown: it is left out.
  const sections = Array.isArray(obj.sections)
    ? obj.sections.filter((s: any) => s?.config?.enabled !== false).map((s: any, i: number) => normalizeSection(s, i))
    : [];
  return { ...obj, configVersion: obj.configVersion || LAYOUT_CONFIG_VERSION, sections };
}

/** Serialize a layout config for saving: strips Studio UI-state keys and stamps configVersion. */
export function serializeLayoutConfig(payload: LayoutConfigPayload): string {
  const sections = (payload.sections || []).map(sec => {
    const config: any = { ...(sec.config || {}) };
    UI_STATE_KEYS.forEach(k => delete config[k]);
    RETIRED_KEYS.forEach(k => delete config[k]);
    const normType = normalizeSectionType(sec.type);
    if (normType === 'custom' || normType === 'attrs') {
      delete config.locationColHeader;
    }
    return { ...sec, type: normType, config };
  });
  return JSON.stringify({ ...payload, configVersion: LAYOUT_CONFIG_VERSION, sections });
}
