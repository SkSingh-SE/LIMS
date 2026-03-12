import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { CompetenceRequirement, CompetenceRequirementResponse } from '../models/competenceRequirementModel';

@Injectable({
    providedIn: 'root'
})
export class CompetenceRequirementService {

    private nextId = 11;

    private dummyData: CompetenceRequirement[] = [
        {
            id: 1,
            formatNo: 'F-4',
            issueNo: '01',
            revNo: '00',
            date: '2024-01-15',
            positionName: 'Technical Director',
            minimumEducation: 'TM should have a minimum of bachelor\'s degree in metallurgical engineering',
            minimumExperience: 'He / She should have a minimum of 5 Years of Experience',
            approvedBy: 'Managing Director',
            isExternal: false
        },
        {
            id: 2,
            formatNo: 'F-4',
            issueNo: '01',
            revNo: '00',
            date: '2024-01-15',
            positionName: 'General Manager',
            minimumEducation: 'GM should have a minimum of bachelor\'s degree in metallurgical engineering',
            minimumExperience: 'He / She should have a minimum of 15 Years of Experience and should have attended course on ISO/IEC 17025: 2017',
            approvedBy: 'Managing Director',
            isExternal: false
        },
        {
            id: 3,
            formatNo: 'F-4',
            issueNo: '01',
            revNo: '00',
            date: '2024-01-15',
            positionName: 'Quality Manager',
            minimumEducation: 'QM should have a minimum of bachelor\'s degree in mechanical or metallurgical engineering',
            minimumExperience: 'He / She should have a minimum of 3 Years of Experience and should have attended course on ISO/IEC 17025: 2017',
            approvedBy: 'Managing Director / Technical Director',
            isExternal: false
        },
        {
            id: 4,
            formatNo: 'F-4',
            issueNo: '01',
            revNo: '00',
            date: '2024-01-15',
            positionName: 'Lab In-charge',
            minimumEducation: 'Lab In-Charge should have a minimum of BSc or Bachelor of Engineering in their relevant field',
            minimumExperience: 'He / She should have a minimum of 3 Years of Experience',
            approvedBy: 'Managing Director / Technical Director',
            isExternal: false
        },
        {
            id: 5,
            formatNo: 'F-4',
            issueNo: '01',
            revNo: '00',
            date: '2024-01-15',
            positionName: 'Chemist',
            minimumEducation: 'Chemist should have a minimum of BSc Degree in Chemistry',
            minimumExperience: 'He / She should have a minimum of 2 Years of Experience',
            approvedBy: 'Managing Director / Technical Director',
            isExternal: false
        },
        {
            id: 6,
            formatNo: 'F-4',
            issueNo: '01',
            revNo: '00',
            date: '2024-01-15',
            positionName: 'Mechanical Engineer',
            minimumEducation: 'Mechanical Engineer should have a minimum of Diploma in Mechanical or Metallurgical Engineering',
            minimumExperience: 'He / She should have a minimum of 2 Years of Experience',
            approvedBy: 'Managing Director / Technical Director',
            isExternal: false
        },
        {
            id: 7,
            formatNo: 'F-4',
            issueNo: '01',
            revNo: '00',
            date: '2024-01-15',
            positionName: 'Metallurgist',
            minimumEducation: 'Metallurgist should have a minimum of bachelor\'s degree in metallurgical engineering',
            minimumExperience: 'He / She should have a minimum of 3 Years of Experience',
            approvedBy: 'Managing Director / Technical Director',
            isExternal: false
        },
        {
            id: 8,
            formatNo: 'F-4',
            issueNo: '01',
            revNo: '00',
            date: '2024-01-15',
            positionName: 'Corrosion Engineer',
            minimumEducation: 'Corrosion Engineer should have a minimum of bachelor\'s degree in metallurgical engineering',
            minimumExperience: 'He / She should have a minimum of 3 Years of Experience',
            approvedBy: 'Managing Director / Technical Director',
            isExternal: false
        },
        {
            id: 9,
            formatNo: 'F-4',
            issueNo: '01',
            revNo: '00',
            date: '2024-01-15',
            relatedActivity: 'External Calibration Agency',
            minimumEducation: '1) External Calibration Providers should be a ISO/IEC 17025 Accredited calibration agency.\n2) If ISO/IEC 17025 scope does not covers the parameter, the calibrating master instrument should at least be calibrated through a ISO/IEC 17025 agency\n3) Competitive Price',
            minimumExperience: 'N/A',
            approvedBy: 'Managing Director / Technical Director',
            isExternal: true
        },
        {
            id: 10,
            formatNo: 'F-4',
            issueNo: '01',
            revNo: '00',
            date: '2024-01-15',
            relatedActivity: 'Reagent / Chemicals Provider',
            minimumEducation: '1) He should be a approved vendor for standard brands such as Merck, Sigma Aldrich, SDFCL Etc\n2) Market Leader and should provide us a with 3-month credit limit.\n3) Competitive Price',
            minimumExperience: 'N/A',
            approvedBy: 'Managing Director / Technical Director',
            isExternal: true
        }
    ];

    constructor() { }

    getAll(filter: any): Observable<CompetenceRequirementResponse> {
        let filtered = [...this.dummyData];

        if (filter.searchTerm) {
            const term = filter.searchTerm.toLowerCase();
            filtered = filtered.filter(
                item =>
                    item.positionName?.toLowerCase().includes(term) ||
                    item.relatedActivity?.toLowerCase().includes(term)
            );
        }

        const totalRecords = filtered.length;
        const pageNumber = filter.PageNumber || 1;
        const pageSize = filter.PageSize || 10;
        const start = (pageNumber - 1) * pageSize;
        const items = filtered.slice(start, start + pageSize);

        return of({
            items,
            totalRecords,
            pageNumber,
            pageSize
        });
    }

    getById(id: number): Observable<CompetenceRequirement | undefined> {
        return of(this.dummyData.find(item => item.id === id));
    }

    create(data: CompetenceRequirement): Observable<any> {
        const newItem: CompetenceRequirement = {
            ...data,
            id: this.nextId++
        };
        this.dummyData.push(newItem);
        return of({ message: 'Competence Requirement created successfully', id: newItem.id });
    }

    update(data: CompetenceRequirement): Observable<any> {
        const index = this.dummyData.findIndex(item => item.id === data.id);
        if (index > -1) {
            this.dummyData[index] = { ...data };
            return of({ message: 'Competence Requirement updated successfully' });
        }
        return of({ message: 'Competence Requirement not found' });
    }

    delete(id: number): Observable<any> {
        const index = this.dummyData.findIndex(item => item.id === id);
        if (index > -1) {
            this.dummyData.splice(index, 1);
            return of({ message: 'Competence Requirement deleted successfully' });
        }
        return of({ message: 'Competence Requirement not found' });
    }
}
