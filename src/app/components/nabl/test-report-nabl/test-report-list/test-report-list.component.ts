import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { TestReportService } from '../../../../services/test-report.service';
import { NablRegisterTableComponent, RegisterColumn } from '../../nabl-register-table/nabl-register-table.component';
import { ToastService } from '../../../../services/toast.service';

@Component({
    selector: 'app-test-report-list',
    standalone: true,
    imports: [CommonModule, NablRegisterTableComponent],
    templateUrl: './test-report-list.component.html'
})
export class TestReportListComponent implements OnInit {
    columns: RegisterColumn[] = [
        { key: 'documentNo', type: 'string', label: 'Report No (ULR)', filter: true },
        { key: 'customerName', type: 'string', label: 'Customer', filter: true },
        { key: 'sampleDescription', type: 'string', label: 'Sample', filter: true },
        { key: 'dateOfIssue', type: 'date', label: 'Date of Issue', filter: true },
        { key: 'status', type: 'string', label: 'Status', filter: true }
    ];

    listData: any[] = [];
    totalItems = 0;
    isLoading = signal(false);

    constructor(
        private service: TestReportService,
        private toastService: ToastService
    ) { }

    ngOnInit() {
        this.fetchData({ PageNumber: 1, PageSize: 10, searchTerm: '', sortByColumn: 'id', sortOrder: 'desc', filter: [] });
    }

    fetchData(payload: any) {
        this.isLoading.set(true);
        this.service.getAll(payload).subscribe({
            next: (response) => { this.listData = response?.items || []; this.totalItems = response?.totalRecords || 0; this.isLoading.set(false); },
            error: () => { this.listData = []; this.totalItems = 0; this.isLoading.set(false); }
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
