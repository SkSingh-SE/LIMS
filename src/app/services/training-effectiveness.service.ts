import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { TrainingEffectiveness, TrainingEffectivenessListResponse, TrainingEffectivenessResponse } from '../models/trainingEffectivenessModel';

@Injectable({
  providedIn: 'root'
})
export class TrainingEffectivenessService {
  private dummyRecords: TrainingEffectiveness[] = [
    {
      id: 1,
      formatNo: 'F-10',
      documentNo: 'TE-2025-001',
      issueNo: 1,
      revNo: 0,
      issueDate: new Date('2025-01-20'),
      trainingCode: 'SAF-101',
      trainingName: 'Lab Safety & Emergency Procedures',
      trainingDate: new Date('2025-01-15'),
      participants: 15,
      preTrainingAssessments: [
        { id: 1, assessmentType: 'Pre-Training', parameter: 'Safety Knowledge', score: 4, remark: 'Basic understanding' },
        { id: 2, assessmentType: 'Pre-Training', parameter: 'Emergency Response', score: 3, remark: 'Limited experience' },
        { id: 3, assessmentType: 'Pre-Training', parameter: 'Safety Compliance', score: 3, remark: 'Needs improvement' }
      ],
      postTrainingAssessments: [
        { id: 4, assessmentType: 'Post-Training', parameter: 'Safety Knowledge', score: 8, remark: 'Significantly improved' },
        { id: 5, assessmentType: 'Post-Training', parameter: 'Emergency Response', score: 8, remark: 'Confident in procedures' },
        { id: 6, assessmentType: 'Post-Training', parameter: 'Safety Compliance', score: 8, remark: 'Well understood' }
      ],
      overallEffectivenessRating: 8,
      recommendations: 'Training was highly effective. Consider annual refresher sessions.',
      evaluatedBy: 'Safety Officer',
      createdBy: 'Admin',
      createdOn: new Date('2025-01-20'),
      isActive: true
    },
    {
      id: 2,
      formatNo: 'F-10',
      documentNo: 'TE-2025-002',
      issueNo: 1,
      revNo: 0,
      issueDate: new Date('2025-02-05'),
      trainingCode: 'QUA-202',
      trainingName: 'ISO 17025 Quality Management',
      trainingDate: new Date('2025-02-01'),
      participants: 8,
      preTrainingAssessments: [
        { id: 7, assessmentType: 'Pre-Training', parameter: 'ISO Knowledge', score: 5, remark: 'Moderate awareness' },
        { id: 8, assessmentType: 'Pre-Training', parameter: 'QMS Implementation', score: 4, remark: 'Basic understanding' }
      ],
      postTrainingAssessments: [
        { id: 9, assessmentType: 'Post-Training', parameter: 'ISO Knowledge', score: 9, remark: 'Excellent understanding' },
        { id: 10, assessmentType: 'Post-Training', parameter: 'QMS Implementation', score: 8, remark: 'Ready to implement' }
      ],
      overallEffectivenessRating: 8,
      recommendations: 'Employees are well-prepared for QMS implementation. Follow-up session recommended in 6 months.',
      evaluatedBy: 'Quality Manager',
      createdBy: 'Admin',
      createdOn: new Date('2025-02-05'),
      isActive: true
    }
  ];

  constructor() { }

  getAll(params?: any): Observable<TrainingEffectivenessListResponse> {
    const pageNo = params?.PageNumber || 1;
    const pageSize = params?.PageSize || 10;
    const totalRecords = this.dummyRecords.length;
    const startIndex = (pageNo - 1) * pageSize;
    const items = this.dummyRecords.slice(startIndex, startIndex + pageSize);

    return of({
      status: 200,
      message: 'Training effectiveness records retrieved successfully',
      items,
      totalRecords,
      pageNumber: pageNo,
      pageSize,
      success: true
    });
  }

  getById(id: number): Observable<TrainingEffectiveness | null> {
    const record = this.dummyRecords.find(r => r.id === id);
    return of(record || null);
  }

  create(data: TrainingEffectiveness): Observable<TrainingEffectivenessResponse> {
    const newRecord = { ...data, id: Date.now() };
    this.dummyRecords.push(newRecord);
    return of({
      status: 201,
      message: 'Training effectiveness record created successfully',
      data: newRecord,
      success: true
    });
  }

  update(id: number, data: TrainingEffectiveness): Observable<TrainingEffectivenessResponse> {
    const index = this.dummyRecords.findIndex(r => r.id === id);
    if (index > -1) {
      this.dummyRecords[index] = { ...data, id };
      return of({
        status: 200,
        message: 'Training effectiveness record updated successfully',
        data: this.dummyRecords[index],
        success: true
      });
    }
    return of({
      status: 404,
      message: 'Training effectiveness record not found',
      data: data,
      success: false
    });
  }

  delete(id: number): Observable<TrainingEffectivenessResponse> {
    const index = this.dummyRecords.findIndex(r => r.id === id);
    if (index > -1) {
      const deletedRecord = this.dummyRecords.splice(index, 1)[0];
      return of({
        status: 200,
        message: 'Training effectiveness record deleted successfully',
        data: deletedRecord,
        success: true
      });
    }
    return of({
      status: 404,
      message: 'Training effectiveness record not found',
      data: {} as TrainingEffectiveness,
      success: false
    });
  }
}
