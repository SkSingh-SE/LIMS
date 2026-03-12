import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { MeasurementUncertaintyService } from '../../../../services/measurement-uncertainty.service';
import { NablRegisterTableComponent, RegisterColumn } from '../../nabl-register-table/nabl-register-table.component';
import { ToastService } from '../../../../services/toast.service';

@Component({
    selector: 'app-measurement-uncertainty-list',
    standalone: true,
    imports: [CommonModule, NablRegisterTableComponent],
    templateUrl: './measurement-uncertainty-list.component.html'
})
export class MeasurementUncertaintyListComponent implements OnInit {
    columns: RegisterColumn[] = [
        { key: 'documentNo', type: 'string', label: 'Document No', filter: true },
        { key: 'testParameter', type: 'string', label: 'Test Parameter', filter: true },
        { key: 'testMethod', type: 'string', label: 'Test Method', filter: true },
        { key: 'expandedUncertainty', type: 'string', label: 'Expanded Uncertainty', filter: true },
        { key: 'date', type: 'date', label: 'Date', filter: true },
        { key: 'status', type: 'string', label: 'Status', filter: true }
    ];

    listData: any[] = [];
    totalItems = 0;
    isLoading = signal(false);

    constructor(
        private service: MeasurementUncertaintyService,
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
        this.isLoading.set(true);
        this.service.getAll(payload).subscribe({
            next: (response) => {
                this.listData = response?.items || [];
                this.totalItems = response?.totalRecords || 0;
                this.isLoading.set(false);
            },
            error: (error) => {
                console.error('Error fetching records:', error);
                this.listData = [];
                this.totalItems = 0;
                this.isLoading.set(false);
            }
        });
    }

    onPageChange(payload: any) {
        this.fetchData(payload);
    }

    deleteRecord(id: number) {
        if (confirm('Are you sure you want to delete this record?')) {
            this.service.delete(id).subscribe({
                next: (res) => {
                    this.toastService.show(res.message || 'Record deleted successfully', 'success');
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
                    this.toastService.show(err.message || 'Error deleting record', 'error');
                }
            });
        }
    }
}
