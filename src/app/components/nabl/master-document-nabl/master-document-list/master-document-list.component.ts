import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MasterDocumentService } from '../../../../services/master-document.service';
import { NablRegisterTableComponent, RegisterColumn } from '../../nabl-register-table/nabl-register-table.component';

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

    columns: RegisterColumn[] = [
        { key: 'srNo', label: 'Sr. No.', type: 'number', width: '80px' },
        { key: 'documentName', label: 'Document Name', type: 'string', filter: true },
        { key: 'documentNo', label: 'Document No.', type: 'string', filter: true },
        { key: 'issueNo', label: 'Issue No.', type: 'string', width: '100px' },
        { key: 'revNo', label: 'Rev No.', type: 'string', width: '100px' },
        { key: 'copyHolder', label: 'Copy Holder', type: 'string', filter: true }
    ];

    data = signal<any[]>([]);
    totalItems = signal(0);

    constructor(private service: MasterDocumentService) { }

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
                console.error('Error fetching master documents:', err);
            }
        });
    }

    onPageChange(params: any) {
        this.fetchData(params);
    }
}
