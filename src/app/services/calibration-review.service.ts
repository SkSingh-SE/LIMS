import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { CalibrationCertificate, CalibrationReviewListResponse, CalibrationReviewResponse, CalibrationPoint } from '../models/calibrationReviewModel';

@Injectable({
  providedIn: 'root'
})
export class CalibrationReviewService {
  private dummyRecords: CalibrationCertificate[] = [
    {
      id: 1,
      formatNo: 'F-15',
      documentNo: 'CAL-REV-2025-001',
      issueNo: '01',
      revNo: '00',
      date: '2025-01-20',
      issueDate: new Date('2025-01-20'),

      certificateNo: 'NABL-CAL-2025-001',
      calibrationDate: new Date('2025-01-15'),
      nextCalibrationDate: new Date('2026-01-15'),
      calibratingAgency: 'NABL Accredited Calibration Lab',
      agencyAccreditationNo: 'NABL-TC-1234',
      certificateValidFrom: new Date('2025-01-15'),
      certificateValidTo: new Date('2026-01-14'),

      equipmentId: 1,
      equipmentName: 'Universal Testing Machine',
      equipmentNo: 'UTM-001',
      equipmentIdentification: 'UTM-001-SN12345',
      manufacturer: 'Instron',
      model: '5969',
      serialNo: 'SN12345',

      calibrationProcedure: 'ASTM E4 - Standard Practices for Force Verification',
      environmentalConditions: 'Temperature: 23±2°C, Humidity: 50±10% RH',
      referenceStandards: ['NIST Traceable Standard - 1000 kgf', 'Dead Weight Set - 500 kgf'],
      calibrationPoints: [
        {
          parameter: 'Load Cell 1000 kgf',
          nominalValue: 1000,
          measuredValue: 1000.5,
          deviation: 0.5,
          tolerance: 2.0,
          passFail: 'pass',
          uncertainty: 0.3
        },
        {
          parameter: 'Load Cell 500 kgf',
          nominalValue: 500,
          measuredValue: 500.2,
          deviation: 0.2,
          tolerance: 1.5,
          passFail: 'pass',
          uncertainty: 0.2
        },
        {
          parameter: 'Load Cell 100 kgf',
          nominalValue: 100,
          measuredValue: 100.1,
          deviation: 0.1,
          tolerance: 1.0,
          passFail: 'pass',
          uncertainty: 0.1
        }
      ],
      uncertainty: '±0.3% of reading',
      remarks: 'All calibration points within specified limits. Certificate approved.',

      reviewDate: new Date('2025-01-18'),
      reviewedBy: 'Dr. Robert Chen',
      reviewStatus: 'approved',
      reviewComments: 'Calibration performed as per standard procedure. All parameters within tolerance.',
      approvedBy: 'Lab Manager',
      approvalDate: new Date('2025-01-19'),

      createdBy: 'Admin',
      createdOn: new Date('2025-01-18'),
      isActive: true
    },
    {
      id: 2,
      formatNo: 'F-15',
      documentNo: 'CAL-REV-2025-002',
      issueNo: '01',
      revNo: '00',
      date: '2025-02-10',
      issueDate: new Date('2025-02-10'),

      certificateNo: 'NABL-CAL-2025-042',
      calibrationDate: new Date('2025-02-05'),
      nextCalibrationDate: new Date('2026-02-05'),
      calibratingAgency: 'Accredited Calibration Services Ltd.',
      agencyAccreditationNo: 'NABL-TC-5678',
      certificateValidFrom: new Date('2025-02-05'),
      certificateValidTo: new Date('2026-02-04'),

      equipmentId: 2,
      equipmentName: 'Hardness Tester',
      equipmentNo: 'HT-002',
      equipmentIdentification: 'HT-002-SN67890',
      manufacturer: 'Rockwell',
      model: '2000',
      serialNo: 'SN67890',

      calibrationProcedure: 'ASTM E10 - Standard Test Method for Brinell Hardness',
      environmentalConditions: 'Temperature: 22±2°C, Humidity: 45±10% RH',
      referenceStandards: ['NIST Certified Hardness Blocks - HRC 20, 40, 60'],
      calibrationPoints: [
        {
          parameter: 'Hardness Block HRC 20',
          nominalValue: 20,
          measuredValue: 20.2,
          deviation: 0.2,
          tolerance: 1.0,
          passFail: 'pass',
          uncertainty: 0.5
        },
        {
          parameter: 'Hardness Block HRC 40',
          nominalValue: 40,
          measuredValue: 40.3,
          deviation: 0.3,
          tolerance: 1.0,
          passFail: 'pass',
          uncertainty: 0.5
        },
        {
          parameter: 'Hardness Block HRC 60',
          nominalValue: 60,
          measuredValue: 60.4,
          deviation: 0.4,
          tolerance: 1.0,
          passFail: 'pass',
          uncertainty: 0.5
        }
      ],
      uncertainty: '±0.5 HRC',
      remarks: 'Minor deviation observed but within acceptable limits.',

      reviewDate: new Date('2025-02-08'),
      reviewedBy: 'Ms. Jennifer Lee',
      reviewStatus: 'conditional-approval',
      reviewComments: 'Calibration acceptable. Recommend monitoring HRC 60 block more frequently.',
      approvedBy: 'Quality Manager',
      approvalDate: new Date('2025-02-09'),

      createdBy: 'Admin',
      createdOn: new Date('2025-02-08'),
      isActive: true
    }
  ];

  constructor() { }

  getAll(params?: any): Observable<CalibrationReviewListResponse> {
    const pageNo = params?.PageNumber || 1;
    const pageSize = params?.PageSize || 10;
    const searchTerm = params?.searchTerm || '';
    const sortByColumn = params?.sortByColumn || 'calibrationDate';
    const sortOrder = params?.sortOrder || 'desc';

    let filteredRecords = [...this.dummyRecords];

    // Apply search filter
    if (searchTerm) {
      filteredRecords = filteredRecords.filter(record =>
        record.equipmentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.equipmentNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.certificateNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.calibratingAgency.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.reviewStatus.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply sorting
    filteredRecords.sort((a, b) => {
      const aValue = a[sortByColumn as keyof CalibrationCertificate];
      const bValue = b[sortByColumn as keyof CalibrationCertificate];

      if (aValue === undefined && bValue === undefined) return 0;
      if (aValue === undefined) return sortOrder === 'asc' ? 1 : -1;
      if (bValue === undefined) return sortOrder === 'asc' ? -1 : 1;

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    const totalRecords = filteredRecords.length;
    const startIndex = (pageNo - 1) * pageSize;
    const items = filteredRecords.slice(startIndex, startIndex + pageSize);

    return of({
      status: 200,
      message: 'Calibration review records retrieved successfully',
      items,
      totalRecords,
      pageNumber: pageNo,
      pageSize,
      success: true
    });
  }

  getById(id: number): Observable<CalibrationCertificate | null> {
    const record = this.dummyRecords.find(r => r.id === id);
    return of(record || null);
  }

  create(data: CalibrationCertificate): Observable<CalibrationReviewResponse> {
    const newRecord = { ...data, id: Date.now() };
    this.dummyRecords.push(newRecord);
    return of({
      status: 201,
      message: 'Calibration review record created successfully',
      data: newRecord,
      success: true
    });
  }

  update(id: number, data: CalibrationCertificate): Observable<CalibrationReviewResponse> {
    const index = this.dummyRecords.findIndex(r => r.id === id);
    if (index > -1) {
      this.dummyRecords[index] = { ...data, id };
      return of({
        status: 200,
        message: 'Calibration review record updated successfully',
        data: this.dummyRecords[index],
        success: true
      });
    }
    return of({
      status: 404,
      message: 'Calibration review record not found',
      data: data,
      success: false
    });
  }

  delete(id: number): Observable<CalibrationReviewResponse> {
    const index = this.dummyRecords.findIndex(r => r.id === id);
    if (index > -1) {
      const deletedRecord = this.dummyRecords.splice(index, 1)[0];
      return of({
        status: 200,
        message: 'Calibration review record deleted successfully',
        data: deletedRecord,
        success: true
      });
    }
    return of({
      status: 404,
      message: 'Calibration review record not found',
      data: {} as CalibrationCertificate,
      success: false
    });
  }

  getPendingReviews(): Observable<CalibrationReviewListResponse> {
    const pendingRecords = this.dummyRecords.filter(r =>
      r.reviewStatus === 'requires-clarification' || r.reviewStatus === 'conditional-approval'
    );

    return of({
      status: 200,
      message: 'Pending calibration review records retrieved successfully',
      items: pendingRecords,
      totalRecords: pendingRecords.length,
      pageNumber: 1,
      pageSize: pendingRecords.length,
      success: true
    });
  }
}
