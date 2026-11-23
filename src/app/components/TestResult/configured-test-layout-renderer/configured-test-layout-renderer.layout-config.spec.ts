import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormArray, FormControl, FormGroup } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { MaterialSpecificationService } from '../../../services/material-specification.service';
import { ParameterService } from '../../../services/parameter.service';
import { ToastService } from '../../../services/toast.service';
import { ConfiguredTestLayoutRendererComponent } from './configured-test-layout-renderer.component';

/** A1: the renderer reads the layout the way the studio saved it (A0 of the report format rollout). */
describe('ConfiguredTestLayoutRendererComponent layout config', () => {
  let fixture: ComponentFixture<ConfiguredTestLayoutRendererComponent>;
  let cmp: ConfiguredTestLayoutRendererComponent;

  function create(sections: any[], opts: { printMode?: boolean; viewMode?: boolean } = {}) {
    fixture = TestBed.createComponent(ConfiguredTestLayoutRendererComponent);
    cmp = fixture.componentInstance;
    cmp.layoutConfig = { layoutName: 'Test layout', id: 7, sections };
    cmp.test = { headerId: 1, name: 'Hardness Test', status: 'Started', totalSpecimens: 1 };
    cmp.testPlan = { type: 'Mechanical' };
    cmp.testFormGroup = new FormGroup({ remarks: new FormControl(''), parameters: new FormArray([]) });
    cmp.sample = {};
    cmp.activeTabSection = 'execution';
    cmp.printMode = !!opts.printMode;
    cmp.isViewMode = !!opts.viewMode;
    fixture.detectChanges();
  }

  const host = () => fixture.nativeElement as HTMLElement;

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

  it('turns shorthand type names into the canonical ones', () => {
    create([
      { id: 1, type: 'spm', title: 'Specimens', config: {} },
      { id: 2, type: 'loc', title: 'Zones', config: {} },
      { id: 3, type: 'note', title: 'Note', config: {} },
      { id: 4, type: 'chk', title: 'Checks', config: {} },
    ]);
    expect(cmp.sections.map(s => s.type)).toEqual(['specimen', 'location', 'narrative', 'checklist']);
    expect(cmp.sections.every(s => !cmp.isUnsupportedSection(s))).toBeTrue();
  });

  it('a layout saved with the literal "spm" type still hides the plain parameter table', () => {
    create([{ id: 1, type: 'spm', title: 'Specimens', config: {} }]);
    expect(cmp.hasSectionOfType('spm')).toBeTrue();
    create([{ id: 1, type: 'specimen', title: 'Specimens', config: {} }]);
    expect(cmp.hasSectionOfType('spm')).toBeFalse();
  });

  it('shows a warning card, not an empty section, for a type the screen cannot draw', () => {
    create([
      { id: 1, type: 'condition', title: 'Conditions', config: {} },
      { id: 2, type: 'fatigue', title: 'Fatigue Curve', config: {} },
    ]);
    const card = host().querySelector('.unsupported-section');
    expect(card).not.toBeNull();
    expect(card!.textContent).toContain('Fatigue Curve');
    expect(card!.textContent).toContain('fatigue');
    expect(card!.querySelector('a')).not.toBeNull();
    // the supported section is drawn once, the unsupported one has no ordinary card; the layout has no result section,
    // so the parameter table is added at the end
    expect(host().querySelectorAll('.lims-section:not(.unsupported-section)').length).toBe(2);
  });

  it('Note / witness / sign can be hidden on the screen and shown again; the last result section cannot be hidden', () => {
    create([
      { id: 1, type: 'location', title: 'Impact', config: { locationParams: [] } },
      { id: 2, type: 'narrative', title: 'Note', config: {} },
      { id: 3, type: 'sign', title: 'Tested By', config: {} },
    ]);
    const note = cmp.sections[1];
    expect(cmp.canHideSection(note)).toBeTrue();
    cmp.hideSection(note);
    fixture.detectChanges();
    expect(cmp.isSectionVisible(note)).toBeFalse();
    expect(cmp.userHiddenSections.map(h => h.title)).toEqual(['Note']);
    expect(host().querySelector('.hidden-sections-bar')).not.toBeNull();
    // the only result section stays
    expect(cmp.canHideSection(cmp.sections[0])).toBeFalse();
    cmp.hideSection(cmp.sections[0]);
    expect(cmp.isSectionVisible(cmp.sections[0])).toBeTrue();
    cmp.showSection(cmp.userHiddenSections[0].key);
    expect(cmp.isSectionVisible(note)).toBeTrue();
  });

  it('hidden sections are still printed (screen only, nothing saved)', () => {
    create([{ id: 1, type: 'parameter', title: 'Results', config: {} }, { id: 2, type: 'narrative', title: 'Note', config: {} }], { printMode: true });
    expect(cmp.canHideSection(cmp.sections[1])).toBeFalse();
    expect(cmp.sections.length).toBe(2);
  });

  it('the conditions the layout lists are fields; one added on the screen is saved with the test', () => {
    create([{ id: 1, type: 'condition', title: 'Test Temperature & Specimen', config: { sectionKey: 'ic', fields: ['Test Temperature', 'Size of Test Specimen (in mm)'] } }]);
    const sec = cmp.sections[0];
    expect(cmp.conditionFields(sec)).toEqual(['Test Temperature', 'Size of Test Specimen (in mm)']);
    cmp.onConditionChange('Test Temperature', '0 °C');
    cmp.addConditionField(sec, 'Striker Radius');
    expect(cmp.conditionFields(sec)).toContain('Striker Radius');
    expect(cmp.isRuntimeConditionField(sec, 'Test Temperature')).toBeFalse();
    const extra = JSON.parse(cmp.getExecutionExtraJson());
    expect(extra.conditionValues['Test Temperature']).toBe('0 °C');
    expect(extra.conditionFields['ic']).toEqual(['Striker Radius']);
    cmp.removeConditionField(sec, 'Striker Radius');
    expect(cmp.conditionFields(sec)).not.toContain('Striker Radius');
  });

  it('Note and witness keep their own text; the witness is a name line', () => {
    create([
      { id: 1, type: 'narrative', title: 'Remarks', config: { sectionKey: 'remarks' } },
      { id: 2, type: 'narrative', title: 'Note', config: { sectionKey: 'note' } },
      { id: 3, type: 'narrative', title: 'Test Witnessed By', config: { sectionKey: 'witness' } },
    ]);
    const [remarks, note, witness] = cmp.sections;
    expect(cmp.isPrimaryNarrative(remarks)).toBeTrue();
    expect(cmp.isPrimaryNarrative(note)).toBeFalse();
    expect(cmp.isWitnessSection(witness)).toBeTrue();
    cmp.onNarrativeChange(note, 'Specimens notched by broaching');
    cmp.onNarrativeChange(witness, 'Mr. R. Shah, TPI');
    const extra = JSON.parse(cmp.getExecutionExtraJson());
    expect(extra.narratives).toEqual({ note: 'Specimens notched by broaching', witness: 'Mr. R. Shah, TPI' });
  });

  it('every reading is judged against its limit, the average row is not counted twice', () => {
    const row = (name: string, min: number | null) => new FormGroup({ parameterName: new FormControl(name), value: new FormControl(null),
      minValue: new FormControl(min), maxValue: new FormControl(null), specMinValue: new FormControl(min), specMaxValue: new FormControl(null) });
    create([{ id: 1, type: 'location', title: 'Impact', config: { sectionKey: 'imp', orientation: 'Parameters under each location', locationMode: 'Named locations',
      locationRows: ['WELD-TOP'], locationParams: ['Charpy Impact Energy', '% Shear'], locationReadings: 3 } }]);
    (cmp.testFormGroup.get('parameters') as FormArray).push(row('Charpy Impact Energy', 35));
    (cmp.testFormGroup.get('parameters') as FormArray).push(row('% Shear', null));
    expect(cmp.conformityVerdict.status).toBe('PENDING');
    cmp.readingValues = { 'Charpy Impact Energy|loc:WELD-TOP': [154, 150, 28], '% Shear|loc:WELD-TOP': [90, 90, 90] };
    const v = cmp.conformityVerdict;
    expect(v.status).toBe('FAIL');
    expect(v.detail).toContain('1 of 3');
    cmp.readingValues = { 'Charpy Impact Energy|loc:WELD-TOP': [154, 150, 128] };
    expect(cmp.conformityVerdict.status).toBe('PASS');
    expect(cmp.locReadingOutOfLimit('Charpy Impact Energy', 28)).toBeTrue();
    expect(cmp.locParamRequirement('Charpy Impact Energy')).toBe('≥ 35');
  });

  it('columns of a specimen matrix can be switched per section on the screen', () => {
    create([{ id: 1, type: 'specimen', title: 'Bend', config: { showAverage: false } }]);
    const sec = cmp.sections[0];
    expect(cmp.adjustableColumns(sec).map(c => c.key)).toEqual(['avg', 'requirement', 'unit', 'status']);
    expect(cmp.isColumnShown(sec, 'avg')).toBeFalse();
    cmp.toggleColumn(sec, 'avg');
    expect(cmp.specimenShow(sec, 'avg')).toBeTrue();
  });

  it('a section without any type is reported as unsupported', () => {
    create([{ id: 1, title: 'No type', config: {} }]);
    expect(host().querySelector('.unsupported-section')).not.toBeNull();
  });

  it('the warning has no link in view mode and is not in the printed record', () => {
    create([{ id: 1, type: 'fatigue', title: 'Fatigue Curve', config: {} }], { viewMode: true });
    const card = host().querySelector('.unsupported-section');
    expect(card).not.toBeNull();
    expect(card!.querySelector('a')).toBeNull();

    create([{ id: 1, type: 'fatigue', title: 'Fatigue Curve', config: {} }], { printMode: true });
    expect(host().querySelector('.unsupported-section')).toBeNull();
  });

  it('a disabled section is left out, supported or not', () => {
    create([
      { id: 1, type: 'fatigue', title: 'Fatigue Curve', config: { enabled: false } },
      { id: 2, type: 'condition', title: 'Conditions', config: { enabled: false } },
    ]);
    // only the result table the screen always keeps
    expect(cmp.sections.map(s => s.id)).toEqual(['auto-results']);
    expect(host().querySelector('.unsupported-section')).toBeNull();
  });

  it('Half Width is a class on the card exactly when the studio set it', () => {
    create([
      { id: 1, type: 'condition', title: 'A', config: { width: 'Half Width' } },
      { id: 2, type: 'condition', title: 'B', config: { width: 'Half Width' } },
      { id: 3, type: 'condition', title: 'C', config: { width: 'Full Width' } },
      { id: 4, type: 'condition', title: 'D', config: {} },
    ]);
    const cards = Array.from(host().querySelectorAll('.sections-stack > .lims-section'));
    expect(cards.slice(0, 4).map(c => c.classList.contains('half-width'))).toEqual([true, true, false, false]);
  });

  it('two Half Width sections share one row, a Full Width section takes the whole row', () => {
    create([
      { id: 1, type: 'condition', title: 'A', config: { width: 'Half Width' } },
      { id: 2, type: 'condition', title: 'B', config: { width: 'Half Width' } },
      { id: 3, type: 'condition', title: 'C', config: {} },
    ]);
    host().style.display = 'block';
    host().style.width = '1000px';
    document.body.appendChild(host());
    const [a, b, c] = Array.from(host().querySelectorAll<HTMLElement>('.sections-stack > .lims-section')).map(e => e.getBoundingClientRect());
    expect(Math.abs(a.top - b.top)).toBeLessThan(2);
    expect(b.left).toBeGreaterThan(a.left + a.width - 2);
    expect(c.top).toBeGreaterThan(a.top + 5);
    expect(c.width).toBeGreaterThan(a.width * 1.8);
    document.body.removeChild(host());
  });
});
