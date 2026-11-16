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
    // the supported section is drawn once, and the unsupported one has no ordinary card
    expect(host().querySelectorAll('.lims-section:not(.unsupported-section)').length).toBe(1);
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
    expect(cmp.sections.length).toBe(0);
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
    expect(cards.map(c => c.classList.contains('half-width'))).toEqual([true, true, false, false]);
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
