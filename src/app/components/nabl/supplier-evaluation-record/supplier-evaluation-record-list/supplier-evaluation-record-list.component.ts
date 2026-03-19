import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NablRegisterTableComponent } from '../../nabl-register-table/nabl-register-table.component';
import { SupplierEvaluationRecordService } from '../../../../services/supplier-evaluation-record.service';
import { SupplierEvaluationRecord } from '../../../../models/supplierEvaluationRecordModel';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
    selector: 'app-supplier-evaluation-record-list',

    imports: [CommonModule, NablRegisterTableComponent],
    templateUrl: './supplier-evaluation-record-list.component.html',
    styleUrls: ['./supplier-evaluation-record-list.component.css']
})
export class SupplierEvaluationRecordListComponent implements OnInit {
    records: SupplierEvaluationRecord[] = [];
    totalRecords = 0;
    pageSize = 10;
    pageNumber = 1;

    columns: any[] = [
        { key: 'documentNo', header: 'Document No.', type: 'text', sortable: true },
        { key: 'date', header: 'Date', type: 'date', sortable: true },
        { key: 'supplierName', header: 'Supplier Name', type: 'text', sortable: true },
        { key: 'percentageScore', header: 'Score %', type: 'number', sortable: true },
        { key: 'recommendation', header: 'Recommendation', type: 'badge', sortable: true }
    ];

    constructor(
        private service: SupplierEvaluationRecordService,
        private router: Router
    ) { }

    ngOnInit(): void {
        this.loadRecords();
    }

    loadRecords(event?: any) {
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
            if (response && response.success) {
                this.records = response.items.map(item => ({
                    ...item,
                    badgeColor: this.getBadgeColor(item.recommendation)
                }));
                this.totalRecords = response.totalRecords;
            }
        });
    }

    getBadgeColor(recommendation: string): string {
        switch (recommendation) {
            case 'Approved': return 'success';
            case 'Conditionally Approved': return 'warning';
            case 'Rejected': return 'danger';
            default: return 'primary';
        }
    }

    onCreate() {
        this.router.navigate(['/supplier/evaluation/form']);
    }

    onEdit(record: any) {
        this.router.navigate(['/supplier/evaluation/form'], { queryParams: { id: record.id } });
    }

    onView(record: any) {
        this.router.navigate(['/supplier/evaluation/form'], { queryParams: { id: record.id, view: 'true' } });
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

    onPrint(record: any) {
        this.router.navigate(['/supplier/evaluation/preview'], { queryParams: { id: record.id } });
    }
}
