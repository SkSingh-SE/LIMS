import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { CrmConsumptionRecord, CrmConsumptionListResponse, CrmConsumptionResponse, CrmDailyConsumption } from '../models/crmConsumptionModel';

@Injectable({
  providedIn: 'root'
})
export class CrmConsumptionService {
  private dummyRecords: CrmConsumptionRecord[] = [
    {
      id: 1,
      formatNo: 'F-18',
      documentNo: 'CRM-CONS-2025-01-001',
      issueNo: '01',
      revNo: '00',
      date: '2025-01-31',
      issueDate: '2025-01-31',

      consumptionMonth: 1,
      consumptionYear: 2025,

      referenceMaterialId: 1,
      materialName: 'Standard Steel Sample - Mild Steel',
      materialCode: 'SS-MS-001',
      batchNo: 'B-2025-001',
      currentStock: 50,
      unitOfMeasure: 'pieces',

      openingStock: 100,
      received: 0,
      consumed: 50,
      wastage: 0,
      closingStock: 50,

      dailyConsumption: this.generateDailyConsumption(31, 100, 50),

      purposeOfUse: 'Tensile testing calibration and verification',
      testMethods: ['ASTM E8/E8M', 'IS 1608'],
      departments: ['Mechanical Testing', 'Quality Control'],

      totalConsumption: 50,
      averageDailyConsumption: 1.61,
      consumptionTrend: 'stable',
      remarks: 'Consumption within expected limits',

      recordedBy: 'Lab Technician 1',
      verifiedBy: 'Supervisor 1',

      createdBy: 'Admin',
      createdOn: '2025-01-31',
      isActive: true
    },
    {
      id: 2,
      formatNo: 'F-18',
      documentNo: 'CRM-CONS-2025-02-001',
      issueNo: '01',
      revNo: '00',
      date: '2025-02-28',
      issueDate: '2025-02-28',

      consumptionMonth: 2,
      consumptionYear: 2025,

      referenceMaterialId: 2,
      materialName: 'Sulfuric Acid Standard Solution',
      materialCode: 'SA-H2SO4-001',
      batchNo: 'B-2025-002',
      currentStock: 20,
      unitOfMeasure: 'liters',

      openingStock: 30,
      received: 0,
      consumed: 10,
      wastage: 0,
      closingStock: 20,

      dailyConsumption: this.generateDailyConsumption(28, 30, 10),

      purposeOfUse: 'Chemical analysis and sample preparation',
      testMethods: ['ASTM D93', 'IS 3025'],
      departments: ['Chemical Testing', 'Research & Development'],

      totalConsumption: 10,
      averageDailyConsumption: 0.36,
      consumptionTrend: 'decreasing',
      remarks: 'Reduced consumption due to process optimization',

      recordedBy: 'Lab Technician 2',
      verifiedBy: 'Supervisor 2',

      createdBy: 'Admin',
      createdOn: '2025-02-28',
      isActive: true
    }
  ];

  constructor() { }

  private generateDailyConsumption(days: number, openingStock: number, totalConsumed: number): CrmDailyConsumption[] {
    const records = [];
    const currentYear = 2025;
    const currentMonth = 1; // January
    let currentStock = openingStock;
    const dailyConsumptionRate = totalConsumed / days;

    for (let i = 1; i <= days; i++) {
      const dailyConsumed = i === days ?
        currentStock - (openingStock - totalConsumed) :
        Math.floor(dailyConsumptionRate + Math.random() * 2 - 1);

      const wastage = Math.random() > 0.9 ? Math.random() * 0.5 : 0;
      const closingBalance = currentStock - dailyConsumed - wastage;

      records.push({
        date: new Date(currentYear, currentMonth - 1, i).toISOString().split('T')[0],
        openingBalance: currentStock,
        quantityConsumed: dailyConsumed,
        quantityWasted: wastage,
        closingBalance: closingBalance,
        purpose: i % 7 === 0 ? 'Weekly calibration check' : 'Daily testing',
        testMethod: i % 3 === 0 ? 'ASTM E8/E8M' : 'IS 1608',
        performedBy: i <= 15 ? 'Lab Technician 1' : 'Lab Technician 2',
        remarks: i % 10 === 0 ? 'Higher consumption due to urgent testing' : 'Normal consumption'
      });

      currentStock = closingBalance;
    }
    return records;
  }

  getAll(params?: any): Observable<CrmConsumptionListResponse> {
    const pageNo = params?.PageNumber || 1;
    const pageSize = params?.PageSize || 10;
    const searchTerm = params?.searchTerm || '';
    const sortByColumn = params?.sortByColumn || 'consumptionYear';
    const sortOrder = params?.sortOrder || 'desc';

    let filteredRecords = [...this.dummyRecords];

    // Apply search filter
    if (searchTerm) {
      filteredRecords = filteredRecords.filter(record =>
        record.materialName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.materialCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.batchNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.purposeOfUse.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply sorting
    filteredRecords.sort((a, b) => {
      const aValue = a[sortByColumn as keyof CrmConsumptionRecord];
      const bValue = b[sortByColumn as keyof CrmConsumptionRecord];

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
      message: 'CRM consumption records retrieved successfully',
      items,
      totalRecords,
      pageNumber: pageNo,
      pageSize,
      success: true
    });
  }

  getById(id: number): Observable<CrmConsumptionRecord | null> {
    const record = this.dummyRecords.find(r => r.id === id);
    return of(record || null);
  }

  create(data: CrmConsumptionRecord): Observable<CrmConsumptionResponse> {
    const newRecord = { ...data, id: Date.now() };
    this.dummyRecords.push(newRecord);
    return of({
      status: 201,
      message: 'CRM consumption record created successfully',
      data: newRecord,
      success: true
    });
  }

  update(id: number, data: CrmConsumptionRecord): Observable<CrmConsumptionResponse> {
    const index = this.dummyRecords.findIndex(r => r.id === id);
    if (index > -1) {
      this.dummyRecords[index] = { ...data, id };
      return of({
        status: 200,
        message: 'CRM consumption record updated successfully',
        data: this.dummyRecords[index],
        success: true
      });
    }
    return of({
      status: 404,
      message: 'CRM consumption record not found',
      data: data,
      success: false
    });
  }

  delete(id: number): Observable<CrmConsumptionResponse> {
    const index = this.dummyRecords.findIndex(r => r.id === id);
    if (index > -1) {
      const deletedRecord = this.dummyRecords.splice(index, 1)[0];
      return of({
        status: 200,
        message: 'CRM consumption record deleted successfully',
        data: deletedRecord,
        success: true
      });
    }
    return of({
      status: 404,
      message: 'CRM consumption record not found',
      data: {} as CrmConsumptionRecord,
      success: false
    });
  }

  getByMaterialId(materialId: number): Observable<CrmConsumptionListResponse> {
    const materialRecords = this.dummyRecords.filter(r => r.referenceMaterialId === materialId);

    return of({
      status: 200,
      message: 'CRM consumption records retrieved successfully',
      items: materialRecords,
      totalRecords: materialRecords.length,
      pageNumber: 1,
      pageSize: materialRecords.length,
      success: true
    });
  }

  getByPeriod(month: number, year: number): Observable<CrmConsumptionListResponse> {
    const periodRecords = this.dummyRecords.filter(r =>
      r.consumptionMonth === month && r.consumptionYear === year
    );

    return of({
      status: 200,
      message: 'CRM consumption records retrieved successfully',
      items: periodRecords,
      totalRecords: periodRecords.length,
      pageNumber: 1,
      pageSize: periodRecords.length,
      success: true
    });
  }
}
