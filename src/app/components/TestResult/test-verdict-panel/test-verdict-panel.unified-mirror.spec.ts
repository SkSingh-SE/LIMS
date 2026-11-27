import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormArray, FormControl, FormGroup } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import {
  Tab1ReadingMatrixSummary,
  TestVerdictPanelComponent
} from './test-verdict-panel.component';
import {
  buildReadingMatrixRowsFromSource,
  resolveReadingMatrixDecimals
} from './reading-matrix-summary.helper';

function makeParamRow(overrides: Record<string, any>): FormGroup {
  return new FormGroup({
    id: new FormControl(overrides['id'] ?? 1),
    parameterID: new FormControl(overrides['parameterID'] ?? 0),
    parameterName: new FormControl(overrides['parameterName'] ?? ''),
    unit: new FormControl(overrides['unit'] ?? '—'),
    value: new FormControl(overrides['value'] ?? null),
    remarks: new FormControl(overrides['remarks'] ?? ''),
    specMinValue: new FormControl(overrides['specMinValue'] ?? null),
    specMaxValue: new FormControl(overrides['specMaxValue'] ?? null),
    minValue: new FormControl(overrides['minValue'] ?? null),
    maxValue: new FormControl(overrides['maxValue'] ?? null),
    acceptanceCriteria: new FormControl(overrides['acceptanceCriteria'] ?? ''),
    parameterType: new FormControl(overrides['parameterType'] ?? 'Quantitative'),
    inputType: new FormControl(overrides['inputType'] ?? 'Decimal'),
    specimenIndex: new FormControl(overrides['specimenIndex'] ?? 0),
    decimalPrecision: new FormControl(overrides['decimalPrecision'] ?? 2),
    testMethodUsed: new FormControl(overrides['testMethodUsed'] ?? '')
  });
}

describe('TestVerdictPanelComponent — Tab 1 Unified Mirror (Wireframes 1–4)', () => {
  let fixture: ComponentFixture<TestVerdictPanelComponent>;
  let component: TestVerdictPanelComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestVerdictPanelComponent, RouterTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(TestVerdictPanelComponent);
    component = fixture.componentInstance;
  });

  it('Wireframe 1 (Tensile): reads Specimen Size text remarks as Reported (0 Pending) and auto-hides unconfigured Scope Status', () => {
    component.inward = { statementOfConformity: 'Applicable', decisionRule: 'Without taking MOU into account' };
    component.plan = { specification: 'ASTM A335/A335M', grade: 'P91 Type 1', methodName: 'IS 1608 - (Part 1) : 2022' };
    component.specimenLabels = ['S.NO.1', 'S.NO.2'];
    component.parametersFormArray = new FormArray([
      makeParamRow({ parameterID: 273, parameterName: 'Specimen Type', inputType: 'Text', remarks: 'Flat', specimenIndex: 0 }),
      makeParamRow({ parameterID: 273, parameterName: 'Specimen Type', inputType: 'Text', remarks: 'Flat', specimenIndex: 1 }),
      // Specimen Size has InputType=Decimal in DB, text stored in remarks
      makeParamRow({ parameterID: 178, parameterName: 'Specimen Size', unit: 'cm', inputType: 'Decimal', value: null, remarks: '12.5 x 10.0', specimenIndex: 0 }),
      makeParamRow({ parameterID: 178, parameterName: 'Specimen Size', unit: 'cm', inputType: 'Decimal', value: null, remarks: '12.5 x 10.0', specimenIndex: 1 }),
      makeParamRow({ parameterID: 63, parameterName: 'Yield Strength', unit: 'kN/mm²', value: 465, specMinValue: 415, specimenIndex: 0 }),
      makeParamRow({ parameterID: 63, parameterName: 'Yield Strength', unit: 'kN/mm²', value: 472, specMinValue: 415, specimenIndex: 1 }),
      makeParamRow({ parameterID: 0, parameterName: 'Location of Fracture', parameterType: 'Qualitative', inputType: 'Text', remarks: 'Within Gauge Length', specimenIndex: 0 }),
      makeParamRow({ parameterID: 0, parameterName: 'Location of Fracture', parameterType: 'Qualitative', inputType: 'Text', remarks: 'Within Gauge Length', specimenIndex: 1 })
    ]);
    component.nablScopeData = [];

    component.evaluateResults();
    fixture.detectChanges();

    expect(component.requiresVerdict).toBeTrue();
    expect(component.pendingCount).toBe(0);
    expect(component.passedCount).toBe(1);
    expect(component.infoCount).toBe(3);
    expect(component.overallVerdict).toBe('PASS');

    const sizeRow = component.evaluationRows.find(r => r.parameterName === 'Specimen Size');
    expect(sizeRow).toBeTruthy();
    expect(sizeRow?.verdict).toBe('INFO');
    expect(sizeRow?.verdictLabel).toBe('Reported');
    expect(sizeRow?.specimenCells.map(c => c.displayValue)).toEqual(['12.5 x 10.0', '12.5 x 10.0']);

    // Scope Status column auto-hidden when Lab Scope Master is unconfigured
    expect(component.isVerdictColShown('scope')).toBeFalse();
    const headers = Array.from(fixture.nativeElement.querySelectorAll('thead th')).map((th: any) => th.textContent.trim());
    expect(headers).toContain('Verdict');
    expect(headers).not.toContain('Scope Status');
  });

  it('Wireframe 2 (Brinell Multi-Reading Matrix): mirrors A1–B2 + Overall Average vs Grade 190–250 with 0 unrelated rows', () => {
    component.inward = { statementOfConformity: 'Applicable', decisionRule: 'Without taking MOU into account' };
    component.plan = { specification: 'ASTM A335/A335M', grade: 'P91 Type 1', methodName: 'ISO 6506 - (Part 1) : 2014' };
    component.parametersFormArray = new FormArray([
      makeParamRow({ parameterID: 66, parameterName: 'Elongation', unit: '%', value: null }),
      makeParamRow({ parameterID: 166, parameterName: 'Brinell Hardness Number', unit: 'HBW', specMinValue: 190, specMaxValue: 250 })
    ]);
    const brinellMatrix: Tab1ReadingMatrixSummary = {
      sectionTitle: 'Brinell Hardness Readings',
      groupHeaderTitle: 'Hardness in HBW(5mm/750 kgf)',
      parameterName: 'Brinell Hardness Number',
      parameterID: 166,
      unit: 'HBW',
      spotCount: 3,
      decimals: 2,
      rows: [
        { label: 'A1', readings: [215, 218, 217], average: 216.67 },
        { label: 'A2', readings: [220, 222, 221], average: 221.00 },
        { label: 'B1', readings: [214, 216, 215], average: 215.00 },
        { label: 'B2', readings: [219, 221, 220], average: 220.00 }
      ],
      overallAverage: 218.17
    };
    component.tab1ReadingMatrix = brinellMatrix;
    component.evaluateResults();
    fixture.detectChanges();

    expect(component.isReadingMatrixMode).toBeTrue();
    expect(component.requiresVerdict).toBeTrue();
    expect(component.overallVerdict).toBe('PASS');
    expect(component.pendingCount).toBe(0);
    expect(component.readingEvalRows.length).toBe(4);
    expect(component.readingEvalRows.every(r => r.verdict === 'PASS')).toBeTrue();
    expect(component.readingOverallDisplay).toBe('218.17');
    expect(component.readingOverallVerdict).toBe('PASS');

    const bodyText = fixture.nativeElement.textContent;
    expect(bodyText).toContain('A1');
    expect(bodyText).toContain('216.67');
    expect(bodyText).toContain('218.17');
    expect(bodyText).toContain('190 – 250');
    expect(bodyText).not.toContain('Elongation');
  });

  it('Wireframe 2 (Fail zone): flags FAIL if a single Brinell location falls outside Grade 190–250', () => {
    component.inward = { statementOfConformity: 'Applicable' };
    component.parametersFormArray = new FormArray([
      makeParamRow({ parameterID: 166, parameterName: 'Brinell Hardness Number', specMinValue: 190, specMaxValue: 250 })
    ]);
    component.tab1ReadingMatrix = {
      sectionTitle: 'Brinell Hardness Readings',
      groupHeaderTitle: 'Hardness in HBW',
      parameterName: 'Brinell Hardness Number',
      parameterID: 166,
      unit: 'HBW',
      spotCount: 3,
      decimals: 2,
      rows: [
        { label: 'A1', readings: [215, 218, 217], average: 216.67 },
        { label: 'B1', readings: [175, 178, 176], average: 176.33 }
      ],
      overallAverage: 196.50
    };
    component.evaluateResults();
    expect(component.overallVerdict).toBe('FAIL');
    expect(component.readingEvalRows[1].verdict).toBe('FAIL');
    expect(component.readingOverallVerdict).toBe('FAIL');
  });

  it('Wireframe 3 (No Verdict Required): hides Verdict column & Statement of Conformity when Inward conformity is Not Applicable', () => {
    component.inward = { statementOfConformity: 'Not Applicable' };
    component.parametersFormArray = new FormArray([
      makeParamRow({ parameterID: 301, parameterName: 'Microstructure', inputType: 'Text', remarks: 'Tempered Martensite' }),
      makeParamRow({ parameterID: 302, parameterName: 'ASTM Grain Size Number', value: 8.5 })
    ]);
    component.nablScopeData = [
      { parameterId: 301, parameterName: 'Microstructure', scopeStatus: 'WithinScope' }
    ];

    component.evaluateResults();
    fixture.detectChanges();

    expect(component.requiresVerdict).toBeFalse();
    expect(component.isVerdictColShown('scope')).toBeTrue();
    const heading = fixture.nativeElement.querySelector('h3')?.textContent?.trim();
    expect(heading).toBe('Observation & QA Summary');
    const headers = Array.from(fixture.nativeElement.querySelectorAll('thead th')).map((th: any) => th.textContent.trim());
    expect(headers).not.toContain('Verdict');
    expect(headers).toContain('Scope Status');
    expect(fixture.nativeElement.textContent).not.toContain('Statement of conformity (ISO/IEC 17025:2017 Cl 7.8.6):');
  });

  it('Wireframe 4 (NABL Scope Master Configured): shows both Verdict and Scope Status side-by-side', () => {
    component.inward = { statementOfConformity: 'Applicable' };
    component.parametersFormArray = new FormArray([
      makeParamRow({ parameterID: 62, parameterName: 'Ultimate Tensile Strength', unit: 'N/mm²', value: 645, specMinValue: 585 })
    ]);
    component.nablScopeData = [
      { parameterId: 62, parameterName: 'Ultimate Tensile Strength', scopeStatus: 'OutsideScope' }
    ];

    component.evaluateResults();
    fixture.detectChanges();

    expect(component.requiresVerdict).toBeTrue();
    expect(component.isVerdictColShown('scope')).toBeTrue();
    expect(component.evaluationRows[0].verdict).toBe('PASS');
    expect(component.evaluationRows[0].scopeStatus).toBe('OutsideScope');
    const headers = Array.from(fixture.nativeElement.querySelectorAll('thead th')).map((th: any) => th.textContent.trim());
    expect(headers).toContain('Verdict');
    expect(headers).toContain('Scope Status');
  });

  it('Staging Regression: unscrambles SequenceNo-ordered flat test.readings by SpecimenCode and keeps spotCols 2-decimal precision', () => {
    const seqOrderedReadings = [
      // SequenceNo = 1 across S1..S4 (plus a voided stale row that must be ignored)
      { parameterCode: 'BHN', specimenCode: 'S1', sequenceNo: 1, value: 999, isVoided: true, isActive: true },
      { parameterCode: 'BHN', specimenCode: 'S1', sequenceNo: 1, value: 130, isActive: true },
      { parameterCode: 'BHN', specimenCode: 'S2', sequenceNo: 1, value: 145.1, isActive: true },
      { parameterCode: 'BHN', specimenCode: 'S3', sequenceNo: 1, value: 140, isActive: true },
      { parameterCode: 'BHN', specimenCode: 'S4', sequenceNo: 1, value: 130, isActive: true },
      // SequenceNo = 2 across S1..S4 (plus an inactive row)
      { parameterCode: 'BHN', specimenCode: 'S2', sequenceNo: 2, value: 888, isActive: false },
      { parameterCode: 'BHN', specimenCode: 'S1', sequenceNo: 2, value: 131, isActive: true },
      { parameterCode: 'BHN', specimenCode: 'S2', sequenceNo: 2, value: 146, isActive: true },
      { parameterCode: 'BHN', specimenCode: 'S3', sequenceNo: 2, value: 139.5, isActive: true },
      { parameterCode: 'BHN', specimenCode: 'S4', sequenceNo: 2, value: 131, isActive: true },
      // SequenceNo = 3 across S1..S4
      { parameterCode: 'BHN', specimenCode: 'S1', sequenceNo: 3, value: 131, isActive: true },
      { parameterCode: 'BHN', specimenCode: 'S2', sequenceNo: 3, value: 145.2, isActive: true },
      { parameterCode: 'BHN', specimenCode: 'S3', sequenceNo: 3, value: 140, isActive: true },
      { parameterCode: 'BHN', specimenCode: 'S4', sequenceNo: 3, value: 131, isActive: true }
    ];

    const rows = buildReadingMatrixRowsFromSource({
      rowLabels: ['A1', 'A2', 'B1', 'B2'],
      spotCount: 3,
      readings: seqOrderedReadings,
      targetParamName: 'Brinell Hardness Number',
      cfgTargetParamName: 'Brinell Hardness Number',
      readingSectionCount: 1
    });

    expect(rows).toEqual([
      { label: 'A1', readings: [130, 131, 131], average: 130.67 },
      { label: 'A2', readings: [145.1, 146, 145.2], average: 145.43 },
      { label: 'B1', readings: [140, 139.5, 140], average: 139.83 },
      { label: 'B2', readings: [130, 131, 131], average: 130.67 }
    ]);

    const allNums = rows.flatMap(r => r.readings.filter((n): n is number => n !== null));
    const overallAverage = Math.round((allNums.reduce((a, b) => a + b, 0) / allNums.length) * 100) / 100;
    expect(overallAverage).toBe(136.65);

    const decimals = resolveReadingMatrixDecimals({
      spotCols: [{ decimalPrecision: 2 }, { decimalPrecision: 2 }, { decimalPrecision: 2 }],
      paramDecimals: 1
    });
    expect(decimals).toBe(2);
  });
});
