import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import {
    SkillMatrix,
    SkillMatrixResponse,
    SkillMatrixDecision,
    SkillMatrixDecisionResponse,
    DecisionRow
} from '../models/skillMatrixModel';

@Injectable({
    providedIn: 'root'
})
export class SkillMatrixService {
    private matrices: SkillMatrix[] = [
        {
            id: 1,
            designationId: 1,
            designationName: 'Chemist',
            formatNo: 'F-6',
            issueNo: '01',
            date: '2025-02-23',
            revNo: '00',
            title: 'Technical Skill Matrix - 2025',
            decision: 'Approved',
            lastUpdated: '2025-02-23',
            preparedBy: 'General Manager',
            issuedBy: 'Quality Manager',
            reviewedApprovedBy: 'Managing Director',
            skills: [
                'Tensile Testing',
                'Hardness Testing',
                'Impact Testing',
                'Chemical Analysis (Wet)',
                'Spectro Analysis',
                'Microscopy',
                'Calibration',
                'Internal Audit'
            ],
            employeeSkills: [
                {
                    employeeId: 1,
                    employeeName: 'Bunty Khattik',
                    designationName: 'Chemist',
                    skills: {
                        'Tensile Testing': 'P',
                        'Hardness Testing': 'P',
                        'Chemical Analysis (Wet)': 'P',
                        'Spectro Analysis': 'P',
                        'Internal Audit': 'D'
                    }
                },
                {
                    employeeId: 2,
                    employeeName: 'Mr. Pratik Thorat',
                    designationName: 'Mech. Engineer',
                    skills: {
                        'Tensile Testing': 'P',
                        'Hardness Testing': 'D',
                        'Impact Testing': 'D'
                    }
                }
            ]
        }
    ];

    private decisions: SkillMatrixDecision[] = [
        {
            id: 1,
            designationId: 1,
            designationName: 'Chemist',
            formatNo: 'F-6A',
            issueNo: '01',
            date: '2025-02-23',
            revNo: '00',
            title: 'Skill Matrix Decision - Chemist',
            rows: [
                {
                    skillArea: 'Technical Decision Making',
                    competencyRequirement: 'Approval of methods, deviations',
                    evaluationMethod: 'Review of approvals',
                    authorized: true
                },
                {
                    skillArea: 'Method Validation',
                    competencyRequirement: 'Oversight & approval',
                    evaluationMethod: 'Validation reports',
                    authorized: true
                },
                {
                    skillArea: 'Measurement Uncertainty',
                    competencyRequirement: 'Approval & review',
                    evaluationMethod: 'MU calculations',
                    authorized: true
                },
                {
                    skillArea: 'PT / ILC evaluation',
                    competencyRequirement: 'Technical review',
                    evaluationMethod: 'PT analysis checks',
                    authorized: true
                },
                {
                    skillArea: 'Risk based thinking',
                    competencyRequirement: 'Identification & mitigation',
                    evaluationMethod: 'Risk register',
                    authorized: true
                }
            ],
            preparedBy: 'General Manager',
            issuedBy: 'Quality Manager',
            reviewedApprovedBy: 'Managing Director',
            lastUpdated: '2025-02-23'
        }
    ];

    constructor() { }

    // ============ Skill Matrix Methods ============

    getAll(): Observable<SkillMatrixResponse> {
        return of({
            items: this.matrices,
            totalRecords: this.matrices.length
        });
    }

    getById(id: number): Observable<SkillMatrix | undefined> {
        return of(this.matrices.find(m => m.id === id));
    }

    getByDesignation(designationName: string): Observable<SkillMatrix | undefined> {
        return of(this.matrices.find(m => m.designationName === designationName));
    }

    create(matrix: SkillMatrix): Observable<any> {
        const newMatrix = {
            ...matrix,
            id: this.matrices.length ? Math.max(...this.matrices.map(m => m.id)) + 1 : 1,
            lastUpdated: new Date().toISOString().split('T')[0]
        };
        this.matrices.push(newMatrix);
        return of({ message: 'Skill matrix created', id: newMatrix.id });
    }

    update(matrix: SkillMatrix): Observable<any> {
        const idx = this.matrices.findIndex(m => m.id === matrix.id);
        if (idx > -1) {
            matrix.lastUpdated = new Date().toISOString().split('T')[0];
            this.matrices[idx] = matrix;
            return of({ message: 'Skill matrix updated' });
        }
        return of({ message: 'Skill matrix not found' });
    }

    delete(id: number): Observable<any> {
        const idx = this.matrices.findIndex(m => m.id === id);
        if (idx > -1) {
            this.matrices.splice(idx, 1);
            return of({ message: 'Skill matrix deleted' });
        }
        return of({ message: 'Skill matrix not found' });
    }

    // ============ Skill Matrix Decision Methods (F-6A) ============

    getDecisions(): Observable<SkillMatrixDecisionResponse> {
        return of({
            items: this.decisions,
            totalRecords: this.decisions.length
        });
    }

    getDecisionById(id: number): Observable<SkillMatrixDecision | undefined> {
        return of(this.decisions.find(d => d.id === id));
    }

    getDecisionByDesignation(designationName: string): Observable<SkillMatrixDecision | undefined> {
        return of(this.decisions.find(d => d.designationName === designationName));
    }

    getDecisionByDesignationId(designationId: number): Observable<SkillMatrixDecision | undefined> {
        return of(this.decisions.find(d => d.designationId === designationId));
    }

    createDecision(decision: SkillMatrixDecision): Observable<any> {
        const newId = this.decisions.length
            ? Math.max(...this.decisions.map(d => d.id)) + 1
            : 1;
        const newDecision: SkillMatrixDecision = {
            ...decision,
            id: newId,
            lastUpdated: new Date().toISOString().split('T')[0]
        };
        this.decisions.push(newDecision);
        return of({ message: 'Decision created', id: newId });
    }

    updateDecision(decision: SkillMatrixDecision): Observable<any> {
        const idx = this.decisions.findIndex(d => d.id === decision.id);
        if (idx > -1) {
            decision.lastUpdated = new Date().toISOString().split('T')[0];
            this.decisions[idx] = decision;
            return of({ message: 'Decision updated' });
        }
        return of({ message: 'Decision not found' });
    }

    deleteDecision(id: number): Observable<any> {
        const idx = this.decisions.findIndex(d => d.id === id);
        if (idx > -1) {
            this.decisions.splice(idx, 1);
            return of({ message: 'Decision deleted' });
        }
        return of({ message: 'Decision not found' });
    }
}
