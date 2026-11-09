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
  if (config.enabled === undefined) config.enabled = true;

  // Normalize legacy shorthand / duplicate aliases (see LAYOUT_STUDIO_CONFIG_MATRIX.md §3)
  if (config.showAreaCol !== undefined && config.showAreaCalculation === undefined) {
    config.showAreaCalculation = !!config.showAreaCol;
  }
  if (config.showOrientationCol !== undefined && config.showOrientationColumn === undefined) {
    config.showOrientationColumn = !!config.showOrientationCol;
  }
  // Note: `showConformity` (Report: print conformity statement) and `conformity` (Rule: evaluate conformity)
  // are different settings and must never be mapped onto each other.

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
  const sections = Array.isArray(obj.sections) ? obj.sections.map((s: any, i: number) => normalizeSection(s, i)) : [];
  return { ...obj, configVersion: obj.configVersion || LAYOUT_CONFIG_VERSION, sections };
}

/** Serialize a layout config for saving: strips Studio UI-state keys and stamps configVersion. */
export function serializeLayoutConfig(payload: LayoutConfigPayload): string {
  const sections = (payload.sections || []).map(sec => {
    const config: any = { ...(sec.config || {}) };
    UI_STATE_KEYS.forEach(k => delete config[k]);
    return { ...sec, type: normalizeSectionType(sec.type), config };
  });
  return JSON.stringify({ ...payload, configVersion: LAYOUT_CONFIG_VERSION, sections });
}
