/**
 * Duplicate-line check for the Material Specification forms.
 * Two lines of one grade with the same configuration (test, size band, heat treatment, product condition,
 * test condition, product size, orientation, methods) would give one parameter two possible limits on the
 * result screen. Limits, notes and equations are not part of the identity (same configuration with a
 * different limit is exactly the conflict). The API applies the same rule when saving.
 */

export interface SpecLineLike {
  type?: string | null;
  parameterID?: number | string | null;
  parameterName?: string | null;
  laboratoryTestID?: number | string | null;
  dimensionalFactorID?: number | string | null;
  lowerLimitValue?: string | null;
  lowerLimitDecimalValue?: number | string | null;
  upperLimitValue?: string | null;
  upperLimitDecimalValue?: number | string | null;
  heatTreatmentID?: number | string | null;
  productConditionID1?: number | string | null;
  productConditionID2?: number | string | null;
  testCondition?: string | null;
  productSizeMasterID?: number | string | null;
  specimenOrientationID?: number | string | null;
  testMethodMappings?: Array<{ testMethodSpecificationID?: number | string | null }> | null;
}

export interface GradeLike {
  grade?: string | null;
  specificationLines?: SpecLineLike[] | null;
}

export interface DuplicateSpecLine {
  grade: string;
  parameter: string;
  count: number;
}

const id = (v: unknown): string => (v === null || v === undefined || v === '' || Number(v) === 0 ? '' : String(Number(v)));
const num = (v: unknown): string => (v === null || v === undefined || v === '' ? '' : String(Number(v)));
const txt = (v: unknown): string => String(v ?? '').trim();

/** Everything that decides when a line applies. */
export function specLineKey(l: SpecLineLike): string {
  const methods = (l.testMethodMappings || [])
    .map(m => Number(m?.testMethodSpecificationID))
    .filter(n => n > 0)
    .sort((a, b) => a - b)
    .filter((n, i, a) => a.indexOf(n) === i)
    .join(',');
  return [
    txt(l.type).toLowerCase(),
    id(l.parameterID),
    id(l.laboratoryTestID),
    id(l.dimensionalFactorID),
    txt(l.lowerLimitValue),
    num(l.lowerLimitDecimalValue),
    txt(l.upperLimitValue),
    num(l.upperLimitDecimalValue),
    id(l.heatTreatmentID),
    id(l.productConditionID1),
    id(l.productConditionID2),
    txt(l.testCondition).toLowerCase(),
    id(l.productSizeMasterID),
    id(l.specimenOrientationID),
    methods,
  ].join('|');
}

/** First group of identical lines found in any grade, or null. Lines without a parameter are ignored (another rule covers them). */
export function findDuplicateSpecLine(grades: GradeLike[] | null | undefined): DuplicateSpecLine | null {
  for (const grade of grades || []) {
    const groups = new Map<string, SpecLineLike[]>();
    for (const line of grade.specificationLines || []) {
      if (!id(line.parameterID)) continue;
      const key = specLineKey(line);
      groups.set(key, [...(groups.get(key) || []), line]);
    }
    for (const lines of groups.values()) {
      if (lines.length > 1) {
        return {
          grade: txt(grade.grade) || 'this grade',
          parameter: txt(lines[0].parameterName) || `#${id(lines[0].parameterID)}`,
          count: lines.length,
        };
      }
    }
  }
  return null;
}

export function duplicateSpecLineMessage(d: DuplicateSpecLine): string {
  return `Grade "${d.grade}" has ${d.count} identical lines for "${d.parameter}" (same test, size band, conditions and method). Remove or change the duplicate line.`;
}
