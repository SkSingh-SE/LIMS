import { AbstractControl, FormArray, FormGroup } from '@angular/forms';

/**
 * Specimen identity for result parameter rows.
 *
 * Every row carries its own specimen index (0 = S1, 1 = S2, ...), saved in TestResultParameters.SpecimenIndex.
 * Rows are grouped by that index, never by their position, so rows that do not repeat for every specimen
 * (a second "Elongation", "Location of Fracture", a parameter added to one specimen only) stay in their specimen.
 *
 * Rows saved before the column existed have no index (null). For those the old layout is read back once:
 * when the rows are exact copies of one block (S1 block, S2 block, ...) they are split into those specimens,
 * otherwise all of them belong to S1. No row is ever dropped.
 */

export interface SpecimenRowLike {
  id?: number | string | null;
  parameterID?: number | string | null;
  parameterName?: string | null;
  specimenIndex?: number | string | null;
  value?: unknown;
  remarks?: unknown;
  textValue?: unknown;
  convertedValue?: unknown;
  [key: string]: any;
}

function hasExplicitIndex(row: SpecimenRowLike): boolean {
  const v = row?.specimenIndex;
  return v !== null && v !== undefined && v !== '' && !isNaN(Number(v));
}

function toIndex(v: unknown): number {
  const n = Math.floor(Number(v));
  return isNaN(n) || n < 0 ? 0 : n;
}

function rowKey(row: SpecimenRowLike): string {
  return `${row?.parameterID ?? ''}|${(row?.parameterName || '').trim().toLowerCase()}`;
}

/** True when at least one row has a saved specimen index (rows saved after the column was added). */
export function hasSavedSpecimenIndexes(rows: ReadonlyArray<SpecimenRowLike>): boolean {
  return (rows || []).some(hasExplicitIndex);
}

/**
 * Block size of rows saved without a specimen index: the smallest size (2 or more) where the rows are
 * whole copies of the first block. 0 when the rows are not such copies.
 */
export function legacyBlockSize(rows: ReadonlyArray<SpecimenRowLike>): number {
  const n = rows?.length || 0;
  const keys = (rows || []).map(rowKey);
  for (let size = 2; size <= n / 2; size++) {
    if (n % size !== 0) continue;
    let same = true;
    for (let i = size; i < n && same; i++) {
      if (keys[i] !== keys[i % size]) same = false;
    }
    if (same) return size;
  }
  return 0;
}

/**
 * Specimen index of every row, in row order.
 * Saved index wins; a row without one (added by another screen) goes to S1.
 * When no row has a saved index, the old block layout is used (see legacyBlockSize), else everything is S1.
 */
export function resolveSpecimenIndexes(rows: ReadonlyArray<SpecimenRowLike>): number[] {
  const list = rows || [];
  if (hasSavedSpecimenIndexes(list)) {
    return list.map(r => (hasExplicitIndex(r) ? toIndex(r.specimenIndex) : 0));
  }
  const size = legacyBlockSize(list);
  return list.map((_, i) => (size > 0 ? Math.floor(i / size) : 0));
}

/**
 * Number of specimens to show.
 * With saved indexes: highest saved index + 1 (the saved count). Without: the fallback count (default 1), but never fewer
 * than the specimens the rows already hold.
 */
export function resolveSpecimenCount(rows: ReadonlyArray<SpecimenRowLike>, fallback: number = 1): number {
  const list = rows || [];
  const indexes = resolveSpecimenIndexes(list);
  const maxIdx = indexes.length ? Math.max(...indexes) : -1;
  if (hasSavedSpecimenIndexes(list)) return Math.max(1, maxIdx + 1);
  return Math.max(1, Math.floor(Number(fallback) || 1), maxIdx + 1);
}

/** Row positions of one specimen, in row order. */
export function rowsOfSpecimen(indexes: ReadonlyArray<number>, specimen: number): number[] {
  const out: number[] = [];
  indexes.forEach((s, i) => {
    if (s === specimen) out.push(i);
  });
  return out;
}

/** All row positions ordered by specimen (S1 rows first), keeping row order inside a specimen. */
export function rowsOrderedBySpecimen(indexes: ReadonlyArray<number>): number[] {
  return indexes
    .map((s, i) => ({ s, i }))
    .sort((a, b) => a.s - b.s || a.i - b.i)
    .map(x => x.i);
}

/**
 * The row of `specimen` that matches row `baseRow` of S1: same parameter, same occurrence number
 * (the 2nd "Elongation" of S1 matches the 2nd "Elongation" of S2). -1 when that specimen has no such row.
 */
export function matchingRowInSpecimen(
  rows: ReadonlyArray<SpecimenRowLike>,
  indexes: ReadonlyArray<number>,
  baseRow: number,
  specimen: number
): number {
  const base = rows[baseRow];
  if (!base) return -1;
  const key = rowKey(base);
  const baseSpecimen = indexes[baseRow];
  let occurrence = 0;
  for (const r of rowsOfSpecimen(indexes, baseSpecimen)) {
    if (r === baseRow) break;
    if (rowKey(rows[r]) === key) occurrence++;
  }
  let seen = 0;
  for (const r of rowsOfSpecimen(indexes, specimen)) {
    if (rowKey(rows[r]) !== key) continue;
    if (seen === occurrence) return r;
    seen++;
  }
  return -1;
}

/** True when a row holds a result (value, remarks, converted value, or text value) that must not be thrown away. */
export function rowHasResult(row: { value?: unknown; remarks?: unknown; textValue?: unknown; convertedValue?: unknown } | null | undefined): boolean {
  if (!row) return false;
  const v = (row as any).value;
  const hasValue = v !== null && v !== undefined && String(v).trim() !== '';
  const r = (row as any).remarks;
  const hasRemarks = r !== null && r !== undefined && String(r).trim() !== '';
  const tv = (row as any).textValue;
  const hasTv = tv !== null && tv !== undefined && String(tv).trim() !== '';
  const cv = (row as any).convertedValue;
  const hasCv = cv !== null && cv !== undefined && String(cv).trim() !== '';
  return hasValue || hasRemarks || hasTv || hasCv;
}

export interface SpecimenActivityContext {
  readings?: ReadonlyArray<{ specimenIndex?: unknown; specimenCode?: unknown; value?: unknown; readingValue?: unknown }> | null;
  readingValues?: Record<string, (number | null)[]> | null;
  testImages?: ReadonlyArray<any> | null;
}

/**
 * Checks whether a layout configuration or saved snapshot has a specimen-matrix section.
 */
export function layoutHasSpecimenSection(layoutOrSnapshot: any): boolean {
  if (!layoutOrSnapshot) return false;
  let parsed = layoutOrSnapshot;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return false;
    }
  }
  if (parsed.layoutConfigJson) {
    try {
      parsed = JSON.parse(parsed.layoutConfigJson);
    } catch {}
  } else if (parsed.parsedConfig) {
    parsed = parsed.parsedConfig;
  }
  const sections = Array.isArray(parsed?.sections) ? parsed.sections : (Array.isArray(parsed) ? parsed : []);
  return sections.some((s: any) => {
    const t = String(s?.type || '').toLowerCase();
    return t === 'specimen' || t === 'spm';
  });
}

/**
 * Declared specimen count configured on the layout's specimen section, or 0 when none.
 */
export function layoutDeclaredSpecimenCount(layoutOrSnapshot: any): number {
  if (!layoutOrSnapshot) return 0;
  let parsed = layoutOrSnapshot;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return 0;
    }
  }
  if (parsed.layoutConfigJson) {
    try {
      parsed = JSON.parse(parsed.layoutConfigJson);
    } catch {}
  } else if (parsed.parsedConfig) {
    parsed = parsed.parsedConfig;
  }
  const sections = Array.isArray(parsed?.sections) ? parsed.sections : (Array.isArray(parsed) ? parsed : []);
  const spm = sections.find((s: any) => {
    const t = String(s?.type || '').toLowerCase();
    return t === 'specimen' || t === 'spm';
  });
  if (!spm?.config) return 0;
  const named = Array.isArray(spm.config.specimenRows)
    ? spm.config.specimenRows.filter((n: any) => String(n ?? '').trim() !== '').length
    : 0;
  return Math.min(20, named || Number(spm.config.count) || 0);
}

/**
 * Whether a specimen (by index 0 = S1, 1 = S2, ...) has recorded results (parameter value, reading, or photo).
 * Specimen 0 (S1) is always treated as having data.
 */
export function specimenHasData(
  specimenIdx: number,
  rows: ReadonlyArray<any>,
  context?: SpecimenActivityContext | null
): boolean {
  if (specimenIdx === 0) return true; // S1 is always kept
  const indexes = resolveSpecimenIndexes(rows);
  const myRowIndexes = rowsOfSpecimen(indexes, specimenIdx);
  for (const r of myRowIndexes) {
    if (rowHasResult(rows[r])) return true;
  }
  if (context?.readings?.length) {
    const sCode = `s${specimenIdx + 1}`;
    const hasReading = context.readings.some(rd => {
      const idx = rd.specimenIndex != null ? Number(rd.specimenIndex) : null;
      const code = String(rd.specimenCode || '').trim().toLowerCase();
      const val = rd.value ?? rd.readingValue;
      const hasVal = val !== null && val !== undefined && String(val).trim() !== '';
      return (idx === specimenIdx || code === sCode) && hasVal;
    });
    if (hasReading) return true;
  }
  if (context?.readingValues) {
    const sCode = `S${specimenIdx + 1}`;
    for (const key of Object.keys(context.readingValues)) {
      const sep = key.lastIndexOf('|');
      const suffix = sep >= 0 ? key.slice(sep + 1) : '';
      if (suffix === sCode) {
        const vals = context.readingValues[key] || [];
        if (vals.some(v => v !== null && v !== undefined && String(v).trim() !== '')) {
          return true;
        }
      }
    }
  }
  if (context?.testImages?.length) {
    const sCode = `s${specimenIdx + 1}`;
    const hasPhoto = context.testImages.some(img => {
      const idx = img.specimenIndex != null ? Number(img.specimenIndex) : null;
      const code = String(img.specimenCode || img.specimen || '').trim().toLowerCase();
      const cap = String(img.caption || img.title || img.name || '').toLowerCase();
      return idx === specimenIdx || code === sCode || cap.includes(sCode);
    });
    if (hasPhoto) return true;
  }
  return false;
}

/**
 * On layouts without a specimen section, filters out extra specimen rows (specimenIndex > 0)
 * that have no value, no reading, and no photo.
 */
export function filterEmptyExtraSpecimenRows<T extends SpecimenRowLike>(
  rows: ReadonlyArray<T>,
  hasSpecimenSection: boolean,
  context?: SpecimenActivityContext | null
): T[] {
  if (hasSpecimenSection) return [...(rows || [])];
  const list = rows || [];
  const indexes = resolveSpecimenIndexes(list);
  return list.filter((r, i) => {
    const s = indexes[i];
    if (s === 0) return true;
    return specimenHasData(s, list, context);
  });
}

// ---------------------------------------------------------------------------
// Form helpers (parameters FormArray of the result screen)
// ---------------------------------------------------------------------------

/**
 * Where the screen keeps rows taken out of the table: saved IDs to delete on the next save, and the removed
 * (empty) row controls so a later "add specimen" brings the same saved rows back instead of new copies.
 * Lives on the test object, so the result screen and the layout table share it.
 */
export interface SpecimenRowStore {
  removedParameterIds?: number[];
  removedSpecimenRows?: AbstractControl[][];
  /**
   * IDs of saved rows whose value or remarks are stored in the database (as last loaded or saved).
   * A row cleared on the screen but not saved yet still holds its value there, and the save refuses to delete it.
   */
  savedResultIds?: number[];
  /** Saved rows the user confirmed to remove although they hold a result; sent with the save so the API deletes them. */
  discardedParameterIds?: number[];
}

/** Why a row cannot be removed: it shows a value or remark, or its value is cleared but still saved. */
export type RowRemovalReason = 'value' | 'saved';

export interface RowRemovalBlock {
  name: string;
  reason: RowRemovalReason;
}

/** IDs of rows (as loaded from the API) that hold a value or remark. */
export function savedResultIdsOf(rows: ReadonlyArray<SpecimenRowLike> | null | undefined): number[] {
  return (rows || []).filter(r => Number(r?.id) > 0 && rowHasResult(r)).map(r => Number(r.id));
}

/**
 * After a successful save: `sentRows` are the rows sent (payload order), `returnedIds` the IDs the save gave back in
 * the same order, `removedIds` the rows deleted by that save.
 */
export function updateSavedResultIds(
  store: SpecimenRowStore,
  sentRows: Array<{ id?: unknown; value?: unknown; remarks?: unknown }>,
  returnedIds: unknown[],
  removedIds: number[] = []
): void {
  const ids = new Set<number>(store.savedResultIds || []);
  (sentRows || []).forEach((r, i) => {
    const id = Number(r?.id) > 0 ? Number(r.id) : Number(returnedIds?.[i]) || 0;
    if (id <= 0) return;
    if (rowHasResult(r)) ids.add(id);
    else ids.delete(id);
  });
  removedIds.forEach(id => ids.delete(id));
  store.savedResultIds = [...ids];
}

/** Null when the row may be removed; otherwise whether it shows a value or still has a saved one. */
export function rowRemovalReason(row: any, store: SpecimenRowStore): RowRemovalReason | null {
  if (rowHasResult(row)) return 'value';
  const id = Number(row?.id) || 0;
  if (id > 0 && (store.savedResultIds || []).includes(id)) return 'saved';
  return null;
}

/** Plain message for a row that cannot be removed. */
export function rowRemovalMessage(block: RowRemovalBlock): string {
  return block.reason === 'value'
    ? `"${block.name}" has a value. Clear the value first, then remove the row.`
    : `"${block.name}" still has a saved value. Click Save Draft to save the cleared value, then remove the row.`;
}

/** Plain message for a specimen that cannot be removed. */
export function specimenRemovalMessage(specimenLabel: string, block: RowRemovalBlock): string {
  return block.reason === 'value'
    ? `Specimen ${specimenLabel} has results (${block.name}). Clear its values first, then remove the specimen.`
    : `Specimen ${specimenLabel} still has saved results (${block.name}). Click Save Draft to save the cleared values, then remove the specimen.`;
}

function rowValue(ctrl: AbstractControl | null | undefined): any {
  if (!ctrl) return null;
  const g = ctrl as FormGroup;
  return typeof g.getRawValue === 'function' ? g.getRawValue() : ctrl.value;
}

/** Specimen index of every form row, in row order. */
export function specimenIndexesOf(fa: FormArray | null | undefined): number[] {
  if (!fa) return [];
  return fa.controls.map(c => toIndex(c.get('specimenIndex')?.value));
}

/** Raw values of every form row (disabled rows included), in row order. */
export function rowValuesOf(fa: FormArray | null | undefined): any[] {
  if (!fa) return [];
  return fa.controls.map(rowValue);
}

/** Position after the last row of `specimen` (or of the closest lower specimen), where a new row of it goes. */
export function insertPositionForSpecimen(fa: FormArray, specimen: number): number {
  const indexes = specimenIndexesOf(fa);
  let pos = -1;
  indexes.forEach((s, i) => {
    if (s <= specimen) pos = i;
  });
  return pos + 1;
}

/**
 * Gives `specimen` its rows when it has none: first the rows removed earlier (saved rows come back with their IDs),
 * otherwise copies of the S1 rows made by `cloneRow`. A specimen that already has rows is left as it is.
 */
export function addSpecimenRows(
  fa: FormArray,
  specimen: number,
  store: SpecimenRowStore,
  cloneRow: (source: any, specimen: number) => AbstractControl
): void {
  if (!fa) return;
  if (rowsOfSpecimen(specimenIndexesOf(fa), specimen).length > 0) return;

  const stashed = store.removedSpecimenRows?.pop();
  if (stashed && stashed.length > 0) {
    const ids = new Set<number>();
    stashed.forEach(ctrl => {
      ctrl.get('specimenIndex')?.setValue(specimen, { emitEvent: false });
      const id = Number(ctrl.get('id')?.value) || 0;
      if (id > 0) ids.add(id);
      fa.insert(insertPositionForSpecimen(fa, specimen), ctrl);
    });
    if (store.removedParameterIds?.length) {
      store.removedParameterIds = store.removedParameterIds.filter(id => !ids.has(id));
    }
    return;
  }

  const indexes = specimenIndexesOf(fa);
  const sourceSpecimen = indexes.length ? Math.min(...indexes) : 0;
  const sources = rowsOfSpecimen(indexes, sourceSpecimen).map(r => rowValue(fa.at(r)));
  sources.forEach(src => fa.insert(insertPositionForSpecimen(fa, specimen), cloneRow(src, specimen)));
}

/**
 * Takes the rows of `specimen` out of the form when none of them holds a result. Saved IDs are queued for
 * deletion on the next save and the controls are kept for a later add. Specimens after it move down by one.
 * Returns the first row that blocks the removal (a value on screen, or a cleared value not saved yet; nothing is
 * removed then), or null when removed.
 */
export function removeSpecimenRows(fa: FormArray, specimen: number, store: SpecimenRowStore): RowRemovalBlock | null {
  if (!fa) return null;
  const rows = rowsOfSpecimen(specimenIndexesOf(fa), specimen);
  for (const r of rows) {
    const value = rowValue(fa.at(r));
    const reason = rowRemovalReason(value, store);
    if (reason) return { name: value?.parameterName || `Row ${r + 1}`, reason };
  }

  const removed: AbstractControl[] = rows.map(r => fa.at(r));
  for (let i = rows.length - 1; i >= 0; i--) fa.removeAt(rows[i]);

  const ids = removed.map(c => Number(c.get('id')?.value) || 0).filter(id => id > 0);
  if (ids.length) store.removedParameterIds = [...(store.removedParameterIds || []), ...ids];
  if (removed.length) store.removedSpecimenRows = [...(store.removedSpecimenRows || []), removed];

  fa.controls.forEach(c => {
    const ctrl = c.get('specimenIndex');
    const s = toIndex(ctrl?.value);
    if (ctrl && s > specimen) ctrl.setValue(s - 1, { emitEvent: false });
  });
  return null;
}

/**
 * Takes one parameter out of every specimen: the given rows (the same parameter in S1, S2, ...) are removed only when
 * none of them holds a result. Saved IDs are queued for deletion on the next save. Returns the first row that blocks
 * the removal (nothing is removed then), or null when removed.
 */
export function removeParameterRows(fa: FormArray, rowIdxs: number[], store: SpecimenRowStore, discardResults = false): RowRemovalBlock | null {
  if (!fa || rowIdxs.length === 0) return null;
  const discarded: number[] = [];
  for (const r of rowIdxs) {
    const value = rowValue(fa.at(r));
    const reason = rowRemovalReason(value, store);
    if (reason) {
      if (!discardResults) {
        return { name: `${value?.parameterName || `Row ${r + 1}`} (S${toIndex(value?.specimenIndex) + 1})`, reason };
      }
      if (Number(value?.id) > 0) discarded.push(Number(value.id));
    }
  }
  if (discarded.length) store.discardedParameterIds = [...(store.discardedParameterIds || []), ...discarded];
  const ids = rowIdxs.map(r => Number(fa.at(r)?.get('id')?.value) || 0).filter(id => id > 0);
  [...rowIdxs].sort((a, b) => b - a).forEach(r => fa.removeAt(r));
  if (ids.length) store.removedParameterIds = [...(store.removedParameterIds || []), ...ids];
  return null;
}
