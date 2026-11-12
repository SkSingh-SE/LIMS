/** Counts shown in the test pill and the metrics badge of the result entry screen. */
export interface ExecutionMetrics {
  total: number;
  entered: number;
  pass: number;
  fail: number;
  pending: number;
}

/** The parameter row fields the counts read (same fields the form saves). */
export interface ExecutionMetricsRow {
  value?: unknown;
  /** Text results (input type Text) are kept here. */
  remarks?: unknown;
  inputType?: string | null;
  resultStatus?: string | null;
  status?: string | null;
  isWithinLimit?: boolean | null;
}

const PASS_STATUSES = ['Pass', 'Compliant', 'Within Range'];
const FAIL_STATUSES = ['Fail', 'Non-compliant', 'Under Range', 'Over Range'];

/**
 * Counts entered / pass / fail / pending parameter rows of one test.
 * A row is entered when its value is not empty. Pass / fail follow the
 * row's resultStatus (or status) and isWithinLimit, which the min/max check sets.
 */
export function countExecutionMetrics(rows: ExecutionMetricsRow[] | null | undefined): ExecutionMetrics {
  const list = rows || [];
  let entered = 0;
  let pass = 0;
  let fail = 0;
  let pending = 0;

  list.forEach(row => {
    const val = row?.value;
    const status = row?.resultStatus || row?.status;
    const isWithinLimit = row?.isWithinLimit;
    const hasText = row?.inputType === 'Text' && String(row?.remarks ?? '').trim() !== '';
    if ((val !== null && val !== undefined && val !== '') || hasText) {
      entered++;
    }
    if ((status && PASS_STATUSES.includes(status)) || isWithinLimit === true) {
      pass++;
    } else if ((status && FAIL_STATUSES.includes(status)) || isWithinLimit === false) {
      fail++;
    } else {
      pending++;
    }
  });

  return { total: list.length, entered, pass, fail, pending };
}

/** True when two per-test metrics lists hold the same counts (used as a signal equality check). */
export function sameExecutionMetricsList(a: readonly ExecutionMetrics[], b: readonly ExecutionMetrics[]): boolean {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  return a.every((m, i) => {
    const o = b[i];
    return !!m && !!o && m.total === o.total && m.entered === o.entered && m.pass === o.pass && m.fail === o.fail && m.pending === o.pending;
  });
}
