import { countExecutionMetrics, sameExecutionMetricsList } from './execution-metrics';

describe('countExecutionMetrics', () => {
  it('returns zeros for empty or missing rows', () => {
    expect(countExecutionMetrics([])).toEqual({ total: 0, entered: 0, pass: 0, fail: 0, pending: 0 });
    expect(countExecutionMetrics(null)).toEqual({ total: 0, entered: 0, pass: 0, fail: 0, pending: 0 });
    expect(countExecutionMetrics(undefined)).toEqual({ total: 0, entered: 0, pass: 0, fail: 0, pending: 0 });
  });

  it('counts a row as entered only when the value is not empty', () => {
    const m = countExecutionMetrics([{ value: '12.5' }, { value: 0 }, { value: '' }, { value: null }, {}]);
    expect(m.total).toBe(5);
    expect(m.entered).toBe(2);
  });

  it('counts a Text parameter as entered when its Remarks hold the result, a numeric one only by value', () => {
    const m = countExecutionMetrics([
      { inputType: 'Text', value: null, remarks: 'Within gauge length' },
      { inputType: 'Text', value: null, remarks: '  ' },
      { inputType: 'Decimal', value: null, remarks: 'a note' },
      { inputType: 'Decimal', value: 5 },
    ]);
    expect(m.entered).toBe(2);
    expect(m.total).toBe(4);
  });

  it('uses isWithinLimit from the min/max check for pass and fail', () => {
    const m = countExecutionMetrics([
      { value: '10', isWithinLimit: true },
      { value: '99', isWithinLimit: false },
      { value: '5', isWithinLimit: null },
    ]);
    expect(m.pass).toBe(1);
    expect(m.fail).toBe(1);
    expect(m.pending).toBe(1);
  });

  it('uses resultStatus, then status, for pass and fail', () => {
    const m = countExecutionMetrics([
      { value: 'x', resultStatus: 'Pass' },
      { value: 'x', resultStatus: 'Over Range' },
      { value: 'x', status: 'Under Range' },
      { value: 'x', status: 'Compliant' },
      { value: 'x', resultStatus: 'Non-compliant' },
      { value: 'x', status: 'Within Range' },
      { value: 'x', resultStatus: 'Fail' },
    ]);
    expect(m.pass).toBe(3);
    expect(m.fail).toBe(4);
    expect(m.pending).toBe(0);
  });

  it('treats unknown status without a limit result as pending', () => {
    const m = countExecutionMetrics([{ value: 'x', status: 'Draft' }, { value: '' }]);
    expect(m.pending).toBe(2);
    expect(m.entered).toBe(1);
  });
});

describe('sameExecutionMetricsList', () => {
  const m = (entered: number, fail = 0) => ({ total: 4, entered, pass: 0, fail, pending: 4 - fail });

  it('is true for the same counts in new objects', () => {
    expect(sameExecutionMetricsList([m(1), m(2, 1)], [m(1), m(2, 1)])).toBeTrue();
    expect(sameExecutionMetricsList([], [])).toBeTrue();
  });

  it('is false when a count or the length differs', () => {
    expect(sameExecutionMetricsList([m(0)], [m(4)])).toBeFalse();
    expect(sameExecutionMetricsList([m(1)], [m(1, 1)])).toBeFalse();
    expect(sameExecutionMetricsList([m(1)], [m(1), m(1)])).toBeFalse();
  });
});
