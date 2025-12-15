import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

export interface ReportingListItem {
  sampleNo: string;
  caseNo: string;
  customer: string;
  material: string;
  condition: string;
  status: 'Pending' | 'Completed' | 'ReadyForReport';
}

export interface ReportingPreview {
  sampleNo: string;
  caseNo: string;
  customer: string;
  material: string;
  condition: string;
  mechanicalTests: MechanicalTest[];
  chemicalTests: ChemicalTest[];
  longTermTests: LongTermTest[];
  remarks: string;
  summary: string;
}

export interface MechanicalTest {
  parameter: string;
  value: number;
  unit: string;
  standard: string;
  status: string;
}

export interface ChemicalTest {
  element: string;
  percentage: number;
  min: number;
  max: number;
  status: string;
}

export interface LongTermTest {
  testName: string;
  startedAt: string;
  duration: string;
  readings: number;
  status: string;
}

@Injectable({
  providedIn: 'root'
})
export class ReportingService {
  private dummyReportingList: ReportingListItem[] = [
    {
      sampleNo: 'S-001',
      caseNo: '24-00012',
      customer: 'ABC Metals',
      material: 'TMT',
      condition: 'As Rolled',
      status: 'ReadyForReport'
    },
    {
      sampleNo: 'S-002',
      caseNo: '24-00013',
      customer: 'Shreenath Steel',
      material: 'Billet',
      condition: 'Hot Rolled',
      status: 'Completed'
    },
    {
      sampleNo: 'S-003',
      caseNo: '24-00014',
      customer: 'Tata Steel',
      material: 'Wire Rod',
      condition: 'Finished',
      status: 'Completed'
    },
    {
      sampleNo: 'S-004',
      caseNo: '24-00015',
      customer: 'JSW Steel',
      material: 'Plate',
      condition: 'Cold Rolled',
      status: 'ReadyForReport'
    },
    {
      sampleNo: 'S-005',
      caseNo: '24-00016',
      customer: 'ArcelorMittal',
      material: 'Coil',
      condition: 'Hot Rolled',
      status: 'Pending'
    },
    {
      sampleNo: 'S-006',
      caseNo: '24-00017',
      customer: 'SAIL',
      material: 'Bar',
      condition: 'As Rolled',
      status: 'Completed'
    }
  ];

  constructor() { }

  getReportingList(): Observable<ReportingListItem[]> {
    return of(this.dummyReportingList);
  }

  getReportPreview(sampleId: string): Observable<ReportingPreview> {
    const dummyPreview: ReportingPreview = {
      sampleNo: sampleId,
      caseNo: '24-00012',
      customer: 'ABC Metals',
      material: 'TMT',
      condition: 'As Rolled',
      summary: 'Sample tested successfully. All mechanical and chemical parameters are within acceptable limits.',
      mechanicalTests: [
        { parameter: 'Tensile Strength', value: 550, unit: 'MPa', standard: 'IS:1786', status: 'Pass' },
        { parameter: 'Yield Strength', value: 470, unit: 'MPa', standard: 'IS:1786', status: 'Pass' },
        { parameter: 'Elongation', value: 14.5, unit: '%', standard: 'IS:1786', status: 'Pass' },
        { parameter: 'Bending', value: 90, unit: 'Degree', standard: 'IS:1786', status: 'Pass' }
      ],
      chemicalTests: [
        { element: 'Carbon', percentage: 0.25, min: 0.15, max: 0.35, status: 'Pass' },
        { element: 'Manganese', percentage: 1.15, min: 0.85, max: 1.35, status: 'Pass' },
        { element: 'Silicon', percentage: 0.35, min: 0.10, max: 0.50, status: 'Pass' },
        { element: 'Phosphorus', percentage: 0.035, min: 0.00, max: 0.040, status: 'Pass' },
        { element: 'Sulfur', percentage: 0.025, min: 0.00, max: 0.030, status: 'Pass' }
      ],
      longTermTests: [
        { testName: 'Corrosion Resistance (Salt Spray)', startedAt: '2024-01-15', duration: '1000 hours', readings: 24, status: 'In Progress' },
        { testName: 'High Temperature Oxidation', startedAt: '2024-01-20', duration: '500 hours', readings: 12, status: 'In Progress' }
      ],
      remarks: 'All test results are satisfactory. No defects observed. Ready for approval and report generation.'
    };
    return of(dummyPreview);
  }
}
