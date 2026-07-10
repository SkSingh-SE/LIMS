import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { CrmConsumptionService } from '../../../services/crm-consumption.service';
import { CrmConsumptionRecord } from '../../../models/crmConsumptionModel';
import { NablRegisterTableComponent, RegisterColumn } from '../nabl-register-table/nabl-register-table.component';
import { ReferenceMaterialService } from '../../../services/reference-material.service';
@Component({
    selector: 'app-crm-consumption-list',

    imports: [CommonModule, RouterModule, NablRegisterTableComponent],
    templateUrl: './crm-consumption-list.component.html'
})
export class CrmConsumptionListComponent implements OnInit {
    items: any[] = [];
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
        private service: CrmConsumptionService,
        private router: Router,
        private referenceMaterialService: ReferenceMaterialService
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
        this.referenceMaterialService.getAll(queryParams).subscribe({
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
        if (confirm('Are you sure you want to delete this consumption record?')) {
            this.service.delete(id).subscribe(() => {
                this.loadRecords({
                    PageNumber: 1,
                    PageSize: 10,
                    searchTerm: '',
                    sortByColumn: 'id',
                    sortOrder: 'desc',
                    filter: []
                });
            });
        }
    }
}
