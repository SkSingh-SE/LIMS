import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { JobDescription, JobDescriptionResponse } from '../models/jobDescriptionModel';

@Injectable({
    providedIn: 'root'
})
export class JobDescriptionService {

    private readonly DEFAULT_CONFIDENTIALITY_CLAUSE =
        'The incumbent is responsible for maintaining the confidentiality of all customer information and ensuring impartiality in all testing activities. ' +
        'Any breach of confidentiality or conflict of interest must be reported immediately to the Quality Manager.';

    private nextId = 5;

    private dummyData: JobDescription[] = [
        {
            id: 1,
            formatNo: 'F-3',
            issueNo: '01',
            revNo: '00',
            date: '2025-01-15',
            designationId: 1,
            designationName: 'Chemist',
            departmentId: 1,
            departmentName: 'Testing Laboratory',
            reportingTo: 'Head of Department',
            documentNo: 'F-3',
            minimumQualification: 'Graduate in Science / Chemistry / Metallurgy',
            technicalTraining: 'Training on Spectrometer, Wet Analysis, ISO 17025 Awareness',
            experience: 'Minimum 2 years in a testing laboratory',
            principalAccountabilities:
                '<ul><li><strong>Sample Handling:</strong> Proper identification, storage, and preparation of samples.</li>' +
                '<li><strong>Testing Operations:</strong> Performing chemical tests as per standard methods (ASTM, IS, ISO).</li>' +
                '<li><strong>Data Integrity:</strong> Recording raw data accurately in registers or LIMS software.</li>' +
                '<li><strong>Quality Control:</strong> Participation in replicate testing, PT/ILC, and monitoring of CRM.</li>' +
                '<li><strong>Housekeeping:</strong> Maintaining the testing area and equipment cleanliness.</li></ul>',
            authorityStopTesting: true,
            authorityIssueReports: false,
            authorityAccessConfidential: true,
            authorityEquipmentCalibration: true,
            qmsResponsibilities:
                '<ul><li><strong>Document Control:</strong> Ensuring latest versions of SOPs are used.</li>' +
                '<li><strong>Non-Conformance:</strong> Responsibility to report any Non-Conforming Work (F-41/42).</li>' +
                '<li><strong>Internal Audit:</strong> Assisting as an internal auditor if trained.</li>' +
                '<li><strong>Continuous Improvement:</strong> Suggesting preventive actions and participating in MRMs.</li></ul>',

            confidentialityClause:
                'The incumbent is responsible for maintaining the confidentiality of all customer information and ensuring impartiality in all testing activities.',
            preparedByName: 'Mr. Quality Manager',
            approvedByName: 'Mr. Director',
            employeeAccepted: true,
            createdBy: 'Admin',
            createdOn: '2025-01-15T10:30:00',
            isActive: true
        },
        {
            id: 2,
            formatNo: 'F-3',
            issueNo: '01',
            revNo: '00',
            date: '2025-02-10',
            designationId: 2,
            designationName: 'Lab Technician',
            departmentId: 1,
            departmentName: 'Testing Laboratory',
            reportingTo: 'Chemist',
            documentNo: 'F-3',
            minimumQualification: 'ITI / Diploma in Mechanical / Metallurgy',
            technicalTraining: 'Training on sample preparation machines, safety procedures',
            experience: 'Minimum 1 year in a metallurgical testing lab',
            principalAccountabilities:
                '• Sample Preparation: Cutting, grinding, and polishing specimens as per instructions.\n' +
                '• Equipment Handling: Operating sample preparation machines safely.\n' +
                '• Support Testing: Assisting chemists and metallurgists during testing.\n' +
                '• Housekeeping: Cleaning testing apparatus and maintaining lab hygiene.',
            authorityStopTesting: false,
            authorityIssueReports: false,
            authorityAccessConfidential: false,
            authorityEquipmentCalibration: false,
            qmsResponsibilities:
                '• Document Control: Using only the latest SOPs for sample preparation.\n' +
                '• Non-Conformance: Reporting any deviation in sample condition to supervisor.\n' +
                '• Continuous Improvement: Participating in training programs as scheduled.',
            confidentialityClause:
                'The incumbent is responsible for maintaining the confidentiality of all customer information and ensuring impartiality in all testing activities.',
            preparedByName: 'Mr. Quality Manager',
            approvedByName: 'Mr. Director',
            employeeAccepted: true,
            createdBy: 'Admin',
            createdOn: '2025-02-10T14:00:00',
            isActive: true
        },
        {
            id: 3,
            formatNo: 'F-3',
            issueNo: '01',
            revNo: '00',
            date: '2025-03-05',
            designationId: 3,
            designationName: 'Quality Manager',
            departmentId: 2,
            departmentName: 'Quality Assurance',
            reportingTo: 'Director',
            documentNo: 'F-3',
            minimumQualification: 'Graduate / Post Graduate in Science or Engineering',
            technicalTraining: 'ISO 17025:2017 Lead Auditor, Internal Auditor Training, Measurement Uncertainty',
            experience: 'Minimum 5 years in a NABL accredited testing laboratory',
            principalAccountabilities:
                '• Quality System Management: Maintaining and improving the QMS as per ISO 17025.\n' +
                '• Document Control: Ensuring all SOPs, manuals, and forms are current and controlled.\n' +
                '• Internal Audit: Planning and conducting internal audits as per schedule.\n' +
                '• Proficiency Testing: Organizing and evaluating PT/ILC participation.\n' +
                '• Management Review: Preparing MRM agenda and ensuring corrective actions are closed.',
            authorityStopTesting: true,
            authorityIssueReports: true,
            authorityAccessConfidential: true,
            authorityEquipmentCalibration: true,
            qmsResponsibilities:
                '• Overall responsibility for the Quality Management System.\n' +
                '• Non-Conformance Management: Investigating and closing NCRs.\n' +
                '• Training: Identifying training needs and maintaining training records.\n' +
                '• Continuous Improvement: Driving CAPA and preventive actions across the lab.',
            confidentialityClause:
                'The incumbent is responsible for maintaining the confidentiality of all customer information and ensuring impartiality in all testing activities.',
            preparedByName: 'Mr. Quality Manager',
            approvedByName: 'Mr. Director',
            employeeAccepted: true,
            createdBy: 'Admin',
            createdOn: '2025-03-05T09:00:00',
            isActive: true
        },
        {
            id: 4,
            formatNo: 'F-3',
            issueNo: '01',
            revNo: '00',
            date: '2025-03-20',
            designationId: 4,
            designationName: 'Technical Manager',
            departmentId: 1,
            departmentName: 'Testing Laboratory',
            reportingTo: 'Director',
            documentNo: 'F-3',
            minimumQualification: 'B.E. / B.Tech in Metallurgy or equivalent',
            technicalTraining: 'ISO 17025:2017, Method Validation, Measurement Uncertainty',
            experience: 'Minimum 5 years in metallurgical testing and lab management',
            principalAccountabilities:
                '• Technical Operations: Overseeing all testing activities and ensuring technical competence.\n' +
                '• Method Validation: Validating and verifying test methods before deployment.\n' +
                '• Report Authorization: Reviewing and authorizing test reports.\n' +
                '• Equipment Calibration: Ensuring all equipment is calibrated and maintained.\n' +
                '• Staff Competency: Assessing and approving technical competency of lab personnel.',
            authorityStopTesting: true,
            authorityIssueReports: true,
            authorityAccessConfidential: true,
            authorityEquipmentCalibration: true,
            qmsResponsibilities:
                '• Technical review of QMS documents.\n' +
                '• Non-Conformance: Technical assessment of non-conforming work.\n' +
                '• Internal Audit: Acting as technical assessor during audits.\n' +
                '• Continuous Improvement: Evaluating new methods and technologies.',
            confidentialityClause:
                'The incumbent is responsible for maintaining the confidentiality of all customer information and ensuring impartiality in all testing activities.',
            preparedByName: 'Mr. Quality Manager',
            approvedByName: 'Mr. Director',
            employeeAccepted: false,
            createdBy: 'Admin',
            createdOn: '2025-03-20T11:00:00',
            isActive: true
        }
    ];

    constructor() { }

    getDefaultConfidentialityClause(): string {
        return this.DEFAULT_CONFIDENTIALITY_CLAUSE;
    }

    getAll(filter: any): Observable<JobDescriptionResponse> {
        let filtered = [...this.dummyData];

        // Search
        if (filter.searchTerm) {
            const term = filter.searchTerm.toLowerCase();
            filtered = filtered.filter(
                item =>
                    item.designationName?.toLowerCase().includes(term) ||
                    item.departmentName?.toLowerCase().includes(term) ||
                    item.reportingTo?.toLowerCase().includes(term)
            );
        }

        // Sort
        if (filter.sortByColumn) {
            const col = filter.sortByColumn as keyof JobDescription;
            filtered.sort((a, b) => {
                const aVal = (a[col] ?? '') as string;
                const bVal = (b[col] ?? '') as string;
                const cmp = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
                return filter.sortOrder === 'desc' ? -cmp : cmp;
            });
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

    getById(id: number): Observable<JobDescription | undefined> {
        return of(this.dummyData.find(item => item.id === id));
    }

    getByDesignationId(designationId: number): Observable<JobDescription | undefined> {
        return of(this.dummyData.find(item => item.designationId === designationId));
    }

    create(data: JobDescription): Observable<any> {
        const newItem: JobDescription = {
            ...data,
            id: this.nextId++,
            createdBy: 'Admin',
            createdOn: new Date().toISOString(),
            isActive: true
        };
        this.dummyData.push(newItem);
        return of({ message: 'Job Description created successfully', id: newItem.id });
    }

    update(data: JobDescription): Observable<any> {
        const index = this.dummyData.findIndex(item => item.id === data.id);
        if (index > -1) {
            this.dummyData[index] = {
                ...this.dummyData[index],
                ...data,
                modifiedBy: 'Admin',
                modifiedOn: new Date().toISOString()
            };
            return of({ message: 'Job Description updated successfully' });
        }
        return of({ message: 'Job Description not found' });
    }

    delete(id: number): Observable<any> {
        const index = this.dummyData.findIndex(item => item.id === id);
        if (index > -1) {
            this.dummyData.splice(index, 1);
            return of({ message: 'Job Description deleted successfully' });
        }
        return of({ message: 'Job Description not found' });
    }
}
