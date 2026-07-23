import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NablRegisterTableComponent } from '../../nabl-register-table/nabl-register-table.component';
import { PurchaseMaterialVerificationService } from '../../../../services/purchase-material-verification.service';
import { PurchaseMaterialVerification } from '../../../../models/purchaseMaterialVerificationModel';
import { NablFormsHelper } from '../../../../utility/nabl-helpers/nabl-forms.helper';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { ToastService } from '../../../../services/toast.service';
@Component({
    selector: 'app-purchase-material-verification-list',
    imports: [CommonModule, NablRegisterTableComponent],
    templateUrl: './purchase-material-verification-list.component.html',
    styleUrls: ['./purchase-material-verification-list.component.css']
})
export class PurchaseMaterialVerificationListComponent implements OnInit {
    printList = '/purchase-material-verification/previewlist';
    records: PurchaseMaterialVerification[] = [];
    totalItems = 0;
    pageSize = 10;
    pageNumber = 1;
    veryficationMaterial: any[] = [];
    columns: any[] = [
        { key: 'purchaseOrderNo', type: 'string', label: 'PO No', filter: true },
        { key: 'poDate', header: 'Date', type: 'date', label: 'PO Date', sortable: true },
        { key: 'invoiceNo', header: 'Status', type: 'text', label: 'Invoice No', sortable: true },
        { key: 'invoiceDate', header: 'Invoice No.', type: 'text', label: 'Invoice Date', sortable: true },
        { key: 'supplierName', header: 'Supplier Name', label: 'Supplier Name', type: 'text', sortable: true },
    ];

    constructor(
        private service: PurchaseMaterialVerificationService,
        private router: Router,
        private toastService: ToastService
    ) { }

    ngOnInit(): void {
        this.fetchData({
            PageNumber: 1,
            PageSize: 10,
            searchTerm: '',
            sortByColumn: 'id',
            sortOrder: 'desc',
            filter: []
        });
    }

    onPageChange(payload: any) {
        this.fetchData(payload);
    }

    fetchData(payload: any) {
        this.service.getAll(payload).subscribe({
            next: (response) => {
                this.veryficationMaterial = response?.items || [];
                this.totalItems = response?.totalRecords || 0;
            },
            error: (error: any) => {
                console.error('Error fetching purchase indents:', error);
                this.veryficationMaterial = [];
                this.totalItems = 0;
            }
        });
    }



    getBadgeColor(status: string): string {
        switch (status) {
            case 'Accepted': return 'success';
            case 'Rejected': return 'danger';
            case 'Hold': return 'warning';
            default: return 'primary';
        }
    }

    onDelete(id: number) {
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
