import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { QualityControlPlanService } from '../../../../services/quality-control-plan.service';
import { NablRegisterTableComponent, RegisterColumn } from '../../nabl-register-table/nabl-register-table.component';
import { ToastService } from '../../../../services/toast.service';

@Component({
    selector: 'app-quality-control-plan-list',
    standalone: true,
    imports: [CommonModule, NablRegisterTableComponent],
    templateUrl: './quality-control-plan-list.component.html'
})
export class QualityControlPlanListComponent implements OnInit {
    columns: RegisterColumn[] = [
        { key: 'planNo', type: 'string', label: 'Plan No', filter: true },
        { key: 'planYear', type: 'string', label: 'Plan Year', filter: true },
        { key: 'retentionPeriod', type: 'string', label: 'Retention Period', filter: true },
        { key: 'effectiveFrom', type: 'date', label: 'Effective From', filter: true },
        { key: 'effectiveTo', type: 'date', label: 'Effective To', filter: true },
        // { key: 'status', type: 'string', label: 'Status', filter: true }
    ];

    listData: any[] = [];
    totalItems = 0;

    constructor(
        private service: QualityControlPlanService,
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
