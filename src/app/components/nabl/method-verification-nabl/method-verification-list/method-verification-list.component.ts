import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { MethodVerificationNablService } from '../../../../services/method-verification-nabl.service';
import { NablRegisterTableComponent, RegisterColumn } from '../../nabl-register-table/nabl-register-table.component';
import { ToastService } from '../../../../services/toast.service';

@Component({
    selector: 'app-method-verification-nabl-list',
    standalone: true,
    imports: [CommonModule, NablRegisterTableComponent],
    templateUrl: './method-verification-list.component.html'
})
export class MethodVerificationNablListComponent implements OnInit {
    columns: RegisterColumn[] = [
        { key: 'documentNo', type: 'string', label: 'Doc No', filter: true },
        { key: 'testMethodCode', type: 'string', label: 'Test Method Code', filter: true },
        { key: 'testMethodName', type: 'string', label: 'Test Method Name', filter: true },
        { key: 'equipmentName', type: 'string', label: 'Equipment Name', filter: true },
        { key: 'verificationStatus', type: 'string', label: 'Verification Status', filter: true },
        { key: 'date', type: 'date', label: 'Date', filter: true },
        { key: 'verifiedBy', type: 'string', label: 'Verified By', filter: true }
    ];

    listData: any[] = [];
    totalItems = 0;

    constructor(private service: MethodVerificationNablService,
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
        const confirmed = window.confirm('Are you sure you want to delete this test method verification?');
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
