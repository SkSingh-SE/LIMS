import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { TestMethodNablService } from '../../../../services/test-method-nabl.service';
import { NablRegisterTableComponent, RegisterColumn } from '../../nabl-register-table/nabl-register-table.component';
import { ToastService } from '../../../../services/toast.service';
@Component({
    selector: 'app-test-method-nabl-list',
    standalone: true,
    imports: [CommonModule, NablRegisterTableComponent],
    templateUrl: './test-method-list.component.html'
})
export class TestMethodNablListComponent implements OnInit {
    columns: RegisterColumn[] = [
        { key: 'documentNo', type: 'string', label: 'Doc No', filter: true },
        // { key: 'listType', type: 'string', label: 'List Type', filter: true },
        // { key: 'testMethodTitle', type: 'string', label: 'Test Method Title', filter: true },
        { key: 'approvedBy', type: 'string', label: 'Approved By', filter: true },
        { key: 'reviewedBy', type: 'string', label: 'Reviewed By', filter: true },
        { key: 'date', type: 'date', label: 'Date', filter: true },
    ];

    listData: any[] = [];
    totalItems = 0;

    constructor(private service: TestMethodNablService,
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

    fetchData(payload: any) {
        this.service.getAll(payload).subscribe({
            next: (response) => {
                this.listData = response?.items || [];
                this.totalItems = response?.totalRecords || 0;
            },
            error: (error) => {
                console.error('Error fetching records:', error);
                this.listData = [];
                this.totalItems = 0;
            }
        });
    }

    onPageChange(payload: any) {
        this.fetchData(payload);
    }

    onDelete(id: number): void {
        if (confirm('Are you sure you want to delete this test method record?')) {
            this.service.delete(id).subscribe(() => {
                this.toastService.show('delete test method record', 'success');
                this.fetchData({
                    PageNumber: 1,
                    PageSize: 10,
                    searchTerm: '',
                    sortByColumn: 'id',
                    sortOrder: 'desc',
                    filter: []
                });
            });
        }
    }
}
