import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InductionTrainingService } from '../../../services/induction-training.service';
import { ToastService } from '../../../services/toast.service';
import { NablRegisterTableComponent, RegisterColumn } from '../nabl-register-table/nabl-register-table.component';

@Component({
    selector: 'app-induction-training-list',

    imports: [CommonModule, NablRegisterTableComponent],
    templateUrl: './induction-training-list.component.html',
    styleUrl: './induction-training-list.component.css'
})
export class InductionTrainingListComponent implements OnInit {

    columns: RegisterColumn[] = [
        { key: 'employeeName', label: 'Employee Name', type: 'string', filter: true },
        { key: 'qualification', label: 'Qualification', type: 'string', filter: true },
        { key: 'position', label: 'Position', type: 'string', filter: true },
        { key: 'trainingDate', label: 'Training Date', type: 'date', filter: true },
        { key: 'trainerName', label: 'Trainer', type: 'string', filter: true },
        { key: 'remarks', label: 'Remarks', type: 'string', filter: true }
    ];

    records: any[] = [];
    totalItems = 0;

    constructor(
        private trainingService: InductionTrainingService,
        private toastService: ToastService
    ) { }

    ngOnInit() {
        this.fetchData({
            PageNumber: 1,
            PageSize: 10,
            searchTerm: '',
            sortByColumn: 'id',
            sortOrder: 'desc',
            filter: []
        });
    }

    fetchData(payload: any) {
        this.trainingService.getAll(payload).subscribe({
            next: (res) => {
                this.records = res.items || [];
                this.totalItems = res.totalRecords || 0;
            },
            error: (err) => {
                console.error('Error fetching records:', err);
                this.toastService.show('Error loading data', 'error');
                this.records = [];
            }
        });
    }

    onPageChange(payload: any) {
        this.fetchData(payload);
    }

    onDelete(id: number) {
        if (confirm('Are you sure you want to delete this induction record?')) {
            this.trainingService.delete(id).subscribe({
                next: (res) => {
                    this.toastService.show('Record deleted successfully', 'success');
                    this.fetchData({
                        PageNumber: 1,
                        PageSize: 10,
                        searchTerm: '',
                        sortByColumn: 'id',
                        sortOrder: 'desc',
                        filter: []
                    });
                },
                error: (err) => {
                    console.error(err);
                    this.toastService.show('Error deleting record', 'error');
                }
            });
        }
    }
}
