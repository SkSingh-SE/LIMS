import {
  buildTensileRoleIndex,
  findByTensileRole,
  isSavedAreaHandTyped,
  normaliseParameterName,
  savedHandTypedRoles,
  planTensileWrites,
  readTensileValues,
  recalcTensileSpecimen,
  resolveTensileRole,
  roleOfRow,
  TENSILE_ROLE_NAMES,
  TensileRole,
  TensileValues,
} from './tensile-parameter-roles';

describe('tensile-parameter-roles', () => {
  describe('resolveTensileRole (E1 names)', () => {
    it('maps Original and Final Gauge Length to different roles', () => {
      expect(resolveTensileRole('Original Gauge Length')).toBe('gaugeLength');
      expect(resolveTensileRole('Final Gauge Length')).toBe('finalLength');
    });

    it('does not treat Throat Thickness / Wall Thickness as specimen thickness', () => {
      expect(resolveTensileRole('Throat Thickness')).toBeNull();
      expect(resolveTensileRole('Wall Thickness')).toBeNull();
    });

    it('maps plain and specimen thickness / width', () => {
      expect(resolveTensileRole('Thickness')).toBe('thickness');
      expect(resolveTensileRole('Thickness of Specimen')).toBe('thickness');
      expect(resolveTensileRole('Width')).toBe('width');
      expect(resolveTensileRole('Width of Specimen')).toBe('width');
    });

    it('leaves weld leg lengths unmapped', () => {
      expect(resolveTensileRole('Leg Length 1')).toBeNull();
      expect(resolveTensileRole('Leg Length 2')).toBeNull();
      expect(resolveTensileRole('Leg Length 1/2')).toBeNull();
    });

    it('maps strengths and loads', () => {
      expect(resolveTensileRole('Ultimate Tensile Strength')).toBe('uts');
      expect(resolveTensileRole('Yield Strength')).toBe('proofStress');
      expect(resolveTensileRole('Yield Load')).toBe('yieldLoad');
      expect(resolveTensileRole('Ultimate Tensile Load')).toBe('peakLoad');
      expect(resolveTensileRole('Cross Section Area')).toBe('area');
      expect(resolveTensileRole('Elongation')).toBe('elongation');
      expect(resolveTensileRole('Elongation (%)')).toBe('elongation');
      expect(resolveTensileRole('Reduction of Area')).toBe('reductionOfArea');
    });

    it('accepts the ISO symbols L0 and Lu', () => {
      expect(resolveTensileRole('L0')).toBe('gaugeLength');
      expect(resolveTensileRole('Lu')).toBe('finalLength');
      expect(resolveTensileRole('Original Gauge Length (L0)')).toBe('gaugeLength');
      expect(resolveTensileRole('Final Gauge Length (Lu)')).toBe('finalLength');
    });

    it('maps the common real names that matched before (fix round 1)', () => {
      const cases: Array<[string, TensileRole]> = [
        ['Yield Strength Rp0.2', 'proofStress'],
        ['0.2% Proof Strength', 'proofStress'],
        ['0.2% Proof Stress', 'proofStress'],
        ['Rp 0.2', 'proofStress'],
        ['Rp0.2', 'proofStress'],
        ['YS', 'proofStress'],
        ['Proof Strength', 'proofStress'],
        // separate ISO 6892-1 quantities: own read-only roles
        ['ReH', 'upperYield'],
        ['Upper Yield Strength', 'upperYield'],
        ['ReL', 'lowerYield'],
        ['Lower Yield Strength', 'lowerYield'],
        ['Yield Strength Rp0.5', 'proofStress05'],
        ['0.5% Yield Strength', 'proofStress05'],
        ['Rp0.5', 'proofStress05'],
        ['TS', 'uts'],
        ['UTS', 'uts'],
        ['U.T.S.', 'uts'],
        ['% Elongation', 'elongation'],
        ['Elongation %', 'elongation'],
        ['A%', 'elongation'],
        ['Elongation A%', 'elongation'],
        ['% Reduction of Area', 'reductionOfArea'],
        ['% Reduction in Area', 'reductionOfArea'],
        ['Reduction in Area', 'reductionOfArea'],
        ['Z%', 'reductionOfArea'],
        ['RA', 'reductionOfArea'],
        ['Max Load', 'peakLoad'],
        ['Max. Load', 'peakLoad'],
      ];
      cases.forEach(([name, role]) => expect(resolveTensileRole(name)).withContext(name).toBe(role));
    });

    it('does not map a bare "a" (throat thickness symbol)', () => {
      expect(resolveTensileRole('a')).toBeNull();
      expect(resolveTensileRole('A')).toBeNull();
    });

    it('returns null for unrelated, empty or partial names', () => {
      expect(resolveTensileRole('Visual Weld Integrity')).toBeNull();
      expect(resolveTensileRole('Location of Fracture')).toBeNull();
      expect(resolveTensileRole('')).toBeNull();
      expect(resolveTensileRole(null)).toBeNull();
      expect(resolveTensileRole(undefined)).toBeNull();
      expect(resolveTensileRole('Gauge Length Mark')).toBeNull();
    });

    it('normalises case, brackets, separators and a dot ending a word, keeping 0.2 and %', () => {
      expect(normaliseParameterName('  FINAL-Gauge_Length  (mm) ')).toBe('final gauge length');
      expect(resolveTensileRole('FINAL-Gauge_Length (mm)')).toBe('finalLength');
      expect(normaliseParameterName('Max. Load')).toBe('max load');
      expect(normaliseParameterName('0.2% Proof Stress.')).toBe('0.2% proof stress');
    });
  });

  it('has no name listed under two roles (no ambiguous exact match)', () => {
    const owner = new Map<string, TensileRole>();
    const clashes: string[] = [];
    (Object.keys(TENSILE_ROLE_NAMES) as TensileRole[]).forEach(role => {
      TENSILE_ROLE_NAMES[role].forEach(n => {
        if (owner.has(n) && owner.get(n) !== role) clashes.push(n);
        owner.set(n, role);
        expect(normaliseParameterName(n)).withContext(`list entry "${n}" must already be normalised`).toBe(n);
      });
    });
    expect(clashes).toEqual([]);
  });

  describe('buildTensileRoleIndex', () => {
    const e1Slice = [
      'Width of Specimen',
      'Thickness of Specimen',
      'Visual Weld Integrity',
      'Cross Section Area',
      'Throat Thickness',
      'Leg Length 1',
      'Original Gauge Length',
      'Final Gauge Length',
      'Leg Length 2',
      'Yield Load',
      'Ultimate Tensile Load',
      'Ultimate Tensile Strength',
      'Elongation',
      'Location of Fracture',
    ];

    it('maps the E1 header 10042 slice row by row', () => {
      const idx = buildTensileRoleIndex(e1Slice);
      expect(idx.get('width')).toEqual([0]);
      expect(idx.get('thickness')).toEqual([1]);
      expect(idx.get('area')).toEqual([3]);
      expect(idx.get('gaugeLength')).toEqual([6]);
      expect(idx.get('finalLength')).toEqual([7]);
      expect(idx.get('yieldLoad')).toEqual([9]);
      expect(idx.get('peakLoad')).toEqual([10]);
      expect(idx.get('uts')).toEqual([11]);
      expect(idx.get('elongation')).toEqual([12]);
      expect(idx.size).toBe(9);
    });

    it('applies the slice offset (specimen 2 rows)', () => {
      const idx = buildTensileRoleIndex(e1Slice, 14);
      expect(idx.get('gaugeLength')).toEqual([20]);
      expect(roleOfRow(idx, 21)).toBe('finalLength');
      expect(roleOfRow(idx, 18)).toBeNull(); // Throat Thickness
    });

    it('never puts one row under two roles and never maps Throat Thickness or leg lengths', () => {
      const idx = buildTensileRoleIndex(e1Slice);
      const rows = Array.from(idx.values()).flat();
      expect(new Set(rows).size).toBe(rows.length);
      expect(rows).not.toContain(4);
      expect(rows).not.toContain(5);
      expect(rows).not.toContain(8);
    });

    it('groups synonyms of one quantity (header 10027 has "UTS" and "Ultimate Tensile Strength")', () => {
      const idx = buildTensileRoleIndex(['UTS', 'Yield Strength', 'Ultimate Tensile Strength', 'Elongation']);
      expect(idx.get('uts')).toEqual([0, 2]);
      expect(idx.get('proofStress')).toEqual([1]);
    });
  });

  describe('readTensileValues / planTensileWrites', () => {
    it('hydrates a synonym group from the first filled row and writes back to all its rows only', () => {
      const names = ['UTS', 'Ultimate Tensile Strength', 'Yield Strength'];
      const vals: Array<number | null> = [null, 450.4, 290];
      const idx = buildTensileRoleIndex(names);
      const read = readTensileValues(idx, r => vals[r]);
      expect(read.uts).toBe(450);
      expect(read.proofStress).toBe(290);
      const plan = planTensileWrites(idx, read);
      expect(plan.filter(p => p.role === 'uts').map(p => p.rowIdx)).toEqual([0, 1]);
      expect(plan.filter(p => p.role === 'proofStress').map(p => p.rowIdx)).toEqual([2]);
    });

    it('simulates hydrate then write-back: L0=50 and Lu=62 stay on their own rows, Throat Thickness untouched', () => {
      const names = ['Width of Specimen', 'Thickness of Specimen', 'Throat Thickness', 'Original Gauge Length', 'Final Gauge Length'];
      const values: Array<number | null> = [null, 12, null, 50, 62];
      const idx = buildTensileRoleIndex(names);
      const spm = readTensileValues(idx, r => values[r]);
      const out = [...values];
      planTensileWrites(idx, spm).forEach(w => (out[w.rowIdx] = w.value));
      expect(out).toEqual([null, 12, null, 50, 62]);
    });

    it('writes nothing for null / unknown values when no clear is asked', () => {
      const idx = buildTensileRoleIndex(['Elongation', 'Final Gauge Length']);
      expect(planTensileWrites(idx, { elongation: null })).toEqual([]);
    });

    it('a layout with ReH, ReL, Rp0.2 and Rp0.5 rows never copies one into another', () => {
      const names = ['ReH', 'ReL', 'Yield Strength', 'Rp0.5', 'Upper Yield Strength'];
      const vals: Array<number | null> = [300, 280, 290, 295, null];
      const idx = buildTensileRoleIndex(names);
      expect(idx.get('upperYield')).toEqual([0, 4]);
      expect(idx.get('lowerYield')).toEqual([1]);
      expect(idx.get('proofStress')).toEqual([2]);
      expect(idx.get('proofStress05')).toEqual([3]);
      const read = readTensileValues(idx, r => vals[r]);
      expect(read).toEqual({ proofStress: 290 }); // read-only roles never enter the specimen model
      const plan = planTensileWrites(idx, { ...read, proofStress: 310 }, new Set<TensileRole>(['upperYield', 'lowerYield', 'proofStress05']));
      expect(plan).toEqual([{ rowIdx: 2, role: 'proofStress', value: 310 }]);
    });
  });

  describe('null-result path (cleared input)', () => {
    const names = ['Original Gauge Length', 'Final Gauge Length', 'Elongation', 'Cross Section Area', 'Ultimate Tensile Load', 'Ultimate Tensile Strength'];
    const idx = buildTensileRoleIndex(names);

    it('cleared Lu: elongation result is null and its row is written null', () => {
      const spm: TensileValues = { gaugeLength: 50, finalLength: null, elongation: 24 };
      const clear = recalcTensileSpecimen(spm);
      expect(spm.elongation).toBeNull();
      expect(clear.has('elongation')).toBeTrue();
      const plan = planTensileWrites(idx, spm, clear);
      expect(plan).toContain({ rowIdx: 2, role: 'elongation', value: null });
    });

    it('a locked (user-typed) elongation stays when Lu is cleared', () => {
      const spm: TensileValues = { gaugeLength: 50, finalLength: null, elongation: 30 };
      const clear = recalcTensileSpecimen(spm, { locked: { elongation: 30 } });
      expect(spm.elongation).toBe(30);
      expect(clear.has('elongation')).toBeFalse();
      expect(planTensileWrites(idx, spm, clear)).toContain({ rowIdx: 2, role: 'elongation', value: 30 });
    });

    it('inputs are never nulled, even if asked', () => {
      const spm: TensileValues = { gaugeLength: 50, finalLength: null };
      const plan = planTensileWrites(idx, spm, new Set<TensileRole>(['finalLength', 'gaugeLength', 'area', 'peakLoad', 'elongation']));
      // only calculated roles (elongation, calculated S0) may be nulled; inputs never
      expect(plan.filter(p => p.value === null).map(p => p.role)).toEqual(['elongation', 'area']);
      expect(plan).toContain({ rowIdx: 0, role: 'gaugeLength', value: 50 });
    });

    it('without S0 the unlocked Rp / Rm are null and cleared; with S0 they follow the loads', () => {
      const noArea: TensileValues = { peakLoad: 67.5, yieldLoad: 43.5, uts: 450, proofStress: 290 };
      const c1 = recalcTensileSpecimen(noArea);
      expect(noArea.uts).toBeNull();
      expect(noArea.proofStress).toBeNull();
      expect(c1.has('uts')).toBeTrue();
      expect(c1.has('proofStress')).toBeTrue();

      const withArea: TensileValues = { area: 150, peakLoad: null, uts: 450 };
      const c2 = recalcTensileSpecimen(withArea);
      expect(c2.has('uts')).toBeTrue();
      expect(withArea.uts).toBeNull();
    });
  });

  describe('recalcTensileSpecimen', () => {
    it('computes elongation 24 from L0=50 and Lu=62 (table edit flow)', () => {
      const spm: TensileValues = { gaugeLength: 50, finalLength: 62 };
      recalcTensileSpecimen(spm);
      expect(spm.elongation).toBe(24);
    });

    it('computes area from dimensions when asked and the stresses from the loads', () => {
      const spm: TensileValues = { thickness: 12, width: 12.5, yieldLoad: 43.5, peakLoad: 67.5 };
      recalcTensileSpecimen(spm, { recomputeArea: true });
      expect(spm.area).toBe(150);
      expect(spm.proofStress).toBe(290);
      expect(spm.uts).toBe(450);
    });

    it('width cleared with a calculated S0: area and uts both null and both in the clear-set', () => {
      const spm: TensileValues = { thickness: 12, width: 12.5, peakLoad: 67.5 };
      recalcTensileSpecimen(spm, { recomputeArea: true });
      expect(spm.area).toBe(150);
      expect(spm.uts).toBe(450);
      spm.width = null;
      const clear = recalcTensileSpecimen(spm, { recomputeArea: true });
      expect(spm.area).toBeNull();
      expect(spm.uts).toBeNull();
      expect(clear.has('area')).toBeTrue();
      expect(clear.has('uts')).toBeTrue();
      const idx = buildTensileRoleIndex(['Thickness of Specimen', 'Width of Specimen', 'Cross Section Area', 'Ultimate Tensile Load', 'Ultimate Tensile Strength']);
      const plan = planTensileWrites(idx, spm, clear);
      expect(plan.filter(p => p.value === null).map(p => p.role).sort()).toEqual(['area', 'uts']);
      expect(plan).toContain({ rowIdx: 0, role: 'thickness', value: 12 });
      expect(plan).toContain({ rowIdx: 3, role: 'peakLoad', value: 67.5 });
    });

    it('locked (typed) S0 with width cleared: area and uts kept (verifier scenario B)', () => {
      const spm: TensileValues = { area: 150, peakLoad: 67.5 };
      recalcTensileSpecimen(spm, { locked: { area: 150 } });
      expect(spm.uts).toBe(450);
      spm.thickness = 12;
      spm.width = 12.5;
      recalcTensileSpecimen(spm, { recomputeArea: true, locked: { area: 150 } });
      spm.width = null;
      const clear = recalcTensileSpecimen(spm, { recomputeArea: true, locked: { area: 150 } });
      expect(spm.area).toBe(150);
      expect(spm.uts).toBe(450);
      expect(clear.has('area')).toBeFalse();
      expect(clear.has('uts')).toBeFalse();
    });

    it('clearing the S0 row by hand (no dimensions) clears the unlocked uts / proofStress', () => {
      const spm: TensileValues = { area: null, yieldLoad: 43.5, peakLoad: 67.5, proofStress: 290, uts: 450 };
      const clear = recalcTensileSpecimen(spm, { recomputeArea: true });
      expect(spm.uts).toBeNull();
      expect(spm.proofStress).toBeNull();
      expect(clear.has('uts')).toBeTrue();
      expect(clear.has('proofStress')).toBeTrue();
    });

    it('a locked Rm stays when S0 is cleared', () => {
      const spm: TensileValues = { area: null, peakLoad: 67.5, uts: 460 };
      const clear = recalcTensileSpecimen(spm, { recomputeArea: true, locked: { uts: 460 } });
      expect(spm.uts).toBe(460);
      expect(clear.has('uts')).toBeFalse();
    });

    it('never overwrites a value the user typed into a derived row', () => {
      const spm: TensileValues = { gaugeLength: 50, finalLength: 62, area: 150, peakLoad: 67.5 };
      recalcTensileSpecimen(spm, { locked: { elongation: 23.5, uts: 455 } });
      expect(spm.elongation).toBe(23.5);
      expect(spm.uts).toBe(455);
    });

    it('a user-typed area drives the stresses', () => {
      const spm: TensileValues = { thickness: 12, width: 12.5, peakLoad: 67.5 };
      recalcTensileSpecimen(spm, { recomputeArea: true, locked: { area: 135 } });
      expect(spm.area).toBe(135);
      expect(spm.uts).toBe(500);
    });

    it('elongation is not computed when Lu < L0', () => {
      const spm: TensileValues = { gaugeLength: 62, finalLength: 50 };
      recalcTensileSpecimen(spm);
      expect(spm.elongation).toBeNull();
    });
  });

  describe('reload rule for saved calculated values', () => {
    it('saved S0 equal to t x w (within 0.01) counts as calculated', () => {
      expect(isSavedAreaHandTyped(150, 12, 12.5, null)).toBeFalse();
      expect(isSavedAreaHandTyped(150.005, 12, 12.5, null)).toBeFalse();
      expect(isSavedAreaHandTyped(78.54, null, null, 10)).toBeFalse(); // pi x 10^2 / 4
    });

    it('saved S0 that differs, or has no saved dimensions, counts as hand-typed', () => {
      expect(isSavedAreaHandTyped(148, 12, 12.5, null)).toBeTrue();
      expect(isSavedAreaHandTyped(150, 12, null, null)).toBeTrue(); // the bad E1 state: width NULL, CSA 150
      expect(isSavedAreaHandTyped(null, 12, 12.5, null)).toBeFalse();
    });

    it('savedHandTypedRoles: consistent saved values are not locked, inconsistent ones are', () => {
      expect(Array.from(savedHandTypedRoles({ thickness: 12, width: 12.5, area: 150, peakLoad: 67.5, uts: 450, gaugeLength: 50, finalLength: 62, elongation: 24 }))).toEqual([]);
      const locked = savedHandTypedRoles({ thickness: 12, width: null, area: 150, peakLoad: 67.5, uts: 460, gaugeLength: 50, finalLength: null, elongation: 30 });
      expect(locked.has('area')).toBeTrue();
      expect(locked.has('uts')).toBeTrue();
      expect(locked.has('elongation')).toBeTrue();
    });
  });

  describe('bracket content naming a different yield quantity', () => {
    it('routes bracketed 0.5 / Rp0.5 / ReH / ReL / upper / lower out of the Rp0.2 group', () => {
      expect(resolveTensileRole('Yield Strength (Rp0.5)')).toBe('proofStress05');
      expect(resolveTensileRole('Proof Stress (0.5%)')).toBe('proofStress05');
      expect(resolveTensileRole('Yield Strength (Rp 0.5)')).toBe('proofStress05');
      expect(resolveTensileRole('Yield Strength (ReH)')).toBe('upperYield');
      expect(resolveTensileRole('Yield Strength [Upper]')).toBe('upperYield');
      expect(resolveTensileRole('Yield Strength (ReL)')).toBe('lowerYield');
      expect(resolveTensileRole('Yield Stress (lower)')).toBe('lowerYield');
    });

    it('keeps Rp0.2 / unit brackets in proofStress and treats two quantities in brackets as ambiguous', () => {
      expect(resolveTensileRole('Yield Strength (Rp0.2)')).toBe('proofStress');
      expect(resolveTensileRole('Yield Strength (MPa)')).toBe('proofStress');
      expect(resolveTensileRole('Yield Strength (10.5)')).toBe('proofStress');
      expect(resolveTensileRole('Yield Strength (ReH / ReL)')).toBeNull();
    });

    it('accepts the new exact names', () => {
      expect(resolveTensileRole('Proof Stress Rp0.5')).toBe('proofStress05');
      expect(resolveTensileRole('Yield Strength ReH')).toBe('upperYield');
      expect(resolveTensileRole('Yield Strength ReL')).toBe('lowerYield');
    });
  });

  it('findByTensileRole picks the exact role, not a substring hit', () => {
    const params = [
      { parameterName: 'Throat Thickness', value: 8 },
      { parameterName: 'Thickness of Specimen', value: 12 },
      { parameterName: 'Reduction of Area', value: 40 },
      { parameterName: 'Cross Section Area', value: 150 },
    ];
    expect(findByTensileRole(params, 'thickness', p => p.parameterName)?.value).toBe(12);
    expect(findByTensileRole(params, 'area', p => p.parameterName)?.value).toBe(150);
    expect(findByTensileRole(params, 'width', p => p.parameterName)).toBeUndefined();
  });
});
