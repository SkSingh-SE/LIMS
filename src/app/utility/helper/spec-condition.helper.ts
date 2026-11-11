/**
 * Pure helpers for the result-entry specification-condition engine
 * (limit bands, sample-based suggestions, required-condition check).
 * Kept free of Angular so they can be unit-tested directly.
 */

export type DimensionKind = 'thickness' | 'diameter' | 'width' | 'length';

/** Lower limit symbols that exclude the boundary. Anything else (>=, ≥, empty) includes it. */
const STRICT_LOWER = ['>'];
/** Upper limit symbols that exclude the boundary. Anything else (<=, ≤, empty) includes it. */
const STRICT_UPPER = ['<'];

/** True when value lies in the band, honouring the > ≥ < ≤ symbols. A missing bound is open. */
export function bandContains(
  value: number,
  lowerSymbol?: string | null,
  lowerValue?: number | null,
  upperSymbol?: string | null,
  upperValue?: number | null
): boolean {
  if (!Number.isFinite(value)) return false;
  if (lowerValue !== null && lowerValue !== undefined) {
    const strict = STRICT_LOWER.includes((lowerSymbol || '').trim());
    if (strict ? !(value > lowerValue) : !(value >= lowerValue)) return false;
  }
  if (upperValue !== null && upperValue !== undefined) {
    const strict = STRICT_UPPER.includes((upperSymbol || '').trim());
    if (strict ? !(value < upperValue) : !(value <= upperValue)) return false;
  }
  return true;
}

/** Which sample dimension a master name (dimensional factor / size type) refers to. */
export function dimensionKind(name?: string | null): DimensionKind | null {
  const n = (name || '').toLowerCase();
  if (n.includes('thick') || n.includes('wall')) return 'thickness';
  if (n.includes('diam') || n === 'od' || n.includes('dia ')) return 'diameter';
  if (n.includes('width')) return 'width';
  if (n.includes('length')) return 'length';
  return null;
}

export function sampleDimension(sample: any, kind: DimensionKind | null): number | null {
  if (!sample || !kind) return null;
  const v = Number(sample[kind]);
  return Number.isFinite(v) && v > 0 ? v : null;
}

/**
 * Suggest the dimensional-factor option (key `id|lowSym|lowVal|upSym|upVal`) whose band contains
 * the sample's dimension. Returns a key only when exactly one band matches.
 */
export function suggestDimensionalFactorKey(lines: any[], sample: any): string | null {
  const keys = new Map<string, boolean>();
  for (const l of lines || []) {
    if (!l.dimensionalFactorID) continue;
    const dim = sampleDimension(sample, dimensionKind(l.dimensionalFactorName));
    if (dim === null) continue;
    const key = [l.dimensionalFactorID, l.lowerLimitValue ?? '', l.lowerLimitDecimalValue ?? '', l.upperLimitValue ?? '', l.upperLimitDecimalValue ?? ''].join('|');
    if (bandContains(dim, l.lowerLimitValue, l.lowerLimitDecimalValue, l.upperLimitValue, l.upperLimitDecimalValue)) {
      keys.set(key, true);
    }
  }
  return keys.size === 1 ? Array.from(keys.keys())[0] : null;
}

/** Suggest the product-size master whose [min,max] contains the sample's dimension (unique match only). */
export function suggestProductSizeKey(lines: any[], sample: any): string | null {
  const ids = new Map<number, boolean>();
  for (const l of lines || []) {
    if (!l.productSizeMasterID) continue;
    const dim = sampleDimension(sample, dimensionKind(l.productSizeType));
    if (dim === null) continue;
    const min = l.productSizeMin ?? null;
    const max = l.productSizeMax ?? null;
    if (min === null && max === null) continue;
    if (bandContains(dim, '≥', min, '≤', max)) ids.set(l.productSizeMasterID, true);
  }
  return ids.size === 1 ? String(Array.from(ids.keys())[0]) : null;
}

/** Facets that exist for this grade/test but have no selection yet (labels for the error message). */
export function missingRequiredFacets(
  facetLabels: Record<string, string>,
  present: Record<string, boolean>,
  selected: Record<string, string | null | undefined>
): string[] {
  return Object.keys(facetLabels).filter(fc => present[fc] && !selected[fc]).map(fc => facetLabels[fc]);
}
