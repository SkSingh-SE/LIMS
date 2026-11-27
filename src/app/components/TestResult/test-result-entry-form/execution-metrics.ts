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
  parameterID?: number | string | null;
  parameterName?: string | null;
  specimenIndex?: number | string | null;
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

function isRowEntered(row: ExecutionMetricsRow | null | undefined): boolean {
  const val = row?.value;
  const hasText = row?.inputType === 'Text' && String(row?.remarks ?? '').trim() !== '';
  return (val !== null && val !== undefined && val !== '') || hasText;
}

function isRowPass(row: ExecutionMetricsRow | null | undefined): boolean {
  const status = row?.resultStatus || row?.status;
  return (!!status && PASS_STATUSES.includes(status)) || row?.isWithinLimit === true;
}

function isRowFail(row: ExecutionMetricsRow | null | undefined): boolean {
  const status = row?.resultStatus || row?.status;
  return (!!status && FAIL_STATUSES.includes(status)) || row?.isWithinLimit === false;
}

/**
 * Counts entered / pass / fail / pending unique parameters of one test.
 * Multi-specimen rows sharing the same parameterID or parameterName are grouped into a single
 * parameter so a 2-specimen test with 11 parameters reports 0/11 rather than 0/22.
 * Worst-case verdict wins across specimens (Fail > Pass > Pending).
 */
export function countExecutionMetrics(rows: ExecutionMetricsRow[] | null | undefined): ExecutionMetrics {
  const list = rows || [];
  if (!list.length) {
    return { total: 0, entered: 0, pass: 0, fail: 0, pending: 0 };
  }

  const groups = new Map<string, ExecutionMetricsRow[]>();
  list.forEach((row, idx) => {
    const pid = row?.parameterID;
    const pname = String(row?.parameterName ?? '').trim().toLowerCase();
    const key = (pid !== null && pid !== undefined && pid !== '' && Number(pid) !== 0)
      ? `id:${pid}`
      : (pname ? `name:${pname}` : `row:${idx}`);
    const bucket = groups.get(key);
    if (bucket) {
      bucket.push(row);
    } else {
      groups.set(key, [row]);
    }
  });

  let entered = 0;
  let pass = 0;
  let fail = 0;
  let pending = 0;

  groups.forEach(groupRows => {
    if (groupRows.some(isRowEntered)) {
      entered++;
    }
    if (groupRows.some(isRowFail)) {
      fail++;
    } else if (groupRows.some(isRowPass)) {
      pass++;
    } else {
      pending++;
    }
  });

  return { total: groups.size, entered, pass, fail, pending };
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
