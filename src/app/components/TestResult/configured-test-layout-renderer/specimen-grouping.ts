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
  parameterID?: number | string | null;
  parameterName?: string | null;
  specimenIndex?: number | string | null;
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
 * With saved indexes: highest saved index + 1 (the saved count). Without: the planned count, but never fewer
 * than the specimens the rows already hold.
 */
export function resolveSpecimenCount(rows: ReadonlyArray<SpecimenRowLike>, planned: number): number {
  const list = rows || [];
  const indexes = resolveSpecimenIndexes(list);
  const maxIdx = indexes.length ? Math.max(...indexes) : -1;
  if (hasSavedSpecimenIndexes(list)) return Math.max(1, maxIdx + 1);
  return Math.max(1, Math.floor(Number(planned) || 1), maxIdx + 1);
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

/** True when a row holds a result (value or remarks) that must not be thrown away. */
export function rowHasResult(row: { value?: unknown; remarks?: unknown } | null | undefined): boolean {
  if (!row) return false;
  const v = row.value;
  const hasValue = v !== null && v !== undefined && String(v).trim() !== '';
  const r = row.remarks;
  const hasRemarks = r !== null && r !== undefined && String(r).trim() !== '';
  return hasValue || hasRemarks;
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
 * Returns the name of the first row that holds a result (nothing is removed then), or null when removed.
 */
export function removeSpecimenRows(fa: FormArray, specimen: number, store: SpecimenRowStore): string | null {
  if (!fa) return null;
  const rows = rowsOfSpecimen(specimenIndexesOf(fa), specimen);
  const blocking = rows.find(r => rowHasResult(rowValue(fa.at(r))));
  if (blocking !== undefined) {
    return rowValue(fa.at(blocking))?.parameterName || `Row ${blocking + 1}`;
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
