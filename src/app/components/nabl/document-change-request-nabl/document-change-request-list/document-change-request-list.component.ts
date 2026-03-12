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
    isLoading = signal(false);

    constructor(private service: DocumentChangeRequestService) { }

    ngOnInit() {
        this.fetchData();
    }

    fetchData(params: any = {}) {
        this.isLoading.set(true);
        this.service.getAll().subscribe({
            next: (resp) => {
                this.data.set(resp);
                this.totalItems.set(resp.length);
                this.isLoading.set(false);
            },
            error: (err) => {
                console.error('Error fetching change requests:', err);
                this.isLoading.set(false);
            }
        });
    }

    onPageChange(params: any) {
        this.fetchData(params);
    }
}
