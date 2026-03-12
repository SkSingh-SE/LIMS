import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { TrainingPlan, TrainingPlanListResponse, TrainingPlanResponse } from '../models/trainingPlanModel';

@Injectable({
  providedIn: 'root'
})
export class TrainingPlanService {
  private dummyTrainingPlans: TrainingPlan[] = [
    {
      id: 1,
      formatNo: 'F-8',
      documentNo: 'TP-2025-001',
      issueNo: '01',
      revNo: '00',
      date: '2025-01-15',
      issueDate: new Date('2025-01-15'),
      revDate: undefined,
      planDate: new Date('2025-01-03'),
      planningYear: 2025,
      courses: [
        {
          id: 1,
          courseCode: 'SAF-101',
          courseName: 'Lab Safety & Emergency Procedures',
          provider: 'Internal',
          duration: 2,
          targetAudience: 'All Staff',
          objectives: 'Understanding lab safety protocols and emergency response',
          isActive: true
        },
        {
          id: 2,
          courseCode: 'QUA-202',
          courseName: 'ISO 17025 Quality Management',
          provider: 'NABL Training Institute',
          duration: 5,
          targetAudience: 'Technical & QA Staff',
          objectives: 'Updates on ISO 17025:2017 requirements',
          isActive: true
        }
      ],
      totalBudget: 50000,
      approvalStatus: 'Approved',
      createdBy: 'Admin',
      createdOn: new Date('2025-01-10'),
      modifiedBy: 'Manager',
      modifiedOn: new Date('2025-01-15'),
      isActive: true
    },
    {
      id: 2,
      formatNo: 'F-8',
      documentNo: 'TP-2025-002',
      issueNo: '01',
      revNo: '00',
      date: '2025-02-01',
      issueDate: new Date('2025-02-01'),
      planDate: new Date('2025-01-05'),
      planningYear: 2025,
      courses: [
        {
          id: 3,
          courseCode: 'TEC-103',
          courseName: 'Advanced Testing Methods',
          provider: 'External',
          duration: 7,
          targetAudience: 'Technicians',
          isActive: true
        }
      ],
      totalBudget: 35000,
      approvalStatus: 'Pending',
      createdBy: 'Admin',
      createdOn: new Date('2025-01-28'),
      isActive: true
    }
  ];

  constructor() { }

  getAll(params?: any): Observable<TrainingPlanListResponse> {
    const pageNo = params?.PageNumber || 1;
    const pageSize = params?.PageSize || 10;
    const totalRecords = this.dummyTrainingPlans.length;
    const startIndex = (pageNo - 1) * pageSize;
    const items = this.dummyTrainingPlans.slice(startIndex, startIndex + pageSize);

    return of({
      status: 200,
      message: 'Training plans retrieved successfully',
      items,
      totalRecords,
      pageNumber: pageNo,
      pageSize,
      success: true
    });
  }

  getById(id: number): Observable<TrainingPlan | null> {
    const plan = this.dummyTrainingPlans.find(p => p.id === id);
    return of(plan || null);
  }

  create(data: TrainingPlan): Observable<TrainingPlanResponse> {
    const newPlan = { ...data, id: Date.now() };
    this.dummyTrainingPlans.push(newPlan);
    return of({
      status: 201,
      message: 'Training plan created successfully',
      data: newPlan,
      success: true
    });
  }

  update(id: number, data: TrainingPlan): Observable<TrainingPlanResponse> {
    const index = this.dummyTrainingPlans.findIndex(p => p.id === id);
    if (index > -1) {
      this.dummyTrainingPlans[index] = { ...data, id };
      return of({
        status: 200,
        message: 'Training plan updated successfully',
        data: this.dummyTrainingPlans[index],
        success: true
      });
    }
    return of({
      status: 404,
      message: 'Training plan not found',
      data: data,
      success: false
    });
  }

  delete(id: number): Observable<TrainingPlanResponse> {
    const index = this.dummyTrainingPlans.findIndex(p => p.id === id);
    if (index > -1) {
      const deletedPlan = this.dummyTrainingPlans.splice(index, 1)[0];
      return of({
        status: 200,
        message: 'Training plan deleted successfully',
        data: deletedPlan,
        success: true
      });
    }
    return of({
      status: 404,
      message: 'Training plan not found',
      data: {} as TrainingPlan,
      success: false
    });
  }
}
