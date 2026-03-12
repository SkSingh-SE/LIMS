import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { PtIlcPlan, PtIlcPlanListResponse, PtIlcPlanResponse } from '../models/ptIlcPlanModel';

@Injectable({
    providedIn: 'root'
})
export class PtIlcPlanService {
    private records: PtIlcPlan[] = [
        {
            id: 1,
            formatNo: 'F-36',
            issueNo: '01',
            revNo: '00',
            date: '2025-04-01',
            documentNo: 'PT-2025-001',
            laboratoryId: 'T-0287',
            laboratoryName: 'DIVINE METALLURGICAL SERVICES PVT LTD',
            fieldOfAccreditation: 'TESTING',
            periodOfParticipation: '1st Apr-2025 to 31st Mar-2027',
            entries: [
                {
                    srNo: 1,
                    accreditedDiscipline: 'Chemical',
                    groupSubgroup: 'Metals & Alloys',
                    ptActivityYear1: 'Chemical analysis of Cupro nickel by OES',
                    ptActivityYear2: 'Chemical analysis of zinc alloys by OES',
                    statusYear1: 'Participated in PT',
                    statusYear2: 'Will Participate',
                    remarksYear1: 'Z Score found satisfactory',
                    remarksYear2: ''
                },
                {
                    srNo: 2,
                    accreditedDiscipline: 'Mechanical',
                    groupSubgroup: 'Mechanical Properties of Metals',
                    ptActivityYear1: 'Tensile test of Steel Flat',
                    ptActivityYear2: 'Drift Expanding Test',
                    statusYear1: 'Participated in PT',
                    statusYear2: 'Will Initiate',
                    remarksYear1: 'Z Score found satisfactory',
                    remarksYear2: ''
                }
            ],
            notes: 'Laboratory should ensure that PT plan covers the groups/sub-groups, analytic/parameter and materials/matrices under each discipline',
            preparedBy: 'General Manager',
            issuedBy: 'Quality Manager',
            reviewedApprovedBy: 'Managing Director',
            status: 'Active',
            createdOn: '2025-04-01'
        }
    ];

    constructor() { }

    getAll(params?: any): Observable<PtIlcPlanListResponse> {
        const pageNo = params?.PageNumber || 1;
        const pageSize = params?.PageSize || 10;
        const searchTerm = params?.searchTerm || '';

        let filtered = [...this.records];
        if (searchTerm) {
            filtered = filtered.filter(r =>
                r.laboratoryName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.documentNo.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        const totalItems = filtered.length;
        const items = filtered.slice((pageNo - 1) * pageSize, pageNo * pageSize);

        return of({ status: 200, message: 'Records retrieved successfully', items, totalRecords: totalItems, pageNumber: pageNo, pageSize, success: true });
    }

    getById(id: number): Observable<PtIlcPlan | null> {
        return of(this.records.find(r => r.id === id) || null);
    }

    create(data: PtIlcPlan): Observable<PtIlcPlanResponse> {
        const newRecord = { ...data, id: Date.now() };
        this.records.push(newRecord);
        return of({ status: 201, message: 'Created successfully', data: newRecord, success: true });
    }

    update(id: number, data: PtIlcPlan): Observable<PtIlcPlanResponse> {
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
