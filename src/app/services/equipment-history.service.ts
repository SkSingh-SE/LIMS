import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { EquipmentHistoryRecord, EquipmentHistoryListResponse, EquipmentHistoryResponse } from '../models/equipmentHistoryModel';

@Injectable({
  providedIn: 'root'
})
export class EquipmentHistoryService {
  private dummyRecords: EquipmentHistoryRecord[] = [
    {
      id: 1,
      formatNo: 'F-14',
      issueNo: '01',
      revNo: '00',
      date: '2025-01-15',
      equipmentId: 1,
      equipmentName: 'Universal Testing Machine',
      equipmentNo: 'UTM-001',
      recordType: 'calibration',
      recordDate: new Date('2025-01-15'),
      performedBy: 'John Smith',
      agency: 'NABL Calibration Lab',
      certificateNo: 'CAL-2025-001',
      nextDueDate: new Date('2026-01-15'),
      description: 'Annual calibration of UTM-001 as per NABL requirements',
      observations: 'All parameters within specified limits',
      actionsTaken: 'Calibration completed successfully',
      cost: 15000,
      status: 'completed',
      documents: ['CAL-2025-001.pdf', 'UTM-001-Calibration-Report.pdf'],
      createdBy: 'Admin',
      createdOn: new Date('2025-01-15'),
      isActive: true
    },
    {
      id: 2,
      formatNo: 'F-14',
      issueNo: '01',
      revNo: '00',
      date: '2025-02-10',
      equipmentId: 1,
      equipmentName: 'Universal Testing Machine',
      equipmentNo: 'UTM-001',
      recordType: 'maintenance',
      recordDate: new Date('2025-02-10'),
      performedBy: 'Mike Johnson',
      description: 'Preventive maintenance - lubrication and inspection',
      observations: 'Minor wear on hydraulic seals observed',
      actionsTaken: 'Seals replaced, system lubricated',
      cost: 5000,
      status: 'completed',
      documents: ['UTM-001-Maintenance-Report.pdf'],
      createdBy: 'Admin',
      createdOn: new Date('2025-02-10'),
      isActive: true
    },
    {
      id: 3,
      formatNo: 'F-14',
      issueNo: '01',
      revNo: '00',
      date: '2025-01-20',
      equipmentId: 2,
      equipmentName: 'Hardness Tester',
      equipmentNo: 'HT-002',
      recordType: 'calibration',
      recordDate: new Date('2025-01-20'),
      performedBy: 'Sarah Wilson',
      agency: 'Accredited Calibration Services',
      certificateNo: 'CAL-2025-042',
      nextDueDate: new Date('2026-01-20'),
      description: 'Bi-annual calibration of hardness tester',
      observations: 'Calibration results within tolerance',
      actionsTaken: 'Calibration completed, certificate issued',
      cost: 8000,
      status: 'completed',
      documents: ['CAL-2025-042.pdf'],
      createdBy: 'Admin',
      createdOn: new Date('2025-01-20'),
      isActive: true
    }
  ];

  constructor() { }

  getAll(params?: any): Observable<EquipmentHistoryListResponse> {
    const pageNo = params?.PageNumber || 1;
    const pageSize = params?.PageSize || 10;
    const searchTerm = params?.searchTerm || '';
    const sortByColumn = params?.sortByColumn || 'recordDate';
    const sortOrder = params?.sortOrder || 'desc';

    let filteredRecords = [...this.dummyRecords];

    // Apply search filter
    if (searchTerm) {
      filteredRecords = filteredRecords.filter(record =>
        record.equipmentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.equipmentNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.recordType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.performedBy.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply sorting
    filteredRecords.sort((a, b) => {
      const aValue = a[sortByColumn as keyof EquipmentHistoryRecord];
      const bValue = b[sortByColumn as keyof EquipmentHistoryRecord];

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
      message: 'Equipment history records retrieved successfully',
      items,
      totalRecords,
      pageNumber: pageNo,
      pageSize,
      success: true
    });
  }

  getById(id: number): Observable<EquipmentHistoryRecord | null> {
    const record = this.dummyRecords.find(r => r.id === id);
    return of(record || null);
  }

  create(data: EquipmentHistoryRecord): Observable<EquipmentHistoryResponse> {
    const newRecord = { ...data, id: Date.now() };
    this.dummyRecords.push(newRecord);
    return of({
      status: 201,
      message: 'Equipment history record created successfully',
      data: newRecord,
      success: true
    });
  }

  update(id: number, data: EquipmentHistoryRecord): Observable<EquipmentHistoryResponse> {
    const index = this.dummyRecords.findIndex(r => r.id === id);
    if (index > -1) {
      this.dummyRecords[index] = { ...data, id };
      return of({
        status: 200,
        message: 'Equipment history record updated successfully',
        data: this.dummyRecords[index],
        success: true
      });
    }
    return of({
      status: 404,
      message: 'Equipment history record not found',
      data: data,
      success: false
    });
  }

  delete(id: number): Observable<EquipmentHistoryResponse> {
    const index = this.dummyRecords.findIndex(r => r.id === id);
    if (index > -1) {
      const deletedRecord = this.dummyRecords.splice(index, 1)[0];
      return of({
        status: 200,
        message: 'Equipment history record deleted successfully',
        data: deletedRecord,
        success: true
      });
    }
    return of({
      status: 404,
      message: 'Equipment history record not found',
      data: {} as EquipmentHistoryRecord,
      success: false
    });
  }

  getByEquipmentId(equipmentId: number): Observable<EquipmentHistoryListResponse> {
    const equipmentRecords = this.dummyRecords.filter(r => r.equipmentId === equipmentId);

    return of({
      status: 200,
      message: 'Equipment history records retrieved successfully',
      items: equipmentRecords,
      totalRecords: equipmentRecords.length,
      pageNumber: 1,
      pageSize: equipmentRecords.length,
      success: true
    });
  }
}
