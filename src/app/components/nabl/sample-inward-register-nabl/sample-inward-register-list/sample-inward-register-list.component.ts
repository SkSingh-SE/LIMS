import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { SampleInwardRegisterNablService } from '../../../../services/sample-inward-register-nabl.service';
import { NablRegisterTableComponent, RegisterColumn } from '../../nabl-register-table/nabl-register-table.component';

@Component({
    selector: 'app-sample-inward-register-nabl-list',
    standalone: true,
    imports: [CommonModule, NablRegisterTableComponent],
    templateUrl: './sample-inward-register-list.component.html'
})
export class SampleInwardRegisterNablListComponent implements OnInit {
    columns: RegisterColumn[] = [
        { key: 'documentNo', type: 'string', label: 'Doc No', filter: true },
        { key: 'date', type: 'date', label: 'Date', filter: true },
        { key: 'preparedBy', type: 'string', label: 'Prepared By', filter: true },
        { key: 'status', type: 'string', label: 'Status', filter: true }
    ];

    listData: any[] = [];
    totalItems = 0;

    constructor(private service: SampleInwardRegisterNablService) { }

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
