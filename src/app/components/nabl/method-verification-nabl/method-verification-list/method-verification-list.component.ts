import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { MethodVerificationNablService } from '../../../../services/method-verification-nabl.service';
import { NablRegisterTableComponent, RegisterColumn } from '../../nabl-register-table/nabl-register-table.component';

@Component({
    selector: 'app-method-verification-nabl-list',
    standalone: true,
    imports: [CommonModule, NablRegisterTableComponent],
    templateUrl: './method-verification-list.component.html'
})
export class MethodVerificationNablListComponent implements OnInit {
    columns: RegisterColumn[] = [
        { key: 'documentNo', type: 'string', label: 'Doc No', filter: true },
        { key: 'testMethodName', type: 'string', label: 'Method Name', filter: true },
        { key: 'referenceStandard', type: 'string', label: 'Ref Standard', filter: true },
        { key: 'matrix', type: 'string', label: 'Matrix', filter: true },
        { key: 'date', type: 'date', label: 'Date', filter: true },
        { key: 'status', type: 'string', label: 'Status', filter: true }
    ];

    listData: any[] = [];
    totalItems = 0;
    isLoading = signal(false);

    constructor(private service: MethodVerificationNablService) { }

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
        this.isLoading.set(true);
        this.service.getAll(payload).subscribe({
            next: (response) => {
                this.listData = response?.items || [];
                this.totalItems = response?.totalRecords || 0;
                this.isLoading.set(false);
            },
            error: (error) => {
                console.error('Error fetching records:', error);
                this.listData = [];
                this.totalItems = 0;
                this.isLoading.set(false);
            }
        });
    }

    onPageChange(payload: any) {
        this.fetchData(payload);
    }
}
