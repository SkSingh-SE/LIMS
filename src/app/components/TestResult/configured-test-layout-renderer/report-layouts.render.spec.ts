import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { MaterialSpecificationService } from '../../../services/material-specification.service';
import { ParameterService } from '../../../services/parameter.service';
import { ToastService } from '../../../services/toast.service';
import { ConfiguredTestLayoutRendererComponent } from './configured-test-layout-renderer.component';
import { REPORT_CASES, ReportCase, buildForm } from './report-layouts.fixture';

/**
 * Renders the layout of each report of the lab with the values of that report and compares the table with what the
 * report prints. A difference that cannot be fixed on the spot is written to scratch/e2e/render_gaps.md.
 */
describe('Report layouts render like the lab reports', () => {
  let fixture: ComponentFixture<ConfiguredTestLayoutRendererComponent>;
  let cmp: ConfiguredTestLayoutRendererComponent;

  /** Renders and waits for ngModel to put the values into the inputs. */
  async function renderStable(c: ReportCase, opts: { status?: string; viewMode?: boolean; printMode?: boolean } = {}): Promise<HTMLElement> {
    const host = render(c, opts);
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();
    return host;
  }

  function render(c: ReportCase, opts: { status?: string; viewMode?: boolean; printMode?: boolean } = {}) {
    fixture = TestBed.createComponent(ConfiguredTestLayoutRendererComponent);
    cmp = fixture.componentInstance;
    cmp.layoutConfig = JSON.parse(JSON.stringify(c.layout));
    cmp.test = { headerId: 1, name: c.testName, status: opts.status ?? 'Started', totalSpecimens: c.specimens ?? 1, readings: c.readings ?? [] };
    cmp.testPlan = { type: 'Mechanical', totalSpecimens: c.specimens ?? 1 };
    cmp.testFormGroup = buildForm(c);
    cmp.sample = { thickness: 10, width: 20 };
    cmp.activeTabSection = 'execution';
    cmp.isViewMode = !!opts.viewMode;
    cmp.printMode = !!opts.printMode;
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  /** Each row of the first result table: inputs as their value, other cells as their text. */
  function tableRows(host: HTMLElement, selector = 'table'): string[][] {
    const table = host.querySelector(selector) as HTMLElement;
    return Array.from(table.querySelectorAll('tr')).map(tr =>
      Array.from(tr.querySelectorAll('th, td')).filter(cell => getComputedStyle(cell).display !== 'none' && !cell.classList.contains('action-col')).map(cell => {
        const input = cell.querySelector('input') as HTMLInputElement | null;
        return (input ? input.value : (cell.textContent || '')).replace(/\s+/g, ' ').trim();
      }));
  }

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

  const caseOf = (id: string) => REPORT_CASES.find(c => c.id === id)!;

  it('has a layout for every case with a reference file', () => {
    expect(REPORT_CASES.length).toBeGreaterThan(0);
    REPORT_CASES.forEach(c => {
      expect(c.reference).toBeTruthy();
      expect(c.layout.sections.length).toBeGreaterThan(0);
    });
  });

  describe('L5 Brinell: samples as rows, three readings, Average', () => {
    it('prints each sample with its readings and its average to two decimals', async () => {
      const rows = tableRows(await renderStable(caseOf('L5-brinell')));
      expect(rows[0][0]).toBe('Sample ID/Locaton');
      expect(rows[0][rows[0].length - 1]).toBe('Average');
      expect(rows.slice(1)).toEqual([
        ['A1', '130', '131', '131', '130.67'],
        ['A2', '145.1', '146', '145.2', '145.43'],
        ['B1', '140', '139.5', '140', '139.83'],
        ['B2', '130', '131', '131', '130.67'],
      ]);
    });

    it('writes the average of all readings and the readings into the parameter row, not into a copy per row', () => {
      render(caseOf('L5-brinell'));
      cmp.onGridReadingChange(cmp.sections[0], 'S1', 0, 130); // any change writes the result
      const row = cmp.parametersFormArray.at(0);
      expect(row.get('value')?.value).toBeCloseTo((130 + 131 + 131 + 145.1 + 146 + 145.2 + 140 + 139.5 + 140 + 130 + 131 + 131) / 12, 2);
      expect(Object.keys(JSON.parse(row.get('remarks')?.value || '{}'))).toEqual(['S1', 'S2', 'S3', 'S4']);
    });

    it('a typed reading updates the average and is saved under the sample code and the reading number', () => {
      render(caseOf('L5-brinell'));
      const s = cmp.sections[0];
      cmp.onGridReadingChange(s, 'S1', 0, 133);
      expect(cmp.gridAggregate(s, 'S1')).toBeCloseTo(131.67, 2);
      const saved = cmp.buildReadingsArray().filter(r => r.specimenCode === 'S1');
      expect(saved.map(r => [r.sequenceNo, r.value])).toEqual([[1, 133], [2, 131], [3, 131]]);
      expect(saved.every(r => r.parameterName === 'Hardness in HBW')).toBeTrue();
    });

    it('nothing is written when the sheet is printed', async () => {
      const host = await renderStable(caseOf('L5-brinell'), { printMode: true, viewMode: true });
      const before = JSON.stringify(cmp.parametersFormArray.getRawValue());
      cmp.onGridReadingChange(cmp.sections[0], 'S1', 0, 999);
      expect(JSON.stringify(cmp.parametersFormArray.getRawValue())).toBe(before);
      expect(tableRows(host).slice(1)[0].slice(0, 2)).toEqual(['A1', '130']);
    });
  });

  describe('L8 Micro Vickers: readings down the rows, Avg.', () => {
    it('prints RESULT 1..3 and Avg. under the sample column', async () => {
      const rows = tableRows(await renderStable(caseOf('L8-micro-vickers')));
      expect(rows).toEqual([
        ['Location', 'Micro Vickers Hardness Value (HV)'],
        ['RESULT 1', '477.41'],
        ['RESULT 2', '474.75'],
        ['RESULT 3', '458.45'],
        ['Avg.', '470.20'],
      ]);
    });
  });

  describe('L10 Case depth (microscopic): readings 1..5 down the rows', () => {
    it('numbers the readings 1..5 when the layout leaves the label empty', async () => {
      const rows = tableRows(await renderStable(caseOf('L10-case-depth-micro')));
      expect(rows).toEqual([
        ['Location', 'Case Depth Measurement in Microns'],
        ['1', '641.99'],
        ['2', '623.34'],
        ['3', '632.92'],
        ['4', '638.25'],
        ['5', '628.66'],
        ['Avg.', '633.03'],
      ]);
    });
  });

  describe('L10 Case depth: the text parameters stay enterable', () => {
    it('the parameter table lists the parameters the grid does not show', async () => {
      const host = await renderStable(caseOf('L10-case-depth-micro'));
      const tables = host.querySelectorAll('table');
      expect(tables.length).toBe(2);
      const text = (tables[1].textContent || '').replace(/\s+/g, ' ');
      expect(text).toContain('Observation at');
      expect(text).toContain('Etchant');
      expect(text).not.toContain('Case Depth');
    });

    it('a reading section without a target still lists the test parameters itself (no second table)', async () => {
      const c = JSON.parse(JSON.stringify(caseOf('L10-case-depth-micro')));
      c.layout.sections[0].config.targetParamName = '';
      const host = await renderStable(c);
      expect(host.querySelectorAll('table').length).toBe(1);
    });
  });

  describe('L11 Ferrite content: frames as rows, two phases', () => {
    it('prints the five frames, the average and the requirement of the ferrite column', fakeAsync(() => {
      const host = render(caseOf('L11-ferrite'));
      flushMicrotasks();
      fixture.detectChanges();
      const rows = tableRows(host);
      expect(rows[0]).toEqual(['Frames', 'Ferrite%(Red)', 'Austenite%(green)']);
      expect(rows.slice(1, 6)).toEqual([
        ['1', '57.04', '42.96'], ['2', '57.06', '42.94'], ['3', '57.01', '42.99'], ['4', '57.05', '42.95'], ['5', '57.08', '42.92'],
      ]);
      expect(rows[6][0]).toBe('Avg.');
      expect(rows[6].slice(1)).toEqual(['57.05', '42.95']);
      expect(rows[7][0]).toBe('Requirement');
      expect(rows[7][1]).toBe('%Fe: 40%-60%');
    }));
  });

  describe('L4 Izod: S.NO.1 / S.NO.2, text size row, requirement column', () => {
    it('prints the size as text and the energies, with the requirement of the energy row', fakeAsync(() => {
      const host = render(caseOf('L4-izod'));
      flushMicrotasks();
      fixture.detectChanges();
      const rows = tableRows(host);
      expect(rows[0]).toEqual(['', 'S.NO.1', 'S.NO.2', 'Requirement']);
      expect(rows[1].slice(0, 3)).toEqual(['Size of Test Specimen(in mm)', '10X10X75', '10X10X75']);
      expect(rows[2].slice(0, 3)).toEqual(['Absorbed energy (J)', '94', '86']);
      expect(rows[2][3]).toBe('≥ 28');
    }));
  });

  describe('L1 Tensile: the rows are named as the report names them', () => {
    it('uses the layout names for the rows it lists', () => {
      const host = render(caseOf('L1-tensile'));
      const names = tableRows(host).slice(1).map(r => r[0]);
      expect(names).toContain('Thickness of specimen (mm)');
      expect(names).toContain('Width of specimen (mm)');
      expect(names).toContain('Yield strength (N/mm²)');
      expect(names).toContain('U.T.S (N/mm²)');
      expect(names).toContain('Elongation (%)');
    });
  });
});
