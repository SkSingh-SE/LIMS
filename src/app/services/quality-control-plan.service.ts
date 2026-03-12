import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { QualityControlPlan, QualityControlPlanListResponse, QualityControlPlanResponse } from '../models/qualityControlPlanModel';

@Injectable({
    providedIn: 'root'
})
export class QualityControlPlanService {
    private records: QualityControlPlan[] = [
        {
            id: 1,
            formatNo: 'F-37',
            issueNo: '01',
            revNo: '00',
            date: '2025-01-05',
            documentNo: 'QCP-2025-001',
            planYear: '2025',
            discipline: 'Mechanical',
            materialProductGroup: 'Metals & Alloys',
            labIncharge: 'Mr. Arvind Kumar',
            activities: [
                {
                    srNo: 1,
                    activityName: 'Replicate Testing',
                    plannedFrequency: 'Once in a Month',
                    targetCriteria: '< 5% Variation',
                    plannedDate: '2025-01-20',
                    actualDate: '2025-01-22',
                    resultStatus: 'Satisfactory',
                    remarks: 'Variation was 2.1%'
                },
                {
                    srNo: 2,
                    activityName: 'Retesting of Retained Sample',
                    plannedFrequency: 'Quarterly',
                    targetCriteria: 'Z-score < 2',
                    plannedDate: '2025-03-15',
                    actualDate: '',
                    resultStatus: 'Pending',
                    remarks: ''
                },
                {
                    srNo: 3,
                    activityName: 'Use of Reference Material (CRM)',
                    plannedFrequency: 'Weekly',
                    targetCriteria: 'Within CRM limits',
                    plannedDate: '2025-01-10',
                    actualDate: '2025-01-10',
                    resultStatus: 'Satisfactory',
                    remarks: 'Carbon content matched CRM value'
                }
            ],
            preparedBy: 'Quality Executive',
            reviewedBy: 'Technical Manager',
            approvedBy: 'Quality Manager',
            status: 'Active',
            createdOn: '2025-01-05'
        }
    ];

    constructor() { }

    getAll(params?: any): Observable<QualityControlPlanListResponse> {
        const pageNo = params?.PageNumber || 1;
        const pageSize = params?.PageSize || 10;
        const searchTerm = params?.searchTerm || '';

        let filtered = [...this.records];
        if (searchTerm) {
            filtered = filtered.filter(r =>
                r.discipline.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.documentNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.planYear.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        const totalItems = filtered.length;
        const items = filtered.slice((pageNo - 1) * pageSize, pageNo * pageSize);

        return of({ status: 200, message: 'Records retrieved successfully', items, totalRecords: totalItems, pageNumber: pageNo, pageSize, success: true });
    }

    getById(id: number): Observable<QualityControlPlan | null> {
        return of(this.records.find(r => r.id === id) || null);
    }

    create(data: QualityControlPlan): Observable<QualityControlPlanResponse> {
        const newRecord = { ...data, id: Date.now() };
        this.records.push(newRecord);
        return of({ status: 201, message: 'Created successfully', data: newRecord, success: true });
    }

    update(id: number, data: QualityControlPlan): Observable<QualityControlPlanResponse> {
        const index = this.records.findIndex(r => r.id === id);
        if (index > -1) {
            this.records[index] = { ...data, id };
            return of({ status: 200, message: 'Updated successfully', data: this.records[index], success: true });
        }
        return of({ status: 404, message: 'Not found', data, success: false });
    }

    delete(id: number): Observable<any> {
        const index = this.records.findIndex(r => r.id === id);
        if (index > -1) {
            this.records.splice(index, 1);
            return of({ status: 200, message: 'Deleted successfully', success: true });
        }
        return of({ status: 404, message: 'Not found', success: false });
    }
}
