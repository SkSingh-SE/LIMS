import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { RetestingOfRetainedSampleService } from '../../../../services/retesting-of-retained-sample.service';
import { NablRegisterTableComponent, RegisterColumn } from '../../nabl-register-table/nabl-register-table.component';
import { ToastService } from '../../../../services/toast.service';

@Component({
    selector: 'app-retesting-of-retained-sample-list',
    standalone: true,
    imports: [CommonModule, NablRegisterTableComponent],
    templateUrl: './retesting-of-retained-sample-list.component.html'
})
export class RetestingOfRetainedSampleListComponent implements OnInit {
    columns: RegisterColumn[] = [
        { key: 'planNo', type: 'string', label: 'Plan No', filter: true },
        { key: 'qcActivity', type: 'string', label: 'Qc Activity', filter: true },
        { key: 'departmentName', type: 'string', label: 'Department Name', filter: true },
        { key: 'testMethodName', type: 'string', label: 'TestMethod Name', filter: true },
        { key: 'frequencyType', type: 'string', label: 'Frequency Type', filter: true },
        { key: 'responsibleEmployee', type: 'string', label: 'Responsible Employee', filter: true },
        // { key: 'dateOfRetesting', type: 'date', label: 'Date of Retesting', filter: true },
        // { key: 'status', type: 'string', label: 'Status', filter: true }
    ];

    listData: any[] = [];
    totalItems = 0;

    constructor(
        private service: RetestingOfRetainedSampleService,
        private toastService: ToastService
    ) { }

    ngOnInit() {
        this.fetchData({ PageNumber: 1, PageSize: 10, searchTerm: '', sortByColumn: 'id', sortOrder: 'desc', filter: [] });
    }

    fetchData(payload: any) {
        this.service.getAll(payload).subscribe({
            next: (response) => { this.listData = response?.items || []; this.totalItems = response?.totalRecords || 0;  },
            error: () => { this.listData = []; this.totalItems = 0;  }
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
