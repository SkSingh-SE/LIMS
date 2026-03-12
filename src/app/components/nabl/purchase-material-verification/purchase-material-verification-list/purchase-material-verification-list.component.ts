import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NablRegisterTableComponent } from '../../nabl-register-table/nabl-register-table.component';
import { PurchaseMaterialVerificationService } from '../../../../services/purchase-material-verification.service';
import { PurchaseMaterialVerification } from '../../../../models/purchaseMaterialVerificationModel';
import { NablFormsHelper } from '../../../../utility/nabl-helpers/nabl-forms.helper';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
    selector: 'app-purchase-material-verification-list',
    imports: [CommonModule, NablRegisterTableComponent],
    templateUrl: './purchase-material-verification-list.component.html',
    styleUrls: ['./purchase-material-verification-list.component.css']
})
export class PurchaseMaterialVerificationListComponent implements OnInit {
    records: PurchaseMaterialVerification[] = [];
    isLoading = false;
    totalRecords = 0;
    pageSize = 10;
    pageNumber = 1;

    columns: any[] = [
        { key: 'documentNo', header: 'Document No.', type: 'text', sortable: true },
        { key: 'date', header: 'Date', type: 'date', sortable: true },
        { key: 'supplierName', header: 'Supplier Name', type: 'text', sortable: true },
        { key: 'invoiceNo', header: 'Invoice No.', type: 'text', sortable: true },
        { key: 'overallStatus', header: 'Status', type: 'badge', sortable: true }
    ];

    constructor(
        private service: PurchaseMaterialVerificationService,
        private router: Router
    ) { }

    ngOnInit(): void {
        this.loadRecords();
    }

    loadRecords(event?: any) {
        this.isLoading = true;
        const params = {
            PageNumber: event?.pageIndex ? event.pageIndex + 1 : this.pageNumber,
            PageSize: event?.pageSize || this.pageSize,
            searchTerm: event?.searchTerm || ''
        };

        this.service.getAll(params).pipe(
            catchError(error => {
                alert('Error loading records');
                return of(null);
            })
        ).subscribe(response => {
            this.isLoading = false;
            if (response && response.success) {
                this.records = response.items.map(item => ({
                    ...item,
                    badgeColor: this.getBadgeColor(item.overallStatus)
                }));
                this.totalRecords = response.totalRecords;
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
        if (confirm('Are you sure you want to delete this record?')) {
            this.service.delete(id).subscribe(res => {
                if (res.success) {
                    alert('Record deleted successfully');
                    this.loadRecords();
                } else {
                    alert('Failed to delete');
                }
            });
        }
    }
}
