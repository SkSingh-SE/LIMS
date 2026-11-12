import { duplicateSpecLineMessage, findDuplicateSpecLine, specLineKey } from './spec-line-duplicates.helper';

const ys = (over: any = {}) => ({
  type: 'mechanical',
  parameterID: 63,
  parameterName: 'Yield Strength',
  dimensionalFactorID: 12,
  lowerLimitValue: '≥',
  lowerLimitDecimalValue: 20,
  upperLimitValue: '≤',
  upperLimitDecimalValue: 40,
  ...over,
});

describe('spec-line-duplicates', () => {
  it('finds two lines with the same configuration even when their limits differ', () => {
    const d = findDuplicateSpecLine([{ grade: 'E250A', specificationLines: [ys({ minValue: 240 } as any), ys({ minValue: 250 } as any)] }]);
    expect(d).toEqual({ grade: 'E250A', parameter: 'Yield Strength', count: 2 });
    expect(duplicateSpecLineMessage(d!)).toContain('2 identical lines for "Yield Strength"');
  });

  it('treats different size bands, conditions, tests or methods as different lines', () => {
    const lines = [
      ys(),
      ys({ lowerLimitDecimalValue: 40, lowerLimitValue: '>', upperLimitDecimalValue: null, upperLimitValue: null }),
      ys({ heatTreatmentID: 5 }),
      ys({ testCondition: 'Product analysis allowance' }),
      ys({ laboratoryTestID: 10015 }),
      ys({ testMethodMappings: [{ testMethodSpecificationID: 98 }] }),
    ];
    expect(findDuplicateSpecLine([{ grade: 'G', specificationLines: lines }])).toBeNull();
  });

  it('ignores case and spaces in the test condition and the order of method mappings', () => {
    const a = ys({ testCondition: ' Product Analysis ', testMethodMappings: [{ testMethodSpecificationID: 2 }, { testMethodSpecificationID: 1 }] });
    const b = ys({ testCondition: 'product analysis', testMethodMappings: [{ testMethodSpecificationID: 1 }, { testMethodSpecificationID: 2 }] });
    expect(specLineKey(a)).toBe(specLineKey(b));
    expect(findDuplicateSpecLine([{ grade: 'G', specificationLines: [a, b] }])).not.toBeNull();
  });

  it('only compares lines inside one grade and skips lines without a parameter', () => {
    expect(findDuplicateSpecLine([{ grade: 'A', specificationLines: [ys()] }, { grade: 'B', specificationLines: [ys()] }])).toBeNull();
    expect(findDuplicateSpecLine([{ grade: 'A', specificationLines: [ys({ parameterID: null }), ys({ parameterID: null })] }])).toBeNull();
    expect(findDuplicateSpecLine(null)).toBeNull();
  });
});
