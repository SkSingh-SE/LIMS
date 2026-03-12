import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { EmployeeAuthorization, EmployeeAuthorizationResponse } from '../models/employeeAuthorizationModel';

@Injectable({
    providedIn: 'root'
})
export class EmployeeAuthorizationService {
    private records: EmployeeAuthorization[] = [
        {
            id: 1,
            department: 'Chemical',
            personnelName: 'Mr. Sudhanshu Shekhar',
            uid: 'DMSPL/01/13',
            equipment: '-Portable Optical Emission Spectro',
            testMethodAuthorization: 'ASTM etc.',
            testAuthorization: 'Chemical Test (Spectro Analysis)'
        },
        {
            id: 2,
            department: 'Mechanical',
            personnelName: 'Mr. Hitesh Vamja',
            uid: 'DMSPL/03/02, DMSPL/07/16',
            equipment: 'Paint Adhesion Tester, Surface roughness tester',
            testMethodAuthorization: 'ASTM, IS, ISO etc.',
            testAuthorization: 'Mechanical Test'
        },
        {
            id: 3,
            department: 'Mechanical',
            personnelName: 'Mr. Saad Bakrawala',
            uid: 'DMSPL/07/16',
            equipment: 'Surface roughness tester',
            testMethodAuthorization: 'ASTM, IS, ISO etc.',
            testAuthorization: 'Mechanical Test'
        },
        {
            id: 4,
            department: 'Metallography',
            personnelName: 'Mr. Ravi Chandravanshi',
            uid: 'DMSPL/09/03, DMSPL/09/04, DMSPL/03/01',
            equipment: 'In-Situ Metallurgical Microscope, Ferritoscope FMP-30, Dual Scope MP40E-S',
            testMethodAuthorization: 'IS, ISO, ASTM, etc',
            testAuthorization: 'Microscopy, Ferrite Number, Coating Thickness'
        }
    ];

    private nextId = 5;

    constructor() { }

    getAll(filter: any): Observable<EmployeeAuthorizationResponse> {
        let filtered = [...this.records];
        if (filter.searchTerm) {
            const term = filter.searchTerm.toLowerCase();
            filtered = filtered.filter(r =>
                r.personnelName.toLowerCase().includes(term) ||
                r.department.toLowerCase().includes(term) ||
                r.equipment.toLowerCase().includes(term)
            );
        }
        const totalRecords = filtered.length;
        return of({
            items: filtered,
            totalRecords,
            pageNumber: filter.PageNumber || 1,
            pageSize: filter.PageSize || 10
        });
    }

    getById(id: number): Observable<EmployeeAuthorization | undefined> {
        return of(this.records.find(r => r.id === id));
    }

    create(record: EmployeeAuthorization): Observable<any> {
        const newRecord = { ...record, id: this.nextId++ };
        this.records.push(newRecord);
        return of({ success: true, message: 'Equipment authorization created successfully', id: newRecord.id });
    }

    update(id: number, record: EmployeeAuthorization): Observable<any> {
        const index = this.records.findIndex(r => r.id === id);
        if (index !== -1) {
            this.records[index] = { ...record, id };
            return of({ success: true, message: 'Equipment authorization updated successfully' });
        }
        return of({ success: false, message: 'Authorization not found' });
    }

    delete(id: number): Observable<any> {
        const index = this.records.findIndex(r => r.id === id);
        if (index !== -1) {
            this.records.splice(index, 1);
            return of({ success: true, message: 'Equipment authorization deleted successfully' });
        }
        return of({ success: false, message: 'Authorization not found' });
    }
}
