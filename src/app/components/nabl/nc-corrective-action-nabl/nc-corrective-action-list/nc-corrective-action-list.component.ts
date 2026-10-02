import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NcCorrectiveActionService } from '../../../../services/nc-corrective-action.service';
import { NablRegisterTableComponent, RegisterColumn } from '../../nabl-register-table/nabl-register-table.component';
import { ToastService } from '../../../../services/toast.service';

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
        { key: 'ncNo', label: 'NC No.', type: 'string', width: '100px', filter: true },
        // { key: 'documentNo', type: 'string', label: 'Doc No', filter: true },
        { key: 'date', label: 'Date', type: 'date', width: '120px', filter: true },
        { key: 'activityAssessed', label: 'Activity Assessed.', type: 'string', width: '100px' },
        { key: 'departmentName', label: 'Department Name', type: 'string', filter: true },
        { key: 'auditor', label: 'Auditor', type: 'string', filter: true },
        { key: 'auditee', label: 'Auditee', type: 'string', filter: true }
    ];

    data = signal<any[]>([]);
    totalItems = signal(0);

    constructor(private service: NcCorrectiveActionService, private toastService: ToastService) { }

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

    fetchData(params: any) {
        this.service.getAll(params).subscribe({
            next: (resp) => {
                this.data.set(resp.items || []);
                this.totalItems.set(resp.totalRecords || 0);
            },
            error: (err) => {
                console.error('Error fetching NC reports:', err);
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
