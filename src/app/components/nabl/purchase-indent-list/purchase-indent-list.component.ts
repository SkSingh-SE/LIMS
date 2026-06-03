import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { PurchaseIndentService } from '../../../services/purchase-indent.service';
import { NablRegisterTableComponent, RegisterColumn } from '../nabl-register-table/nabl-register-table.component';
import { ToastService } from '../../../services/toast.service';
@Component({
    selector: 'app-purchase-indent-list',

    imports: [CommonModule, NablRegisterTableComponent],
    templateUrl: './purchase-indent-list.component.html'
})
export class PurchaseIndentListComponent implements OnInit {

    columns: RegisterColumn[] = [
        { key: 'documentNo', type: 'string', label: 'Doc No', filter: true },
        { key: 'piNo', type: 'string', label: 'Purchase Inent/Purchase Request No', filter: true },
        { key: 'indentorName', type: 'string', label: 'Indentor Name', filter: true },
        { key: 'quantity', type: 'number', label: 'Quality', filter: true },
        { key: 'date', type: 'date', label: 'Date', filter: true },
        { key: 'priority', type: 'string', label: 'Priority', filter: true },
    ];

    indents: any[] = [];
    totalItems = 0;

    constructor(private service: PurchaseIndentService,
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
                this.indents = response?.items || [];
                this.totalItems = response?.totalRecords || 0;
            },
            error: (error: any) => {
                console.error('Error fetching purchase indents:', error);
                this.indents = [];
                this.totalItems = 0;
            }
        });
    }

    onPageChange(payload: any) {
        this.fetchData(payload);
    }
    deletePurchaseIndent(id: number) {
        const confirm = window.confirm('Are you sure you want to delete this purchase indent?');
        if (confirm) {
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
                error: (err) => {
                    this.toastService.show(err.message, 'error');
                },
            });
        }
    }
}
