import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { FormArray, FormControl, FormGroup } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { MaterialSpecificationService } from '../../../services/material-specification.service';
import { ParameterService } from '../../../services/parameter.service';
import { ToastService } from '../../../services/toast.service';
import { ConfiguredTestLayoutRendererComponent } from './configured-test-layout-renderer.component';

function row(id: number, name: string, unit: string, extra: Record<string, any> = {}): FormGroup {
  const v: Record<string, any> = {
    id, specimenIndex: 0, parameterID: id, parameterName: name, unit, value: null, remarks: '', minValue: 200, maxValue: null,
    isWithinLimit: null, altered: false, formulaExpression: '', formulaDisplay: '', isCalculated: false, inputType: 'Decimal',
    dropdownOptions: [], specMinValue: 200, specMaxValue: null, acceptanceCriteria: '', specificationLineID: null,
    isAdditional: false, specSource: '', isStandalone: false, sourceTestMethodId: null, resultStatus: null, parameterType: '',
    testMethodUsed: '', decimalPrecision: 2, conversionFactor: 1, convertedValue: null, selectedUnit: '', unitOptions: [],
    isBillable: true, isReportable: true, ...extra,
  };
  const g: Record<string, FormControl> = {};
  Object.keys(v).forEach(k => (g[k] = new FormControl(v[k])));
  return new FormGroup(g);
}

/** A1 of the report format rollout: the specimen matrix follows the layout the studio saved. */
describe('ConfiguredTestLayoutRendererComponent specimen layout', () => {
  let fixture: ComponentFixture<ConfiguredTestLayoutRendererComponent>;
  let cmp: ConfiguredTestLayoutRendererComponent;
  let counts: number[];

  function create(config: Record<string, any>, opts: { testName?: string; status?: string; planned?: number; extra?: any } = {}) {
    fixture = TestBed.createComponent(ConfiguredTestLayoutRendererComponent);
    cmp = fixture.componentInstance;
    cmp.layoutConfig = { layoutName: 'L', sections: [{ id: 1, type: 'specimen', title: 'Results', config }] };
    cmp.test = {
      headerId: 1, name: opts.testName ?? 'Hardness Test', status: opts.status ?? 'Pending', totalSpecimens: opts.planned ?? 1,
      executionExtraJson: opts.extra ? JSON.stringify(opts.extra) : undefined,
    };
    cmp.testPlan = { type: 'Mechanical', totalSpecimens: opts.planned ?? 1 };
    cmp.testFormGroup = new FormGroup({
      remarks: new FormControl(''),
      parameters: new FormArray([row(1, 'Hardness HV', 'HV'), row(2, 'Case Depth', 'mm'), row(3, 'Spread', 'HV')]),
    });
    cmp.sample = {};
    cmp.activeTabSection = 'execution';
    counts = [];
    cmp.specimenCountChanged.subscribe(n => counts.push(n));
    fixture.detectChanges();
  }

  const host = () => fixture.nativeElement as HTMLElement;
  const headers = () => Array.from(host().querySelectorAll('table.lims-matrix-table thead th')).map(th => (th.textContent || '').replace(/\s+/g, ' ').trim());
  const firstColumn = () => Array.from(host().querySelectorAll('table.lims-matrix-table tbody tr')).map(tr => (tr.querySelector('td')?.textContent || '').replace(/\s+/g, ' ').trim());

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfiguredTestLayoutRendererComponent],
      providers: [
        provideRouter([]),
        { provide: ParameterService, useValue: { getParameterDropdown: () => of([]), getParameterById: () => of(null) } },
        { provide: MaterialSpecificationService, useValue: { getGradeDropdown: () => of([]), getConditionOptions: () => of([]) } },
        { provide: ToastService, useValue: { show: () => undefined } },
      ],
    }).compileComponents();
  });

  describe('specimen names', () => {
    it('uses the layout names, else prefix + number, else S{n}', () => {
      create({ specimenRows: ['S.NO.1', '  ', 'Third'], prefix: 'X', orientation: 'Parameters × Specimens' });
      expect([0, 1, 2, 3].map(i => cmp.specimenLabel(i))).toEqual(['S.NO.1', 'X2', 'Third', 'X4']);
      create({ orientation: 'Parameters × Specimens' });
      expect(cmp.specimenLabel(0)).toBe('S1');
    });

    it('shows the names in the matrix header', fakeAsync(() => {
      create({ specimenRows: ['Sample 1', 'Sample 2'], orientation: 'Parameters × Specimens', showAverage: false, showRequirement: false });
      flushMicrotasks();
      fixture.detectChanges();
      expect(headers()).toContain('Sample 1');
      expect(headers()).toContain('Sample 2');
    }));
  });

  describe('parameter rows', () => {
    it('follow the checklist, the row list (hidden, renamed through sourceName) and show all when none is named', () => {
      create({
        orientation: 'Parameters × Specimens',
        specimenColumns: ['Hardness HV', 'Case Depth'],
        tableRows: [
          { key: 'param_0', label: 'Hardness in HV10', sourceName: 'Hardness HV', visible: true },
          { key: 'param_1', label: 'Case Depth', sourceName: 'Case Depth', visible: false },
        ],
      });
      expect(cmp.specimenParams(cmp.specimenSection).map(p => p.displayName)).toEqual(['Hardness in HV10']);

      create({ orientation: 'Parameters × Specimens', specimenColumns: ['Not a parameter of this test'] });
      expect(cmp.specimenParams(cmp.specimenSection).length).toBe(3);
    });
  });

  describe('columns', () => {
    it('Average, Requirement and Status follow the section switches and the column list', () => {
      create({ orientation: 'Parameters × Specimens', showAverage: true, showRequirement: true, showStatus: true });
      const s = cmp.specimenSection;
      expect(['avg', 'requirement', 'status', 'unit'].map(k => cmp.specimenShow(s, k as any))).toEqual([true, true, true, true]);

      create({
        orientation: 'Parameters × Specimens', showAverage: false,
        tableColumns: [{ key: 'requirement', label: 'Req.', visible: false }, { key: 'status', label: 'Result', visible: false }, { key: 'unit', visible: false }],
      });
      const s2 = cmp.specimenSection;
      expect(['avg', 'requirement', 'status', 'unit'].map(k => cmp.specimenShow(s2, k as any))).toEqual([false, false, false, false]);
      expect(cmp.columnLabel(s2, 'requirement', 'Requirement')).toBe('Req.');
      expect(headers()).not.toContain('Status');
    });

    it('the Unit column is hidden, the specimen headers stay', () => {
      create({ orientation: 'Parameters × Specimens', specimenRows: ['A'], tableColumns: [{ key: 'unit', visible: false }] });
      const table = host().querySelector('table.lims-matrix-table') as HTMLElement;
      expect(table.classList.contains('hide-unit-col')).toBeTrue();
      const ths = Array.from(table.querySelectorAll('thead th')) as HTMLElement[];
      expect(getComputedStyle(ths[1]).display).toBe('none'); // Unit
      expect(getComputedStyle(ths[2]).display).not.toBe('none'); // first specimen
    });
  });

  describe('orientation', () => {
    it('Parameters × Specimens: parameters are rows', () => {
      create({ orientation: 'Parameters × Specimens', specimenRows: ['A', 'B'], showAverage: false, showRequirement: false, showStatus: false });
      expect(cmp.isTransposed(cmp.specimenSection)).toBeFalse();
      expect(firstColumn()).toEqual(['Hardness HV', 'Case Depth', 'Spread']);
    });

    it('Specimens × Parameters: specimens are rows, parameters columns, Average / Requirement / Status close the table', fakeAsync(() => {
      create({ orientation: 'Specimens × Parameters', specimenRows: ['S.NO.1', 'S.NO.2'], specimenColHeader: 'Sample ID', showAverage: true, showRequirement: true, showStatus: true });
      flushMicrotasks();
      fixture.detectChanges();
      expect(cmp.isTransposed(cmp.specimenSection)).toBeTrue();
      expect(headers()).toEqual(['Sample ID', 'Hardness HVHV', 'Case Depthmm', 'SpreadHV']); // name and unit are two lines
      expect(firstColumn()).toEqual(['S.NO.1', 'S.NO.2', 'Average', 'Requirement', 'Status']);
    }));

    it('the tensile matrix always keeps parameters as rows', () => {
      create({ orientation: 'Specimens × Parameters' }, { testName: 'Tensile Test' });
      expect(cmp.isTransposed(cmp.specimenSection)).toBeFalse();
    });
  });

  describe('specimen count from the layout', () => {
    it('a test that has not started takes the count of the layout once and tells the parent', fakeAsync(() => {
      create({ orientation: 'Parameters × Specimens', specimenRows: ['S.NO.1', 'S.NO.2', 'S.NO.3'] }, { planned: 1 });
      flushMicrotasks();
      expect(cmp.specimens.length).toBe(3);
      expect(counts).toEqual([3]);
      // the choice is saved with the test, so it is not applied again
      expect(JSON.parse(cmp.getExecutionExtraJson()).specimenCountApplied).toBeTrue();
    }));

    it('a smaller layout count also wins (the plan quantity is only the starting value)', fakeAsync(() => {
      create({ orientation: 'Parameters × Specimens', specimenRows: ['A', 'B'] }, { planned: 4 });
      flushMicrotasks();
      expect(cmp.specimens.length).toBe(2);
    }));

    it('leaves a started test, a finished choice and a read-only view alone', fakeAsync(() => {
      create({ specimenRows: ['A', 'B', 'C'] }, { status: 'Started', planned: 1 });
      flushMicrotasks();
      expect(cmp.specimens.length).toBe(1);

      create({ specimenRows: ['A', 'B', 'C'] }, { planned: 1, extra: { specimenCountApplied: true } });
      flushMicrotasks();
      expect(cmp.specimens.length).toBe(1);

      fixture = TestBed.createComponent(ConfiguredTestLayoutRendererComponent);
      cmp = fixture.componentInstance;
      cmp.layoutConfig = { sections: [{ id: 1, type: 'specimen', title: 'R', config: { specimenRows: ['A', 'B', 'C'] } }] };
      cmp.test = { headerId: 1, name: 'Hardness Test', status: 'Pending', totalSpecimens: 1 };
      cmp.testPlan = { type: 'Mechanical', totalSpecimens: 1 };
      cmp.testFormGroup = new FormGroup({ remarks: new FormControl(''), parameters: new FormArray([row(1, 'Hardness HV', 'HV')]) });
      cmp.isViewMode = true;
      cmp.activeTabSection = 'execution';
      fixture.detectChanges();
      flushMicrotasks();
      expect(cmp.specimens.length).toBe(1);
    }));

    it('a layout without any specimen names keeps the plan quantity', fakeAsync(() => {
      create({ orientation: 'Parameters × Specimens' }, { planned: 2 });
      flushMicrotasks();
      expect(cmp.specimens.length).toBe(2);
      expect(counts).toEqual([]);
    }));
  });
});
