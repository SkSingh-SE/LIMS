import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InternalAuditorService } from '../../../../services/internal-auditor.service';
import { NablRegisterTableComponent, RegisterColumn } from '../../nabl-register-table/nabl-register-table.component';
import { ToastService } from '../../../../services/toast.service';
@Component({
    selector: 'app-internal-auditor-list',
    standalone: true,
    imports: [CommonModule, NablRegisterTableComponent],
    templateUrl: './internal-auditor-list.component.html',
    styleUrl: './internal-auditor-list.component.css'
})
export class InternalAuditorListComponent implements OnInit {
    title = 'F-49: Trained Auditors List';
    addButtonLabel = 'New Auditor';
    addRoute = '/internal-auditor/create';
    baseRoute = '/internal-auditor';

    columns: RegisterColumn[] = [
        { key: 'employeeName', type: 'string', label: 'Employee Name', filter: true },
        { key: 'departmentName', label: 'Department Name', type: 'string', filter: true },
        { key: 'certificateNo', label: 'Certificate No', type: 'string', filter: true },
        { key: 'trainingOrganization', label: 'Training Organization', type: 'string', filter: true },
        { key: 'authorizationDate', label: 'Authorization Date', type: 'date', width: '120px', filter: true },
        { key: 'authorizationValidUpto', label: 'Authorization Valid Upto', type: 'date', width: '120px', filter: true }
    ];

    data = signal<any[]>([]);
    totalItems = signal(0);

    constructor(private service: InternalAuditorService,
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
                console.error('Error fetching internal auditors:', err);
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
