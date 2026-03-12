import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { TrainingAttendance, TrainingAttendanceListResponse, TrainingAttendanceResponse } from '../models/trainingAttendanceModel';

@Injectable({
    providedIn: 'root'
})
export class TrainingAttendanceService {
    private dummyRecords: TrainingAttendance[] = [
        {
            id: 1,
            formatNo: 'F-9',
            issueNo: '03',
            revNo: '00',
            date: '2021-10-01',
            trainingProgramTitle: 'Requirement of National / International Standards',
            trainingVenue: 'DMSPL',
            facultyName: 'Mr. V. S. Kalpheide',
            dateTime: '03/09/25 & 4:00 pm',
            participants: [
                { id: 1, slNo: 1, participantName: 'Rinkal Korat', feedback: 'Good' },
                { id: 2, slNo: 2, participantName: 'Ankit Gurach', feedback: 'Good' },
                { id: 3, slNo: 3, participantName: 'Sudhanshu Shekhar', feedback: 'Good' },
                { id: 4, slNo: 4, participantName: 'Harshad Prajapati', feedback: 'Good' },
                { id: 5, slNo: 5, participantName: 'Karishma Sagar', feedback: 'Good' },
                { id: 6, slNo: 6, participantName: 'Ravi Chandravanshi', feedback: 'Good' },
                { id: 7, slNo: 7, participantName: 'Aaron Christie', feedback: 'Good' },
                { id: 8, slNo: 8, participantName: 'Maulik Prajapati', feedback: 'Good' },
                { id: 9, slNo: 9, participantName: 'Aradhna Vaja', feedback: 'Good' },
                { id: 10, slNo: 10, participantName: 'Bunty Khattik', feedback: 'Good' },
                { id: 11, slNo: 11, participantName: 'Nikunj Harsoda', feedback: 'Good' },
                { id: 12, slNo: 12, participantName: 'Pratik Thorat', feedback: 'Good' },
                { id: 13, slNo: 13, participantName: 'Shivam Panchal', feedback: 'Good' }
            ],
            preparedBy: 'General Manager',
            issuedBy: 'Quality Manager',
            reviewedApprovedBy: 'Managing Director'
        }
    ];

    constructor() { }

    getAll(params?: any): Observable<TrainingAttendanceListResponse> {
        const pageNo = params?.PageNumber || 1;
        const pageSize = params?.PageSize || 10;
        const totalRecords = this.dummyRecords.length;
        const startIndex = (pageNo - 1) * pageSize;
        const items = this.dummyRecords.slice(startIndex, startIndex + pageSize);

        return of({
            status: 200,
            message: 'Records retrieved successfully',
            items,
            totalRecords,
            pageNumber: pageNo,
            pageSize,
            success: true
        });
    }

    getById(id: number): Observable<TrainingAttendance | null> {
        const record = this.dummyRecords.find(p => p.id === id);
        return of(record || null);
    }

    create(data: TrainingAttendance): Observable<TrainingAttendanceResponse> {
        const newRecord = { ...data, id: Date.now() };
        this.dummyRecords.push(newRecord);
        return of({
            status: 201,
            message: 'Record created successfully',
            data: newRecord,
            success: true
        });
    }

    update(id: number, data: TrainingAttendance): Observable<TrainingAttendanceResponse> {
        const index = this.dummyRecords.findIndex(p => p.id === id);
        if (index > -1) {
            this.dummyRecords[index] = { ...data, id };
            return of({
                status: 200,
                message: 'Record updated successfully',
                data: this.dummyRecords[index],
                success: true
            });
        }
        return of({
            status: 404,
            message: 'Record not found',
            data: data,
            success: false
        });
    }

    delete(id: number): Observable<TrainingAttendanceResponse> {
        const index = this.dummyRecords.findIndex(p => p.id === id);
        if (index > -1) {
            const deletedRecord = this.dummyRecords.splice(index, 1)[0];
            return of({
                status: 200,
                message: 'Record deleted successfully',
                data: deletedRecord,
                success: true
            });
        }
        return of({
            status: 404,
            message: 'Record not found',
            data: {} as TrainingAttendance,
            success: false
        });
    }
}
