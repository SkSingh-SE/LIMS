import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { MethodValidationNablService } from '../../../../services/method-validation-nabl.service';
import { NablRegisterTableComponent, RegisterColumn } from '../../nabl-register-table/nabl-register-table.component';
import { ToastService } from '../../../../services/toast.service';
@Component({
    selector: 'app-method-validation-nabl-list',
    standalone: true,
    imports: [CommonModule, NablRegisterTableComponent],
    templateUrl: './method-validation-list.component.html'
})
export class MethodValidationNablListComponent implements OnInit {
    columns: RegisterColumn[] = [
        { key: 'documentNo', type: 'string', label: 'Doc No', filter: true },
        { key: 'testMethodCode', type: 'string', label: 'Verified Test Method Code', filter: true },
        { key: 'testMethodName', type: 'string', label: 'Verified Test Method Name', filter: true },
        { key: 'equipmentName', type: 'string', label: 'Equipment Name', filter: true },
        { key: 'validStatus', type: 'string', label: 'Validate Status', filter: true },
        { key: 'date', type: 'date', label: 'Date', filter: true },
        { key: 'validatedBy', type: 'string', label: 'Validate By', filter: true }
    ];

    listData: any[] = [];
    totalItems = 0;

    constructor(private service: MethodValidationNablService,
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
    delete(id: number) {
        const confirmed = window.confirm('Are you sure you want to delete this test method validation?');
        if (confirmed) {
            this.service.delete(id).subscribe({
                next: (response) => {
                    this.toastService.show(response.message, 'success');
                    this.fetchData({
                        PageNumber: 1,
                        PageSize: 10,
                        searchTerm: '',
                        sortByColumn: 'id',
                        sortOrder: 'desc',
                        filter: []
                    });
                },
                error: (error) => {
                    this.toastService.show(error.message, 'error');
                }
            });
        }
    }
}
