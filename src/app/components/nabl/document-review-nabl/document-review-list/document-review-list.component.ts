import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DocumentReviewService } from '../../../../services/document-review.service';
import { NablRegisterTableComponent, RegisterColumn } from '../../nabl-register-table/nabl-register-table.component';

@Component({
    selector: 'app-document-review-list',
    standalone: true,
    imports: [CommonModule, NablRegisterTableComponent],
    templateUrl: './document-review-list.component.html',
    styleUrl: './document-review-list.component.css'
})
export class DocumentReviewListComponent implements OnInit {
    title = 'F-45: Document Review Record';
    addButtonLabel = 'Add New Review';
    addRoute = '/document-review/create';
    baseRoute = '/document-review';

    columns: RegisterColumn[] = [
        { key: 'documentNo', type: 'string', label: 'Doc No', filter: true },
        { key: 'srNo', label: 'Sr. No.', type: 'number', width: '80px' },
        { key: 'documentName', label: 'Document', type: 'string', filter: true },
        { key: 'lastReviewDate', label: 'Last Review Date', type: 'date', width: '150px', filter: true },
        { key: 'nextReviewDate', label: 'Next Review Date', type: 'date', width: '150px', filter: true },
        { key: 'reviewDoneBy', label: 'Review Done By', type: 'string', filter: true }
    ];

    data = signal<any[]>([]);
    totalItems = signal(0);

    constructor(private service: DocumentReviewService) { }

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
                console.error('Error fetching document reviews:', err);
            }
        });
    }

    onPageChange(params: any) {
        this.fetchData(params);
    }
}
