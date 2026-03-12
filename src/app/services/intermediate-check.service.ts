import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { IntermediateCheckRecord, IntermediateCheckListResponse, IntermediateCheckResponse, IntermediateCheckDailyRecord } from '../models/intermediateCheckModel';

@Injectable({
  providedIn: 'root'
})
export class IntermediateCheckService {
  private dummyRecords: IntermediateCheckRecord[] = [
    {
      id: 1,
      formatNo: 'F-16',
      documentNo: 'IC-2025-01-001',
      issueNo: '01',
      revNo: '00',
      date: '2025-01-31',
      issueDate: new Date('2025-01-31'),

      checkMonth: 1,
      checkYear: 2025,
      location: 'Testing Lab - Room 101',

      equipmentId: 1,
      equipmentName: 'Universal Testing Machine',
      equipmentNo: 'UTM-001',

      dailyRecords: this.generateDailyRecords(31),
      totalChecksPerformed: 31,

      deviationsObserved: 'Minor fluctuation in load reading on 15th Jan',
      correctiveActions: 'Equipment recalibrated, readings normalized',
      nextCalibrationDue: new Date('2026-01-15'),

      checkedBy: 'Lab Technician 1',
      verifiedBy: 'Supervisor 1',

      createdBy: 'Admin',
      createdOn: new Date('2025-01-31'),
      isActive: true
    },
    {
      id: 2,
      formatNo: 'F-16',
      documentNo: 'IC-2025-02-001',
      issueNo: '01',
      revNo: '00',
      date: '2025-02-28',
      issueDate: new Date('2025-02-28'),

      checkMonth: 2,
      checkYear: 2025,
      location: 'Calibration Lab - Room 205',

      equipmentId: 2,
      equipmentName: 'Hardness Tester',
      equipmentNo: 'HT-002',

      dailyRecords: this.generateDailyRecords(28),
      totalChecksPerformed: 28,

      deviationsObserved: 'No deviations observed',
      correctiveActions: 'N/A',
      nextCalibrationDue: new Date('2026-02-05'),

      checkedBy: 'Lab Technician 2',
      verifiedBy: 'Supervisor 2',

      createdBy: 'Admin',
      createdOn: new Date('2025-02-28'),
      isActive: true
    }
  ];

  constructor() { }

  private generateDailyRecords(days: number): IntermediateCheckDailyRecord[] {
    const records = [];
    const currentYear = 2025;
    const currentMonth = 1; // January

    for (let i = 1; i <= days; i++) {
      const hasDeviation = i % 15 === 0; // Every 15th day has a deviation for demo
      records.push({
        date: new Date(currentYear, currentMonth - 1, i),
        checkStatus: hasDeviation ? 'deviation' as const : 'ok' as const,
        equipmentCondition: hasDeviation ? 'Minor fluctuation' : 'Normal operation',
        observations: hasDeviation ? 'Load reading fluctuation observed' : 'All parameters normal',
        correctiveAction: hasDeviation ? 'Recalibrated equipment' : 'N/A',
        checkedBy: i <= 15 ? 'Lab Technician 1' : 'Lab Technician 2',
        checkTime: `${9 + (i % 8)}:${(i % 60).toString().padStart(2, '0')} AM`
      });
    }
    return records;
  }

  getAll(params?: any): Observable<IntermediateCheckListResponse> {
    const pageNo = params?.PageNumber || 1;
    const pageSize = params?.PageSize || 10;
    const searchTerm = params?.searchTerm || '';
    const sortByColumn = params?.sortByColumn || 'checkDate';
    const sortOrder = params?.sortOrder || 'desc';

    let filteredRecords = [...this.dummyRecords];

    // Apply search filter
    if (searchTerm) {
      filteredRecords = filteredRecords.filter(record =>
        record.equipmentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.equipmentNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.checkedBy.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply sorting
    filteredRecords.sort((a, b) => {
      const aValue = a[sortByColumn as keyof IntermediateCheckRecord];
      const bValue = b[sortByColumn as keyof IntermediateCheckRecord];

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
      message: 'Intermediate check records retrieved successfully',
      items,
      totalRecords,
      pageNumber: pageNo,
      pageSize,
      success: true
    });
  }

  getById(id: number): Observable<IntermediateCheckRecord | null> {
    const record = this.dummyRecords.find(r => r.id === id);
    return of(record || null);
  }

  create(data: IntermediateCheckRecord): Observable<IntermediateCheckResponse> {
    const newRecord = { ...data, id: Date.now() };
    this.dummyRecords.push(newRecord);
    return of({
      status: 201,
      message: 'Intermediate check record created successfully',
      data: newRecord,
      success: true
    });
  }

  update(id: number, data: IntermediateCheckRecord): Observable<IntermediateCheckResponse> {
    const index = this.dummyRecords.findIndex(r => r.id === id);
    if (index > -1) {
      this.dummyRecords[index] = { ...data, id };
      return of({
        status: 200,
        message: 'Intermediate check record updated successfully',
        data: this.dummyRecords[index],
        success: true
      });
    }
    return of({
      status: 404,
      message: 'Intermediate check record not found',
      data: data,
      success: false
    });
  }

  delete(id: number): Observable<IntermediateCheckResponse> {
    const index = this.dummyRecords.findIndex(r => r.id === id);
    if (index > -1) {
      const deletedRecord = this.dummyRecords.splice(index, 1)[0];
      return of({
        status: 200,
        message: 'Intermediate check record deleted successfully',
        data: deletedRecord,
        success: true
      });
    }
    return of({
      status: 404,
      message: 'Intermediate check record not found',
      data: {} as IntermediateCheckRecord,
      success: false
    });
  }

  getByEquipmentId(equipmentId: number): Observable<IntermediateCheckListResponse> {
    const equipmentRecords = this.dummyRecords.filter(r => r.equipmentId === equipmentId);

    return of({
      status: 200,
      message: 'Intermediate check records retrieved successfully',
      items: equipmentRecords,
      totalRecords: equipmentRecords.length,
      pageNumber: 1,
      pageSize: equipmentRecords.length,
      success: true
    });
  }

  getPendingChecks(): Observable<IntermediateCheckListResponse> {
    const currentDate = new Date();
    const pendingRecords = this.dummyRecords.filter(r => {
      const recordDate = new Date(r.checkYear, r.checkMonth - 1, 1);
      return recordDate.getMonth() === currentDate.getMonth() &&
        recordDate.getFullYear() === currentDate.getFullYear() &&
        r.dailyRecords.some(d => d.checkStatus === 'not-performed');
    });

    return of({
      status: 200,
      message: 'Pending intermediate check records retrieved successfully',
      items: pendingRecords,
      totalRecords: pendingRecords.length,
      pageNumber: 1,
      pageSize: pendingRecords.length,
      success: true
    });
  }
}
