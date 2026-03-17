import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { PurchaseOrderService } from '../../../services/purchase-order.service';
import { NablRegisterTableComponent, RegisterColumn } from '../nabl-register-table/nabl-register-table.component';

@Component({
    selector: 'app-purchase-order-list',

    imports: [CommonModule, NablRegisterTableComponent],
    templateUrl: './purchase-order-list.component.html'
})
export class PurchaseOrderListComponent implements OnInit {

    columns: RegisterColumn[] = [
        { key: 'documentNo', type: 'string', label: 'PO Number', filter: true },
        { key: 'date', type: 'date', label: 'Date', filter: true },
        { key: 'supplierName', type: 'string', label: 'Supplier', filter: true },
        { key: 'poType', type: 'string', label: 'Type', filter: true },
        { key: 'grandTotal', type: 'number', label: 'Total Amount', filter: true },
        { key: 'status', type: 'string', label: 'Status', filter: true }
    ];

    orders: any[] = [];
    totalItems = 0;
    isLoading = signal(false);

    constructor(private service: PurchaseOrderService) { }

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
                this.orders = response?.items || [];
                this.totalItems = response?.totalRecords || 0;
                this.isLoading.set(false);
            },
            error: (error: any) => {
                console.error('Error fetching purchase orders:', error);
                this.orders = [];
                this.totalItems = 0;
                this.isLoading.set(false);
            }
        });
    }

    onPageChange(payload: any) {
        this.fetchData(payload);
    }
}
