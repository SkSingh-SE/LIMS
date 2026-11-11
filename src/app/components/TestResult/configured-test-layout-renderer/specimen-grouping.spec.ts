import { FormArray, FormControl, FormGroup } from '@angular/forms';
import {
  addSpecimenRows,
  insertPositionForSpecimen,
  legacyBlockSize,
  matchingRowInSpecimen,
  removeSpecimenRows,
  resolveSpecimenCount,
  resolveSpecimenIndexes,
  rowHasResult,
  rowsOfSpecimen,
  rowsOrderedBySpecimen,
  specimenIndexesOf,
  SpecimenRowStore,
} from './specimen-grouping';

const row = (id: number, name: string, specimenIndex: number | null = null, value: any = null) => ({
  id,
  parameterID: name.length,
  parameterName: name,
  specimenIndex,
  value,
  remarks: '',
});

function formRow(r: any): FormGroup {
  return new FormGroup({
    id: new FormControl(r.id),
    parameterID: new FormControl(r.parameterID),
    parameterName: new FormControl(r.parameterName),
    specimenIndex: new FormControl(r.specimenIndex ?? 0),
    value: new FormControl(r.value ?? null),
    remarks: new FormControl(r.remarks ?? ''),
  });
}

const clone = (src: any, specimen: number) => formRow({ ...src, id: 0, value: null, remarks: '', specimenIndex: specimen });

/** Header 10027 shape: 12 tensile rows + a 2nd "Elongation" + "Location of Fracture", saved before SpecimenIndex existed. */
const header10027 = [
  'Thickness', 'Width', 'Area', 'Gauge Length', 'Yield Load', 'Peak Load', 'Final Length',
  'Yield Strength', 'Tensile Strength', 'Elongation', 'Reduction of Area', 'Ratio',
  'Elongation', 'Location of Fracture',
].map((n, i) => row(1000 + i, n, null, i));

describe('specimen-grouping', () => {
  describe('resolveSpecimenIndexes (load)', () => {
    it('keeps all 14 rows of a legacy header in S1 when a name repeats inside the specimen', () => {
      const idx = resolveSpecimenIndexes(header10027);
      expect(idx.length).toBe(14);
      expect(idx.every(s => s === 0)).toBeTrue();
      expect(resolveSpecimenCount(header10027, 1)).toBe(1);
    });

    it('splits legacy rows into specimens only when they are whole copies of one block', () => {
      const rows = ['A', 'B', 'C', 'A', 'B', 'C'].map((n, i) => row(i + 1, n));
      expect(legacyBlockSize(rows)).toBe(3);
      expect(resolveSpecimenIndexes(rows)).toEqual([0, 0, 0, 1, 1, 1]);
    });

    it('does not split legacy rows that are not exact copies', () => {
      const rows = ['A', 'B', 'A', 'C'].map((n, i) => row(i + 1, n));
      expect(legacyBlockSize(rows)).toBe(0);
      expect(resolveSpecimenIndexes(rows)).toEqual([0, 0, 0, 0]);
    });

    it('uses the saved index and keeps rows that exist for one specimen only', () => {
      const rows = [row(1, 'A', 0), row(2, 'B', 0), row(3, 'A', 1), row(4, 'B', 1), row(5, 'Extra', 1), row(6, 'Other', null)];
      expect(resolveSpecimenIndexes(rows)).toEqual([0, 0, 1, 1, 1, 0]);
    });

    it('specimen count is the saved count when rows carry an index, else the planned count', () => {
      const saved = [row(1, 'A', 0), row(2, 'A', 1)];
      expect(resolveSpecimenCount(saved, 1)).toBe(2);
      expect(resolveSpecimenCount(saved, 5)).toBe(2);
      expect(resolveSpecimenCount([row(1, 'A'), row(2, 'B')], 3)).toBe(3);
      expect(resolveSpecimenCount([], 0)).toBe(1);
    });
  });

  describe('row lookup', () => {
    it('orders rows by specimen and finds the matching row by occurrence', () => {
      const rows = [row(1, 'A', 0), row(2, 'E', 0), row(3, 'A', 1), row(4, 'E', 0), row(5, 'E', 1), row(6, 'E', 1)];
      const idx = resolveSpecimenIndexes(rows);
      expect(rowsOfSpecimen(idx, 1)).toEqual([2, 4, 5]);
      expect(rowsOrderedBySpecimen(idx)).toEqual([0, 1, 3, 2, 4, 5]);
      // 2nd "E" of S1 (row 3) -> 2nd "E" of S2 (row 5)
      expect(matchingRowInSpecimen(rows, idx, 3, 1)).toBe(5);
      expect(matchingRowInSpecimen(rows, idx, 1, 1)).toBe(4);
      expect(matchingRowInSpecimen(rows, idx, 0, 2)).toBe(-1);
    });

    it('rowHasResult treats 0 as a value and blank as empty', () => {
      expect(rowHasResult({ value: 0 })).toBeTrue();
      expect(rowHasResult({ value: '', remarks: ' ' })).toBeFalse();
      expect(rowHasResult({ value: null, remarks: 'broke at grip' })).toBeTrue();
    });
  });

  describe('form add / remove', () => {
    it('adds copies of S1 for a new specimen and does not copy again when the specimen has rows', () => {
      const fa = new FormArray([row(1, 'A', 0, 5), row(2, 'B', 0, 6)].map(formRow));
      const store: SpecimenRowStore = {};
      addSpecimenRows(fa, 1, store, clone);
      expect(fa.length).toBe(4);
      expect(specimenIndexesOf(fa)).toEqual([0, 0, 1, 1]);
      expect(fa.at(2).get('id')?.value).toBe(0);
      expect(fa.at(2).get('value')?.value).toBeNull();
      addSpecimenRows(fa, 1, store, clone);
      expect(fa.length).toBe(4);
    });

    it('refuses to remove a specimen that holds results', () => {
      const fa = new FormArray([row(1, 'A', 0, 5), row(2, 'A', 1, 7)].map(formRow));
      const store: SpecimenRowStore = {};
      expect(removeSpecimenRows(fa, 1, store)).toBe('A');
      expect(fa.length).toBe(2);
      expect(store.removedParameterIds).toBeUndefined();
    });

    it('removes an empty saved specimen, queues its ids, and brings the same rows back on add', () => {
      const fa = new FormArray([row(1, 'A', 0, 5), row(2, 'B', 0, 6), row(3, 'A', 1), row(4, 'B', 1)].map(formRow));
      const store: SpecimenRowStore = {};
      expect(removeSpecimenRows(fa, 1, store)).toBeNull();
      expect(fa.length).toBe(2);
      expect(store.removedParameterIds).toEqual([3, 4]);

      addSpecimenRows(fa, 1, store, clone);
      expect(fa.length).toBe(4);
      expect(fa.controls.map(c => c.get('id')?.value)).toEqual([1, 2, 3, 4]);
      expect(store.removedParameterIds).toEqual([]);
    });

    it('moves later specimens down when a middle specimen is removed', () => {
      const fa = new FormArray([row(1, 'A', 0, 1), row(2, 'A', 1), row(3, 'A', 2, 3)].map(formRow));
      const store: SpecimenRowStore = {};
      expect(removeSpecimenRows(fa, 1, store)).toBeNull();
      expect(specimenIndexesOf(fa)).toEqual([0, 1]);
      expect(fa.at(1).get('id')?.value).toBe(3);
    });

    it('inserts a new row after the last row of its specimen', () => {
      const fa = new FormArray([row(1, 'A', 0), row(2, 'B', 0), row(3, 'A', 1)].map(formRow));
      expect(insertPositionForSpecimen(fa, 0)).toBe(2);
      expect(insertPositionForSpecimen(fa, 1)).toBe(3);
    });
  });
});
