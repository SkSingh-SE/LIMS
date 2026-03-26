import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuditSummaryService } from '../../../../services/audit-summary.service';
import { NablRegisterTableComponent, RegisterColumn } from '../../nabl-register-table/nabl-register-table.component';

@Component({
    selector: 'app-audit-summary-list',
    standalone: true,
    imports: [CommonModule, NablRegisterTableComponent],
    templateUrl: './audit-summary-list.component.html',
    styleUrl: './audit-summary-list.component.css'
})
export class AuditSummaryListComponent implements OnInit {
    title = 'F-52: Audit Summary Report';
    addButtonLabel = 'New Summary Report';
    addRoute = '/audit-summary/create';
    baseRoute = '/audit-summary';

    columns: RegisterColumn[] = [
        { key: 'documentNo', type: 'string', label: 'Doc No', filter: true },
        { key: 'auditDate', label: 'Audit Date', type: 'date', width: '150px', filter: true },
        { key: 'areasCovered', label: 'Areas Covered', type: 'string', filter: true },
        { key: 'majorNCs', label: 'Major NCs', type: 'number', width: '120px' },
        { key: 'minorNCs', label: 'Minor NCs', type: 'number', width: '120px' }
    ];

    data = signal<any[]>([]);
    totalItems = signal(0);

    constructor(private service: AuditSummaryService) { }

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
                console.error('Error fetching audit summaries:', err);
            }
        });
    }

    onPageChange(params: any) {
        this.fetchData(params);
    }
}
