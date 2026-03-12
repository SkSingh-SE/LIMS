import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TechnicalRawDataNablService } from '../../../../services/technical-raw-data-nabl.service';
import { ToastService } from '../../../../services/toast.service';
import { NablRegisterTableComponent, RegisterColumn } from '../../nabl-register-table/nabl-register-table.component';

@Component({
    selector: 'app-technical-raw-data-list',

    imports: [CommonModule, NablRegisterTableComponent],
    templateUrl: './technical-raw-data-list.component.html',
    styleUrl: './technical-raw-data-list.component.css'
})
export class TechnicalRawDataListComponent implements OnInit {

    columns: RegisterColumn[] = [
        { key: 'testMethodName', type: 'string', label: 'Test Method', filter: true },
        { key: 'analystName', type: 'string', label: 'Analyst', filter: true },
        { key: 'formatNo', type: 'string', label: 'Form Number', filter: true },
        { key: 'issueNo', type: 'string', label: 'Issue No', filter: true },
        { key: 'date', type: 'date', label: 'Date', filter: true },
        { key: 'revNo', type: 'string', label: 'Rev No', filter: true }
    ];

    listData: any[] = [];
    totalItems = 0;
    isLoading = signal(false);

    constructor(
        private service: TechnicalRawDataNablService,
        private toastService: ToastService,
        private router: Router
    ) { }

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
                this.listData = response?.items || [];
                this.totalItems = response?.totalRecords || 0;
                this.isLoading.set(false);
            },
            error: (error: any) => {
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

    deleteRecord(id: number) {
        const confirmed = window.confirm('Are you sure you want to delete this record?');
        if (confirmed) {
            this.service.delete(id).subscribe({
                next: (response) => {
                    this.toastService.show(response.message, 'success');
                    this.fetchData({
                        PageNumber: 1,
                        PageSize: 10,
                        searchTerm: '',
                        sortByColumn: 'id',
                        sortOrder: 'asc',
                        filter: []
                    });
                },
                error: (error: any) => {
                    this.toastService.show(error.message, 'error');
                }
            });
        }
    }
}
