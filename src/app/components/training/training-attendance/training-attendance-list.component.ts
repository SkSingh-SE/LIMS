import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TrainingAttendanceService } from '../../../services/training-attendance.service';
import { TrainingAttendance } from '../../../models/trainingAttendanceModel';
import { NablRegisterTableComponent, RegisterColumn } from '../../nabl/nabl-register-table/nabl-register-table.component';
import { ToastService } from '../../../services/toast.service';
@Component({
    selector: 'app-training-attendance-list',

    imports: [CommonModule, RouterModule, NablRegisterTableComponent],
    templateUrl: './training-attendance-list.component.html'
})
export class TrainingAttendanceListComponent implements OnInit {
    records = signal<TrainingAttendance[]>([]);
    searchTerm = '';
    columns: RegisterColumn[] = [
        { key: 'formCode', label: 'Format No', type: 'string' },
        { key: 'trainingTopic', label: 'Program Title', type: 'string' },
        { key: 'trainerName', label: 'Faculty', type: 'string' },
        { key: 'trainingDatetime', label: 'Date & Time', type: 'string' }
    ];

    totalItems = 0;

    constructor(private service: TrainingAttendanceService,
        private toastService: ToastService
    ) { }

    ngOnInit(): void {
        this.loadRecords();
    }

    loadRecords(params: any = {}): void {
        const queryParams = {
            searchTerm: this.searchTerm,
            ...params
        };
        this.service.getAll(queryParams).subscribe({
            next: (res) => {
                this.records.set(res.items);
                this.totalItems = res.totalRecords || res.items.length;
            },
            error: () => {}
        });
    }

    onPageChange(params: any): void {
        this.searchTerm = params.searchTerm || '';
        this.loadRecords(params);
    }

    onDelete(id: number): void {
        if (confirm('Are you sure you want to delete this record?')) {
            this.service.delete(id).subscribe({
                next: () => {
                  this.toastService.show('Training attendance record deleted successfully', 'success');
                    this.loadRecords({ pageNumber: 1, pageSize: 10 });
                },
                error: () => {
                  this.toastService.show('Failed to delete training attendance record', 'error');
                }
            });
        }
    }
}
