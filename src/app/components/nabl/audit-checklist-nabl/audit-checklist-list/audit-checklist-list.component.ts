import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuditChecklistService } from '../../../../services/audit-checklist.service';
import { NablRegisterTableComponent, RegisterColumn } from '../../nabl-register-table/nabl-register-table.component';

@Component({
    selector: 'app-audit-checklist-list',
    standalone: true,
    imports: [CommonModule, NablRegisterTableComponent],
    templateUrl: './audit-checklist-list.component.html',
    styleUrl: './audit-checklist-list.component.css'
})
export class AuditChecklistListComponent implements OnInit {
    title = 'F-51: Audit Checklist & Observation';
    addButtonLabel = 'New Checklist';
    addRoute = '/audit-checklist/create';
    baseRoute = '/audit-checklist';

    columns: RegisterColumn[] = [
        { key: 'auditDate', label: 'Audit Date', type: 'date', width: '150px', filter: true },
        { key: 'areaDepartment', label: 'Area / Department', type: 'string', filter: true },
        { key: 'auditorName', label: 'Auditor Name', type: 'string', filter: true },
        { key: 'auditeeName', label: 'Auditee Name', type: 'string', filter: true }
    ];

    data = signal<any[]>([]);
    totalItems = signal(0);

    constructor(private service: AuditChecklistService) { }

    ngOnInit() {
        this.fetchData();
    }

    fetchData(params: any = {}) {
        this.service.getAll().subscribe({
            next: (resp) => {
                this.data.set(resp);
                this.totalItems.set(resp.length);
            },
            error: (err) => {
                console.error('Error fetching audit checklists:', err);
            }
        });
    }

    onPageChange(params: any) {
        this.fetchData(params);
    }
}
