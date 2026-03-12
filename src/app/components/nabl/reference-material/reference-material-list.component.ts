import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ReferenceMaterialService } from '../../../services/reference-material.service';
import { ReferenceMaterial } from '../../../models/referenceMaterialModel';
import { NablRegisterTableComponent, RegisterColumn } from '../nabl-register-table/nabl-register-table.component';

@Component({
    selector: 'app-reference-material-list',

    imports: [CommonModule, RouterModule, NablRegisterTableComponent],
    templateUrl: './reference-material-list.component.html'
})
export class ReferenceMaterialListComponent implements OnInit {
    items: ReferenceMaterial[] = [];
    totalItems = 0;
    isLoading = signal(false);
    searchTerm = '';

    columns: RegisterColumn[] = [
        { key: 'formatNo', label: 'Format No', type: 'string' },
        { key: 'materialName', label: 'Material Name', type: 'string' },
        { key: 'materialCode', label: 'Material Code', type: 'string' },
        { key: 'category', label: 'Category', type: 'string' },
        { key: 'type', label: 'Type', type: 'string' },
        { key: 'expiryDate', label: 'Expiry Date', type: 'date' },
        { key: 'currentStock', label: 'Stock', type: 'number' }
    ];

    constructor(
        private service: ReferenceMaterialService,
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
        if (confirm('Are you sure you want to delete this material record?')) {
            this.service.delete(id).subscribe(() => {
                this.loadRecords({ PageNumber: 1, PageSize: 10 });
            });
        }
    }
}
