import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { EnvironmentMonitoring, EnvironmentMonitoringListResponse, EnvironmentMonitoringResponse } from '../models/environmentMonitoringModel';

@Injectable({
  providedIn: 'root'
})
export class EnvironmentMonitoringService {
  private dummyRecords: EnvironmentMonitoring[] = [
    {
      id: 1,
      formatNo: 'F-12',
      documentNo: 'EM-2025-01-001',
      issueNo: '01',
      revNo: '00',
      date: '2025-01-31',
      issueDate: new Date('2025-01-31'),
      monitoringMonth: 1,
      monitoringYear: 2025,
      location: 'Testing Lab - Room 101',
      minTempLimit: 20,
      maxTempLimit: 25,
      minHumidityLimit: 45,
      maxHumidityLimit: 65,
      dailyRecords: this.generateDailyRecords(31),
      totalRecordssTaken: 31,
      deviationsObserved: 'Humidity exceeded limit on 15th Jan (68%)',
      correctionsTaken: 'AC adjusted, humidity restored to 62%',
      recordedBy: 'Lab Technician 1',
      createdBy: 'Admin',
      createdOn: new Date('2025-01-31'),
      isActive: true
    },
    {
      id: 2,
      formatNo: 'F-12',
      documentNo: 'EM-2025-02-001',
      issueNo: '01',
      revNo: '00',
      date: '2025-02-28',
      issueDate: new Date('2025-02-28'),
      monitoringMonth: 2,
      monitoringYear: 2025,
      location: 'Calibration Lab - Room 205',
      minTempLimit: 19,
      maxTempLimit: 26,
      minHumidityLimit: 40,
      maxHumidityLimit: 70,
      dailyRecords: this.generateDailyRecords(28),
      totalRecordssTaken: 28,
      deviationsObserved: 'No deviations',
      correctionsTaken: 'N/A',
      recordedBy: 'Lab Technician 2',
      createdBy: 'Admin',
      createdOn: new Date('2025-02-28'),
      isActive: true
    }
  ];

  constructor() { }

  private generateDailyRecords(days: number) {
    const records = [];
    for (let i = 1; i <= days; i++) {
      records.push({
        date: new Date(2025, 0, i),
        temperature: 22 + Math.random() * 3 - 1.5, // 20.5 - 23.5
        humidity: 55 + Math.random() * 20 - 10, // 45 - 65
        pressure: 1013 + Math.random() * 2 - 1,
        airQuality: 'Good',
        remarks: i % 7 === 0 ? 'Weekly check completed' : ''
      });
    }
    return records;
  }

  getAll(params?: any): Observable<EnvironmentMonitoringListResponse> {
    const pageNo = params?.PageNumber || 1;
    const pageSize = params?.PageSize || 10;
    const totalRecords = this.dummyRecords.length;
    const startIndex = (pageNo - 1) * pageSize;
    const items = this.dummyRecords.slice(startIndex, startIndex + pageSize);

    return of({
      status: 200,
      message: 'Environment monitoring records retrieved successfully',
      items,
      totalRecords,
      pageNumber: pageNo,
      pageSize,
      success: true
    });
  }

  getById(id: number): Observable<EnvironmentMonitoring | null> {
    const record = this.dummyRecords.find(r => r.id === id);
    return of(record || null);
  }

  create(data: EnvironmentMonitoring): Observable<EnvironmentMonitoringResponse> {
    const newRecord = { ...data, id: Date.now() };
    this.dummyRecords.push(newRecord);
    return of({
      status: 201,
      message: 'Environment monitoring record created successfully',
      data: newRecord,
      success: true
    });
  }

  update(id: number, data: EnvironmentMonitoring): Observable<EnvironmentMonitoringResponse> {
    const index = this.dummyRecords.findIndex(r => r.id === id);
    if (index > -1) {
      this.dummyRecords[index] = { ...data, id };
      return of({
        status: 200,
        message: 'Environment monitoring record updated successfully',
        data: this.dummyRecords[index],
        success: true
      });
    }
    return of({
      status: 404,
      message: 'Environment monitoring record not found',
      data: data,
      success: false
    });
  }

  delete(id: number): Observable<EnvironmentMonitoringResponse> {
    const index = this.dummyRecords.findIndex(r => r.id === id);
    if (index > -1) {
      const deletedRecord = this.dummyRecords.splice(index, 1)[0];
      return of({
        status: 200,
        message: 'Environment monitoring record deleted successfully',
        data: deletedRecord,
        success: true
      });
    }
    return of({
      status: 404,
      message: 'Environment monitoring record not found',
      data: {} as EnvironmentMonitoring,
      success: false
    });
  }
}
