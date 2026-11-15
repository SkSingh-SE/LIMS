import {
  LimitBand,
  bandContains,
  buildBandSegments,
  dimensionKind,
  formatBand,
  missingRequiredFacets,
  parameterShortName,
  segmentContainingValue,
  segmentWithinBand,
  suggestDimensionalFactorKey,
  suggestProductSizeKey
} from './spec-condition.helper';

describe('spec-condition.helper', () => {
  describe('bandContains', () => {
    it('honours strict lower (>) and inclusive upper (≤): 16 < t ≤ 40', () => {
      expect(bandContains(16, '>', 16, '≤', 40)).toBeFalse();
      expect(bandContains(16.01, '>', 16, '≤', 40)).toBeTrue();
      expect(bandContains(40, '>', 16, '≤', 40)).toBeTrue();
      expect(bandContains(40.01, '>', 16, '≤', 40)).toBeFalse();
    });
    it('honours inclusive lower (≥) and strict upper (<)', () => {
      expect(bandContains(16, '≥', 16, '<', 40)).toBeTrue();
      expect(bandContains(40, '≥', 16, '<', 40)).toBeFalse();
    });
    it('treats a missing bound as open and a missing symbol as inclusive', () => {
      expect(bandContains(5, null, null, '≤', 16)).toBeTrue();
      expect(bandContains(17, null, null, '≤', 16)).toBeFalse();
      expect(bandContains(16, '', 16, '', 16)).toBeTrue();
    });
    it('rejects non-finite values', () => {
      expect(bandContains(NaN, '>', 1, '<', 2)).toBeFalse();
    });
  });

  describe('dimensionKind', () => {
    it('maps names to sample dimensions', () => {
      expect(dimensionKind('Thickness')).toBe('thickness');
      expect(dimensionKind('Wall Thickness')).toBe('thickness');
      expect(dimensionKind('Diameter')).toBe('diameter');
      expect(dimensionKind('Width')).toBe('width');
      expect(dimensionKind('Something else')).toBeNull();
    });
  });

  const dfLines = [
    { dimensionalFactorID: 3, dimensionalFactorName: 'Thickness', lowerLimitValue: '', lowerLimitDecimalValue: null, upperLimitValue: '≤', upperLimitDecimalValue: 16 },
    { dimensionalFactorID: 3, dimensionalFactorName: 'Thickness', lowerLimitValue: '>', lowerLimitDecimalValue: 16, upperLimitValue: '≤', upperLimitDecimalValue: 40 }
  ];

  describe('suggestDimensionalFactorKey', () => {
    it('suggests the single band that contains the sample thickness', () => {
      expect(suggestDimensionalFactorKey(dfLines, { thickness: 12 })).toBe('3|||≤|16');
    });
    it('suggests the upper band for 16 < t ≤ 40', () => {
      expect(suggestDimensionalFactorKey(dfLines, { thickness: 25 })).toBe('3|>|16|≤|40');
    });
    it('boundary 16 belongs to the first band only (second is strict >16)', () => {
      expect(suggestDimensionalFactorKey(dfLines, { thickness: 16 })).toBe('3|||≤|16');
    });
    it('returns null when no band or the sample has no dimension', () => {
      expect(suggestDimensionalFactorKey(dfLines, { thickness: 80 })).toBeNull();
      expect(suggestDimensionalFactorKey(dfLines, {})).toBeNull();
    });
    it('returns null when more than one band matches', () => {
      const overlapping = [dfLines[0], { ...dfLines[0], upperLimitDecimalValue: 20 }];
      expect(suggestDimensionalFactorKey(overlapping, { thickness: 10 })).toBeNull();
    });
  });

  describe('suggestProductSizeKey', () => {
    const lines = [
      { productSizeMasterID: 7, productSizeType: 'Thickness', productSizeMin: 0, productSizeMax: 16 },
      { productSizeMasterID: 8, productSizeType: 'Thickness', productSizeMin: 16.01, productSizeMax: 40 }
    ];
    it('picks the size band containing the sample dimension', () => {
      expect(suggestProductSizeKey(lines, { thickness: 12 })).toBe('7');
      expect(suggestProductSizeKey(lines, { thickness: 30 })).toBe('8');
    });
    it('returns null when nothing matches', () => {
      expect(suggestProductSizeKey(lines, { thickness: 99 })).toBeNull();
    });
  });

  describe('buildBandSegments', () => {
    const b = (ls: string | null, lv: number | null, us: string | null, uv: number | null): LimitBand => ({ lowerSymbol: ls, lowerValue: lv, upperSymbol: us, upperValue: uv });
    const labels = (segs: LimitBand[]) => segs.map(formatBand);

    it('returns the standard bands when every parameter uses the same band set', () => {
      const bands = [b(null, null, '<', 20), b('≥', 20, '≤', 40), b('>', 40, null, null), b(null, null, '<', 20), b('≥', 20, '≤', 40), b('>', 40, null, null)];
      expect(labels(buildBandSegments(bands))).toEqual(['< 20', '≥ 20 ≤ 40', '> 40']);
    });

    it('cuts finer when parameters use different band sets (IS 2062: YS <20/20-40/>40, bend <=25/>25)', () => {
      const bands = [b(null, null, '<', 20), b('≥', 20, '≤', 40), b('>', 40, null, null), b(null, null, '≤', 25), b('>', 25, null, null)];
      expect(labels(buildBandSegments(bands))).toEqual(['< 20', '≥ 20 ≤ 25', '> 25 ≤ 40', '> 40']);
    });

    it('keeps a single point segment when two bands meet on the same edge from different sides', () => {
      const bands = [b(null, null, '<', 10), b('≥', 10, null, null), b(null, null, '≤', 10), b('>', 10, null, null)];
      expect(labels(buildBandSegments(bands))).toEqual(['< 10', '= 10', '> 10']);
    });

    it('drops a gap that no band covers and returns nothing for no bands', () => {
      expect(labels(buildBandSegments([b(null, null, '<', 10), b('>', 20, null, null)]))).toEqual(['< 10', '> 20']);
      expect(buildBandSegments([])).toEqual([]);
    });

    it('every segment lies inside exactly one band of each parameter', () => {
      const ys = [b(null, null, '<', 20), b('≥', 20, '≤', 40), b('>', 40, null, null)];
      const bend = [b(null, null, '≤', 25), b('>', 25, null, null)];
      const segs = buildBandSegments([...ys, ...bend]);
      for (const seg of segs) {
        expect(ys.filter(x => segmentWithinBand(seg, x)).length).toBe(1);
        expect(bend.filter(x => segmentWithinBand(seg, x)).length).toBe(1);
      }
    });
  });

  describe('segmentWithinBand', () => {
    it('respects open ends and strict / inclusive edges', () => {
      expect(segmentWithinBand({ lowerSymbol: '≥', lowerValue: 20, upperSymbol: '≤', upperValue: 25 }, { lowerSymbol: '≥', lowerValue: 20, upperSymbol: '≤', upperValue: 40 })).toBeTrue();
      expect(segmentWithinBand({ lowerSymbol: '≥', lowerValue: 20, upperSymbol: '≤', upperValue: 25 }, { lowerSymbol: '>', lowerValue: 20, upperSymbol: '≤', upperValue: 40 })).toBeFalse();
      expect(segmentWithinBand({ lowerSymbol: '>', lowerValue: 40 }, { lowerSymbol: '>', lowerValue: 40 })).toBeTrue();
      expect(segmentWithinBand({ lowerSymbol: '>', lowerValue: 40 }, { lowerSymbol: '>', lowerValue: 20, upperSymbol: '≤', upperValue: 40 })).toBeFalse();
      expect(segmentWithinBand({ upperSymbol: '<', upperValue: 20 }, { upperSymbol: '≤', upperValue: 20 })).toBeTrue();
      expect(segmentWithinBand({ upperSymbol: '≤', upperValue: 20 }, { upperSymbol: '<', upperValue: 20 })).toBeFalse();
    });
    it('a band with no limits contains everything', () => {
      expect(segmentWithinBand({ lowerSymbol: '≥', lowerValue: 1, upperSymbol: '≤', upperValue: 2 }, {})).toBeTrue();
    });
  });

  describe('segmentContainingValue', () => {
    const segs: LimitBand[] = [
      { upperSymbol: '<', upperValue: 20 },
      { lowerSymbol: '≥', lowerValue: 20, upperSymbol: '≤', upperValue: 25 },
      { lowerSymbol: '>', lowerValue: 25 }
    ];
    it('picks the segment holding the sample dimension, boundaries included', () => {
      expect(formatBand(segmentContainingValue(segs, 19.99)!)).toBe('< 20');
      expect(formatBand(segmentContainingValue(segs, 20)!)).toBe('≥ 20 ≤ 25');
      expect(formatBand(segmentContainingValue(segs, 25)!)).toBe('≥ 20 ≤ 25');
      expect(formatBand(segmentContainingValue(segs, 25.01)!)).toBe('> 25');
    });
    it('returns null without a value', () => {
      expect(segmentContainingValue(segs, null)).toBeNull();
    });
  });

  describe('parameterShortName', () => {
    it('shortens the usual tensile properties and keeps any other name', () => {
      expect(parameterShortName('0.2% Proof Stress / Yield Strength')).toBe('YS');
      expect(parameterShortName('Ultimate Tensile Strength (UTS)')).toBe('UTS');
      expect(parameterShortName('Percentage Elongation in 50mm / 4D')).toBe('El');
      expect(parameterShortName('Internal Bend Diameter')).toBe('Internal Bend Diameter');
      expect(parameterShortName(null)).toBe('');
    });
  });

  describe('missingRequiredFacets', () => {
    const labels = { df: 'Dimensional Factor', ht: 'Heat Treatment', tc: 'Test Condition' };
    it('lists present facets that have no selection', () => {
      expect(missingRequiredFacets(labels, { df: true, ht: true, tc: false }, { df: '3|>|16|≤|40' })).toEqual(['Heat Treatment']);
    });
    it('is empty when everything present is selected or nothing is present', () => {
      expect(missingRequiredFacets(labels, { df: true }, { df: 'x' })).toEqual([]);
      expect(missingRequiredFacets(labels, {}, {})).toEqual([]);
    });
  });
});
