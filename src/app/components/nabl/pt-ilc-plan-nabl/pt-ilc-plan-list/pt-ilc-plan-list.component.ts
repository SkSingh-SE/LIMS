import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { PtIlcPlanService } from '../../../../services/pt-ilc-plan.service';
import { NablRegisterTableComponent, RegisterColumn } from '../../nabl-register-table/nabl-register-table.component';
import { ToastService } from '../../../../services/toast.service';

@Component({
    selector: 'app-pt-ilc-plan-list',
    standalone: true,
    imports: [CommonModule, NablRegisterTableComponent],
    templateUrl: './pt-ilc-plan-list.component.html'
})
export class PtIlcPlanListComponent implements OnInit {
    columns: RegisterColumn[] = [
        { key: 'documentNo', type: 'string', label: 'Document No', filter: true },
        { key: 'laboratoryId', type: 'string', label: 'Lab ID (CAB ID)', filter: true },
        { key: 'periodOfParticipation', type: 'string', label: 'Period', filter: true },
        { key: 'date', type: 'date', label: 'Date', filter: true },
        { key: 'status', type: 'string', label: 'Status', filter: true }
    ];

    listData: any[] = [];
    totalItems = 0;

    constructor(
        private service: PtIlcPlanService,
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
