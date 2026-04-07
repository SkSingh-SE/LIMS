import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { SupplierConfidentialityService } from '../../../services/supplier-confidentiality.service';
import { SupplierConfidentiality } from '../../../models/supplierConfidentialityModel';
import { NablRegisterTableComponent, RegisterColumn } from '../nabl-register-table/nabl-register-table.component';
import { ToastService } from '../../../services/toast.service';

@Component({
    selector: 'app-supplier-confidentiality-list',

    imports: [CommonModule, RouterModule, NablRegisterTableComponent],
    templateUrl: './supplier-confidentiality-list.component.html'
})
export class SupplierConfidentialityListComponent implements OnInit {
    items: SupplierConfidentiality[] = [];
    totalItems = 0;
    searchTerm = '';

    columns: RegisterColumn[] = [
        { key: 'documentNo', label: 'Document No', type: 'string' },
        { key: 'supplierName', label: 'Supplier Name', type: 'string' },
        { key: 'contactPerson', label: 'Contact Person', type: 'string' },
        { key: 'agreementDate', label: 'Agreement Date', type: 'date' },
        { key: 'validUntil', label: 'Valid Until', type: 'date' },
        { key: 'status', label: 'Status', type: 'string' }
    ];

    constructor(
        private service: SupplierConfidentialityService,
        private router: Router,
        private toastService: ToastService
    ) { }

    ngOnInit(): void {
        this.loadRecords();
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

    onSearch(term: string): void {
        this.searchTerm = term;
        this.loadRecords();
    }

    onAdd(): void {
        this.router.navigate(['/supplier-confidentiality-agreement/create']);
    }

    onEdit(id: number): void {
        this.router.navigate(['/supplier-confidentiality-agreement/edit', id]);
    }

    onDelete(id: number): void {
        if (confirm('Are you sure you want to delete this agreement?')) {
            this.service.delete(id).subscribe({
                next: () => {
                    this.loadRecords({ PageNumber: 1, PageSize: 10 });
                },
                error: (err) => {
                    this.toastService.show(err?.error?.message || 'Failed to delete record', 'error');
                }
            });
        }
    }

    onPreview(id: number): void {
        this.router.navigate(['/supplier-confidentiality-agreement/preview', id]);
    }
}
