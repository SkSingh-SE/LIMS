import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormArray, FormControl, FormGroup } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { MaterialSpecificationService } from '../../../services/material-specification.service';
import { ParameterService } from '../../../services/parameter.service';
import { ToastService } from '../../../services/toast.service';
import { normalizeLayoutConfig, serializeLayoutConfig } from '../../../utility/helper/test-layout-config.helper';
import { ConfiguredTestLayoutRendererComponent } from './configured-test-layout-renderer.component';

/** One parameter row with the controls the result entry form gives every row. */
function paramRow(id: number, name: string, value: any, specimenIndex = 0, extra: Record<string, any> = {}): FormGroup {
  const v: Record<string, any> = {
    id, specimenIndex, parameterID: id, parameterName: name, unit: '', value, remarks: '',
    minValue: null, maxValue: null, isWithinLimit: null, altered: false, formulaExpression: '', formulaDisplay: '',
    isCalculated: false, inputType: 'Decimal', dropdownOptions: [], specMinValue: null, specMaxValue: null,
    acceptanceCriteria: '', specificationLineID: null, isAdditional: false, specSource: '', isStandalone: false,
    sourceTestMethodId: null, resultStatus: null, parameterType: '', testMethodUsed: '', decimalPrecision: 2,
    conversionFactor: 1, convertedValue: null, selectedUnit: '', unitOptions: [], isBillable: true, isReportable: true,
    ...extra,
  };
  const g: Record<string, FormControl> = {};
  Object.keys(v).forEach(k => (g[k] = new FormControl(v[k])));
  return new FormGroup(g);
}

/** What the layout studio configures per section and the result screen has to honour (2026-11 config audit). */
describe('ConfiguredTestLayoutRendererComponent section config', () => {
  let fixture: ComponentFixture<ConfiguredTestLayoutRendererComponent>;
  let cmp: ConfiguredTestLayoutRendererComponent;

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

  function create(sections: any[], opts: { printMode?: boolean; images?: any[]; rows?: FormGroup[]; extra?: any; equipment?: any[] } = {}): HTMLElement {
    fixture = TestBed.createComponent(ConfiguredTestLayoutRendererComponent);
    cmp = fixture.componentInstance;
    cmp.layoutConfig = { layoutName: 'T', sections };
    cmp.test = { headerId: 9, name: 'Hardness Test', status: 'InProgress', totalSpecimens: 2, executionExtraJson: opts.extra ? JSON.stringify(opts.extra) : '' };
    cmp.testPlan = { type: 'Mechanical' };
    cmp.testFormGroup = new FormGroup({
      remarks: new FormControl(''), roomTemperature: new FormControl(23), roomHumidity: new FormControl(50),
      parameters: new FormArray(opts.rows || [
        paramRow(1, 'Load', 10, 0), paramRow(2, 'Extension', 2, 0), // rows of one parameter on different specimens share the parameter id
        paramRow(3, 'Load', 30, 1, { parameterID: 1 }), paramRow(4, 'Extension', 5, 1, { parameterID: 2, maxValue: 8 }),
      ]),
    });
    cmp.sample = { sampleNo: '26-000123-1' };
    cmp.inward = { statementOfConformity: 'Applicable', decisionRule: 'Without taking MOU into account' };
    cmp.timingData = { performedByName: 'H.K. Vamja', testEndTime: '2026-10-02T10:00:00' };
    cmp.selectedEquipment = opts.equipment || [{ name: 'Impact Machine', equipmentNo: 'DMSPL/07/07', nextCalibrationDueDate: '2027-06-11' }];
    cmp.testImages = opts.images || [];
    cmp.activeTabSection = 'execution';
    cmp.printMode = !!opts.printMode;
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  const sec = (type: string, config: Record<string, any> = {}, title = type) => ({ id: type + '-1', type, title, config });

  it('normalizer: retired keys go, "manual" binding becomes entry, a switched-off section is left out', () => {
    const cfg = normalizeLayoutConfig({
      sections: [
        { id: 1, type: 'specimen', title: 'S', config: { visibility: 'Always', pageBreak: 'Auto', showConformanceVerdict: false, width: 'Auto', tableRows: [{ key: 'a', label: 'A', bindingMode: 'manual', visible: true }] } },
        { id: 2, type: 'narrative', title: 'N', config: { enabled: false } },
      ],
    });
    expect(cfg.sections.length).toBe(1);
    const c: any = cfg.sections[0].config;
    expect(c.visibility).toBeUndefined();
    expect(c.pageBreak).toBeUndefined();
    expect(c.showStatus).toBeFalse();
    expect(c.width).toBe('Full Width');
    expect(c.tableRows[0].bindingMode).toBe('runtime');
    expect(serializeLayoutConfig(cfg)).not.toContain('showConformanceVerdict');
  });

  it('print: a section the layout does not print is left out, and titles show only when asked', () => {
    const host = create([sec('narrative', { reportable: false, label: 'Internal note', sectionKey: 'n1' }), sec('checklist', { printTitle: true }, 'Checks'), sec('parameter')], { printMode: true });
    expect(host.querySelectorAll('.lims-workbench-card').length).toBe(2);
    expect(host.querySelectorAll('.lims-section-head:not(.d-none)').length).toBe(1);
  });

  it('checklist: items of the layout with the answers it offers', () => {
    create([sec('checklist', { items: 'Polished, Etched', responseType: 'Applied / Not applied' }), sec('parameter')]);
    expect(cmp.checklistItems.map(i => i.label)).toEqual(['Polished', 'Etched']);
    expect(cmp.checklistOptions(cmp.sections[0]).map(o => o.label)).toEqual(['Applied', 'Not applied']);
  });

  it('traceability and sign: only the boxes the layout lists', () => {
    const host = create([sec('traceability', { fields: ['Analyst / Tester', 'Equipment ID', 'Calibration Due', 'Sample / Lab ID'] }), sec('sign', { fields: ['Tested & Recorded By'] }), sec('parameter')]);
    expect(cmp.traceFields(cmp.sections[0])).toEqual([
      { label: 'Analyst / Tester', value: 'H.K. Vamja' }, { label: 'Equipment ID', value: 'DMSPL/07/07' },
      { label: 'Calibration Due', value: '11-06-2027' }, { label: 'Sample / Lab ID', value: '26-000123-1' },
    ]);
    expect(host.querySelectorAll('.trace-box').length).toBe(4);
    expect(host.querySelectorAll('.sign-box').length).toBe(1);
  });

  it('photo: an image captioned with a slot title fills that slot, a fixed image stays, the record leaves empty slots out', () => {
    const slots = [
      { id: 'a', title: 'Before Test', caption: 'as received', bindingSource: 'runtime', mandatory: true, reportable: true },
      { id: 'b', title: 'After 48 hours', bindingSource: 'runtime', mandatory: true, reportable: true },
      { id: 'c', title: 'Sketch', bindingSource: 'static', imageUrl: 'data:image/png;base64,AAAA', reportable: true },
    ];
    const photo = sec('photo', { photoSlots: slots, gridColumns: '2 Columns (Pair)', requirePhotoToVerify: true, showPostText: true, postText: 'Note: 20X' });
    create([photo, sec('parameter')], { images: [{ url: 'u-after', name: 'x.jpg', caption: 'After 48 hours' }] });
    const cells = cmp.photoCells(cmp.sections[0]);
    expect(cells.map(c => [c.title, c.url, c.required])).toEqual([['Before Test', '', true], ['After 48 hours', 'u-after', false], ['Sketch', 'data:image/png;base64,AAAA', false]]);
    expect(cmp.photoColClass(cmp.sections[0])).toBe('col-6');
    expect(cmp.photoText(cmp.sections[0], 'post')).toBe('Note: 20X');
    expect(cmp.photoGaps()).toEqual(['Before Test']);
    fixture.destroy();
    create([photo, sec('parameter')], { printMode: true, images: [{ url: 'u-after', name: 'x.jpg', caption: 'After 48 hours' }] });
    expect(cmp.photoCells(cmp.sections[0]).map(c => c.title)).toEqual(['After 48 hours', 'Sketch']);
  });

  it('custom table: fixed cells, entered cells and a formula over them', () => {
    const cell = (r: number, c: number, extra: Record<string, any> = {}) => ({ id: `cell_${r}_${c}`, rowIdx: r, colIdx: c, rowKey: 'r' + r, colKey: 'c' + c, value: '', dataType: 'text', bindingMode: 'runtime', ...extra });
    const custom = sec('custom', {
      sectionKey: 'wt',
      tableColumns: [{ key: 'c0', label: 'Test Parameters', bindingMode: 'static', visible: true }, { key: 'c1', label: 'Observed Values', bindingMode: 'runtime', visible: true }],
      tableRows: [{ key: 'r0', label: 'Initial', visible: true }, { key: 'r1', label: 'Final', visible: true }, { key: 'r2', label: 'Loss', visible: true }],
      cellMatrix: [
        [cell(0, 0, { bindingMode: 'static', value: 'Initial weight (g)' }), cell(0, 1, { dataType: 'number' })],
        [cell(1, 0, { bindingMode: 'static', value: 'Final weight (g)' }), cell(1, 1, { dataType: 'number' })],
        [cell(2, 0, { bindingMode: 'static', value: 'Loss (g)' }), cell(2, 1, { dataType: 'formula', formulaExpression: '=[r0,c1] - [r1,c1]', precision: 4 })],
      ],
    });
    const host = create([custom, sec('parameter')]);
    const s = cmp.sections[0];
    const m = cmp.customMatrix(s)!;
    expect(cmp.customHeaders(s)).toEqual(['Test Parameters', 'Observed Values']);
    expect(cmp.customCellValue(s, m[2][1])).toBe('');
    cmp.onCustomCellChange(s, m[0][1], '81.9459');
    cmp.onCustomCellChange(s, m[1][1], '81.9458');
    expect(cmp.customCellValue(s, m[2][1])).toBe('0.0001');
    expect(JSON.parse(cmp.getExecutionExtraJson()).customCells.wt.cell_0_1).toBe('81.9459');
    expect(host.querySelector('.custom-attributes-section')).toBeNull();
  });

  it('required items of the layout are reported until they are filled', () => {
    create([
      sec('narrative', { label: 'Remarks', sectionKey: 'first' }),
      sec('narrative', { label: 'Observation', required: true, sectionKey: 'obs' }),
      sec('condition', { fields: ['Test Temperature'], required: true }),
      sec('checklist', { items: 'Polished', requireAll: true }, 'Preparation'),
      sec('parameter'),
    ]);
    expect(cmp.requiredGaps()).toEqual(['Observation', 'Test Temperature', 'Preparation: every item needs an answer']);
    cmp.onNarrativeChange(cmp.sections[1], 'No pitting observed.');
    cmp.onConditionChange('Test Temperature', '50');
    cmp.setChecklistStatus(cmp.checklistItems[0], 'Pass');
    expect(cmp.requiredGaps()).toEqual([]);
  });

  it('narrative: default text of the layout until the technician writes, single-line input when asked', () => {
    const host = create([sec('narrative', { label: 'Remarks', sectionKey: 'first' }), sec('narrative', { label: 'Etchant', sectionKey: 'etch', inputType: 'Single line', defaultText: '2 % Nital' }), sec('parameter')]);
    expect(cmp.narrativeValue(cmp.sections[1])).toBe('2 % Nital');
    expect(JSON.parse(cmp.getExecutionExtraJson()).narratives.etch).toBe('2 % Nital');
    expect(host.querySelectorAll('.narrative-box input[type="text"]').length).toBe(1);
  });

  it('chart: X and Y parameters of the layout, one point per specimen, with the limit line', () => {
    create([sec('chart', { chartType: 'scatter', xField: 'Load', yField: 'Extension', xUnit: 'kN', yUnit: 'mm', showLimit: true }), sec('parameter')]);
    const chart = cmp.configuredChart(cmp.sections[0])!;
    expect(chart.type).toBe('scatter');
    expect(chart.points.map(p => [p.x, p.y])).toEqual([[10, 2], [30, 5]]);
    expect(chart.xTitle).toBe('Load (kN)');
    expect(chart.limits.map(l => l.label)).toEqual(['Max 8']);
    expect(cmp.configuredChart({ config: { xField: 'Auto – Parameter 1', yField: 'Auto – Parameter 2' } })).toBeNull();
  });

  it('parameter table: the layout subset first, the other parameters of the test after it', () => {
    create([sec('parameter', { parameterMode: 'Configured parameter subset', subset: ['Extension'] })]);
    const names = cmp.getFilteredParamIndices().map(i => cmp.parametersFormArray.at(i).get('parameterName')?.value + '/' + cmp.getSpecimenIndexForParam(i));
    expect(names).toEqual(['Extension/0', 'Load/0', 'Extension/1', 'Load/1']);
    expect(cmp.isOutsideSubset(0)).toBeTrue();
  });

  it('location grid: merged heading over the readings; traverse: labels and cut-off of the layout', () => {
    const loc = sec('location', { locationRows: ['WELD-TOP'], locationParams: ['Load'], locationReadings: 3, orientation: 'Parameters under each location', headerMerge: { title: 'Impact Energy Observed (in Joules)', isMerged: true, showSubLabels: false } });
    const trav = sec('traverse', { xField: 'Exposure Time', xUnit: 'Hours', yField: 'Corrosion Observation', yUnit: 'Rating' });
    create([loc, trav]);
    expect(cmp.locMergedTitle(cmp.sections[0])).toBe('Impact Energy Observed (in Joules)');
    expect(cmp.locShowReadingLabels(cmp.sections[0])).toBeFalse();
    expect(cmp.traverseLabel(cmp.sections[1], 'x')).toBe('Exposure Time (Hours)');
    expect(cmp.isCaseDepthTraverse(cmp.sections[1])).toBeFalse();
    expect(cmp.cutoffLimit).toBe(550);
    expect(cmp.isCaseDepthTraverse({ config: { yUnit: 'HV' } })).toBeTrue();
  });

  it('specimen matrix: fixed-value rows of the layout show while the technician may adjust; min / max are real values', () => {
    const spm = sec('specimen', { showMinMax: true, tableRows: [{ key: 'size', label: 'Size of Test Specimen', bindingMode: 'static', staticValue: '10X10X55', visible: true }] });
    create([spm]);
    const rows = cmp.specimenParams(cmp.sections[0]);
    expect(rows[0].isStatic).toBeTrue();
    expect(rows[0].staticValue).toBe('10X10X55');
    const load = rows.find((r: any) => r.name === 'Load');
    expect(cmp.getBaseParamStat(load.index, 'min')).toBe('10');
    expect(cmp.getBaseParamStat(load.index, 'max')).toBe('30');
  });
});
