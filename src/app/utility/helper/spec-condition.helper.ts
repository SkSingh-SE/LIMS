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

// ---------------------------------------------------------------------------
// Dimensional-factor segments
// ---------------------------------------------------------------------------

/** A limit band such as "> 16 ≤ 40" (symbols as stored on specification lines). */
export interface LimitBand {
  lowerSymbol?: string | null;
  lowerValue?: number | null;
  upperSymbol?: string | null;
  upperValue?: number | null;
}

const hasNum = (v: number | null | undefined): v is number => v !== null && v !== undefined && Number.isFinite(v);

/**
 * Cut the number line at every band edge so each piece lies inside exactly the same bands.
 * Adjacent pieces covered by the same bands are merged. Pieces no band covers are dropped.
 * When every parameter uses the same bands the result is those bands (e.g. "< 20", "≥ 20 ≤ 40", "> 40").
 * When parameters cut the factor differently (e.g. "<20 / 20-40 / >40" and "≤25 / >25") the result is the
 * finer set ("< 20", "≥ 20 ≤ 25", "> 25 ≤ 40", "> 40"), so one choice still maps every parameter to one band.
 */
export function buildBandSegments(bands: LimitBand[]): LimitBand[] {
  const unique: LimitBand[] = [];
  const seen = new Set<string>();
  for (const b of bands || []) {
    const key = [b.lowerSymbol ?? '', b.lowerValue ?? '', b.upperSymbol ?? '', b.upperValue ?? ''].join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(b);
  }
  if (!unique.length) return [];

  const edges = Array.from(
    new Set(unique.flatMap(b => [b.lowerValue, b.upperValue]).filter(hasNum))
  ).sort((a, b) => a - b);

  if (!edges.length) return [{}];

  type Piece = { rep: number; lower: { symbol: string; value: number } | null; upper: { symbol: string; value: number } | null };
  const pieces: Piece[] = [];
  pieces.push({ rep: edges[0] - 1, lower: null, upper: { symbol: '<', value: edges[0] } });
  for (let i = 0; i < edges.length; i++) {
    pieces.push({ rep: edges[i], lower: { symbol: '≥', value: edges[i] }, upper: { symbol: '≤', value: edges[i] } });
    if (i < edges.length - 1) {
      pieces.push({
        rep: (edges[i] + edges[i + 1]) / 2,
        lower: { symbol: '>', value: edges[i] },
        upper: { symbol: '<', value: edges[i + 1] }
      });
    }
  }
  pieces.push({ rep: edges[edges.length - 1] + 1, lower: { symbol: '>', value: edges[edges.length - 1] }, upper: null });

  const signature = (p: Piece) =>
    unique
      .map((b, i) => (bandContains(p.rep, b.lowerSymbol, b.lowerValue, b.upperSymbol, b.upperValue) ? i : -1))
      .filter(i => i >= 0)
      .join(',');

  const segments: LimitBand[] = [];
  let runStart = -1;
  let runSig = '';
  const closeRun = (endIndex: number) => {
    if (runStart < 0) return;
    const first = pieces[runStart];
    const last = pieces[endIndex];
    segments.push({
      lowerSymbol: first.lower?.symbol ?? null,
      lowerValue: first.lower?.value ?? null,
      upperSymbol: last.upper?.symbol ?? null,
      upperValue: last.upper?.value ?? null
    });
    runStart = -1;
  };
  pieces.forEach((p, i) => {
    const sig = signature(p);
    if (!sig) {
      closeRun(i - 1);
      runSig = '';
      return;
    }
    if (runStart >= 0 && sig === runSig) return;
    closeRun(i - 1);
    runStart = i;
    runSig = sig;
  });
  closeRun(pieces.length - 1);
  return segments;
}

/** True when every value of `segment` also lies inside `band` (open ends and > ≥ < ≤ respected). */
export function segmentWithinBand(segment: LimitBand, band: LimitBand): boolean {
  if (hasNum(band.lowerValue)) {
    if (!hasNum(segment.lowerValue)) return false;
    if (segment.lowerValue < band.lowerValue) return false;
    if (segment.lowerValue === band.lowerValue) {
      const bandStrict = STRICT_LOWER.includes((band.lowerSymbol || '').trim());
      const segStrict = STRICT_LOWER.includes((segment.lowerSymbol || '').trim());
      if (bandStrict && !segStrict) return false;
    }
  }
  if (hasNum(band.upperValue)) {
    if (!hasNum(segment.upperValue)) return false;
    if (segment.upperValue > band.upperValue) return false;
    if (segment.upperValue === band.upperValue) {
      const bandStrict = STRICT_UPPER.includes((band.upperSymbol || '').trim());
      const segStrict = STRICT_UPPER.includes((segment.upperSymbol || '').trim());
      if (bandStrict && !segStrict) return false;
    }
  }
  return true;
}

/** Readable band text: "≥ 20 ≤ 40", "< 20", "= 25". */
export function formatBand(b: LimitBand): string {
  const lo = hasNum(b.lowerValue) ? `${(b.lowerSymbol || '≥').trim()} ${b.lowerValue}` : '';
  const up = hasNum(b.upperValue) ? `${(b.upperSymbol || '≤').trim()} ${b.upperValue}` : '';
  if (hasNum(b.lowerValue) && hasNum(b.upperValue) && b.lowerValue === b.upperValue && lo.startsWith('≥') && up.startsWith('≤')) {
    return `= ${b.lowerValue}`;
  }
  return [lo, up].filter(x => !!x).join(' ');
}

/** The segment that contains the sample's dimension, or null when the sample has no such dimension. */
export function segmentContainingValue(segments: LimitBand[], value: number | null): LimitBand | null {
  if (value === null || !Number.isFinite(value)) return null;
  return segments.find(s => bandContains(value, s.lowerSymbol, s.lowerValue, s.upperSymbol, s.upperValue)) ?? null;
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
