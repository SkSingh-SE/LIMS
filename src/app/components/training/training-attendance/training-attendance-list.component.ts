import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TrainingAttendanceService } from '../../../services/training-attendance.service';
import { TrainingAttendance } from '../../../models/trainingAttendanceModel';
import { NablRegisterTableComponent, RegisterColumn } from '../../nabl/nabl-register-table/nabl-register-table.component';

@Component({
    selector: 'app-training-attendance-list',

    imports: [CommonModule, RouterModule, NablRegisterTableComponent],
    templateUrl: './training-attendance-list.component.html'
})
export class TrainingAttendanceListComponent implements OnInit {
    records = signal<TrainingAttendance[]>([]);
    isLoading = signal(false);
    searchTerm = '';
    columns: RegisterColumn[] = [
        { key: 'formatNo', label: 'Format No', type: 'string' },
        { key: 'trainingProgramTitle', label: 'Program Title', type: 'string' },
        { key: 'facultyName', label: 'Faculty', type: 'string' },
        { key: 'dateTime', label: 'Date & Time', type: 'string' }
    ];

    totalItems = 0;

    constructor(private service: TrainingAttendanceService) { }

    ngOnInit(): void {
        this.loadRecords();
    }

    loadRecords(params: any = {}): void {
        this.isLoading.set(true);
        const queryParams = {
            searchTerm: this.searchTerm,
            ...params
        };
        this.service.getAll(queryParams).subscribe({
            next: (res) => {
                this.records.set(res.items);
                this.totalItems = res.totalRecords || res.items.length;
                this.isLoading.set(false);
            },
            error: () => this.isLoading.set(false)
        });
    }

    onPageChange(params: any): void {
        this.searchTerm = params.searchTerm || '';
        this.loadRecords(params);
    }

    onDelete(id: number): void {
        if (confirm('Are you sure you want to delete this record?')) {
            this.service.delete(id).subscribe(() => this.loadRecords());
        }
    }
}
