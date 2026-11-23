import { normalizeLayoutConfig } from '../../../utility/helper/test-layout-config.helper';

export interface LayoutGapCheckOptions {
  sections?: any[];
  executionExtra?: any;
  checklist?: any[];
  testImages?: any[];
}

/**
 * Normalizes an execution extra payload (JSON string or object) into a safe object.
 */
export function parseExecutionExtra(raw: any): Record<string, any> {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }
  return typeof raw === 'object' ? raw : {};
}

/**
 * Normalizes raw sections or a layout object into canonical layout sections.
 */
export function extractCanonicalSections(layoutOrSections: any): any[] {
  if (!layoutOrSections) return [];
  const raw: any[] = Array.isArray(layoutOrSections)
    ? layoutOrSections
    : Array.isArray(layoutOrSections.sections)
      ? layoutOrSections.sections
      : Array.isArray(layoutOrSections.parsedConfig?.sections)
        ? layoutOrSections.parsedConfig.sections
        : [];
  return normalizeLayoutConfig({ sections: raw }).sections.filter((s: any) => s?.config?.enabled !== false);
}

function normKey(v: any): string {
  return String(v ?? '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function isWitnessSection(s: any): boolean {
  return String(s?.config?.sectionKey || '').toLowerCase() === 'witness'
    || /witness/i.test(String(s?.title || s?.config?.label || ''));
}

function isPrimaryNarrative(s: any, sections: any[]): boolean {
  const first = sections.find(x =>
    ['narrative', 'rem'].includes(String(x?.type || '').toLowerCase()) && !isWitnessSection(x)
  );
  return first === s;
}

function narrativeKey(s: any, sections: any[]): string {
  return String(s?.config?.sectionKey || `narrative-${sections.indexOf(s)}`);
}

function narrativeValue(s: any, sections: any[], extra: any): string {
  const key = narrativeKey(s, sections);
  const narratives = extra?.['narratives'] || {};
  const saved = narratives[key];
  return saved !== undefined ? String(saved) : String(s?.config?.defaultText ?? s?.config?.extraFields ?? '');
}

/**
 * Computes required items missing from layout execution (narratives, conditions, checklist answers).
 */
export function layoutRequiredGaps(
  layoutOrSections: any,
  executionExtra: any,
  checklist?: any[]
): string[] {
  const sections = extractCanonicalSections(layoutOrSections);
  const extra: any = parseExecutionExtra(executionExtra);
  const gaps: string[] = [];

  for (const s of sections) {
    const c = s?.config || {};

    // 1. Narrative gaps (skip primary test narrative and witness sections)
    if (s.type === 'narrative' && !isPrimaryNarrative(s, sections)) {
      if (c.required === true && !narrativeValue(s, sections, extra).trim()) {
        gaps.push(String(c.label || s.title || 'Note'));
      }
    }

    // 2. Condition gaps
    if (s.type === 'condition' && c.required === true) {
      const cfgList = Array.isArray(c.fields) ? c.fields : [];
      const cfgFields: string[] = cfgList
        .map((f: any) => String(typeof f === 'string' ? f : f?.label ?? f?.name ?? '').trim())
        .filter(Boolean);

      const secKey = String(c.sectionKey || 'cond');
      const conditionFieldsMap = extra?.['conditionFields'] || {};
      const extraRuntime: string[] = (conditionFieldsMap[secKey] || []).filter((f: string) => !cfgFields.includes(f));
      const allFields: string[] = extraRuntime.length ? [...cfgFields, ...extraRuntime] : cfgFields;

      const condVals: Record<string, any> = extra?.['conditionValues'] || {};
      allFields
        .filter((f: string) => String(condVals[f] ?? '').trim() === '')
        .forEach((f: string) => gaps.push(f));
    }

    // 3. Checklist gaps (require all items answered)
    if (s.type === 'checklist' && c.requireAll === true) {
      let items: any[] = [];
      if (Array.isArray(checklist) && checklist.length > 0) {
        items = checklist;
      } else if (Array.isArray(c.tableRows) && c.tableRows.length > 0) {
        items = c.tableRows.filter((r: any) => r?.visible !== false).map((r: any, idx: number) => ({
          id: idx + 1,
          label: r.label,
          status: ''
        }));
      } else if (typeof c.items === 'string' && c.items.trim()) {
        items = c.items.split(',').map((x: string) => x.trim()).filter(Boolean).map((label: string, idx: number) => ({
          id: idx + 1,
          label,
          status: ''
        }));
      }

      if (items.length > 0 && items.some(i => !i?.status)) {
        gaps.push(`${s.title || 'Checklist'}: every item needs an answer`);
      }
    }
  }

  return gaps;
}

/**
 * Computes required photos missing before verification can be submitted.
 */
export function layoutPhotoGaps(layoutOrSections: any, testImages?: any[]): string[] {
  const sections = extractCanonicalSections(layoutOrSections);
  const gaps: string[] = [];
  const images = [...(testImages || [])];

  for (const s of sections) {
    if (s.type !== 'photo' || s?.config?.requirePhotoToVerify !== true) continue;

    const slots: any[] = Array.isArray(s?.config?.photoSlots)
      ? s.config.photoSlots.filter((x: any) => !!x)
      : [];

    const captionOf = (img: any) => normKey(img?.caption ?? img?.description ?? '');
    const named = new Map<any, any>();
    for (const slot of slots) {
      const want = normKey(slot.title);
      const at = want ? images.findIndex(img => captionOf(img) === want) : -1;
      if (at >= 0) named.set(slot, images.splice(at, 1)[0]);
    }

    for (const slot of slots) {
      const own = String(slot.imageUrl ?? slot.mockUrl ?? '').trim();
      const fixed = slot.bindingSource === 'static' && !!own;
      const img = fixed ? null : (named.get(slot) ?? images.shift());
      const required = slot.mandatory === true && !fixed && !img;
      if (required) {
        gaps.push(String(slot.title ?? '').trim() || 'Photo');
      }
    }
  }

  return gaps;
}

/**
 * Convenience wrapper returning required and photo gaps together.
 */
export function checkLayoutGaps(options: LayoutGapCheckOptions): {
  requiredGaps: string[];
  photoGaps: string[];
  allGaps: string[];
} {
  const req = layoutRequiredGaps(options.sections, options.executionExtra, options.checklist);
  const photo = layoutPhotoGaps(options.sections, options.testImages);
  return {
    requiredGaps: req,
    photoGaps: photo,
    allGaps: [...req, ...photo]
  };
}
