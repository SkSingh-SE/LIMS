import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { ProductInspectionService } from '../../../services/product-inspection.service';
import { NablRegisterTableComponent, RegisterColumn } from '../nabl-register-table/nabl-register-table.component';
import { ToastService } from '../../../services/toast.service';
@Component({
    selector: 'app-product-inspection-list',

    imports: [CommonModule, NablRegisterTableComponent],
    templateUrl: './product-inspection-list.component.html'
})
export class ProductInspectionListComponent implements OnInit {

    columns: RegisterColumn[] = [
        { key: 'documentNo', type: 'string', label: 'Doc Number', filter: true },
        { key: 'productName', type: 'string', label: 'Product / Service Name', filter: true },
        { key: 'productCode', type: 'string', label: 'Product / Service Code', filter: true },
        { key: 'category', type: 'string', label: 'Category', filter: true },
        { key: 'inspectionStage', type: 'string', label: 'Inspection Stage', filter: true },
        { key: 'status', type: 'string', label: 'Status', filter: true }
    ];

    plans: any[] = [];
    totalItems = 0;

    constructor(private service: ProductInspectionService,
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
                this.plans = response?.items || [];
                this.totalItems = response?.totalRecords || 0;
            },
            error: (error: any) => {
                console.error('Error fetching inspection plans:', error);
                this.plans = [];
                this.totalItems = 0;
            }
        });
    }

    onPageChange(payload: any) {
        this.fetchData(payload);
    }
      deleteProductInspection(id: number) {
        const confirm = window.confirm('Are you sure you want to delete this product inspection?');
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
