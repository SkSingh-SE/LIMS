/**
 * One layout per report of the lab (Project Document / Report Format), written the way the Layout Studio saves a
 * layout: sections with their config keys. Each case also carries the values of the reference report, so the same
 * data can be rendered and compared with what the lab prints. Used by report-layouts.render.spec.ts.
 *
 * Cases added so far: the ones the sections implemented up to now can draw. A gap found while comparing is
 * written to scratch/e2e/render_gaps.md, not hidden here.
 */
import { FormArray, FormControl, FormGroup } from '@angular/forms';

export interface ReportCase {
  /** Layout of the lab's report (L1..L17 of the plan) and the reference file it follows. */
  id: string;
  reference: string;
  testName: string;
  layout: { layoutName: string; sections: any[] };
  /** Parameters of the test, one object per parameter row (specimenIndex 0..n-1 are made by `specimens`). */
  parameters: { name: string; unit?: string; inputType?: string; decimals?: number; minValue?: number | null; maxValue?: number | null; acceptance?: string; values?: (number | string | null)[] }[];
  /** Number of specimens the test holds (parameter rows per specimen). */
  specimens?: number;
  /** Readings saved for the test (the rows of TestResultReadings). */
  readings?: { parameterName: string; specimenCode: string; sequenceNo: number; value: number }[];
}

/** A parameter row with every control the result entry form gives it. */
export function paramRow(id: number, p: ReportCase['parameters'][0], specimenIndex: number, parameterId: number): FormGroup {
  const raw = p.values?.[specimenIndex] ?? null;
  const isText = p.inputType === 'Text';
  const v: Record<string, any> = {
    id, specimenIndex, parameterID: parameterId, parameterName: p.name, unit: p.unit ?? '', value: isText ? null : raw, remarks: isText ? raw ?? '' : '',
    minValue: p.minValue ?? null, maxValue: p.maxValue ?? null, isWithinLimit: null, altered: false, formulaExpression: '', formulaDisplay: '',
    isCalculated: false, inputType: p.inputType ?? 'Decimal', dropdownOptions: [], specMinValue: p.minValue ?? null, specMaxValue: p.maxValue ?? null,
    acceptanceCriteria: p.acceptance ?? '', specificationLineID: null, isAdditional: false, specSource: '', isStandalone: false,
    sourceTestMethodId: null, resultStatus: null, parameterType: '', testMethodUsed: '', decimalPrecision: p.decimals ?? 2, conversionFactor: 1,
    convertedValue: null, selectedUnit: '', unitOptions: [], isBillable: true, isReportable: true,
  };
  const g: Record<string, FormControl> = {};
  Object.keys(v).forEach(k => (g[k] = new FormControl(v[k])));
  return new FormGroup(g);
}

export function buildForm(c: ReportCase): FormGroup {
  const rows: FormGroup[] = [];
  let id = 1;
  for (let s = 0; s < (c.specimens ?? 1); s++) c.parameters.forEach((p, pi) => rows.push(paramRow(id++, p, s, pi + 1)));
  return new FormGroup({ remarks: new FormControl(''), parameters: new FormArray(rows) });
}

const column = (key: string, label: string, visible = true) => ({ key, label, bindingMode: 'runtime', visible });
const row = (key: string, label: string, extra: Record<string, any> = {}) => ({ key, label, bindingMode: 'runtime', visible: true, ...extra });

export const REPORT_CASES: ReportCase[] = [
  // ---- L5: Brinell, several samples, three readings each, Average ("Hardness Test - ISO 6506-1 (Brinell Multi-Sample HBW)")
  {
    id: 'L5-brinell',
    reference: 'Hardness Test - ISO 6506-1 (Brinell Multi-Sample HBW).jpeg',
    testName: 'Hardness Test',
    layout: {
      layoutName: 'Brinell multi-sample',
      sections: [{
        id: 1, type: 'reading', title: 'Hardness in HBW(5mm/750 kgf)',
        config: {
          sectionKey: 'brinell', targetParamName: 'Hardness in HBW', count: 3, readingLabel: 'Reading', readingsAs: 'columns', aggregation: 'Average',
          showIndividual: true, showStatistics: false, showOverallAverageRow: false, showSpreadRow: false, requirementRow: false,
          tableColumns: [column('specimen', 'Sample ID/Locaton'), column('unit', 'Unit', false), column('agg', 'Average'), column('requirement', 'Requirement', false), column('status', 'Status', false)],
          tableRows: ['A1', 'A2', 'B1', 'B2'].map((l, i) => row(`spec_${i}`, l)),
        },
      }],
    },
    parameters: [{ name: 'Hardness in HBW', unit: 'HBW', decimals: 2 }],
    readings: [
      ...[130.0, 131.0, 131.0].map((value, i) => ({ parameterName: 'Hardness in HBW', specimenCode: 'S1', sequenceNo: i + 1, value })),
      ...[145.1, 146.0, 145.2].map((value, i) => ({ parameterName: 'Hardness in HBW', specimenCode: 'S2', sequenceNo: i + 1, value })),
      ...[140.0, 139.5, 140.0].map((value, i) => ({ parameterName: 'Hardness in HBW', specimenCode: 'S3', sequenceNo: i + 1, value })),
      ...[130.0, 131.0, 131.0].map((value, i) => ({ parameterName: 'Hardness in HBW', specimenCode: 'S4', sequenceNo: i + 1, value })),
    ],
  },

  // ---- L8: Micro Vickers, one sample, readings listed down the rows, Avg. ("Micro Vickers Hardness.pdf")
  {
    id: 'L8-micro-vickers',
    reference: 'Reports (PDF Format)/Micro Vickers Hardness.pdf',
    testName: 'Microhardness Testing',
    layout: {
      layoutName: 'Micro Vickers',
      sections: [{
        id: 1, type: 'reading', title: 'Micro Vickers Hardness Value (HV)',
        config: {
          sectionKey: 'microvickers', targetParamName: 'Micro Vickers Hardness', count: 3, readingLabel: 'RESULT', readingsAs: 'rows', aggregation: 'Average',
          showIndividual: true, showStatistics: false, requirementRow: false,
          tableColumns: [column('specimen', 'Location'), column('unit', 'Unit', false), column('agg', 'Avg.'), column('requirement', 'Requirement', false), column('status', 'Status', false)],
          tableRows: [row('spec_0', 'Micro Vickers Hardness Value (HV)')],
        },
      }],
    },
    parameters: [{ name: 'Micro Vickers Hardness', unit: 'HV', decimals: 2 }],
    readings: [477.41, 474.75, 458.45].map((value, i) => ({ parameterName: 'Micro Vickers Hardness', specimenCode: 'S1', sequenceNo: i + 1, value })),
  },

  // ---- L10: case depth by microscope, five locations down the rows ("Case depth by Microscopic.pdf")
  {
    id: 'L10-case-depth-micro',
    reference: 'Reports (PDF Format)/Case depth by Microscopic.pdf',
    testName: 'Case Depth Measurement',
    layout: {
      layoutName: 'Case depth (microscopic)',
      sections: [{
        id: 1, type: 'reading', title: 'Case Depth Measurement in Microns',
        config: {
          sectionKey: 'casedepth', targetParamName: 'Case Depth', count: 5, readingLabel: '', readingsAs: 'rows', aggregation: 'Average',
          showIndividual: true, showStatistics: false, requirementRow: false,
          tableColumns: [column('specimen', 'Location'), column('unit', 'Unit', false), column('agg', 'Avg.'), column('requirement', 'Requirement', false), column('status', 'Status', false)],
          tableRows: [row('spec_0', 'Case Depth Measurement in Microns')],
        },
      }, {
        id: 2, type: 'parameter', title: 'Test Parameters', config: { sectionKey: 'casedepth_text' },
      }],
    },
    parameters: [
      { name: 'Case Depth', unit: 'µm', decimals: 2 },
      { name: 'Observation at', inputType: 'Text', values: ['100 x'] },
      { name: 'Etchant', inputType: 'Text', values: ['2 % Nital'] },
    ],
    readings: [641.99, 623.34, 632.92, 638.25, 628.66].map((value, i) => ({ parameterName: 'Case Depth', specimenCode: 'S1', sequenceNo: i + 1, value })),
  },

  // ---- L11: ferrite content, five frames, two phases ("Ferrite Content by Phase Analysis VF.pdf")
  {
    id: 'L11-ferrite',
    reference: 'Reports (PDF Format)/Ferrite Content by Phase Analysis VF.pdf',
    testName: 'Ferrite Content',
    layout: {
      layoutName: 'Ferrite content',
      sections: [{
        id: 1, type: 'specimen', title: 'Ferrite Content (Volume Fraction) 5 Field',
        config: {
          sectionKey: 'ferrite', orientation: 'Specimens × Parameters', specimenColHeader: 'Frames', specimenRows: ['1', '2', '3', '4', '5'],
          showAverage: true, showRequirement: true, showStatus: false, showUnit: false,
          tableColumns: [column('avg', 'Avg.'), column('requirement', 'Requirement')],
        },
      }],
    },
    specimens: 5,
    parameters: [
      { name: 'Ferrite%(Red)', inputType: 'Decimal', decimals: 2, acceptance: '%Fe: 40%-60%', values: [57.04, 57.06, 57.01, 57.05, 57.08] },
      { name: 'Austenite%(green)', inputType: 'Decimal', decimals: 2, values: [42.96, 42.94, 42.99, 42.95, 42.92] },
    ],
  },

  // ---- L4: Izod impact, two specimens, size is text, energy with requirement ("Impact (Izod).pdf")
  {
    id: 'L4-izod',
    reference: 'Impact (Izod).pdf',
    testName: 'Impact Test (Izod) @ Room Temp',
    layout: {
      layoutName: 'Izod impact',
      sections: [{
        id: 1, type: 'specimen', title: 'Impact Test (Izod)',
        config: {
          sectionKey: 'izod', orientation: 'Parameters × Specimens', specimenRows: ['S.NO.1', 'S.NO.2'],
          showAverage: false, showRequirement: true, showStatus: false, showUnit: false,
          tableColumns: [column('param', ''), column('unit', 'Unit', false), column('requirement', 'Requirement')],
        },
      }],
    },
    specimens: 2,
    parameters: [
      { name: 'Size of Test Specimen(in mm)', inputType: 'Text', values: ['10X10X75', '10X10X75'] },
      { name: 'Absorbed energy (J)', unit: 'J', decimals: 0, minValue: 28, values: [94, 86] },
    ],
  },

  // ---- L1: tensile, two specimens, the rows named as the report names them ("Tensile Test - IS 1608-1 (Multi-Specimen 2 Readings).jpeg")
  {
    id: 'L1-tensile',
    reference: 'Tensile Test - IS 1608-1 (Multi-Specimen 2 Readings).jpeg',
    testName: 'Tensile Test',
    layout: {
      layoutName: 'Tensile (IS 1608-1)',
      sections: [{
        id: 1, type: 'specimen', title: 'Tensile Test',
        config: {
          sectionKey: 'tensile', renderMode: 'fixed', orientation: 'Parameters × Specimens', specimenRows: ['S.NO.1', 'S.NO.2'],
          showAverage: false, showRequirement: true, showMinMax: false, showUnit: false,
          tableColumns: [column('param', ''), column('unit', 'Unit', false), column('requirement', 'Requirement')],
          tableRows: [
            row('tensile_thickness', 'Thickness of specimen (mm)'), row('tensile_width', 'Width of specimen (mm)'),
            row('tensile_area', 'Cross-sectional area (mm²)'), row('tensile_gaugeLength', 'Original Gauge Length (mm)'),
            row('tensile_finalLength', 'Final gauge length (mm)'), row('tensile_yieldLoad', 'Yield load (kN)'),
            row('tensile_proofStress', 'Yield strength (N/mm²)'), row('tensile_peakLoad', 'Ultimate tensile load (kN)'),
            row('tensile_uts', 'U.T.S (N/mm²)'), row('tensile_elongation', 'Elongation (%)'),
          ],
        },
      }],
    },
    specimens: 2,
    parameters: [
      { name: 'Thickness', unit: 'mm' }, { name: 'Width', unit: 'mm' }, { name: 'Cross Section Area', unit: 'mm²' },
      { name: 'Gauge Length', unit: 'mm' }, { name: 'Final Length', unit: 'mm' }, { name: 'Yield Load', unit: 'kN' },
      { name: 'Yield Strength', unit: 'N/mm²', minValue: 250 }, { name: 'Peak Load', unit: 'kN' },
      { name: 'Ultimate Tensile Strength', unit: 'N/mm²', minValue: 410 }, { name: 'Elongation', unit: '%', minValue: 23 },
    ],
  },
];
