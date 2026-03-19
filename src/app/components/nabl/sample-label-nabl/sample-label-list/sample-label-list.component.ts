import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { SampleLabelNablService } from '../../../../services/sample-label-nabl.service';
import { NablRegisterTableComponent, RegisterColumn } from '../../nabl-register-table/nabl-register-table.component';

@Component({
    selector: 'app-sample-label-nabl-list',
    standalone: true,
    imports: [CommonModule, NablRegisterTableComponent],
    templateUrl: './sample-label-list.component.html'
})
export class SampleLabelNablListComponent implements OnInit {
    columns: RegisterColumn[] = [
        { key: 'sampleId', type: 'string', label: 'Sample ID', filter: true },
        { key: 'receiptDate', type: 'date', label: 'Receipt Date', filter: true },
        { key: 'description', type: 'string', label: 'Description', filter: true },
        { key: 'testParameters', type: 'string', label: 'Tests', filter: true },
        { key: 'status', type: 'string', label: 'Status', filter: true }
    ];

    listData: any[] = [];
    totalItems = 0;

    constructor(private service: SampleLabelNablService) { }

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
