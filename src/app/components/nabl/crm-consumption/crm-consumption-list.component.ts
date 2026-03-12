import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { CrmConsumptionService } from '../../../services/crm-consumption.service';
import { CrmConsumptionRecord } from '../../../models/crmConsumptionModel';
import { NablRegisterTableComponent, RegisterColumn } from '../nabl-register-table/nabl-register-table.component';

@Component({
    selector: 'app-crm-consumption-list',

    imports: [CommonModule, RouterModule, NablRegisterTableComponent],
    templateUrl: './crm-consumption-list.component.html'
})
export class CrmConsumptionListComponent implements OnInit {
    items: CrmConsumptionRecord[] = [];
    totalItems = 0;
    isLoading = signal(false);
    searchTerm = '';

    columns: RegisterColumn[] = [
        { key: 'formatNo', label: 'Format No', type: 'string' },
        { key: 'materialName', label: 'Material Name', type: 'string' },
        { key: 'batchNo', label: 'Batch No', type: 'string' },
        { key: 'consumptionMonth', label: 'Month', type: 'number' },
        { key: 'consumptionYear', label: 'Year', type: 'number' },
        { key: 'openingStock', label: 'Opening', type: 'number' },
        { key: 'consumed', label: 'Consumed', type: 'number' },
        { key: 'closingStock', label: 'Closing', type: 'number' }
    ];

    constructor(
        private service: CrmConsumptionService,
        private router: Router
    ) { }

    ngOnInit(): void {
        this.loadRecords();
    }

    loadRecords(params: any = {}): void {
        this.isLoading.set(true);
        const queryParams = {
            searchTerm: this.searchTerm,
            ...params
        };
        this.service.getAll(queryParams).subscribe({
            next: (res) => {
                this.items = res.items || [];
                this.totalItems = res.totalRecords || 0;
                this.isLoading.set(false);
            },
            error: () => {
                this.items = [];
                this.totalItems = 0;
                this.isLoading.set(false);
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
                this.loadRecords({ PageNumber: 1, PageSize: 10 });
            });
        }
    }
}
