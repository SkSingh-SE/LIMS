import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuditPlanService } from '../../../../services/audit-plan.service';
import { NablRegisterTableComponent, RegisterColumn } from '../../nabl-register-table/nabl-register-table.component';
import { ToastService } from '../../../../services/toast.service';

@Component({
    selector: 'app-audit-plan-list',
    standalone: true,
    imports: [CommonModule, NablRegisterTableComponent],
    templateUrl: './audit-plan-list.component.html',
    styleUrl: './audit-plan-list.component.css'
})
export class AuditPlanListComponent implements OnInit {
    title = 'F-50: Audit Schedule & Plan';
    addButtonLabel = 'New Audit Plan';
    addRoute = '/audit-plan/create';
    baseRoute = '/audit-plan';
    summaryRoute = '/audit-summary/edit';

    columns: RegisterColumn[] = [
        // { key: 'documentNo', type: 'string', label: 'Doc No', filter: true },
        { key: 'planNo', label: 'Plan No', type: 'string', width: '120px', filter: true },
        { key: 'auditType', label: 'Audit Type', type: 'string', filter: true },
        { key: 'leadAuditorName', label: 'Lead Auditor Name', type: 'string', filter: true },
        { key: 'scheduleDateFrom', label: 'ScheduleDate From', type: 'date', width: '150px', filter: true },
        { key: 'scheduleDateTo', label: 'ScheduleDate To', type: 'date', width: '150px', filter: true }
    ];

    data = signal<any[]>([]);
    totalItems = signal(0);

    constructor(private service: AuditPlanService, private toastService: ToastService) { }

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

    fetchData(params: any = {}) {
        this.service.getAll(params).subscribe({
            next: (resp) => {
                this.data.set(resp.items || []);
                this.totalItems.set(resp.totalRecords || 0);
            },
            error: (err) => {
                console.error('Error fetching audit plans:', err);
            }
        });
    }

    deleteRecord(id: number) {
        if (confirm('Are you sure you want to delete this record?')) {
            this.service.delete(id).subscribe({
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
                    this.toastService.show(err.message || 'Error deleting record', 'error');
                }
            });
        }
    }
    onPageChange(params: any) {
        this.fetchData(params);
    }
}
