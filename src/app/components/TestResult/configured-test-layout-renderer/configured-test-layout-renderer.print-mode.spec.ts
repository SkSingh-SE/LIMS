import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormArray, FormControl, FormGroup } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { MaterialSpecificationService } from '../../../services/material-specification.service';
import { ParameterService } from '../../../services/parameter.service';
import { ToastService } from '../../../services/toast.service';
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

/** A tensile test saved with one specimen although two are planned, and with empty dimension rows. */
function tensileCase() {
  const testFormGroup = new FormGroup({
    remarks: new FormControl('Broke in the gauge length'),
    roomTemperature: new FormControl(23.5),
    roomHumidity: new FormControl(55),
    parameters: new FormArray([
      paramRow(1, 'Thickness', null),
      paramRow(2, 'Width', null),
      paramRow(3, 'Cross Section Area', null),
      paramRow(4, 'Yield Load', 42),
      paramRow(5, 'Yield Strength', 280, 0, { minValue: 240 }),
      paramRow(6, 'Case Depth', null),
    ]),
  });
  const test = {
    headerId: 5,
    name: 'Tensile Test',
    status: 'Completed',
    totalSpecimens: 2,
    checklist: [{ checklistCode: 'CHK-1', itemLabel: 'Grips checked', status: 'Pass' }],
    traversePoints: [
      { pointSequence: 1, distanceMm: 0.1, hardnessValue: 600 },
      { pointSequence: 2, distanceMm: 0.2, hardnessValue: 500 },
    ],
    executionExtraJson: JSON.stringify({ hiddenRows: ['finalLength'], conditionValues: { Medium: 'Air', Temperature: 23 } }),
  };
  const layoutConfig = {
    layoutName: 'Tensile',
    sections: [
      { id: 's1', type: 'condition', title: 'Conditions', config: {} },
      { id: 's2', type: 'specimen', title: 'Specimens', config: {} },
      { id: 's3', type: 'traverse', title: 'Traverse', config: {} },
      { id: 's4', type: 'checklist', title: 'Checklist', config: {} },
      { id: 's5', type: 'narrative', title: 'Remarks', config: {} },
      { id: 's6', type: 'sign', title: 'Sign-off', config: {} },
    ],
  };
  return { testFormGroup, test, layoutConfig, sample: { thickness: 12, width: 12.5 } };
}

describe('ConfiguredTestLayoutRendererComponent print mode', () => {
  let fixture: ComponentFixture<ConfiguredTestLayoutRendererComponent>;
  let cmp: ConfiguredTestLayoutRendererComponent;
  let emitted: string[];

  /** Conformity as chosen on the sample inward / plan; a statement of conformity is given unless a test says otherwise. */
  const APPLICABLE = { statementOfConformity: 'Applicable', decisionRule: 'Without taking MOU into account' };

  function create(printMode: boolean, data = tensileCase(), inward: any = APPLICABLE, uncertainty: any[] = []) {
    fixture = TestBed.createComponent(ConfiguredTestLayoutRendererComponent);
    cmp = fixture.componentInstance;
    cmp.layoutConfig = data.layoutConfig;
    cmp.test = data.test;
    cmp.testPlan = { type: 'Mechanical' };
    cmp.testFormGroup = data.testFormGroup;
    cmp.sample = data.sample;
    cmp.inward = inward;
    cmp.uncertaintyData = uncertainty;
    cmp.activeTabSection = 'execution';
    cmp.printMode = printMode;
    emitted = [];
    cmp.paramValueChanged.subscribe(() => emitted.push('paramValueChanged'));
    cmp.parametersAdjusted.subscribe(() => emitted.push('parametersAdjusted'));
    cmp.specimenCountChanged.subscribe(() => emitted.push('specimenCountChanged'));
    fixture.detectChanges();
    return data;
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

  it('live mode writes calculated values and specimen rows into the form (what print mode must not do)', () => {
    const data = tensileCase();
    const before = JSON.stringify(data.testFormGroup.getRawValue());
    create(false, data);
    expect(JSON.stringify(data.testFormGroup.getRawValue())).not.toBe(before);
  });

  it('print mode leaves the form and the test object untouched and emits nothing', () => {
    const data = tensileCase();
    const formBefore = JSON.stringify(data.testFormGroup.getRawValue());
    const testBefore = JSON.stringify(data.test);
    create(true, data);
    cmp.ngOnChanges({ activeTabSection: { currentValue: 'execution', previousValue: 'all', firstChange: false, isFirstChange: () => false } });
    cmp.syncCollectionsToTest();
    fixture.detectChanges();
    expect(JSON.stringify(data.testFormGroup.getRawValue())).toBe(formBefore);
    expect(JSON.stringify(data.test)).toBe(testBefore);
    expect(data.testFormGroup.dirty).toBeFalse();
    expect(emitted).toEqual([]);
  });

  it('print mode is read-only and shows the saved state: values, removed rows, checklist, traverse', () => {
    create(true);
    expect(cmp.isViewMode).toBeTrue();
    expect(cmp.isLocked).toBeTrue();
    expect(cmp.specimens[0].yieldLoad).toBe(42);
    expect(cmp.specimens[0].proofStress).toBe(280);
    expect(cmp.isTensileRowShown('finalLength')).toBeFalse();
    expect(cmp.checklistItems[0].label).toBe('Grips checked');
    expect(cmp.traversePoints.map(p => p.distance)).toEqual([0.1, 0.2]);
    expect(cmp.effectiveCaseDepth).toBe(0.15);
    expect(cmp.conditionValues['Medium']).toBe('Air');
    // room temperature is taken from the environment record, never from the saved extra data
    expect(cmp.conditionValues['Temperature']).toBeNull();
    cmp.environmentData = { roomTemperature: 24.5, roomHumidity: 51 };
    cmp.ngOnChanges({ environmentData: { currentValue: cmp.environmentData, previousValue: null, firstChange: false, isFirstChange: () => false } });
    expect(cmp.conditionValues['Temperature']).toBe(24.5);
    expect(cmp.roleUnit('proofStress', 'MPa')).toBe('MPa');
  });

  it('print mode shows no control: buttons, action columns and input borders are gone', () => {
    create(true);
    const host: HTMLElement = fixture.nativeElement;
    expect(host.classList.contains('print-mode')).toBeTrue();
    expect(host.querySelectorAll('.lims-workbench-card').length).toBe(6);
    const shown = Array.from(host.querySelectorAll<HTMLElement>('button, .action-col')).filter(
      el => getComputedStyle(el).display !== 'none' && !el.closest('.btn-group') && !el.classList.contains('reportable-toggle-btn')
    );
    expect(shown.map(el => el.outerHTML.slice(0, 80))).toEqual([]);
    // the recorded checklist answer stays as text; the other choices are hidden
    const answers = Array.from(host.querySelectorAll<HTMLElement>('.btn-group .btn')).filter(el => getComputedStyle(el).display !== 'none');
    expect(answers.map(el => el.textContent?.trim())).toEqual(['Pass']);
    const input = host.querySelector<HTMLElement>('input:not([type="checkbox"]):not([type="radio"])');
    expect(input).not.toBeNull();
    expect(getComputedStyle(input!).borderTopWidth).toBe('0px');
    expect(getComputedStyle(host).pointerEvents).toBe('none');
  });

  it('print mode renders every section type of the studio without a control', () => {
    const types = ['traceability', 'condition', 'specimen', 'parameter', 'reading', 'traverse', 'chart', 'formula', 'narrative',
      'checklist', 'photo', 'sign', 'location', 'rule', 'classification', 'custom', 'opinion'];
    for (const withMatrix of [true, false]) {
      const data = tensileCase();
      data.test.name = 'Hardness Test';
      const used = withMatrix ? types : types.filter(t => t !== 'specimen' && t !== 'reading'); // the plain parameter table shows without them
      data.layoutConfig.sections = used.map((type, i) => ({ id: 'x' + i, type, title: type, config: {} }));
      const before = JSON.stringify(data.testFormGroup.getRawValue());
      create(true, data);
      const host: HTMLElement = fixture.nativeElement;
      expect(host.querySelectorAll('.lims-workbench-card').length).toBe(used.length);
      const shown = Array.from(host.querySelectorAll<HTMLElement>('button, .action-col')).filter(
        el => getComputedStyle(el).display !== 'none' && !el.closest('.btn-group') && !el.classList.contains('reportable-toggle-btn')
      );
      expect(shown.map(el => el.outerHTML.slice(0, 80))).toEqual([]);
      expect(JSON.stringify(data.testFormGroup.getRawValue())).toBe(before);
      fixture.destroy();
    }
  });

  it('live mode restores checklist labels, traverse points and the case depth after a reload, without writing the row', () => {
    const data = tensileCase();
    create(false, data);
    expect(cmp.checklistItems[0].label).toBe('Grips checked');
    expect(cmp.traversePoints.map(p => p.distance)).toEqual([0.1, 0.2]);
    expect(cmp.effectiveCaseDepth).toBe(0.15);
    const caseDepthRow = (data.testFormGroup.get('parameters') as FormArray).controls.find(c => c.get('parameterName')?.value === 'Case Depth');
    expect(caseDepthRow?.get('value')?.value).toBeNull();
  });

  it('the curve is not drawn from invented numbers', () => {
    const data = tensileCase();
    (data.testFormGroup.get('parameters') as FormArray).controls.forEach(c => c.get('value')?.setValue(null));
    create(true, data);
    expect(cmp.getStressStrainChartData()).toBeNull();
    fixture.destroy();
    create(true);
    const chart = cmp.getStressStrainChartData();
    expect(chart?.rp).toBe(280);
    expect(chart?.rm).toBeNull();
    expect(chart?.ra).toBeNull();
    expect(cmp.hasCalculatedParameters()).toBeFalse();
  });

  it('live mode keeps its controls', () => {
    const data = tensileCase();
    data.test.status = 'InProgress';
    create(false, data);
    const host: HTMLElement = fixture.nativeElement;
    expect(host.classList.contains('print-mode')).toBeFalse();
    expect(host.querySelectorAll('.btn-lims-delete').length).toBeGreaterThan(0);
    expect(Array.from(host.querySelectorAll<HTMLElement>('.action-col')).every(el => getComputedStyle(el).display !== 'none')).toBeTrue();
  });

  describe('rule section (statement of conformity)', () => {
    const ruleCase = (config: Record<string, any> = {}) => {
      const data = tensileCase();
      data.layoutConfig.sections.push({ id: 'r1', type: 'rule', title: 'Conformity', config });
      return data;
    };
    const NOT_APPLICABLE = { statementOfConformity: 'Not Applicable', decisionRule: 'Not Applicable' };
    const WITH_MOU = { statementOfConformity: 'Applicable', decisionRule: 'With MOU consideration' };

    it('follows the sample inward: without MOU the result within its limit passes and the lines are written', () => {
      create(false, ruleCase());
      expect(cmp.ruleBasis().applicable).toBeTrue();
      expect(cmp.ruleBasis().withMU).toBeFalse();
      expect(cmp.conformityVerdict.status).toBe('PASS');
      expect(cmp.ruleStatement()).toBe('The Result meets the Customer Requirement.');
      expect(cmp.ruleDecisionText()).toBe('Statement of Conformity is provided without consideration measurement uncertainty.');
    });

    it('conformity "Not Applicable" on the inward: note on screen, no rule card on the printed record', () => {
      create(false, ruleCase(), NOT_APPLICABLE);
      expect(cmp.ruleBasis().applicable).toBeFalse();
      expect((fixture.nativeElement as HTMLElement).querySelector('.decision-rule-section')?.textContent).toContain('No statement of conformity');
      fixture.destroy();
      create(true, ruleCase(), NOT_APPLICABLE);
      expect((fixture.nativeElement as HTMLElement).querySelector('.decision-rule-section')).toBeNull();
    });

    it('with MOU consideration: a result closer to its limit than the uncertainty is borderline', () => {
      // Yield Strength 280 against min 240: U = 50 reaches the limit, U = 10 does not
      create(false, ruleCase(), WITH_MOU, [{ parameterID: 5, expandedUncertainty: 50 }]);
      expect(cmp.ruleBasis().withMU).toBeTrue();
      expect(cmp.conformityVerdict.status).toBe('BORDERLINE');
      expect(cmp.ruleStatement()).toBe('');
      fixture.destroy();
      create(false, ruleCase(), WITH_MOU, [{ parameterID: 5, expandedUncertainty: 10 }]);
      expect(cmp.conformityVerdict.status).toBe('PASS');
      expect(cmp.ruleDecisionText()).toContain('with consideration of measurement uncertainty');
    });

    it('lab scope source: a test outside the accredited scope is judged without uncertainty', () => {
      create(false, ruleCase({ verdictSource: 'scope' }), WITH_MOU, [{ parameterID: 5, expandedUncertainty: 50 }]);
      cmp.nablInScope = false;
      expect(cmp.ruleBasis().withMU).toBeFalse();
      expect(cmp.conformityVerdict.status).toBe('PASS');
      cmp.nablInScope = true;
      expect(cmp.conformityVerdict.status).toBe('BORDERLINE');
    });

    it('fixed text source: the layout text is used even when the inward says not applicable; the technician can reword it', () => {
      const cfg = { verdictSource: 'fixed', statementText: 'Complies with the drawing.', decisionRuleText: 'Simple acceptance.' };
      create(false, ruleCase(cfg), NOT_APPLICABLE);
      expect(cmp.ruleBasis().applicable).toBeTrue();
      expect(cmp.ruleStatement()).toBe('Complies with the drawing.');
      expect(cmp.ruleDecisionText()).toBe('Simple acceptance.');
      cmp.onRuleStatementChange({ config: cfg }, 'Own wording');
      expect(cmp.ruleStatement()).toBe('Own wording');
      expect(JSON.parse(cmp.getExecutionExtraJson()).decisionRule.resolvedStatement).toBe('Own wording');
      cmp.resetRuleStatement();
      expect(cmp.ruleStatement()).toBe('Complies with the drawing.');
    });
  });
});
