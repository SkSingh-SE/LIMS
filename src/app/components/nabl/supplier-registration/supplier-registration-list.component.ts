import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { SupplierRegistrationService } from '../../../services/supplier-registration.service';
import { SupplierRegistration } from '../../../models/supplierRegistrationModel';
import { NablRegisterTableComponent, RegisterColumn } from '../nabl-register-table/nabl-register-table.component';
import { ToastService } from '../../../services/toast.service';

@Component({
    selector: 'app-supplier-registration-list',

    imports: [CommonModule, RouterModule, NablRegisterTableComponent],
    templateUrl: './supplier-registration-list.component.html'
})
export class SupplierRegistrationListComponent implements OnInit {
    items: SupplierRegistration[] = [];
    totalItems = 0;
    searchTerm = '';

    columns: RegisterColumn[] = [
        { key: 'formCode', label: 'Format No', type: 'string' },
        { key: 'supplierName', label: 'Supplier Name', type: 'string' },
        { key: 'contactPerson', label: 'Contact Person', type: 'string' },
        { key: 'mobileNo', label: 'Mobile', type: 'string' },
        { key: 'gstNo', label: 'GST No', type: 'string' },
        { key: 'registrationStatus', label: 'Status', type: 'string' }
    ];

    constructor(
        private service: SupplierRegistrationService,
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

    onEdit(id: number): void {
        this.router.navigate(['/supplier-registration/edit', id]);
    }

    onView(id: number): void {
        this.router.navigate(['/supplier-registration/details', id]);
    }

    onPrint(id: number): void {
        this.router.navigate(['/supplier-registration/preview', id]);
    }

    onPageChange(params: any): void {
        this.searchTerm = params.searchTerm || '';
        this.loadRecords(params);
    }

    onDelete(id: number): void {
        if (confirm('Are you sure you want to delete this registration record?')) {
            this.service.delete(id).subscribe(() => {
                  this.toastService.show('delete supplier registration record', 'success');
                this.loadRecords({ PageNumber: 1, PageSize: 10 });
            });
        }
    }
}
