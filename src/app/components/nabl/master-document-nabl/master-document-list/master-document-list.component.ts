import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MasterDocumentService } from '../../../../services/master-document.service';
import { NablRegisterTableComponent, RegisterColumn } from '../../nabl-register-table/nabl-register-table.component';
import { ToastService } from '../../../../services/toast.service';

@Component({
    selector: 'app-master-document-list',
    standalone: true,
    imports: [CommonModule, NablRegisterTableComponent],
    templateUrl: './master-document-list.component.html',
    styleUrl: './master-document-list.component.css'
})
export class MasterDocumentListComponent implements OnInit {
    title = 'F-43: Master List of Documents';
    addButtonLabel = 'Add New Document';
    addRoute = '/master-document/create';
    baseRoute = '/master-document';
    printList = '/master-document/previewlist';
    columns: RegisterColumn[] = [
        { key: 'documentCode', label: 'Doc Code.', type: 'string', width: '80px' },
        { key: 'documentTitle', label: 'Document Title', type: 'string', filter: true },
        // { key: 'documentType', label: 'Document Type.', type: 'string', width: '100px' },
        { key: 'departmentName', label: 'Department', type: 'string', filter: true },
        { key: 'currentIssue', label: 'Current Issue', type: 'string', filter: true },
        { key: 'currentRevision', label: 'Current Revision', type: 'string', width: '100px' },
        { key: 'date', label: 'Date', type: 'date', width: '120px', filter: true },
        { key: 'status', label: 'Status', type: 'string', width: '100px' },

    ];

    data = signal<any[]>([]);
    totalItems = signal(0);

    constructor(private service: MasterDocumentService,
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
                console.error('Error fetching master documents:', err);
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
