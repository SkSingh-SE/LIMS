import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DocumentChangeRequestService } from '../../../../services/document-change-request.service';
import { NablRegisterTableComponent, RegisterColumn } from '../../nabl-register-table/nabl-register-table.component';

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
        { key: 'date', label: 'Date', type: 'date', width: '120px', filter: true },
        { key: 'documentTitle', label: 'Document Title', type: 'string', filter: true },
        { key: 'documentNo', label: 'Doc No.', type: 'string', width: '150px', filter: true },
        { key: 'initiatedBy', label: 'Initiated By', type: 'string', filter: true },
        { key: 'approvedBy', label: 'Approved By', type: 'string', filter: true }
    ];

    data = signal<any[]>([]);
    totalItems = signal(0);

    constructor(private service: DocumentChangeRequestService) { }

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
                console.error('Error fetching change requests:', err);
            }
        });
    }

    onPageChange(params: any) {
        this.fetchData(params);
    }
}
