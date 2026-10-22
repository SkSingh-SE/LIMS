import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuditChecklistService } from '../../../../services/audit-checklist.service';
import { NablRegisterTableComponent, RegisterColumn } from '../../nabl-register-table/nabl-register-table.component';
import { ToastService } from '../../../../services/toast.service';

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
        { key: 'checklistNo', type: 'string', label: 'Check List No', filter: true },
        { key: 'auditPlanNo', type: 'string', label: 'Audit Plan No', filter: true },
        { key: 'isoClause', type: 'string', label: 'Iso Clause', filter: true },
        { key: 'auditDate', label: 'Audit Date', type: 'date', width: '150px', filter: true },
        { key: 'departmentName', label: 'Area / Department', type: 'string', filter: true },
        { key: 'auditorName', label: 'Auditor Name', type: 'string', filter: true },
        { key: 'auditeeName', label: 'Auditee Name', type: 'string', filter: true }
    ];

    data = signal<any[]>([]);
    totalItems = signal(0);

    constructor(private service: AuditChecklistService,
        private toastService: ToastService
    ) { }

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
                console.error('Error fetching audit checklists:', err);
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
