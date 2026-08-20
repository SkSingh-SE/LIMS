import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DocumentChangeRequestService } from '../../../../services/document-change-request.service';
import { NablRegisterTableComponent, RegisterColumn } from '../../nabl-register-table/nabl-register-table.component';
import { ToastService } from '../../../../services/toast.service';
@Component({
    selector: 'app-document-change-request-list',
    standalone: true,
    imports: [CommonModule, NablRegisterTableComponent],
    templateUrl: './document-change-request-list.component.html',
    styleUrl: './document-change-request-list.component.css'
})
export class DocumentChangeRequestListComponent implements OnInit {
    title = 'F-44: Document Change Request Form';
    addButtonLabel = 'New Request';
    addRoute = '/document-change-request/create';
    baseRoute = '/document-change-request';

    columns: RegisterColumn[] = [
        { key: 'requestNo', label: 'Change Request No', type: 'string', filter: true },
        { key: 'changeType', label: 'Type of Change', type: 'string', filter: true },
        { key: 'documentName', label: 'Document Name', type: 'string', filter: true },
        { key: 'requestDate', label: 'Request Date', type: 'date', width: '120px', filter: true },
        { key: 'priority', label: 'Priority', type: 'string', width: '150px', filter: true },
        { key: 'reviewedByName', label: 'Requested By', type: 'string', filter: true },
    ];

    data = signal<any[]>([]);
    totalItems = signal(0);

    constructor(private service: DocumentChangeRequestService,
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
                console.error('Error fetching change requests:', err);
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
