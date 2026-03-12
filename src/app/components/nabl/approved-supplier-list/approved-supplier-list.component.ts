import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { ApprovedSupplierService } from '../../../services/approved-supplier.service';
import { NablRegisterTableComponent, RegisterColumn } from '../nabl-register-table/nabl-register-table.component';

@Component({
    selector: 'app-approved-supplier-list',

    imports: [CommonModule, NablRegisterTableComponent],
    templateUrl: './approved-supplier-list.component.html'
})
export class ApprovedSupplierListComponent implements OnInit {

    columns: RegisterColumn[] = [
        { key: 'documentNo', type: 'string', label: 'Document No', filter: true },
        { key: 'supplierName', type: 'string', label: 'Supplier Name', filter: true },
        { key: 'productsServicesSupplied', type: 'string', label: 'Products/Services', filter: true },
        { key: 'registrationNo', type: 'string', label: 'Reg. No', filter: true },
        { key: 'performanceGrade', type: 'string', label: 'Grade', filter: true },
        { key: 'validUpTo', type: 'date', label: 'Valid Up To', filter: true }
    ];

    suppliers: any[] = [];
    totalItems = 0;
    isLoading = signal(false);

    constructor(private service: ApprovedSupplierService) { }

    ngOnInit() {
        this.fetchData({
            PageNumber: 1,
            PageSize: 10,
            searchTerm: '',
            sortByColumn: 'id',
            sortOrder: 'asc',
            filter: []
        });
    }

    fetchData(payload: any) {
        this.isLoading.set(true);
        this.service.getAll(payload).subscribe({
            next: (response) => {
                this.suppliers = response?.items || [];
                this.totalItems = response?.totalRecords || 0;
                this.isLoading.set(false);
            },
            error: (error: any) => {
                console.error('Error fetching approved suppliers:', error);
                this.suppliers = [];
                this.totalItems = 0;
                this.isLoading.set(false);
            }
        });
    }

    onPageChange(payload: any) {
        this.fetchData(payload);
    }
}
