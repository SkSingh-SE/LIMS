import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DocumentReviewService } from '../../../../services/document-review.service';
import { NablRegisterTableComponent, RegisterColumn } from '../../nabl-register-table/nabl-register-table.component';
import { ToastService } from '../../../../services/toast.service';
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
    printList = '/document-review/previewlist';

    columns: RegisterColumn[] = [
        { key: 'reviewNo', type: 'string', label: 'Review No', filter: true },
        { key: 'reviewType', label: 'Review Type', type: 'string', width: '120px', filter: true },
        { key: 'documentName', label: 'Document Name', type: 'string', filter: true },
        { key: 'departmentName', label: 'Reviewer Department', type: 'string', filter: true },
        { key: 'changeRequired', label: 'Change Required', type: 'string', filter: true },
        { key: 'nextReviewDate', label: 'Next Review Date', type: 'date', width: '150px', filter: true },
        { key: 'status', label: 'Status', type: 'string', filter: true },
    ];

    data = signal<any[]>([]);
    totalItems = signal(0);

    constructor(private service: DocumentReviewService,
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
                console.error('Error fetching document reviews:', err);
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
