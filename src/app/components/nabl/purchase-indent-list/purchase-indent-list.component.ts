import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { PurchaseIndentService } from '../../../services/purchase-indent.service';
import { NablRegisterTableComponent, RegisterColumn } from '../nabl-register-table/nabl-register-table.component';

@Component({
    selector: 'app-purchase-indent-list',

    imports: [CommonModule, NablRegisterTableComponent],
    templateUrl: './purchase-indent-list.component.html'
})
export class PurchaseIndentListComponent implements OnInit {

    columns: RegisterColumn[] = [
        { key: 'documentNo', type: 'string', label: 'Indent No', filter: true },
        { key: 'date', type: 'date', label: 'Date', filter: true },
        { key: 'departmentName', type: 'string', label: 'Department', filter: true },
        { key: 'indentorName', type: 'string', label: 'Indentor', filter: true },
        { key: 'priority', type: 'string', label: 'Priority', filter: true },
        { key: 'status', type: 'string', label: 'Status', filter: true }
    ];

    indents: any[] = [];
    totalItems = 0;
    isLoading = signal(false);

    constructor(private service: PurchaseIndentService) { }

    ngOnInit() {
        this.fetchData({
            PageNumber: 1,
            PageSize: 10,
            searchTerm: '',
            sortByColumn: 'id',
            sortOrder: 'asc',
            filter: []
        });
    }

    fetchData(payload: any) {
        this.isLoading.set(true);
        this.service.getAll(payload).subscribe({
            next: (response) => {
                this.indents = response?.items || [];
                this.totalItems = response?.totalRecords || 0;
                this.isLoading.set(false);
            },
            error: (error: any) => {
                console.error('Error fetching purchase indents:', error);
                this.indents = [];
                this.totalItems = 0;
                this.isLoading.set(false);
            }
        });
    }

    onPageChange(payload: any) {
        this.fetchData(payload);
    }
}
