import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ReferenceMaterialService } from '../../../services/reference-material.service';
import { ReferenceMaterial } from '../../../models/referenceMaterialModel';
import { NablRegisterTableComponent, RegisterColumn } from '../nabl-register-table/nabl-register-table.component';
import { ToastService } from '../../../services/toast.service';
@Component({
    selector: 'app-reference-material-list',

    imports: [CommonModule, RouterModule, NablRegisterTableComponent],
    templateUrl: './reference-material-list.component.html'
})
export class ReferenceMaterialListComponent implements OnInit {
        printList = '/reference-material/previewlist';
    items: ReferenceMaterial[] = [];
    totalItems = 0;
    searchTerm = '';

    columns: RegisterColumn[] = [
        { key: 'documentNo', label: 'Document No', type: 'string' },
        { key: 'rmCode', label: 'Material Code', type: 'string' },
        { key: 'rmName', label: 'Material Name', type: 'string' },
        { key: 'batchNo', label: 'Batch No', type: 'string' },
        { key: 'manufacturer', label: 'Manufacturer', type: 'string' },
        { key: 'type', label: 'Type', type: 'string' },
        { key: 'validityDate', label: 'Validity Date', type: 'date' },
    ];

    constructor(
        private service: ReferenceMaterialService,
        private router: Router,
        private toastService: ToastService
    ) { }

    ngOnInit(): void {
        this.loadRecords({
            PageNumber: 1,
            PageSize: 10,
            searchTerm: '',
            sortByColumn: 'id',
            sortOrder: 'desc',
            filter: []
        });
    }

    loadRecords(params: any = {}): void {
        const queryParams = {
            searchTerm: this.searchTerm,
            ...params
        };
        this.service.getAll(queryParams).subscribe({
            next: (res) => {
                this.items = res.items || [];
                this.totalItems = res.totalRecords || 0;
            },
            error: () => {
                this.items = [];
                this.totalItems = 0;
            }
        });
    }

    onPageChange(params: any): void {
        this.searchTerm = params.searchTerm || '';
        this.loadRecords(params);
    }

    onDelete(id: number): void {
        if (confirm('Are you sure you want to delete this record?')) {
            this.service.delete(id).subscribe({
                next: (res) => {
                    this.toastService.show(res.message || 'Record deleted successfully', 'success');
                    this.loadRecords({
                        PageNumber: 1,
                        PageSize: 10,
                        searchTerm: '',
                        sortByColumn: 'id',
                        sortOrder: 'asc',
                        filter: []
                    });
                },
                error: (err) => {
                    this.toastService.show(err.message || 'Error deleting record', 'error');
                }
            });
        }
    }
}
