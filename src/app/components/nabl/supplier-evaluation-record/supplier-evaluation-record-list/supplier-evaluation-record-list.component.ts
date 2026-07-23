import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NablRegisterTableComponent } from '../../nabl-register-table/nabl-register-table.component';
import { SupplierEvaluationRecordService } from '../../../../services/supplier-evaluation-record.service';
import { SupplierEvaluationRecord } from '../../../../models/supplierEvaluationRecordModel';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { ToastService } from '../../../../services/toast.service';

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
    searchTerm = '';

    columns: any[] = [
        { key: 'supplierName', header: 'Supplier Name', label: 'Supplier Name', type: 'text', sortable: true },
        { key: 'registerNo', header: 'Register No', type: 'string', label: 'Register No', filter: true },
        { key: 'evaluationDate', header: 'Date', type: 'date', label: 'Evaluation Date', sortable: true },
        { key: 'percentageScore', header: 'Score %', type: 'number', label: 'Percentage Score', sortable: true },
        { key: 'recommendation', header: 'Recommendation', type: 'badge', label: 'Recommendation', sortable: true },
        { key: 'presentStatus', header: 'Present Status', type: 'text', label: 'Present Status (Enlisted/Delisted)', sortable: true }
    ];

    constructor(
        private service: SupplierEvaluationRecordService,
        private router: Router,
        private toastService: ToastService
    ) { }

    ngOnInit(): void {
        this.loadRecords();
    }



    loadRecords(params: any = {}): void {
        const queryParams = {
            searchTerm: params.searchTerm || '',
            ...params
        };
        this.service.getAll(queryParams).subscribe({
            next: (res) => {
                this.records = res.items || [];
                this.records = res.items || [];
                this.totalRecords = res.totalRecords || 0;
            },
            error: () => {
                this.records = [];
                this.totalRecords = 0;
            }
        });
    }
   
    onPageChange(params: any): void {
        this.searchTerm = params.searchTerm || '';
        this.loadRecords(params);
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
            this.service.delete(id).subscribe({
                next: () => {
                    this.toastService.show('Supplier Evaluation Record deleted successfully', 'success');
                    this.loadRecords();
                },
                error: (err) => {
                    this.toastService.show(err?.error?.message || 'Failed to delete record', 'error');
                }
            });
        }
    }

    onPrint(record: any) {
        this.router.navigate(['/supplier/evaluation/preview'], { queryParams: { id: record.id } });
    }
}
