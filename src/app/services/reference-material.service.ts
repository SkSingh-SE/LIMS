import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { ReferenceMaterial, ReferenceMaterialListResponse, ReferenceMaterialResponse } from '../models/referenceMaterialModel';

@Injectable({
  providedIn: 'root'
})
export class ReferenceMaterialService {
  private dummyRecords: ReferenceMaterial[] = [
    {
      id: 1,
      formatNo: 'F-17',
      documentNo: 'RM-2025-001',
      issueNo: '01',
      revNo: '00',
      date: '2025-01-15',
      issueDate: '2025-01-15',

      materialName: 'Standard Steel Sample - Mild Steel',
      materialCode: 'SS-MS-001',
      category: 'Metallic Standard',
      type: 'physical',
      grade: 'NABL Certified',
      manufacturer: 'NIST Certified Materials',
      manufacturerCode: 'NIST-MS-001',
      batchNo: 'B-2025-001',
      lotNo: 'L-2025-001',

      specifications: 'Carbon: 0.25%, Manganese: 0.8%, Sulfur: 0.05%, Phosphorus: 0.04%',
      purity: 99.5,
      concentration: 'N/A',
      physicalState: 'solid',
      storageConditions: 'Room temperature, dry environment',
      shelfLife: 24,
      expiryDate: '2027-01-15',

      certificateOfAnalysis: true,
      certificateNo: 'COA-2025-001',
      certifiedBy: 'NABL Certified Lab',
      certificationDate: '2025-01-10',
      traceability: 'NIST Traceable Standard SRM 1155a',

      currentStock: 50,
      unitOfMeasure: 'pieces',
      minimumStock: 10,
      maximumStock: 100,
      reorderLevel: 15,
      storageLocation: 'Cabinet A-1',

      usageFrequency: 'weekly',
      criticality: 'critical',

      qualityCheckFrequency: 'Monthly',
      lastQualityCheck: '2025-01-01',
      nextQualityCheck: '2025-02-01',

      createdBy: 'Admin',
      createdOn: '2025-01-15',
      isActive: true
    },
    {
      id: 2,
      formatNo: 'F-17',
      documentNo: 'RM-2025-002',
      issueNo: '01',
      revNo: '00',
      date: '2025-01-20',
      issueDate: '2025-01-20',

      materialName: 'Sulfuric Acid Standard Solution',
      materialCode: 'SA-H2SO4-001',
      category: 'Chemical Standard',
      type: 'chemical',
      grade: 'Analytical Grade',
      manufacturer: 'Merck Chemicals',
      manufacturerCode: 'MERCK-SA-001',
      batchNo: 'B-2025-002',
      lotNo: 'L-2025-002',

      specifications: 'H2SO4 Concentration: 98% ± 0.5%',
      purity: 98.0,
      concentration: '98% w/w',
      physicalState: 'liquid',
      storageConditions: 'Cool, dry place, away from sunlight',
      shelfLife: 36,
      expiryDate: '2028-01-20',

      certificateOfAnalysis: true,
      certificateNo: 'COA-2025-002',
      certifiedBy: 'Manufacturer Certified',
      certificationDate: '2025-01-05',
      traceability: 'USP Reference Standard',

      currentStock: 25,
      unitOfMeasure: 'liters',
      minimumStock: 5,
      maximumStock: 50,
      reorderLevel: 8,
      storageLocation: 'Chemical Cabinet B-2',

      usageFrequency: 'monthly',
      criticality: 'important',

      qualityCheckFrequency: 'Quarterly',
      lastQualityCheck: '2025-01-01',
      nextQualityCheck: '2025-04-01',

      createdBy: 'Admin',
      createdOn: '2025-01-20',
      isActive: true
    },
    {
      id: 3,
      formatNo: 'F-17',
      documentNo: 'RM-2025-003',
      issueNo: '01',
      revNo: '00',
      date: '2025-02-01',
      issueDate: '2025-02-01',

      materialName: 'Hardness Test Block - HRC 60',
      materialCode: 'HTB-HRC60-001',
      category: 'Hardness Standard',
      type: 'physical',
      grade: 'NABL Certified',
      manufacturer: 'Rockwell Standards Inc.',
      manufacturerCode: 'RSI-HTB-001',
      batchNo: 'B-2025-003',
      lotNo: 'L-2025-003',

      specifications: 'Rockwell Hardness: 60 ± 1 HRC',
      purity: 100,
      concentration: 'N/A',
      physicalState: 'solid',
      storageConditions: 'Room temperature, protected from impact',
      shelfLife: 60,
      expiryDate: '2030-02-01',

      certificateOfAnalysis: true,
      certificateNo: 'COA-2025-003',
      certifiedBy: 'NABL Certified Lab',
      certificationDate: '2025-01-25',
      traceability: 'NIST Traceable Standard',

      currentStock: 15,
      unitOfMeasure: 'pieces',
      minimumStock: 3,
      maximumStock: 30,
      reorderLevel: 5,
      storageLocation: 'Cabinet C-3',

      usageFrequency: 'daily',
      criticality: 'critical',

      qualityCheckFrequency: 'Monthly',
      lastQualityCheck: '2025-01-15',
      nextQualityCheck: '2025-02-15',

      createdBy: 'Admin',
      createdOn: '2025-02-01',
      isActive: true
    }
  ];

  constructor() { }

  getAll(params?: any): Observable<ReferenceMaterialListResponse> {
    const pageNo = params?.PageNumber || 1;
    const pageSize = params?.PageSize || 10;
    const searchTerm = params?.searchTerm || '';
    const sortByColumn = params?.sortByColumn || 'materialName';
    const sortOrder = params?.sortOrder || 'asc';

    let filteredRecords = [...this.dummyRecords];

    // Apply search filter
    if (searchTerm) {
      filteredRecords = filteredRecords.filter(record =>
        record.materialName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.materialCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.type.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply sorting
    filteredRecords.sort((a, b) => {
      const aValue = a[sortByColumn as keyof ReferenceMaterial];
      const bValue = b[sortByColumn as keyof ReferenceMaterial];

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
      message: 'Reference material records retrieved successfully',
      items,
      totalRecords,
      pageNumber: pageNo,
      pageSize,
      success: true
    });
  }

  getById(id: number): Observable<ReferenceMaterial | null> {
    const record = this.dummyRecords.find(r => r.id === id);
    return of(record || null);
  }

  create(data: ReferenceMaterial): Observable<ReferenceMaterialResponse> {
    const newRecord = { ...data, id: Date.now() };
    this.dummyRecords.push(newRecord);
    return of({
      status: 201,
      message: 'Reference material record created successfully',
      data: newRecord,
      success: true
    });
  }

  update(id: number, data: ReferenceMaterial): Observable<ReferenceMaterialResponse> {
    const index = this.dummyRecords.findIndex(r => r.id === id);
    if (index > -1) {
      this.dummyRecords[index] = { ...data, id };
      return of({
        status: 200,
        message: 'Reference material record updated successfully',
        data: this.dummyRecords[index],
        success: true
      });
    }
    return of({
      status: 404,
      message: 'Reference material record not found',
      data: data,
      success: false
    });
  }

  delete(id: number): Observable<ReferenceMaterialResponse> {
    const index = this.dummyRecords.findIndex(r => r.id === id);
    if (index > -1) {
      const deletedRecord = this.dummyRecords.splice(index, 1)[0];
      return of({
        status: 200,
        message: 'Reference material record deleted successfully',
        data: deletedRecord,
        success: true
      });
    }
    return of({
      status: 404,
      message: 'Reference material record not found',
      data: {} as ReferenceMaterial,
      success: false
    });
  }

  getLowStockItems(): Observable<ReferenceMaterialListResponse> {
    const lowStockRecords = this.dummyRecords.filter(r => r.currentStock <= r.reorderLevel);

    return of({
      status: 200,
      message: 'Low stock reference materials retrieved successfully',
      items: lowStockRecords,
      totalRecords: lowStockRecords.length,
      pageNumber: 1,
      pageSize: lowStockRecords.length,
      success: true
    });
  }

  getExpiringItems(): Observable<ReferenceMaterialListResponse> {
    const currentDate = new Date();
    const threeMonthsFromNow = new Date(currentDate.getTime() + (90 * 24 * 60 * 60 * 1000));

    const expiringRecords = this.dummyRecords.filter(r => {
      const expiryDate = new Date(r.expiryDate);
      return expiryDate <= threeMonthsFromNow;
    });

    return of({
      status: 200,
      message: 'Expiring reference materials retrieved successfully',
      items: expiringRecords,
      totalRecords: expiringRecords.length,
      pageNumber: 1,
      pageSize: expiringRecords.length,
      success: true
    });
  }
}
