export interface ReadingMatrixParamsMeta {
  parameterName?: string | null;
  decimalPrecision?: number | string | null;
}

export interface FlatReadingRecord {
  parameterName?: string | null;
  parameterCode?: string | null;
  specimenCode?: string | null;
  specimenLabel?: string | null;
  locationCode?: string | null;
  location?: string | null;
  readingNumber?: number | string | null;
  sequenceNo?: number | string | null;
  readingValue?: unknown;
  value?: unknown;
  isVoided?: boolean | null;
  isActive?: boolean | null;
}

const normKey = (v: unknown): string => String(v ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

const cleanNum = (v: unknown): number | null => {
  if (v === null || v === undefined || String(v).trim() === '') return null;
  const n = Number(v);
  return isNaN(n) ? null : Math.round(n * 1e6) / 1e6;
};

/**
 * Unscrambles SequenceNo-ordered flat backend `test.readings` (e.g. SpecimenCode = 'S1'..'S4')
 * or layout JSON matrix rows into per-row ordered reading arrays matching Tab 1's Reading Matrix.
 */
export function buildReadingMatrixRowsFromSource(options: {
  rowLabels: string[];
  spotCount: number;
  jsonMap?: Record<string, unknown> | null;
  readings?: FlatReadingRecord[] | null;
  targetParamName?: string | null;
  cfgTargetParamName?: string | null;
  readingSectionCount?: number;
}): { label: string; readings: (number | null)[]; average: number | null }[] {
  const {
    rowLabels,
    spotCount,
    jsonMap = null,
    readings = [],
    targetParamName = '',
    cfgTargetParamName = '',
    readingSectionCount = 1
  } = options;

  const stored: FlatReadingRecord[] = Array.isArray(readings)
    ? readings.filter(r => r?.isVoided !== true && r?.isActive !== false)
    : [];
  const wantTarget = normKey(cfgTargetParamName);
  const wantParam = normKey(targetParamName);
  const matchedStored = stored.filter(r => {
    const k = normKey(r?.parameterName || r?.parameterCode);
    return !!k && (k === wantParam || (!!wantTarget && k === wantTarget));
  });
  const flatReadings: FlatReadingRecord[] = matchedStored.length
    ? matchedStored
    : (readingSectionCount === 1 ? stored : []);

  return rowLabels.map((label, rowIdx) => {
    let vals: (number | null)[] = [];
    const rowCode = `S${rowIdx + 1}`;
    if (jsonMap) {
      const byLabel = jsonMap[label] || jsonMap[rowCode] || jsonMap[String(rowIdx + 1)];
      if (Array.isArray(byLabel)) {
        vals = Array.from({ length: spotCount }, (_, sIdx) => cleanNum(byLabel[sIdx]));
      }
    }
    if (!vals.length && flatReadings.length > 0) {
      const byRow = flatReadings.filter(r => {
        const spCode = String(r?.specimenCode || r?.specimenLabel || r?.locationCode || r?.location || '').trim().toLowerCase();
        return spCode === label.toLowerCase() || spCode === rowCode.toLowerCase();
      });
      if (byRow.length > 0) {
        const arr: (number | null)[] = Array(spotCount).fill(null);
        byRow.forEach((r, idx) => {
          const seq = Number(r?.readingNumber || r?.sequenceNo || (idx + 1));
          if (seq >= 1 && seq <= spotCount) {
            arr[seq - 1] = cleanNum(r?.readingValue ?? r?.value);
          }
        });
        vals = arr;
      }
    }
    if (!vals.length) {
      vals = Array.from({ length: spotCount }, () => null);
    }
    const valid = vals.filter((n): n is number => n !== null);
    const avg = valid.length > 0 ? Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 100) / 100 : null;
    return { label, readings: vals, average: avg };
  });
}

/**
 * Matches precision precedence with ConfiguredTestLayoutRendererComponent.gridDecimals():
 * agg column -> spot columns -> section decimals -> positive parameter DecimalPrecision -> 2
 */
export function resolveReadingMatrixDecimals(options: {
  tableCols?: Array<{ key?: string; columnRole?: string; decimalPrecision?: number | string | null }>;
  spotCols?: Array<{ decimalPrecision?: number | string | null }>;
  cfgDecimals?: number | string | null;
  paramDecimals?: number | string | null;
}): number {
  const { tableCols = [], spotCols = [], cfgDecimals = null, paramDecimals = null } = options;
  const aggCol = tableCols.find(c => c?.key === 'agg' || String(c?.columnRole || '').toLowerCase() === 'agg_average');
  const aggDec = aggCol?.decimalPrecision != null && aggCol?.decimalPrecision !== '' ? Number(aggCol.decimalPrecision) : NaN;
  const spotDec = spotCols
    .map(c => (c?.decimalPrecision != null && c?.decimalPrecision !== '' ? Number(c.decimalPrecision) : NaN))
    .find(d => Number.isFinite(d) && d > 0 && d <= 6);
  const cfgDec = cfgDecimals != null && cfgDecimals !== '' ? Number(cfgDecimals) : NaN;
  const paramDec = paramDecimals != null && paramDecimals !== '' ? Number(paramDecimals) : NaN;

  if (Number.isFinite(aggDec) && aggDec >= 0 && aggDec <= 4) return aggDec;
  if (spotDec != null) return spotDec;
  if (Number.isFinite(cfgDec) && cfgDec > 0 && cfgDec <= 4) return cfgDec;
  if (Number.isFinite(paramDec) && paramDec > 0 && paramDec <= 4) return paramDec;
  return 2;
}
