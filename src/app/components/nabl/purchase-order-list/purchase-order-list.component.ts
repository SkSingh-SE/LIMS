import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { PurchaseOrderService } from '../../../services/purchase-order.service';
import { NablRegisterTableComponent, RegisterColumn } from '../nabl-register-table/nabl-register-table.component';
import { ToastService } from '../../../services/toast.service';
@Component({
    selector: 'app-purchase-order-list',

    imports: [CommonModule, NablRegisterTableComponent],
    templateUrl: './purchase-order-list.component.html'
})
export class PurchaseOrderListComponent implements OnInit {

    columns: RegisterColumn[] = [
        { key: 'documentNo', type: 'string', label: 'Doc Number', filter: true },
        { key: 'poDate', type: 'date', label: 'PO Date', filter: true },
        { key: 'supplierName', type: 'string', label: 'Supplier', filter: true },
        { key: 'paymentTerms', type: 'string', label: 'Payment Terms', filter: true },
        { key: 'totalAmount', type: 'number', label: 'Total Amount', filter: true },
        { key: 'status', type: 'string', label: 'Status', filter: true }
    ];

    orders: any[] = [];
    totalItems = 0;

    constructor(private service: PurchaseOrderService,
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
                this.orders = response?.items || [];
                this.totalItems = response?.totalRecords || 0;
            },
            error: (error: any) => {
                console.error('Error fetching purchase orders:', error);
                this.orders = [];
                this.totalItems = 0;
            }
        });
    }

    onPageChange(payload: any) {
        this.fetchData(payload);
    }
    deletePurchaseOrder(id: number) {
        const confirm = window.confirm('Are you sure you want to delete this purachse order?');
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
