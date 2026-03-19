import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { TestRequestNablService } from '../../../../services/test-request-nabl.service';
import { NablRegisterTableComponent, RegisterColumn } from '../../nabl-register-table/nabl-register-table.component';

@Component({
    selector: 'app-test-request-nabl-list',
    imports: [CommonModule, NablRegisterTableComponent],
    templateUrl: './test-request-list.component.html'
})
export class TestRequestNablListComponent implements OnInit {
    columns: RegisterColumn[] = [
        { key: 'documentNo', type: 'string', label: 'TRN / Case No', filter: true },
        { key: 'customerName', type: 'string', label: 'Customer', filter: true },
        { key: 'date', type: 'date', label: 'Receipt Date', filter: true },
        { key: 'preparedBy', type: 'string', label: 'Prepared By', filter: true },
        { key: 'status', type: 'string', label: 'Status', filter: true },
        { key: 'urgent', type: 'string', label: 'Urgent', filter: true }
    ];

    listData: any[] = [];
    totalItems = 0;

    constructor(private service: TestRequestNablService) { }

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
}
