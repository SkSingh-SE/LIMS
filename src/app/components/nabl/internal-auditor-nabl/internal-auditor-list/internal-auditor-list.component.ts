import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InternalAuditorService } from '../../../../services/internal-auditor.service';
import { NablRegisterTableComponent, RegisterColumn } from '../../nabl-register-table/nabl-register-table.component';

@Component({
    selector: 'app-internal-auditor-list',
    standalone: true,
    imports: [CommonModule, NablRegisterTableComponent],
    templateUrl: './internal-auditor-list.component.html',
    styleUrl: './internal-auditor-list.component.css'
})
export class InternalAuditorListComponent implements OnInit {
    title = 'F-49: Trained Internal Auditors List';
    addButtonLabel = 'New Auditor';
    addRoute = '/internal-auditor/create';
    baseRoute = '/internal-auditor';

    columns: RegisterColumn[] = [
        { key: 'auditorName', label: 'Auditor Name', type: 'string', filter: true },
        { key: 'qualification', label: 'Qualification', type: 'string', filter: true },
        { key: 'trainingDate', label: 'Training Date', type: 'date', width: '150px', filter: true },
        { key: 'examScore', label: 'Exam Score', type: 'string', width: '120px' }
    ];

    data = signal<any[]>([]);
    totalItems = signal(0);

    constructor(private service: InternalAuditorService) { }

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
                console.error('Error fetching internal auditors:', err);
            }
        });
    }

    onPageChange(params: any) {
        this.fetchData(params);
    }
}
