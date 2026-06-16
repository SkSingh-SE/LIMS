import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NcCorrectiveActionService } from '../../../../services/nc-corrective-action.service';
import { NablRegisterTableComponent, RegisterColumn } from '../../nabl-register-table/nabl-register-table.component';

@Component({
    selector: 'app-nc-corrective-action-list',
    standalone: true,
    imports: [CommonModule, NablRegisterTableComponent],
    templateUrl: './nc-corrective-action-list.component.html',
    styleUrl: './nc-corrective-action-list.component.css'
})
export class NcCorrectiveActionListComponent implements OnInit {
    title = 'F-42: NC & Corrective Action Report';
    addButtonLabel = 'Add New Report';
    addRoute = '/nc-corrective-action/create';
    baseRoute = '/nc-corrective-action';

    columns: RegisterColumn[] = [
        { key: 'documentNo', type: 'string', label: 'Doc No', filter: true },
        { key: 'date', label: 'Date', type: 'date', width: '120px', filter: true },
        { key: 'ncNo', label: 'NC No.', type: 'string', width: '100px', filter: true },
        { key: 'clauseNo', label: 'Clause No.', type: 'string', width: '100px' },
        { key: 'section', label: 'Section', type: 'string', filter: true },
        { key: 'auditor', label: 'Auditor', type: 'string', filter: true },
        { key: 'auditee', label: 'Auditee', type: 'string', filter: true }
    ];

    data = signal<any[]>([]);
    totalItems = signal(0);

    constructor(private service: NcCorrectiveActionService) { }

    ngOnInit() {
        this.fetchData();
    }

    fetchData(params: any = {}) {
        this.service.getAll().subscribe({
            next: (resp) => {
                this.data.set(resp.items || []);
                this.totalItems.set(resp.totalRecords || 0);
            },
            error: (err) => {
                console.error('Error fetching NC reports:', err);
            }
        });
    }

    onPageChange(params: any) {
        this.fetchData(params);
    }
}
