/**
 * Deterministic mapping between tensile result parameters and specimen fields.
 *
 * Rules:
 * - Names are matched EXACTLY after normalisation (lower case, text in brackets removed,
 *   separators turned into spaces, a dot at the end of a word removed, spaces collapsed).
 *   No substring matching, so "Final Gauge Length" can never be read as the original gauge
 *   length and "Throat Thickness" / "Wall Thickness" are never treated as the specimen thickness.
 * - A name that matches more than one role is ambiguous and maps to no role.
 * - Every name listed under one role is a name of the same quantity. Rows in one specimen
 *   that share a role (e.g. "UTS" and "Ultimate Tensile Strength") form one group: read from
 *   the first filled row, write the value to all rows of that group, never to another role.
 * - ReH, ReL and Rp0.5 are separate ISO 6892-1 quantities. They have their own read-only roles:
 *   never calculated, never read into the specimen model, never written by the sync.
 */

/** Roles that map to a specimen field (read, calculated and written back). */
export type SpecimenRole =
  | 'thickness'
  | 'width'
  | 'diameter'
  | 'area'
  | 'gaugeLength'
  | 'finalLength'
  | 'yieldLoad'
  | 'peakLoad'
  | 'proofStress'
  | 'uts'
  | 'elongation'
  | 'reductionOfArea';

/** Recognised quantities that are only shown, never calculated or written. */
export type ReadOnlyTensileRole = 'upperYield' | 'lowerYield' | 'proofStress05';

export type TensileRole = SpecimenRole | ReadOnlyTensileRole;

/** Exact normalised names (and common symbols) accepted for each role. */
export const TENSILE_ROLE_NAMES: Readonly<Record<TensileRole, readonly string[]>> = {
  thickness: ['thickness', 'thickness of specimen', 'specimen thickness', 'a0'],
  width: ['width', 'width of specimen', 'specimen width', 'b0'],
  diameter: ['diameter', 'diameter of specimen', 'specimen diameter', 'original diameter', 'd0'],
  area: [
    'area',
    'cross section area',
    'cross sectional area',
    'original cross section area',
    'original cross sectional area',
    'cross section area of specimen',
    's0',
  ],
  gaugeLength: ['gauge length', 'original gauge length', 'gage length', 'original gage length', 'l0'],
  finalLength: [
    'final gauge length',
    'final gage length',
    'final length',
    'gauge length after fracture',
    'final gauge length after fracture',
    'lu',
  ],
  yieldLoad: ['yield load', 'load at yield', 'yield force', 'proof load'],
  peakLoad: [
    'peak load',
    'maximum load',
    'max load',
    'ultimate load',
    'ultimate tensile load',
    'breaking load',
    'maximum force',
    'fm',
  ],
  // Generic yield / 0.2 % proof strength: the value calculated from yield load / S0
  proofStress: [
    'yield strength',
    'yield stress',
    'proof stress',
    'proof strength',
    '0.2% proof stress',
    '0.2% proof strength',
    '0.2% yield strength',
    'yield strength rp0.2',
    'rp0.2',
    'rp 0.2',
    'ys',
  ],
  uts: ['ultimate tensile strength', 'tensile strength', 'uts', 'u.t.s', 'rm', 'ts'],
  elongation: [
    'elongation',
    'percentage elongation',
    'elongation after fracture',
    'percent elongation',
    'elongation %',
    '% elongation',
    'a%',
    'elongation a%',
  ],
  reductionOfArea: [
    'reduction of area',
    'reduction in area',
    'percentage reduction of area',
    '% reduction of area',
    '% reduction in area',
    'z',
    'z%',
    'ra',
  ],
  // Read-only quantities (own roles, never mixed with proofStress)
  upperYield: ['reh', 'upper yield strength', 'upper yield stress', 'upper yield point', 'yield strength reh'],
  lowerYield: ['rel', 'lower yield strength', 'lower yield stress', 'lower yield point', 'yield strength rel'],
  proofStress05: [
    'rp0.5',
    'rp 0.5',
    '0.5% proof stress',
    '0.5% proof strength',
    '0.5% yield strength',
    'yield strength rp0.5',
    'proof stress rp0.5',
  ],
};

export const READ_ONLY_TENSILE_ROLES: ReadonlySet<TensileRole> = new Set<TensileRole>(['upperYield', 'lowerYield', 'proofStress05']);

export function isSpecimenRole(role: TensileRole | null | undefined): role is SpecimenRole {
  return !!role && !READ_ONLY_TENSILE_ROLES.has(role);
}

/** Roles whose value is normally calculated from other roles. */
export const DERIVED_TENSILE_ROLES: ReadonlySet<TensileRole> = new Set<TensileRole>([
  'area',
  'proofStress',
  'uts',
  'elongation',
  'reductionOfArea',
]);

/** Roles whose change must re-run the per-specimen calculation. */
export const RECALC_TRIGGER_ROLES: ReadonlySet<TensileRole> = new Set<TensileRole>([
  'thickness',
  'width',
  'diameter',
  'area',
  'gaugeLength',
  'finalLength',
  'yieldLoad',
  'peakLoad',
]);

export const DIMENSION_ROLES: ReadonlySet<TensileRole> = new Set<TensileRole>(['thickness', 'width', 'diameter']);

/** Calculated roles a null result may clear (S0 only when it was calculated, never when typed by the user). */
const CLEARABLE_ROLES: ReadonlySet<TensileRole> = new Set<TensileRole>(['area', 'proofStress', 'uts', 'elongation', 'reductionOfArea']);

const ROLES = Object.keys(TENSILE_ROLE_NAMES) as TensileRole[];

/** Lower case, drop "( ... )" / "[ ... ]" parts, turn - _ / , : into spaces, drop a dot ending a word, collapse spaces. */
export function normaliseParameterName(name: string | null | undefined): string {
  return String(name ?? '')
    .toLowerCase()
    .replace(/\([^)]*\)|\[[^\]]*\]/g, ' ')
    .replace(/[-_/,:]+/g, ' ')
    .replace(/\.+(?=\s|$)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Role of one parameter name, or null when unknown or ambiguous. */
export function resolveTensileRole(name: string | null | undefined): TensileRole | null {
  const n = normaliseParameterName(name);
  if (!n) return null;
  const hits = ROLES.filter(role => TENSILE_ROLE_NAMES[role].includes(n));
  if (hits.length !== 1) return null;
  if (hits[0] !== 'proofStress') return hits[0];

  // Brackets are dropped for matching, but their content can name a different yield quantity:
  // "Yield Strength (Rp0.5)" / "Proof Stress (0.5%)" -> Rp0.5, "Yield Strength (ReH)" -> ReH, "(ReL)" -> ReL.
  const routed = bracketYieldRoles(name);
  if (routed.size === 0) return 'proofStress';
  return routed.size === 1 ? Array.from(routed)[0] : null; // brackets naming two quantities: ambiguous
}

/** Yield quantities named inside ( ) or [ ] of a parameter name. */
function bracketYieldRoles(name: string | null | undefined): Set<TensileRole> {
  const roles = new Set<TensileRole>();
  const parts = String(name ?? '').toLowerCase().match(/\(([^)]*)\)|\[([^\]]*)\]/g) || [];
  parts.forEach(part => {
    const inner = part.slice(1, -1).replace(/[-_/,:]+/g, ' ');
    if (/(^|[^\d.])0\.5(?![\d])/.test(inner)) roles.add('proofStress05'); // "0.5%", "Rp0.5", "Rp 0.5", not "10.5" / "0.55"
    if (/\breh\b|\bupper\b/.test(inner)) roles.add('upperYield');
    if (/\brel\b|\blower\b/.test(inner)) roles.add('lowerYield');
  });
  return roles;
}

/** Role → row indexes (in order) for one specimen's parameter rows. Synonyms of one role form one group. */
export type TensileRoleIndex = Map<TensileRole, number[]>;

export function buildTensileRoleIndex(names: ReadonlyArray<string | null | undefined>, offset = 0): TensileRoleIndex {
  const index: TensileRoleIndex = new Map();
  names.forEach((name, idx) => {
    const role = resolveTensileRole(name);
    if (!role) return;
    const rows = index.get(role);
    if (rows) rows.push(idx + offset);
    else index.set(role, [idx + offset]);
  });
  return index;
}

/** Role of a row inside an index, or null. */
export function roleOfRow(index: TensileRoleIndex, rowIdx: number): TensileRole | null {
  for (const [role, rows] of index) {
    if (rows.includes(rowIdx)) return role;
  }
  return null;
}

export function parseTensileNumber(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  const n = Number(raw);
  return isNaN(n) ? null : n;
}

export type TensileValues = { [K in SpecimenRole]?: number | null } & { finalArea?: number | null };

/** Rounding used when a saved row value is read into the specimen model. */
export function roundForRole(role: SpecimenRole, value: number): number {
  if (role === 'proofStress' || role === 'uts') return Math.round(value);
  if (role === 'elongation' || role === 'reductionOfArea') return Number(value.toFixed(1));
  return value;
}

/** Read fallback: each specimen role reads the first filled row of its own group only. Read-only roles are skipped. */
export function readTensileValues(index: TensileRoleIndex, getRaw: (rowIdx: number) => unknown): TensileValues {
  const out: TensileValues = {};
  index.forEach((rows, role) => {
    if (!isSpecimenRole(role)) return;
    for (const r of rows) {
      const v = parseTensileNumber(getRaw(r));
      if (v != null) {
        out[role] = roundForRole(role, v);
        return;
      }
    }
  });
  return out;
}

export interface TensileWrite {
  rowIdx: number;
  role: SpecimenRole;
  value: number | null;
}

/**
 * Write-back plan: each known value goes to every row of its own role group, nowhere else.
 * `clearRoles` = calculated roles whose fresh result is null: their rows are cleared (value null).
 * Only calculated roles (Rp, Rm, A%, Z%) can be cleared; inputs and read-only roles are never nulled.
 */
export function planTensileWrites(index: TensileRoleIndex, values: TensileValues, clearRoles?: ReadonlySet<TensileRole>): TensileWrite[] {
  const plan: TensileWrite[] = [];
  index.forEach((rows, role) => {
    if (!isSpecimenRole(role)) return;
    const v = values[role];
    if (v != null) {
      rows.forEach(rowIdx => plan.push({ rowIdx, role, value: v }));
    } else if (clearRoles?.has(role) && CLEARABLE_ROLES.has(role)) {
      rows.forEach(rowIdx => plan.push({ rowIdx, role, value: null }));
    }
  });
  return plan;
}

/** S0 from diameter (round) or thickness x width (flat), 2 decimals. */
export function tensileArea(t: number | null | undefined, w: number | null | undefined, d: number | null | undefined): number | null {
  if (d && d > 0) return Number(((Math.PI * d * d) / 4).toFixed(2));
  if (t && w && t > 0 && w > 0) return Number((t * w).toFixed(2));
  return null;
}

/**
 * Per-specimen calculation (same formulas as the specimen matrix):
 *   Rp = yield load (kN) x 1000 / S0, Rm = peak load (kN) x 1000 / S0,
 *   A% = (Lu - L0) / L0 x 100, Z% = (S0 - Su) / S0 x 100.
 * `locked` holds values the user typed into derived rows; they always win over the calculation.
 * `recomputeArea` recalculates S0 from the dimensions; when they give no area an unlocked S0 becomes null.
 * Without S0 (null or 0) the unlocked Rp / Rm become null.
 * Returns the calculated roles whose result is now null and that are not locked: the caller clears those rows.
 * Rp, Rm, A% and Z% are always decided; S0 only when `recomputeArea` is set. Inputs are never in the result.
 */
export function recalcTensileSpecimen(spm: TensileValues, opts: { recomputeArea?: boolean; locked?: TensileValues } = {}): Set<SpecimenRole> {
  const locked = opts.locked || {};
  const decided: SpecimenRole[] = ['elongation', 'reductionOfArea'];

  if (locked.area != null) {
    spm.area = locked.area;
  } else if (opts.recomputeArea) {
    // Calculated S0 follows the dimensions: when they no longer give an area, S0 is cleared too
    spm.area = tensileArea(spm.thickness, spm.width, spm.diameter);
    decided.push('area');
  }

  // Without S0 there is no Rp / Rm: unlocked stresses are cleared, never left from an old S0
  const s0 = spm.area;
  if (s0 && s0 > 0) {
    spm.proofStress = spm.yieldLoad && spm.yieldLoad > 0 ? Math.round((spm.yieldLoad * 1000) / s0) : null;
    spm.uts = spm.peakLoad && spm.peakLoad > 0 ? Math.round((spm.peakLoad * 1000) / s0) : null;
  } else {
    spm.proofStress = null;
    spm.uts = null;
  }
  decided.push('proofStress', 'uts');

  if (spm.finalLength && spm.gaugeLength && spm.gaugeLength > 0 && spm.finalLength >= spm.gaugeLength) {
    spm.elongation = Number((((spm.finalLength - spm.gaugeLength) / spm.gaugeLength) * 100).toFixed(1));
  } else {
    spm.elongation = null;
  }

  if (spm.finalArea && s0 && s0 > 0 && spm.finalArea <= s0) {
    spm.reductionOfArea = Number((((s0 - spm.finalArea) / s0) * 100).toFixed(1));
  } else {
    spm.reductionOfArea = null;
  }

  (['proofStress', 'uts', 'elongation', 'reductionOfArea'] as SpecimenRole[]).forEach(role => {
    if (locked[role] != null) spm[role] = locked[role];
  });

  return new Set(decided.filter(role => locked[role] == null && spm[role] == null));
}

/**
 * Reload rule for a saved S0 (cross section area):
 * - it equals the area of the saved dimensions (t x w, or pi d^2 / 4) within 0.01 mm2 -> it was calculated, it may be
 *   recalculated or cleared when the dimensions change;
 * - it differs, or the saved dimensions give no area -> it was typed by hand: treat it as locked, so a reload
 *   never silently drops or replaces a manual S0.
 */
export function isSavedAreaHandTyped(
  savedArea: number | null | undefined,
  t: number | null | undefined,
  w: number | null | undefined,
  d: number | null | undefined
): boolean {
  if (savedArea == null) return false;
  const calc = tensileArea(t, w, d);
  return calc == null || Math.abs(calc - savedArea) > 0.01;
}

/**
 * Same reload rule for the other calculated values, so an edit after reload never wipes a value typed by hand:
 * a saved Rp / Rm / A% that cannot be reproduced from the saved inputs (load and S0, or L0 and Lu) counts as hand-typed.
 * Rp / Rm match when equal after rounding to whole MPa; A% within 0.1 %.
 */
export function savedHandTypedRoles(saved: TensileValues): Set<SpecimenRole> {
  const out = new Set<SpecimenRole>();
  if (isSavedAreaHandTyped(saved.area, saved.thickness, saved.width, saved.diameter)) out.add('area');
  const s0 = saved.area;
  const stress = (load: number | null | undefined) => (load && load > 0 && s0 && s0 > 0 ? Math.round((load * 1000) / s0) : null);
  const rp = stress(saved.yieldLoad);
  if (saved.proofStress != null && (rp == null || Math.abs(rp - saved.proofStress) >= 1)) out.add('proofStress');
  const rm = stress(saved.peakLoad);
  if (saved.uts != null && (rm == null || Math.abs(rm - saved.uts) >= 1)) out.add('uts');
  const l0 = saved.gaugeLength;
  const lu = saved.finalLength;
  const a = l0 && lu && l0 > 0 && lu >= l0 ? Number((((lu - l0) / l0) * 100).toFixed(1)) : null;
  if (saved.elongation != null && (a == null || Math.abs(a - saved.elongation) > 0.1)) out.add('elongation');
  return out;
}

/** First item whose name resolves to the given role (read-only lookups for display). */
export function findByTensileRole<T>(items: ReadonlyArray<T>, role: TensileRole, getName: (item: T) => string | null | undefined): T | undefined {
  return items.find(item => resolveTensileRole(getName(item)) === role);
}

/**
 * Which quantities a derived tensile quantity is calculated from (see recalcTensileSpecimen):
 * S0 from the dimensions, Rp / Rm from a load and S0, A% from L0 and Lu, Z% from S0.
 */
export const TENSILE_INPUTS: Readonly<Partial<Record<SpecimenRole, readonly SpecimenRole[]>>> = {
  area: ['thickness', 'width', 'diameter'],
  proofStress: ['area', 'yieldLoad'],
  uts: ['area', 'peakLoad'],
  elongation: ['gaugeLength', 'finalLength'],
  reductionOfArea: ['area'],
};

/**
 * The visible quantities that need `role` for their calculation, directly or through another quantity
 * (Thickness -> S0 -> Rp, so Thickness stays while Rp is shown even when S0 itself is hidden).
 * A quantity can be removed from the screen only when this list is empty.
 */
export function tensileDependents(role: SpecimenRole, visible: ReadonlySet<SpecimenRole>): SpecimenRole[] {
  const needs = (target: SpecimenRole, seen: Set<SpecimenRole>): boolean => {
    for (const input of TENSILE_INPUTS[target] || []) {
      if (input === role) return true;
      if (!seen.has(input)) {
        seen.add(input);
        if (needs(input, seen)) return true;
      }
    }
    return false;
  };
  return (Object.keys(TENSILE_INPUTS) as SpecimenRole[]).filter(r => r !== role && visible.has(r) && needs(r, new Set([r])));
}
