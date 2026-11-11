import {
  bandContains,
  dimensionKind,
  missingRequiredFacets,
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
