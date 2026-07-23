import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { ApprovedSupplierService } from '../../../services/approved-supplier.service';
import { NablRegisterTableComponent, RegisterColumn } from '../nabl-register-table/nabl-register-table.component';
import { ToastService } from '../../../services/toast.service';
@Component({
    selector: 'app-approved-supplier-list',

    imports: [CommonModule, NablRegisterTableComponent],
    templateUrl: './approved-supplier-list.component.html'
})
export class ApprovedSupplierListComponent implements OnInit {
    printList = '/approved-supplier/previewlist';

    columns: RegisterColumn[] = [
        { key: 'supplierName', type: 'string', label: 'List of Item', filter: true },
        { key: 'serviceProviderName', type: 'string', label: 'Service Provider Name', filter: true },
        { key: 'productApproved', type: 'string', label: 'Products/Service Approved', filter: true },
        { key: 'contactPerson', type: 'string', label: 'Contact Persons', filter: true },
        { key: 'mobileNo', type: 'string', label: 'MobileNo', filter: true },
        { key: 'email', type: 'string', label: 'Email', filter: true },
        { key: 'isPresentStatus', type: 'string', label: 'Present Status (Enlisted/Delisted)', filter: true },
        { key: 'enlistmentDate', type: 'string', label: 'Date of EnListed', filter: true }
    ];

    suppliers: any[] = [];
    totalItems = 0;

    constructor(private service: ApprovedSupplierService,
        private toastService: ToastService
    ) { }

    ngOnInit() {
        this.fetchData({
            PageNumber: 1,
            PageSize: 10,
            searchTerm: '',
            sortByColumn: 'id',
            sortOrder: 'desc',
            filter: []
        });
    }

    fetchData(payload: any) {
        this.service.getAll(payload).subscribe({
            next: (response) => {
                const rowItems = response?.items || [];

                this.suppliers = rowItems.map((item: any) => {
                    return {
                        ...item,
                        isPresentStatus: (item.isPresentStatus === true || item.isPresentStatus === 'true') ? 'Enlisted' : 'Delisted',
                        productApproved: (item.productApproved === true || item.productApproved === 'true') ? 'Yes' : 'No',
                        enlistmentDate: item.enlistmentDate ? item.enlistmentDate.split('T')[0] : ''
                    };
                });

                this.totalItems = response?.totalRecords || 0;
            },
            error: (error: any) => {
                console.error('Error fetching approved suppliers:', error);
                this.suppliers = [];
                this.totalItems = 0;
            }
        });
    }

    onPageChange(payload: any) {
        this.fetchData(payload);
    }
    deleteApprovedSupplier(id: number) {
        const confirm = window.confirm('Are you sure you want to delete this approved supplier?');
        if (confirm) {
            this.service.delete(id).subscribe({
                next: (response) => {
                    this.toastService.show(response.message, 'success');
                    this.fetchData({
                        PageNumber: 1,
                        PageSize: 10,
                        searchTerm: '',
                        sortByColumn: 'id',
                        sortOrder: 'desc',
                        filter: []
                    });
                },
                error: (err) => {
                    this.toastService.show(err.message, 'error');
                },
            });
        }
    }
}
