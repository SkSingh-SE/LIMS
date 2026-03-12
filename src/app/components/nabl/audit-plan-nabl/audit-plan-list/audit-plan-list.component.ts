import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuditPlanService } from '../../../../services/audit-plan.service';
import { NablRegisterTableComponent, RegisterColumn } from '../../nabl-register-table/nabl-register-table.component';

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

    columns: RegisterColumn[] = [
        { key: 'period', label: 'Period', type: 'string', width: '120px', filter: true },
        { key: 'areaDepartment', label: 'Area / Department', type: 'string', filter: true },
        { key: 'auditorName', label: 'Auditor Name', type: 'string', filter: true },
        { key: 'scheduleDate', label: 'Schedule Date', type: 'date', width: '150px', filter: true }
    ];

    data = signal<any[]>([]);
    totalItems = signal(0);
    isLoading = signal(false);

    constructor(private service: AuditPlanService) { }

    ngOnInit() {
        this.fetchData();
    }

    fetchData(params: any = {}) {
        this.isLoading.set(true);
        this.service.getAll().subscribe({
            next: (resp) => {
                this.data.set(resp);
                this.totalItems.set(resp.length);
                this.isLoading.set(false);
            },
            error: (err) => {
                console.error('Error fetching audit plans:', err);
                this.isLoading.set(false);
            }
        });
    }

    onPageChange(params: any) {
        this.fetchData(params);
    }
}
